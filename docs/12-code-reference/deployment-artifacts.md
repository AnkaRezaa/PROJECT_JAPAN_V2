# Deployment Artifacts

Dokumentasi deployment kanonis berada di:

- [VPS Debian](../02-deployment/vps-debian.md)
- [Nginx, TLS, scheduler, dan service](../02-deployment/nginx-ssl-services.md)
- [Live class production](../06-live-class/production.md)
- [Scheduler, queue, backup, dan monitoring](../08-operations/scheduler-queue-backup.md)

Folder `deployment/` hanya menyimpan file yang disalin atau dipakai langsung oleh server. Ia bukan lokasi kedua untuk dokumentasi.

## `deployment/systemd/toku-up-reverb.service`

Unit systemd untuk menjalankan `php artisan reverb:start` sebagai user `webtest`, working directory `/var/www/project_japan_v2`, bind lokal `127.0.0.1:8080`, restart otomatis, dan logging ke journal.

Instalasi, Nginx proxy, firewall, restart, serta troubleshooting dijelaskan satu kali di [Nginx, TLS, scheduler, dan service](../02-deployment/nginx-ssl-services.md).

LiveKit memakai service/config tersendiri pada server media. Contoh lengkap production berada di [Live class production](../06-live-class/production.md); secret dan file environment tidak boleh disimpan di repository.
