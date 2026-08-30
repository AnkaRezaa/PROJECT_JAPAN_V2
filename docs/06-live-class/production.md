# Kelas Realtime di Production

## Topologi Satu Domain

Tidak perlu membeli domain kedua. Gunakan subdomain:

```text
rezawalker.web.id       Laravel + Reverb WSS
live.rezawalker.web.id  LiveKit signal WSS
turn.rezawalker.web.id  TURN hostname
```

Buat DNS A record ketiganya ke IP VPS. Bila memakai Cloudflare, domain web boleh proxied; `live` dan `turn` sebaiknya DNS only karena media UDP tidak melewati proxy HTTP biasa.

## 1. Environment

```dotenv
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=toku-up-production
REVERB_APP_KEY=KEY_PRODUCTION_BARU
REVERB_APP_SECRET=SECRET_PRODUCTION_BARU
REVERB_HOST=rezawalker.web.id
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_SCALING_ENABLED=false

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

LIVEKIT_API_URL=http://127.0.0.1:7880
LIVEKIT_WS_URL=wss://live.rezawalker.web.id
LIVEKIT_API_KEY=KEY_LIVEKIT_PRODUCTION
LIVEKIT_API_SECRET=SECRET_LIVEKIT_PRODUCTION
LIVEKIT_TOKEN_TTL=900
```

Konfigurasi repository saat ini mengizinkan origin Reverb `*`. Ini blocker hardening: sebelum go-live ubah `config/reverb.php` agar origin hanya `https://rezawalker.web.id` (dan `www` bila dipakai). Jangan mengandalkan wildcard di production.

## 2. Install LiveKit

Unduh release resmi Linux AMD64 yang sama dengan versi yang diuji:

```bash
cd /tmp
LIVEKIT_VERSION=1.13.5
curl -fL -o livekit.tar.gz "https://github.com/livekit/livekit/releases/download/v${LIVEKIT_VERSION}/livekit_${LIVEKIT_VERSION}_linux_amd64.tar.gz"
mkdir livekit-extract
tar -xzf livekit.tar.gz -C livekit-extract
sudo install -m 0755 livekit-extract/livekit-server /usr/local/bin/livekit-server
sudo useradd --system --create-home --home-dir /var/lib/livekit --shell /usr/sbin/nologin livekit 2>/dev/null || true
sudo install -d -o root -g livekit -m 0750 /etc/livekit
```

Verifikasi checksum dari halaman release sebelum production.

## 3. Konfigurasi LiveKit

`/etc/livekit/livekit.yaml`:

```yaml
port: 7880
bind_addresses:
  - "0.0.0.0"
log_level: info

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50199
  use_external_ip: true

keys:
  "KEY_LIVEKIT_PRODUCTION": "SECRET_LIVEKIT_PRODUCTION"

turn:
  enabled: true
  domain: turn.rezawalker.web.id
  udp_port: 3478
```

```bash
sudo chown root:livekit /etc/livekit/livekit.yaml
sudo chmod 640 /etc/livekit/livekit.yaml
```

### VPS di Belakang NAT/OPNsense

Jika interface VPS memakai IP privat, jangan mengandalkan deteksi STUN yang dapat menemukan IP publik gateway yang berbeda. Gunakan IP publik yang benar:

```yaml
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50199
  use_external_ip: false
  node_ip: "IP_PUBLIK_VPS"
```

Admin jaringan harus membuat destination NAT/port forwarding ke IP privat VPS:

```text
TCP 7881          -> IP_PRIVAT_VPS:7881
UDP 50000-50199   -> IP_PRIVAT_VPS:50000-50199
```

`ss` pada VPS hanya membuktikan LiveKit mendengarkan port lokal; keberhasilan forwarding harus diuji dari perangkat di jaringan eksternal saat room mengirim media.

## 4. systemd LiveKit

`/etc/systemd/system/livekit.service`:

```ini
[Unit]
Description=LiveKit Server TOKU-UP
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=livekit
Group=livekit
ExecStart=/usr/local/bin/livekit-server --config /etc/livekit/livekit.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now livekit
sudo systemctl status livekit
```

## 5. Nginx LiveKit Signal

Buat server block `live.rezawalker.web.id` yang proxy ke `127.0.0.1:7880` dengan HTTP/1.1, `Upgrade`, `Connection`, timeout panjang, dan buffering off. Pasang sertifikat:

```bash
sudo certbot --nginx -d live.rezawalker.web.id
```

Konfigurasi Reverb WSS pada domain utama dijelaskan di [Nginx dan service](../02-deployment/nginx-ssl-services.md).

Verifikasi sertifikat yang dilayani Nginx lokal dan IP publik secara terpisah:

```bash
echo | openssl s_client -connect 127.0.0.1:443 -servername live.rezawalker.web.id 2>/dev/null | openssl x509 -noout -subject -issuer -dates
echo | openssl s_client -connect IP_PUBLIK_VPS:443 -servername live.rezawalker.web.id 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

Jika koneksi lokal menunjukkan Let's Encrypt tetapi IP publik menunjukkan sertifikat self-signed OPNsense, TLS berhenti di gateway dan belum diteruskan ke Nginx yang benar. Perbaikannya berada pada NAT/virtual host OPNsense, bukan dengan menerbitkan ulang sertifikat Nginx berulang kali.

## 6. Firewall

```bash
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 3478/udp
sudo ufw allow 50000:50199/udp
sudo ufw deny 7880/tcp
sudo ufw deny 8080/tcp
```

Buka aturan yang sama pada firewall provider. `7880` dan `8080` internal saja.

Sebelum mengaktifkan UFW lewat SSH, pastikan port SSH aktual sudah diizinkan. Untuk konfigurasi standar:

```bash
sudo sshd -T | grep '^port'
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status verbose
```

## 7. Batas TURN Single IP

TURN/UDP 3478 cukup untuk banyak jaringan rumah/seluler, tetapi jaringan kantor ketat dapat hanya mengizinkan TURN/TLS TCP 443. Nginx website sudah memakai TCP 443 pada IP yang sama. Untuk dukungan jaringan paling luas gunakan IP/media VPS kedua atau layanan LiveKit Cloud/TURN terkelola. Jangan menjanjikan semua jaringan sebelum pengujian nyata.

## 8. Build dan Restart

```bash
cd /var/www/project_japan_v2
php artisan optimize:clear
npm run build
php artisan optimize
sudo systemctl restart php8.3-fpm toku-up-reverb livekit
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Uji Staging/Production

Gunakan dua perangkat dan dua jaringan berbeda. Uji:

- login dan membership;
- lobby/permission browser;
- audio/video mentor;
- PTT siswa;
- screen share dan audio tab;
- slide, pointer, drawing, snapshot late join;
- block mic yang tetap berlaku setelah reconnect;
- kick berbeda dari disconnect;
- end session;
- beban bertahap 5, 10, 20 peserta.

Pantau:

```bash
htop
free -h
df -h
sudo journalctl -u livekit -f
sudo journalctl -u toku-up-reverb -f
sudo ss -s
```

## 10. Kriteria Siap

- origin Reverb tidak wildcard;
- TLS valid dan WSS bekerja;
- secret production baru dan tidak masuk Git;
- UFW serta firewall provider membuka media yang dibutuhkan;
- 7880/8080 tidak publik;
- seluruh skenario akses/moderasi/reconnect lulus;
- resource dan bandwidth masih memiliki headroom;
- backup/rollback sudah diuji;
- keterbatasan TURN single-IP diterima secara eksplisit.
