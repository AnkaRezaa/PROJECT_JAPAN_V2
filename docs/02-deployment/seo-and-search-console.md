# SEO dan Peluncuran Domain Final

## Kondisi Domain Sementara

Fondasi SEO boleh dipasang saat domain masih sementara, tetapi indexing harus tetap dimatikan:

```env
SEO_SITE_NAME="Belajar Bahasa Jepang"
SEO_DEFAULT_DESCRIPTION="Belajar bahasa Jepang melalui roadmap terstruktur, kosakata, kanji, kuis, latihan menulis, kelas mandiri, dan pendampingan mentor."
SEO_DEFAULT_IMAGE=
SEO_INDEXING_ENABLED=false
GOOGLE_SITE_VERIFICATION=
VITE_SEO_SITE_NAME="${SEO_SITE_NAME}"
```

Dalam kondisi ini respons HTML dan header mengirim `noindex, nofollow`, `robots.txt` menahan crawler, dan `sitemap.xml` belum tersedia.

## Aktivasi pada Domain Final

1. Arahkan domain final ke VPS dan pasang TLS.
2. Ubah `APP_URL`, `SEO_SITE_NAME`, gambar sosial default, dan Google verification token.
3. Aktifkan `SEO_INDEXING_ENABLED=true`.
4. Jalankan:

```bash
php artisan optimize:clear
php artisan optimize
npm ci
npm run build
sudo systemctl restart php8.3-fpm
```

5. Pastikan canonical dan Open Graph menggunakan domain final:

```bash
curl -s https://domain-final.example | grep -E 'canonical|robots|og:title|description'
curl -s https://domain-final.example/robots.txt
curl -s https://domain-final.example/sitemap.xml
```

6. Tambahkan domain ke Google Search Console dan kirim `/sitemap.xml`.

## Perilaku Halaman

- Hanya halaman publik dan kelas berstatus `published` yang boleh diindeks.
- Admin, superadmin, autentikasi, user, dashboard, profil, pembayaran, dan checkout selalu `noindex`.
- URL kelas publik menggunakan `/kelas/{slug}` dan sitemap dibentuk dari data kelas published.
- Nama brand SEO berada di environment sehingga pergantian brand tidak memerlukan edit setiap halaman.

Jika domain sementara pernah terindeks atau dibagikan luas, pertahankan server lama dan buat redirect HTTP 301 per URL menuju domain final.
