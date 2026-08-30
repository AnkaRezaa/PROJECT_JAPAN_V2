# Kelas Realtime di Development Windows

## Komponen yang Harus Hidup

```text
1. MySQL/MariaDB
2. Laravel/Laragon
3. Vite
4. Reverb 127.0.0.1:8080
5. LiveKit HTTP/WS 7880, ICE TCP 7881, ICE UDP 7882
```

## 1. LiveKit Server Windows

Binary boleh berada di drive lain, misalnya:

```text
D:\Livekit\livekit_1.13.5_windows_amd64
```

Buat key development:

```powershell
cd D:\Livekit\livekit_1.13.5_windows_amd64
.\livekit-server.exe generate-keys
```

Buat `livekit.dev.yaml`:

```yaml
port: 7880
bind_addresses:
  - "127.0.0.1"
log_level: info

rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: false

keys:
  "GANTI_API_KEY_DEV": "GANTI_API_SECRET_DEV"
```

Jalankan:

```powershell
.\livekit-server.exe --config .\livekit.dev.yaml
```

Pesan Windows bahwa CPU capacity monitoring tidak tersedia dapat diabaikan untuk development. Pastikan server tetap menunjukkan port dan tidak berhenti.

## 2. Environment Laravel

```dotenv
APP_URL=http://127.0.0.1:8000
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=toku-up-local
REVERB_APP_KEY=REVERB_KEY_RANDOM
REVERB_APP_SECRET=REVERB_SECRET_RANDOM
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_SCALING_ENABLED=false

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

LIVEKIT_API_URL=http://127.0.0.1:7880
LIVEKIT_WS_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=GANTI_API_KEY_DEV
LIVEKIT_API_SECRET=GANTI_API_SECRET_DEV
LIVEKIT_TOKEN_TTL=900
```

Key Laravel harus sama persis dengan `livekit.dev.yaml`.

```powershell
php artisan optimize:clear
```

Restart Vite setelah mengubah `VITE_REVERB_*`.

## 3. Reverb

```powershell
cd C:\laragon\www\project_japan\toku-up
php artisan reverb:start --host=127.0.0.1 --port=8080
```

Queue worker tidak diperlukan untuk event kelas karena event state memakai `ShouldBroadcastNow`.

## 4. Laravel dan Vite

```powershell
php artisan serve --host=127.0.0.1 --port=8000
npm run dev
```

Masing-masing proses yang long-running memerlukan terminal sendiri.

## 5. Data Uji

1. Login superadmin.
2. Buat program dan kloter aktif.
3. Pilih admin sebagai pengampu kloter.
4. Tambahkan user sebagai anggota aktif.
5. Login admin pengampu di browser normal.
6. Login user di Incognito/browser lain.

Room tidak akan bisa dibuat tanpa kloter aktif dan admin pengampu. User di luar kloter sengaja menerima 403.

## 6. Pengujian

Mentor:

- buat room dengan deck dan tanpa deck;
- preview kamera/mic;
- masuk, ganti slide, coret, pointer, kamera, mic, share screen;
- izinkan menulis, block mic, mute all, kick, end session.

Siswa:

- join melalui link;
- pastikan media mentor terlihat/terdengar;
- PTT dan raise hand;
- reconnect setelah jaringan putus;
- pastikan kick menolak token berikutnya.

Gunakan minimal dua browser. Untuk dua perangkat melalui LAN, HTTP alamat IP tidak selalu dianggap secure context. Kamera, microphone, dan share screen paling aman diuji melalui localhost atau staging/tunnel HTTPS.

## 7. Cek Port

```powershell
Get-NetTCPConnection -LocalPort 7880,7881,8080 -ErrorAction SilentlyContinue
Get-NetUDPEndpoint -LocalPort 7882 -ErrorAction SilentlyContinue
```

## 8. Error Penting

- WebSocket `ws://127.0.0.1:7880` gagal: LiveKit tidak hidup, bind/port salah, atau browser tidak berada di mesin yang sama.
- `Provided key is too short` atau endpoint token mengembalikan 503: jangan jalankan server dengan placeholder `--dev`. Gunakan `generate-keys`, pastikan secret minimal 32 karakter, simpan pasangan yang sama di `livekit.dev.yaml` dan `.env`, lalu jalankan `php artisan optimize:clear`.
- `POST /admin/live-classes/{id}/token 500/503`: periksa log Laravel, panjang dan kecocokan key/secret, config cache, dan format grant SDK.
- `invalid token`: key/secret Laravel berbeda dari server, token lama, atau jam OS tidak sinkron.
- Loop kembali ke setup: session gagal dibuat/start, admin bukan pengampu, atau kloter/deck tidak cocok.
- Kamera lobby muncul tetapi ruang kosong: pastikan track preview dihentikan sebelum LiveKit membuat track baru dan token mentor memiliki source camera.
