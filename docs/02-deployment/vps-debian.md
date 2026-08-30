# Deployment VPS Debian

Panduan ini memakai deployment native tanpa Docker agar ringan pada VPS kecil. Contoh target:

```text
OS           Debian 12
Project      /var/www/project_japan_v2
Deploy user  webtest
Web group    www-data
Domain       rezawalker.web.id
PHP          8.3 FPM
Database     MariaDB/MySQL
```

## 1. DNS dan Jaringan

Buat DNS A record domain utama ke IP publik VPS. Bila VPS berada di belakang NAT, forward minimal TCP 80 dan 443 ke VM. Untuk LiveKit, ikuti port tambahan di [production realtime](../06-live-class/production.md).

Verifikasi:

```bash
dig rezawalker.web.id +short
curl -I http://rezawalker.web.id
```

## 2. Paket Sistem

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx mariadb-server mariadb-client supervisor cron \
  certbot python3-certbot-nginx curl wget git unzip zip ca-certificates gnupg
```

Install PHP 8.3 sesuai repository Debian/Sury yang digunakan, lalu:

```bash
sudo apt install -y php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl \
  php8.3-gd php8.3-readline php8.3-opcache
```

Install Composer dari installer resmi dan Node.js 22. Verifikasi sebelum lanjut:

```bash
php -v
php -m | grep -E 'pdo_mysql|curl|mbstring|openssl|xml|zip|gd|intl'
composer --version
node -v
npm -v
```

## 3. Database

```bash
sudo mariadb-secure-installation
sudo mariadb
```

```sql
CREATE DATABASE project_japan_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'project_japan'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_DB_KUAT';
GRANT ALL PRIVILEGES ON project_japan_v2.* TO 'project_japan'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Database tidak boleh mendengarkan koneksi publik kecuali ada kebutuhan dan firewall khusus.

## 4. Clone dan Dependency

```bash
sudo mkdir -p /var/www
sudo chown -R webtest:www-data /var/www
sudo -u webtest git clone https://github.com/walkerreza/PROJECT_JAPAN_V2.git /var/www/project_japan_v2
cd /var/www/project_japan_v2
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci
npm run build
```

Jangan memakai `--force` atau `--legacy-peer-deps` sebagai kebiasaan. Jika `npm ci` gagal karena lockfile tidak sinkron, perbaiki dan commit lockfile dari development dengan versi Node/npm yang sama.

Build production belum selesai sampai Vite menampilkan `built in ...` dan manifest tersedia:

```bash
ls -lh public/build/manifest.json
```

Jangan menjalankan optimasi Laravel ketika proses build masih berjalan atau gagal karena `public/build` dapat berada dalam kondisi sementara tanpa manifest.

## 5. Environment Production

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

Minimum:

```dotenv
APP_NAME="TOKU-UP"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://rezawalker.web.id
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=project_japan_v2
DB_USERNAME=project_japan
DB_PASSWORD=GANTI_PASSWORD_DB_KUAT

SESSION_DRIVER=database
SESSION_DOMAIN=rezawalker.web.id
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
```

Tambahkan Google, Midtrans, Mailtrap, Reverb, dan LiveKit dari panduan masing-masing. Jangan menyalin secret development.

## 6. Migration dan Storage

Backup database sebelum migration pada server yang sudah memiliki data:

```bash
mysqldump --single-transaction project_japan_v2 > /var/backups/toku-up-before-migrate.sql
php artisan migrate --force
php artisan storage:link
```

PDF premium harus berada di private/local storage. Untuk data legacy:

```bash
php artisan presentations:migrate-public-pdfs --dry-run
php artisan presentations:migrate-public-pdfs --force
```

Jalankan `--force` hanya setelah dry-run diperiksa dan backup tersedia.

## 7. Permission

```bash
sudo chown -R webtest:www-data /var/www/project_japan_v2
sudo find /var/www/project_japan_v2 -type d -exec chmod 755 {} \;
sudo find /var/www/project_japan_v2 -type f -exec chmod 644 {} \;
sudo chmod -R ug+rwx storage bootstrap/cache
sudo chmod 600 .env
```

Jangan memberi `777` pada repository atau storage.

## 8. Nginx, TLS, dan Proses Background

Ikuti [Nginx, TLS, dan service](nginx-ssl-services.md), kemudian:

```bash
php artisan optimize:clear
php artisan optimize
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx
```

## 9. Urutan Update Berikutnya

```bash
cd /var/www/project_japan_v2
php artisan down --retry=30
git pull origin main
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci
npm run build
test -f public/build/manifest.json
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
sudo systemctl restart php8.3-fpm
sudo systemctl restart toku-up-reverb
php artisan up
```

Untuk perubahan besar, gunakan release directory/symlink agar rollback lebih aman. `git pull` langsung cocok hanya untuk deployment sederhana dengan backup dan downtime yang diterima.

## 10. Verifikasi

```bash
php artisan about
php artisan migrate:status
php artisan schedule:list
sudo nginx -t
curl -I https://rezawalker.web.id
```

Pastikan `/.env`, `/artisan`, `/composer.json`, `/storage/logs/laravel.log`, dan directory listing menghasilkan 403/404.
