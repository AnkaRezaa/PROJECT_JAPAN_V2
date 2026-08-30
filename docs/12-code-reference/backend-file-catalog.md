# Katalog File Backend

> Dibangkitkan oleh `scripts/generate-code-reference.ps1`. Jangan mengedit tabel secara manual; perbarui catatan arsitektur terpisah bila tanggung jawab domain berubah.

Total file PHP dalam `app/`: 153.

## Artisan command

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Console/Commands/AnonymizeSuspendedAccounts.php` | `AnonymizeSuspendedAccounts` | Operasi CLI/maintenance untuk Anonymize Suspended Accounts. |
| `app/Console/Commands/BersihkanImportPresentasi.php` | `BersihkanImportPresentasi` | Operasi CLI/maintenance untuk Bersihkan Import Presentasi. |
| `app/Console/Commands/BersihkanLogOperasional.php` | `BersihkanLogOperasional` | Operasi CLI/maintenance untuk Bersihkan Log Operasional. |
| `app/Console/Commands/CleanupHandwritingQuestions.php` | `CleanupHandwritingQuestions` | Operasi CLI/maintenance untuk Cleanup Handwriting Questions. |
| `app/Console/Commands/CleanupLiveClassSnapshots.php` | `CleanupLiveClassSnapshots` | Operasi CLI/maintenance untuk Cleanup Live Class Snapshots. |
| `app/Console/Commands/KadaluarsaLangganan.php` | `KadaluarsaLangganan` | Operasi CLI/maintenance untuk Kadaluarsa Langganan. |
| `app/Console/Commands/MigratePublicPresentationPdfs.php` | `MigratePublicPresentationPdfs` | Operasi CLI/maintenance untuk Migrate Public Presentation Pdfs. |
| `app/Console/Commands/PublishScheduledNews.php` | `PublishScheduledNews` | Operasi CLI/maintenance untuk Publish Scheduled News. |
| `app/Console/Commands/ReconcilePendingMidtransPayments.php` | `ReconcilePendingMidtransPayments` | Operasi CLI/maintenance untuk Reconcile Pending Midtrans Payments. |

## Domain/broadcast event

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Events/KuisSelesai.php` | `KuisSelesai` | Event aplikasi untuk Kuis Selesai. |
| `app/Events/StatusKelasLiveDiperbarui.php` | `StatusKelasLiveDiperbarui` | Event aplikasi untuk Status Kelas Live Diperbarui. |

## Admin controller

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Controllers/Admin/AdminAnalitikController.php` | `AdminAnalitikController` | Endpoint dan orkestrasi HTTP untuk Admin Analitik Controller. |
| `app/Http/Controllers/Admin/AdminBerandaController.php` | `AdminBerandaController` | Endpoint dan orkestrasi HTTP untuk Admin Beranda Controller. |
| `app/Http/Controllers/Admin/AdminFlashcardController.php` | `AdminFlashcardController` | Endpoint dan orkestrasi HTTP untuk Admin Flashcard Controller. |
| `app/Http/Controllers/Admin/AdminHariModulController.php` | `AdminHariModulController` | Endpoint dan orkestrasi HTTP untuk Admin Hari Modul Controller. |
| `app/Http/Controllers/Admin/AdminKosakataController.php` | `AdminKosakataController` | Endpoint dan orkestrasi HTTP untuk Admin Kosakata Controller. |
| `app/Http/Controllers/Admin/AdminKuisController.php` | `AdminKuisController` | Endpoint dan orkestrasi HTTP untuk Admin Kuis Controller. |
| `app/Http/Controllers/Admin/AdminLevelController.php` | `AdminLevelController` | Endpoint dan orkestrasi HTTP untuk Admin Level Controller. |
| `app/Http/Controllers/Admin/AdminModulController.php` | `AdminModulController` | Endpoint dan orkestrasi HTTP untuk Admin Modul Controller. |
| `app/Http/Controllers/Admin/AdminPenggunaController.php` | `AdminPenggunaController` | Endpoint dan orkestrasi HTTP untuk Admin Pengguna Controller. |
| `app/Http/Controllers/Admin/AdminPresentasiController.php` | `AdminPresentasiController` | Endpoint dan orkestrasi HTTP untuk Admin Presentasi Controller. |
| `app/Http/Controllers/Admin/AdminUnggahController.php` | `AdminUnggahController` | Endpoint dan orkestrasi HTTP untuk Admin Unggah Controller. |
| `app/Http/Controllers/Admin/RuangKelasLiveController.php` | `RuangKelasLiveController` | Endpoint dan orkestrasi HTTP untuk Ruang Kelas Live Controller. |

## Auth controller

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Controllers/Auth/KataSandiController.php` | `KataSandiController` | Endpoint dan orkestrasi HTTP untuk Kata Sandi Controller. |
| `app/Http/Controllers/Auth/KonfirmasiPasswordController.php` | `KonfirmasiPasswordController` | Endpoint dan orkestrasi HTTP untuk Konfirmasi Password Controller. |
| `app/Http/Controllers/Auth/LinkResetPasswordController.php` | `LinkResetPasswordController` | Endpoint dan orkestrasi HTTP untuk Link Reset Password Controller. |
| `app/Http/Controllers/Auth/LoginSosialController.php` | `LoginSosialController` | Endpoint dan orkestrasi HTTP untuk Login Sosial Controller. |
| `app/Http/Controllers/Auth/NotifikasiVerifikasiEmailController.php` | `NotifikasiVerifikasiEmailController` | Endpoint dan orkestrasi HTTP untuk Notifikasi Verifikasi Email Controller. |
| `app/Http/Controllers/Auth/PasswordBaruController.php` | `PasswordBaruController` | Endpoint dan orkestrasi HTTP untuk Password Baru Controller. |
| `app/Http/Controllers/Auth/PromptVerifikasiEmailController.php` | `PromptVerifikasiEmailController` | Endpoint dan orkestrasi HTTP untuk Prompt Verifikasi Email Controller. |
| `app/Http/Controllers/Auth/RegistrasiPenggunaController.php` | `RegistrasiPenggunaController` | Endpoint dan orkestrasi HTTP untuk Registrasi Pengguna Controller. |
| `app/Http/Controllers/Auth/SesiAutentikasiController.php` | `SesiAutentikasiController` | Endpoint dan orkestrasi HTTP untuk Sesi Autentikasi Controller. |
| `app/Http/Controllers/Auth/VerifikasiEmailController.php` | `VerifikasiEmailController` | Endpoint dan orkestrasi HTTP untuk Verifikasi Email Controller. |

## Shared controller

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Controllers/Controller.php` | `Controller` | Endpoint dan orkestrasi HTTP untuk Controller. |
| `app/Http/Controllers/HalamanController.php` | `HalamanController` | Endpoint dan orkestrasi HTTP untuk Halaman Controller. |
| `app/Http/Controllers/NotifikasiController.php` | `NotifikasiController` | Endpoint dan orkestrasi HTTP untuk Notifikasi Controller. |
| `app/Http/Controllers/PembayaranMidtransController.php` | `PembayaranMidtransController` | Endpoint dan orkestrasi HTTP untuk Pembayaran Midtrans Controller. |
| `app/Http/Controllers/PengarahDashboardController.php` | `PengarahDashboardController` | Endpoint dan orkestrasi HTTP untuk Pengarah Dashboard Controller. |
| `app/Http/Controllers/ProfileController.php` | `ProfileController` | Endpoint dan orkestrasi HTTP untuk Profile Controller. |
| `app/Http/Controllers/UmpanBalikProdukController.php` | `UmpanBalikProdukController` | Endpoint dan orkestrasi HTTP untuk Umpan Balik Produk Controller. |

## Superadmin controller

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Controllers/SuperAdmin/SuperAdminAktivitasController.php` | `SuperAdminAktivitasController` | Endpoint dan orkestrasi HTTP untuk Super Admin Aktivitas Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminBerandaController.php` | `SuperAdminBerandaController` | Endpoint dan orkestrasi HTTP untuk Super Admin Beranda Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminDasarController.php` | `SuperAdminDasarController` | Endpoint dan orkestrasi HTTP untuk Super Admin Dasar Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminGamifikasiController.php` | `SuperAdminGamifikasiController` | Endpoint dan orkestrasi HTTP untuk Super Admin Gamifikasi Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminKloterController.php` | `SuperAdminKloterController` | Endpoint dan orkestrasi HTTP untuk Super Admin Kloter Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminKontenController.php` | `SuperAdminKontenController` | Endpoint dan orkestrasi HTTP untuk Super Admin Konten Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminPembayaranController.php` | `SuperAdminPembayaranController` | Endpoint dan orkestrasi HTTP untuk Super Admin Pembayaran Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminPengelolaAdminController.php` | `SuperAdminPengelolaAdminController` | Endpoint dan orkestrasi HTTP untuk Super Admin Pengelola Admin Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminPenggunaController.php` | `SuperAdminPenggunaController` | Endpoint dan orkestrasi HTTP untuk Super Admin Pengguna Controller. |
| `app/Http/Controllers/SuperAdmin/SuperAdminSistemController.php` | `SuperAdminSistemController` | Endpoint dan orkestrasi HTTP untuk Super Admin Sistem Controller. |

## User controller

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Controllers/User/BerandaController.php` | `BerandaController` | Endpoint dan orkestrasi HTTP untuk Beranda Controller. |
| `app/Http/Controllers/User/BeritaController.php` | `BeritaController` | Endpoint dan orkestrasi HTTP untuk Berita Controller. |
| `app/Http/Controllers/User/FlashcardController.php` | `FlashcardController` | Endpoint dan orkestrasi HTTP untuk Flashcard Controller. |
| `app/Http/Controllers/User/ModulController.php` | `ModulController` | Endpoint dan orkestrasi HTTP untuk Modul Controller. |
| `app/Http/Controllers/User/PapanPeringkatController.php` | `PapanPeringkatController` | Endpoint dan orkestrasi HTTP untuk Papan Peringkat Controller. |
| `app/Http/Controllers/User/PembelajaranController.php` | `PembelajaranController` | Endpoint dan orkestrasi HTTP untuk Pembelajaran Controller. |
| `app/Http/Controllers/User/ProgresController.php` | `ProgresController` | Endpoint dan orkestrasi HTTP untuk Progres Controller. |
| `app/Http/Controllers/User/QuickQuizController.php` | `QuickQuizController` | Endpoint dan orkestrasi HTTP untuk Quick Quiz Controller. |
| `app/Http/Controllers/User/RuangKelasLiveController.php` | `RuangKelasLiveController` | Endpoint dan orkestrasi HTTP untuk Ruang Kelas Live Controller. |
| `app/Http/Controllers/User/SertifikatController.php` | `SertifikatController` | Endpoint dan orkestrasi HTTP untuk Sertifikat Controller. |
| `app/Http/Controllers/User/TargetUjianPenggunaController.php` | `TargetUjianPenggunaController` | Endpoint dan orkestrasi HTTP untuk Target Ujian Pengguna Controller. |
| `app/Http/Controllers/User/UmpanBalikPembelajaranController.php` | `UmpanBalikPembelajaranController` | Endpoint dan orkestrasi HTTP untuk Umpan Balik Pembelajaran Controller. |

## HTTP middleware

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Middleware/CheckRole.php` | `CheckRole` | Menyaring request berdasarkan aturan Check Role. |
| `app/Http/Middleware/HandleInertiaRequests.php` | `HandleInertiaRequests` | Menyaring request berdasarkan aturan Handle Inertia Requests. |
| `app/Http/Middleware/SearchEngineIndexing.php` | `SearchEngineIndexing` | Menyaring request berdasarkan aturan Search Engine Indexing. |
| `app/Http/Middleware/SubscriptionMiddleware.php` | `SubscriptionMiddleware` | Menyaring request berdasarkan aturan Subscription Middleware. |

## Form request

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Http/Requests/Admin/KuisRequest.php` | `KuisRequest` | Validasi request untuk Kuis Request. |
| `app/Http/Requests/Admin/ModulRequest.php` | `ModulRequest` | Validasi request untuk Modul Request. |
| `app/Http/Requests/Auth/LoginRequest.php` | `LoginRequest` | Validasi request untuk Login Request. |
| `app/Http/Requests/ProfileUpdateRequest.php` | `ProfileUpdateRequest` | Validasi request untuk Profile Update Request. |

## Event listener

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Listeners/ProsesRewardGamifikasi.php` | `ProsesRewardGamifikasi` | Menangani event terkait Proses Reward Gamifikasi. |

## Eloquent model

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Models/AnggotaKloter.php` | `AnggotaKloter` | Representasi dan relasi data Anggota Kloter. |
| `app/Models/Berita.php` | `Berita` | Representasi dan relasi data Berita. |
| `app/Models/CurriculumTrack.php` | `CurriculumTrack` | Representasi dan relasi data Curriculum Track. |
| `app/Models/DeckPresentasi.php` | `DeckPresentasi` | Representasi dan relasi data Deck Presentasi. |
| `app/Models/Flashcard.php` | `Flashcard` | Representasi dan relasi data Flashcard. |
| `app/Models/HariModul.php` | `HariModul` | Representasi dan relasi data Hari Modul. |
| `app/Models/JawabanPengerjaanKuis.php` | `JawabanPengerjaanKuis` | Representasi dan relasi data Jawaban Pengerjaan Kuis. |
| `app/Models/KloterBelajar.php` | `KloterBelajar` | Representasi dan relasi data Kloter Belajar. |
| `app/Models/KodeAkses.php` | `KodeAkses` | Representasi dan relasi data Kode Akses. |
| `app/Models/Kosakata.php` | `Kosakata` | Representasi dan relasi data Kosakata. |
| `app/Models/Kuis.php` | `Kuis` | Representasi dan relasi data Kuis. |
| `app/Models/LampiranBerita.php` | `LampiranBerita` | Representasi dan relasi data Lampiran Berita. |
| `app/Models/Langganan.php` | `Langganan` | Representasi dan relasi data Langganan. |
| `app/Models/LevelPembelajaran.php` | `LevelPembelajaran` | Representasi dan relasi data Level Pembelajaran. |
| `app/Models/LogAktivitas.php` | `LogAktivitas` | Representasi dan relasi data Log Aktivitas. |
| `app/Models/LogReward.php` | `LogReward` | Representasi dan relasi data Log Reward. |
| `app/Models/LogTransaksi.php` | `LogTransaksi` | Representasi dan relasi data Log Transaksi. |
| `app/Models/Modul.php` | `Modul` | Representasi dan relasi data Modul. |
| `app/Models/PaketPembayaran.php` | `PaketPembayaran` | Representasi dan relasi data Paket Pembayaran. |
| `app/Models/Pencapaian.php` | `Pencapaian` | Representasi dan relasi data Pencapaian. |
| `app/Models/PengaturanGamifikasi.php` | `PengaturanGamifikasi` | Representasi dan relasi data Pengaturan Gamifikasi. |
| `app/Models/PengerjaanKuis.php` | `PengerjaanKuis` | Representasi dan relasi data Pengerjaan Kuis. |
| `app/Models/Pengguna.php` | `Pengguna` | Representasi dan relasi data Pengguna. |
| `app/Models/PenukaranKodeAkses.php` | `PenukaranKodeAkses` | Representasi dan relasi data Penukaran Kode Akses. |
| `app/Models/PesertaKelasLive.php` | `PesertaKelasLive` | Representasi dan relasi data Peserta Kelas Live. |
| `app/Models/ProgramPembelajaran.php` | `ProgramPembelajaran` | Representasi dan relasi data Program Pembelajaran. |
| `app/Models/Progres.php` | `Progres` | Representasi dan relasi data Progres. |
| `app/Models/ProgresHariModul.php` | `ProgresHariModul` | Representasi dan relasi data Progres Hari Modul. |
| `app/Models/ReviewFlashcard.php` | `ReviewFlashcard` | Representasi dan relasi data Review Flashcard. |
| `app/Models/ReviewSoal.php` | `ReviewSoal` | Representasi dan relasi data Review Soal. |
| `app/Models/RiwayatLogin.php` | `RiwayatLogin` | Representasi dan relasi data Riwayat Login. |
| `app/Models/RiwayatStatusPengguna.php` | `RiwayatStatusPengguna` | Representasi dan relasi data Riwayat Status Pengguna. |
| `app/Models/Sertifikat.php` | `Sertifikat` | Representasi dan relasi data Sertifikat. |
| `app/Models/SesiKelasLive.php` | `SesiKelasLive` | Representasi dan relasi data Sesi Kelas Live. |
| `app/Models/SetFlashcard.php` | `SetFlashcard` | Representasi dan relasi data Set Flashcard. |
| `app/Models/SlidePresentasi.php` | `SlidePresentasi` | Representasi dan relasi data Slide Presentasi. |
| `app/Models/Soal.php` | `Soal` | Representasi dan relasi data Soal. |
| `app/Models/TargetUjianPengguna.php` | `TargetUjianPengguna` | Representasi dan relasi data Target Ujian Pengguna. |
| `app/Models/Transaksi.php` | `Transaksi` | Representasi dan relasi data Transaksi. |
| `app/Models/UmpanBalikPembelajaran.php` | `UmpanBalikPembelajaran` | Representasi dan relasi data Umpan Balik Pembelajaran. |
| `app/Models/UmpanBalikProduk.php` | `UmpanBalikProduk` | Representasi dan relasi data Umpan Balik Produk. |

## Notification channel

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Notifications/Channels/MailtrapTemplateChannel.php` | `MailtrapTemplateChannel` | Mengirim notifikasi melalui channel Mailtrap Template Channel. |

## Notification

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Notifications/EmailVerificationNotification.php` | `EmailVerificationNotification` | Membangun notifikasi Email Verification Notification. |
| `app/Notifications/NotifikasiPengguna.php` | `NotifikasiPengguna` | Membangun notifikasi Notifikasi Pengguna. |
| `app/Notifications/PasswordResetOtpNotification.php` | `PasswordResetOtpNotification` | Membangun notifikasi Password Reset Otp Notification. |
| `app/Notifications/PurchaseReceiptNotification.php` | `PurchaseReceiptNotification` | Membangun notifikasi Purchase Receipt Notification. |

## Service provider

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Providers/AppServiceProvider.php` | `AppServiceProvider` | Registrasi/bootstrap layanan App Service Provider. |
| `app/Providers/ReverbServiceProvider.php` | `ReverbServiceProvider` | Registrasi/bootstrap layanan Reverb Service Provider. |

## Domain service

| File | Symbol utama | Tanggung jawab |
|---|---|---|
| `app/Services/AccountDeletionService.php` | `AccountDeletionService` | Aturan domain dan proses reusable untuk Account Deletion Service. |
| `app/Services/AccountSuspensionService.php` | `AccountSuspensionService` | Aturan domain dan proses reusable untuk Account Suspension Service. |
| `app/Services/AksesFlashcardPenggunaService.php` | `AksesFlashcardPenggunaService` | Aturan domain dan proses reusable untuk Akses Flashcard Pengguna Service. |
| `app/Services/AksesKuisPenggunaService.php` | `AksesKuisPenggunaService` | Aturan domain dan proses reusable untuk Akses Kuis Pengguna Service. |
| `app/Services/AksesLanggananService.php` | `AksesLanggananService` | Aturan domain dan proses reusable untuk Akses Langganan Service. |
| `app/Services/AksesPremiumService.php` | `AksesPremiumService` | Aturan domain dan proses reusable untuk Akses Premium Service. |
| `app/Services/BersihkanImportPresentasiService.php` | `BersihkanImportPresentasiService` | Aturan domain dan proses reusable untuk Bersihkan Import Presentasi Service. |
| `app/Services/ChartDataService.php` | `ChartDataService` | Aturan domain dan proses reusable untuk Chart Data Service. |
| `app/Services/GamifikasiConfigService.php` | `GamifikasiConfigService` | Aturan domain dan proses reusable untuk Gamifikasi Config Service. |
| `app/Services/HtmlSanitizerService.php` | `HtmlSanitizerService` | Aturan domain dan proses reusable untuk Html Sanitizer Service. |
| `app/Services/ImportPresentasiGambarService.php` | `ImportPresentasiGambarService` | Aturan domain dan proses reusable untuk Import Presentasi Gambar Service. |
| `app/Services/ImportPresentasiPdfService.php` | `ImportPresentasiPdfService` | Aturan domain dan proses reusable untuk Import Presentasi Pdf Service. |
| `app/Services/ImportPresentasiPptxService.php` | `ImportPresentasiPptxService` | Aturan domain dan proses reusable untuk Import Presentasi Pptx Service. |
| `app/Services/ImportSpreadsheetService.php` | `ImportSpreadsheetService` | Aturan domain dan proses reusable untuk Import Spreadsheet Service. |
| `app/Services/KelasPenggunaPayloadService.php` | `KelasPenggunaPayloadService` | Aturan domain dan proses reusable untuk Kelas Pengguna Payload Service. |
| `app/Services/KloterBelajarService.php` | `KloterBelajarService` | Aturan domain dan proses reusable untuk Kloter Belajar Service. |
| `app/Services/LeaderboardService.php` | `LeaderboardService` | Aturan domain dan proses reusable untuk Leaderboard Service. |
| `app/Services/MailtrapTemplateService.php` | `MailtrapTemplateService` | Aturan domain dan proses reusable untuk Mailtrap Template Service. |
| `app/Services/NotifikasiPenggunaService.php` | `NotifikasiPenggunaService` | Aturan domain dan proses reusable untuk Notifikasi Pengguna Service. |
| `app/Services/PasswordResetOtpService.php` | `PasswordResetOtpService` | Aturan domain dan proses reusable untuk Password Reset Otp Service. |
| `app/Services/PembelajaranPenggunaService.php` | `PembelajaranPenggunaService` | Aturan domain dan proses reusable untuk Pembelajaran Pengguna Service. |
| `app/Services/PencapaianService.php` | `PencapaianService` | Aturan domain dan proses reusable untuk Pencapaian Service. |
| `app/Services/PenilaianJawabanKuisService.php` | `PenilaianJawabanKuisService` | Aturan domain dan proses reusable untuk Penilaian Jawaban Kuis Service. |
| `app/Services/PresentasiStorageService.php` | `PresentasiStorageService` | Aturan domain dan proses reusable untuk Presentasi Storage Service. |
| `app/Services/ProgresRoadmapService.php` | `ProgresRoadmapService` | Aturan domain dan proses reusable untuk Progres Roadmap Service. |
| `app/Services/QuickQuizSessionService.php` | `QuickQuizSessionService` | Aturan domain dan proses reusable untuk Quick Quiz Session Service. |
| `app/Services/RepetisiPembelajaranService.php` | `RepetisiPembelajaranService` | Aturan domain dan proses reusable untuk Repetisi Pembelajaran Service. |
| `app/Services/RingkasanProgresPenggunaService.php` | `RingkasanProgresPenggunaService` | Aturan domain dan proses reusable untuk Ringkasan Progres Pengguna Service. |
| `app/Services/RuangKelasLiveService.php` | `RuangKelasLiveService` | Aturan domain dan proses reusable untuk Ruang Kelas Live Service. |
| `app/Services/SertifikatService.php` | `SertifikatService` | Aturan domain dan proses reusable untuk Sertifikat Service. |
| `app/Services/SoalKuisService.php` | `SoalKuisService` | Aturan domain dan proses reusable untuk Soal Kuis Service. |
| `app/Services/StreakService.php` | `StreakService` | Aturan domain dan proses reusable untuk Streak Service. |
| `app/Services/TemplateExcelService.php` | `TemplateExcelService` | Aturan domain dan proses reusable untuk Template Excel Service. |
| `app/Services/XpService.php` | `XpService` | Aturan domain dan proses reusable untuk Xp Service. |

## Catatan Pemeliharaan

- Controller harus tipis; aturan lintas endpoint ditempatkan di service.
- Model menyimpan relasi/cast dan helper data, bukan orkestrasi HTTP.
- Route-model binding tetap memerlukan authorization eksplisit.
- File baru wajib masuk katalog dengan menjalankan generator ini.
