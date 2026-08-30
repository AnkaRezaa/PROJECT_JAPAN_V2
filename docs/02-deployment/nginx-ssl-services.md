# Nginx, TLS, Scheduler, dan Service

## Virtual Host Aplikasi

Buat `/etc/nginx/sites-available/toku-up`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name rezawalker.web.id www.rezawalker.web.id;

    root /var/www/project_japan_v2/public;
    index index.php;
    client_max_body_size 25m;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\. {
        deny all;
    }

    location ~* \.(env|log|sql|bak)$ {
        deny all;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/toku-up /etc/nginx/sites-enabled/toku-up
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## TLS

```bash
sudo certbot --nginx -d rezawalker.web.id -d www.rezawalker.web.id
sudo certbot renew --dry-run
```

Setelah HTTPS aktif, pastikan `.env` memakai `APP_URL=https://rezawalker.web.id` dan `SESSION_SECURE_COOKIE=true`.

## Reverb sebagai systemd

Repository menyediakan `deployment/systemd/toku-up-reverb.service`:

Folder `deployment/systemd/` hanya berisi unit yang disalin ke server. Dokumen ini adalah referensi kanonis untuk instalasi dan operasi service supaya instruksi systemd tidak terduplikasi.

```bash
cd /var/www/project_japan_v2
sudo cp deployment/systemd/toku-up-reverb.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now toku-up-reverb
sudo systemctl status toku-up-reverb
```

Service bind ke `127.0.0.1:8080`; jangan membuka 8080 ke publik. Tambahkan proxy WebSocket pada server HTTPS aplikasi:

```nginx
location /app {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:8080;
}

location /apps {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_pass http://127.0.0.1:8080;
}
```

Batasi `allowed_origins` Reverb ke domain production sebelum go-live; konfigurasi `*` hanya layak untuk development.

## Scheduler

Tambahkan crontab user aplikasi:

```bash
sudo crontab -u webtest -e
```

```cron
* * * * * cd /var/www/project_japan_v2 && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

Scheduler menjalankan expiry subscription, cleanup import/log/snapshot, reconciliation Midtrans, publish berita, dan pembersihan token reset.

## Queue

Untuk trafik kecil gunakan `QUEUE_CONNECTION=sync`; worker tidak diperlukan. Jika beralih ke `database`, buat Supervisor:

```ini
[program:toku-up-worker]
command=/usr/bin/php /var/www/project_japan_v2/artisan queue:work database --queue=mail,default --sleep=3 --tries=3 --timeout=90
directory=/var/www/project_japan_v2
user=webtest
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/var/www/project_japan_v2/storage/logs/worker.log
```

Aktifkan:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

Jangan menjalankan worker database jika env masih `sync`.

## Firewall Dasar

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 2029/tcp
sudo ufw enable
```

Sesuaikan port SSH nyata sebelum mengaktifkan UFW. Database, Reverb 8080, dan LiveKit API 7880 tidak boleh publik. Port media LiveKit dijelaskan terpisah.

## Log dan Restart

```bash
sudo journalctl -u toku-up-reverb -f
sudo tail -f /var/log/nginx/error.log
tail -f /var/www/project_japan_v2/storage/logs/laravel.log
sudo systemctl restart php8.3-fpm toku-up-reverb
```
