# Scheduler, Queue, Backup, Storage, dan Monitoring

Scheduler juga menjalankan `accounts:anonymize-suspended` setiap hari. Command ini memproses akun suspended yang melewati `scheduled_anonymization_at`; scheduler Laravel wajib aktif sebelum kebijakan retensi 30 hari digunakan di production.

## Scheduler Aktif

`routes/console.php` menjalankan:

```text
00:10 harian       subscriptions:expire
00:30 harian       presentations:cleanup-imports --days=14
00:45 harian       logs:prune --days=90
setiap 10 menit    payments:reconcile-pending --hours=48
setiap menit       news:publish-scheduled
setiap 15 menit    auth:clear-resets
01:00 harian       live-classes:cleanup-snapshots --days=30
```

Production memerlukan cron `schedule:run` setiap menit. Cek:

```bash
php artisan schedule:list
php artisan schedule:run -v
```

## Queue

### Trafik kecil

```dotenv
QUEUE_CONNECTION=sync
```

Email dan job diproses pada request; tidak membutuhkan worker. Kekurangannya request lebih lambat dan kegagalan provider langsung memengaruhi request jika tidak ditangani.

### Trafik bertambah

```dotenv
QUEUE_CONNECTION=database
```

Jalankan worker melalui Supervisor, bukan terminal SSH. Pantau:

```bash
php artisan queue:failed
php artisan queue:retry all
sudo supervisorctl status
```

Event kelas live tertentu menggunakan `ShouldBroadcastNow`, jadi tidak menunggu queue worker.

## Backup Database

Backup harian terenkripsi atau pada storage terpisah:

```bash
mkdir -p /var/backups/toku-up
mysqldump --single-transaction --quick project_japan_v2 | gzip > /var/backups/toku-up/db-$(date +%F-%H%M).sql.gz
```

Jangan menaruh backup SQL di `public/` atau root repository. Terapkan retention, misalnya 7 harian, 4 mingguan, dan beberapa bulanan sesuai kebutuhan bisnis.

## Backup File

Backup minimal:

```text
storage/app/private
storage/app/public (hanya asset yang memang publik)
.env melalui secret manager/backup terenkripsi
/etc/nginx/sites-available
/etc/systemd/system/livekit.service
/etc/systemd/system/toku-up-reverb.service
/etc/livekit/livekit.yaml (terenkripsi/permission ketat)
```

`vendor/`, `node_modules/`, dan `public/build/` dapat dibangun ulang dan tidak wajib masuk backup data.

## Uji Restore

Backup yang belum pernah direstore belum terbukti berguna. Pada staging:

```bash
gunzip -c backup.sql.gz | mysql project_japan_v2_restore
```

Verifikasi login, kelas, transaksi, storage private, dan migration status.

## Storage dan Cleanup

- PDF premium di private storage;
- file import presentasi sementara dibersihkan setelah 14 hari;
- snapshot papan sesi berakhir dibersihkan setelah 30 hari;
- log aktivitas/login dipangkas sesuai retention;
- jangan menghapus source presentasi yang masih direferensikan database;
- pantau inode dan disk, bukan hanya total GB.

```bash
df -h
df -i
du -sh storage/*
```

## Monitoring Minimum

- uptime Nginx, PHP-FPM, MariaDB, Reverb, LiveKit;
- HTTP 5xx dan exception Laravel;
- queue failed;
- transaksi pending lebih dari batas normal;
- kegagalan webhook/signature;
- email bounce/complaint;
- disk/inode, RAM, swap, CPU, load average;
- koneksi dan bandwidth LiveKit saat kelas;
- expiry sertifikat TLS dan backup terakhir.

Perintah cepat:

```bash
systemctl --failed
free -h
df -h
uptime
sudo journalctl -p err -n 100
php artisan queue:failed
```

## News Terjadwal

Berita dengan waktu publish diproses scheduler setiap menit. Jika berita tidak muncul, periksa timezone, scheduler, status publish, dan log command; jangan mengubah status manual sebelum memastikan scheduler berjalan.

## Rollback

Sebelum deployment:

- backup database dan storage yang berubah;
- catat commit lama;
- simpan konfigurasi Nginx/service secara aman;
- baca migration `down()` dan dampak data.

Rollback kode tidak otomatis membatalkan migration data. Untuk perubahan skema destruktif, buat rencana forward-fix atau migration rollback yang sudah diuji.
