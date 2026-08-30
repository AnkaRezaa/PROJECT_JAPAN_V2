# Katalog Database dan Test

> Dibangkitkan oleh `scripts/generate-code-reference.ps1`. Migration, factory, seeder, dan seluruh test tercantum di bawah.

Total file database dan test: 123.

## Test bootstrap/config

| File | Symbol utama | Tujuan |
|---|---|---|
| `database/.gitignore` | `-` | Bootstrap atau konfigurasi test: . |
| `tests/Pest.php` | `-` | Bootstrap atau konfigurasi test: Pest. |
| `tests/TestCase.php` | `TestCase` | Bootstrap atau konfigurasi test: Test Case. |

## Factory

| File | Symbol utama | Tujuan |
|---|---|---|
| `database/factories/PenggunaFactory.php` | `PenggunaFactory` | Factory data test: Pengguna Factory. |

## Migration

| File | Symbol utama | Tujuan |
|---|---|---|
| `database/migrations/0001_01_01_000000_create_users_table.php` | `-` | Perubahan skema/data: 0001 01 01 000000 create users table. |
| `database/migrations/0001_01_01_000001_create_cache_table.php` | `-` | Perubahan skema/data: 0001 01 01 000001 create cache table. |
| `database/migrations/0001_01_01_000002_create_jobs_table.php` | `-` | Perubahan skema/data: 0001 01 01 000002 create jobs table. |
| `database/migrations/2026_02_19_140711_create_level_pembelajaran_table.php` | `-` | Perubahan skema/data: 2026 02 19 140711 create level pembelajaran table. |
| `database/migrations/2026_02_19_140723_create_modul_table.php` | `-` | Perubahan skema/data: 2026 02 19 140723 create modul table. |
| `database/migrations/2026_02_19_140743_create_materi_table.php` | `-` | Perubahan skema/data: 2026 02 19 140743 create materi table. |
| `database/migrations/2026_02_19_140806_create_kuis_table.php` | `-` | Perubahan skema/data: 2026 02 19 140806 create kuis table. |
| `database/migrations/2026_02_19_140824_create_soal_table.php` | `-` | Perubahan skema/data: 2026 02 19 140824 create soal table. |
| `database/migrations/2026_02_19_140838_create_pengerjaan_kuis_table.php` | `-` | Perubahan skema/data: 2026 02 19 140838 create pengerjaan kuis table. |
| `database/migrations/2026_02_19_140859_create_progres_belajar_table.php` | `-` | Perubahan skema/data: 2026 02 19 140859 create progres belajar table. |
| `database/migrations/2026_02_19_143213_add_kolom_gamifikasi_to_users_table.php` | `-` | Perubahan skema/data: 2026 02 19 143213 add kolom gamifikasi to users table. |
| `database/migrations/2026_03_17_000001_create_sertifikat_table.php` | `-` | Perubahan skema/data: 2026 03 17 000001 create sertifikat table. |
| `database/migrations/2026_03_17_000002_create_pencapaian_table.php` | `-` | Perubahan skema/data: 2026 03 17 000002 create pencapaian table. |
| `database/migrations/2026_03_17_000003_create_pencapaian_pengguna_table.php` | `-` | Perubahan skema/data: 2026 03 17 000003 create pencapaian pengguna table. |
| `database/migrations/2026_04_03_000001_add_kolom_konten_pembelajaran_table.php` | `-` | Perubahan skema/data: 2026 04 03 000001 add kolom konten pembelajaran table. |
| `database/migrations/2026_04_03_194100_add_media_to_materi_table.php` | `-` | Perubahan skema/data: 2026 04 03 194100 add media to materi table. |
| `database/migrations/2026_04_18_162430_create_log_reward_table.php` | `-` | Perubahan skema/data: 2026 04 18 162430 create log reward table. |
| `database/migrations/2026_04_25_000001_create_pengumuman_table.php` | `-` | Perubahan skema/data: 2026 04 25 000001 create pengumuman table. |
| `database/migrations/2026_04_25_000002_create_log_aktivitas_table.php` | `-` | Perubahan skema/data: 2026 04 25 000002 create log aktivitas table. |
| `database/migrations/2026_04_25_000003_create_riwayat_login_table.php` | `-` | Perubahan skema/data: 2026 04 25 000003 create riwayat login table. |
| `database/migrations/2026_04_25_000004_add_status_to_users_table.php` | `-` | Perubahan skema/data: 2026 04 25 000004 add status to users table. |
| `database/migrations/2026_04_25_000005_create_riwayat_status_pengguna_table.php` | `-` | Perubahan skema/data: 2026 04 25 000005 create riwayat status pengguna table. |
| `database/migrations/2026_04_25_000006_rename_pengumuman_to_berita_table.php` | `-` | Perubahan skema/data: 2026 04 25 000006 rename pengumuman to berita table. |
| `database/migrations/2026_04_25_164131_add_is_premium_to_level_table.php` | `-` | Perubahan skema/data: 2026 04 25 164131 add is premium to level table. |
| `database/migrations/2026_04_26_000008_create_lampiran_berita_table.php` | `-` | Perubahan skema/data: 2026 04 26 000008 create lampiran berita table. |
| `database/migrations/2026_04_26_000009_create_tabel_pembayaran_table.php` | `-` | Perubahan skema/data: 2026 04 26 000009 create tabel pembayaran table. |
| `database/migrations/2026_04_26_100823_create_notifikasi_table.php` | `-` | Perubahan skema/data: 2026 04 26 100823 create notifikasi table. |
| `database/migrations/2026_04_27_000010_add_status_publish_to_konten_pembelajaran.php` | `-` | Perubahan skema/data: 2026 04 27 000010 add status publish to konten pembelajaran. |
| `database/migrations/2026_04_27_000011_create_jawaban_pengerjaan_kuis_table.php` | `-` | Perubahan skema/data: 2026 04 27 000011 create jawaban pengerjaan kuis table. |
| `database/migrations/2026_04_27_000012_create_bank_kanji_table.php` | `-` | Perubahan skema/data: 2026 04 27 000012 create bank kanji table. |
| `database/migrations/2026_04_27_000013_create_pengaturan_aplikasi_table.php` | `-` | Perubahan skema/data: 2026 04 27 000013 create pengaturan aplikasi table. |
| `database/migrations/2026_04_27_000014_add_social_auth_to_users_table.php` | `-` | Perubahan skema/data: 2026 04 27 000014 add social auth to users table. |
| `database/migrations/2026_04_27_000015_add_tipe_to_soal_table.php` | `-` | Perubahan skema/data: 2026 04 27 000015 add tipe to soal table. |
| `database/migrations/2026_04_27_000016_create_kode_akses_table.php` | `-` | Perubahan skema/data: 2026 04 27 000016 create kode akses table. |
| `database/migrations/2026_06_01_000001_create_kosakata_flashcard_table.php` | `-` | Perubahan skema/data: 2026 06 01 000001 create kosakata flashcard table. |
| `database/migrations/2026_06_01_000002_create_presentasi_table.php` | `-` | Perubahan skema/data: 2026 06 01 000002 create presentasi table. |
| `database/migrations/2026_06_05_000001_create_board_ajar_table.php` | `-` | Perubahan skema/data: 2026 06 05 000001 create board ajar table. |
| `database/migrations/2026_06_08_000001_integrate_board_to_presentasi.php` | `-` | Perubahan skema/data: 2026 06 08 000001 integrate board to presentasi. |
| `database/migrations/2026_06_29_141600_add_free_access_until_to_users_table.php` | `-` | Perubahan skema/data: 2026 06 29 141600 add free access until to users table. |
| `database/migrations/2026_06_29_154938_drop_free_access_until_from_users_table.php` | `-` | Perubahan skema/data: 2026 06 29 154938 drop free access until from users table. |
| `database/migrations/2026_06_30_000001_connect_quizzes_directly_to_modules.php` | `-` | Perubahan skema/data: 2026 06 30 000001 connect quizzes directly to modules. |
| `database/migrations/2026_06_30_000002_add_repetition_tracking.php` | `-` | Perubahan skema/data: 2026 06 30 000002 add repetition tracking. |
| `database/migrations/2026_07_01_000001_create_program_pembelajaran_table.php` | `-` | Perubahan skema/data: 2026 07 01 000001 create program pembelajaran table. |
| `database/migrations/2026_07_06_000001_add_instructor_name_to_program_pembelajaran_table.php` | `-` | Perubahan skema/data: 2026 07 06 000001 add instructor name to program pembelajaran table. |
| `database/migrations/2026_07_06_000002_add_scope_to_payment_access_tables.php` | `-` | Perubahan skema/data: 2026 07 06 000002 add scope to payment access tables. |
| `database/migrations/2026_07_07_000001_cleanup_lessons_and_kanji_bank.php` | `-` | Perubahan skema/data: 2026 07 07 000001 cleanup lessons and kanji bank. |
| `database/migrations/2026_07_08_000001_add_import_metadata_to_presentations.php` | `-` | Perubahan skema/data: 2026 07 08 000001 add import metadata to presentations. |
| `database/migrations/2026_07_08_000002_move_board_ajar_to_presentation_jamboard.php` | `-` | Perubahan skema/data: 2026 07 08 000002 move board ajar to presentation jamboard. |
| `database/migrations/2026_07_09_000001_create_kloter_belajar_table.php` | `-` | Perubahan skema/data: 2026 07 09 000001 create kloter belajar table. |
| `database/migrations/2026_07_09_000002_add_operational_fields_to_kloter_belajar_table.php` | `-` | Perubahan skema/data: 2026 07 09 000002 add operational fields to kloter belajar table. |
| `database/migrations/2026_07_09_000003_add_passing_score_to_quizzes_table.php` | `-` | Perubahan skema/data: 2026 07 09 000003 add passing score to quizzes table. |
| `database/migrations/2026_07_10_000001_create_gamification_settings_table.php` | `-` | Perubahan skema/data: 2026 07 10 000001 create gamification settings table. |
| `database/migrations/2026_07_10_000002_add_indexes_to_activity_and_login_logs.php` | `-` | Perubahan skema/data: 2026 07 10 000002 add indexes to activity and login logs. |
| `database/migrations/2026_07_13_150000_deduplicate_reward_logs_and_add_unique_constraint.php` | `-` | Perubahan skema/data: 2026 07 13 150000 deduplicate reward logs and add unique constraint. |
| `database/migrations/2026_07_15_000001_add_portal_fields_to_news_table.php` | `-` | Perubahan skema/data: 2026 07 15 000001 add portal fields to news table. |
| `database/migrations/2026_07_15_000001_extend_vocabulary_bank_for_n3_content.php` | `-` | Perubahan skema/data: 2026 07 15 000001 extend vocabulary bank for n3 content. |
| `database/migrations/2026_07_15_100000_harden_midtrans_checkout_idempotency.php` | `-` | Perubahan skema/data: 2026 07 15 100000 harden midtrans checkout idempotency. |
| `database/migrations/2026_07_16_090000_add_period_lookup_index_to_reward_logs_table.php` | `-` | Perubahan skema/data: 2026 07 16 090000 add period lookup index to reward logs table. |
| `database/migrations/2026_07_16_091000_add_leaderboard_order_index_to_users_table.php` | `-` | Perubahan skema/data: 2026 07 16 091000 add leaderboard order index to users table. |
| `database/migrations/2026_07_17_100000_add_password_login_enabled_to_users_table.php` | `-` | Perubahan skema/data: 2026 07 17 100000 add password login enabled to users table. |
| `database/migrations/2026_07_22_000001_add_admin_scope_to_users_table.php` | `-` | Perubahan skema/data: 2026 07 22 000001 add admin scope to users table. |
| `database/migrations/2026_07_23_000001_add_days_to_learning_roadmap.php` | `-` | Perubahan skema/data: 2026 07 23 000001 add days to learning roadmap. |
| `database/migrations/2026_07_27_000001_finalize_weekly_learning_flow.php` | `-` | Perubahan skema/data: 2026 07 27 000001 finalize weekly learning flow. |
| `database/migrations/2026_07_28_000001_support_multiple_weekly_exams.php` | `-` | Perubahan skema/data: 2026 07 28 000001 support multiple weekly exams. |
| `database/migrations/2026_07_28_000002_add_sort_order_to_presentation_decks.php` | `-` | Perubahan skema/data: 2026 07 28 000002 add sort order to presentation decks. |
| `database/migrations/2026_07_30_120000_create_learning_feedback_table.php` | `-` | Perubahan skema/data: 2026 07 30 120000 create learning feedback table. |
| `database/migrations/2026_07_30_180000_create_user_exam_targets_table.php` | `-` | Perubahan skema/data: 2026 07 30 180000 create user exam targets table. |
| `database/migrations/2026_08_02_170000_create_live_class_tables.php` | `-` | Perubahan skema/data: 2026 08 02 170000 create live class tables. |
| `database/migrations/2026_08_12_000001_add_scheduled_at_to_live_class_sessions_table.php` | `-` | Perubahan skema/data: 2026 08 12 000001 add scheduled at to live class sessions table. |
| `database/migrations/2026_08_14_000001_add_audience_scope_to_presentation_decks.php` | `-` | Perubahan skema/data: 2026 08 14 000001 add audience scope to presentation decks. |
| `database/migrations/2026_08_22_000001_add_curriculum_tracks.php` | `-` | Perubahan skema/data: 2026 08 22 000001 add curriculum tracks. |
| `database/migrations/2026_08_27_000001_add_learning_preferences_and_retention_to_users.php` | `-` | Perubahan skema/data: 2026 08 27 000001 add learning preferences and retention to users. |
| `database/migrations/2026_08_27_000002_add_reading_blocks_to_news.php` | `-` | Perubahan skema/data: 2026 08 27 000002 add reading blocks to news. |
| `database/migrations/2026_08_27_000003_add_reading_fields_to_questions.php` | `-` | Perubahan skema/data: 2026 08 27 000003 add reading fields to questions. |
| `database/migrations/2026_08_27_000004_create_product_feedback_table.php` | `-` | Perubahan skema/data: 2026 08 27 000004 create product feedback table. |

## Seeder

| File | Symbol utama | Tujuan |
|---|---|---|
| `database/seeders/AchievementSeeder.php` | `AchievementSeeder` | Mengisi data referensi/demo: Achievement Seeder. |
| `database/seeders/DatabaseSeeder.php` | `DatabaseSeeder` | Mengisi data referensi/demo: Database Seeder. |
| `database/seeders/DemoDataSeeder.php` | `DemoDataSeeder` | Mengisi data referensi/demo: Demo Data Seeder. |
| `database/seeders/KelasDemoSeeder.php` | `KelasDemoSeeder` | Mengisi data referensi/demo: Kelas Demo Seeder. |
| `database/seeders/KloterDemoSeeder.php` | `KloterDemoSeeder` | Mengisi data referensi/demo: Kloter Demo Seeder. |
| `database/seeders/NewsPortalSeeder.php` | `NewsPortalSeeder` | Mengisi data referensi/demo: News Portal Seeder. |
| `database/seeders/PenggunaSeeder.php` | `PenggunaSeeder` | Mengisi data referensi/demo: Pengguna Seeder. |
| `database/seeders/ProgramPaymentPlanSeeder.php` | `ProgramPaymentPlanSeeder` | Mengisi data referensi/demo: Program Payment Plan Seeder. |

## Feature test

| File | Symbol utama | Tujuan |
|---|---|---|
| `tests/Feature/AccountRetentionAndPreferencesTest.php` | `-` | Regresi HTTP/domain: Account Retention And Preferences Test. |
| `tests/Feature/AdminGlobalKloterTest.php` | `-` | Regresi HTTP/domain: Admin Global Kloter Test. |
| `tests/Feature/AdminLegacyContentRoutesTest.php` | `-` | Regresi HTTP/domain: Admin Legacy Content Routes Test. |
| `tests/Feature/Auth/AuthenticationTest.php` | `-` | Regresi HTTP/domain: Authentication Test. |
| `tests/Feature/Auth/EmailVerificationTest.php` | `-` | Regresi HTTP/domain: Email Verification Test. |
| `tests/Feature/Auth/GoogleAuthenticationTest.php` | `-` | Regresi HTTP/domain: Google Authentication Test. |
| `tests/Feature/Auth/PasswordConfirmationTest.php` | `-` | Regresi HTTP/domain: Password Confirmation Test. |
| `tests/Feature/Auth/PasswordResetTest.php` | `-` | Regresi HTTP/domain: Password Reset Test. |
| `tests/Feature/Auth/PasswordUpdateTest.php` | `-` | Regresi HTTP/domain: Password Update Test. |
| `tests/Feature/Auth/RegistrationTest.php` | `-` | Regresi HTTP/domain: Registration Test. |
| `tests/Feature/DemoSeederTest.php` | `-` | Regresi HTTP/domain: Demo Seeder Test. |
| `tests/Feature/ErrorPageTest.php` | `-` | Regresi HTTP/domain: Error Page Test. |
| `tests/Feature/ExampleTest.php` | `-` | Regresi HTTP/domain: Example Test. |
| `tests/Feature/HandwritingFlashcardFlowTest.php` | `-` | Regresi HTTP/domain: Handwriting Flashcard Flow Test. |
| `tests/Feature/LeaderboardAndProgressTest.php` | `-` | Regresi HTTP/domain: Leaderboard And Progress Test. |
| `tests/Feature/LearningFeedbackTest.php` | `-` | Regresi HTTP/domain: Learning Feedback Test. |
| `tests/Feature/LearningRoadmapDayTest.php` | `-` | Regresi HTTP/domain: Learning Roadmap Day Test. |
| `tests/Feature/LiveClassRoadmapTest.php` | `-` | Regresi HTTP/domain: Live Class Roadmap Test. |
| `tests/Feature/MultiCurriculumTest.php` | `-` | Regresi HTTP/domain: Multi Curriculum Test. |
| `tests/Feature/NewsPortalTest.php` | `-` | Regresi HTTP/domain: News Portal Test. |
| `tests/Feature/NotificationInboxTest.php` | `-` | Regresi HTTP/domain: Notification Inbox Test. |
| `tests/Feature/ProductFeedbackTest.php` | `-` | Regresi HTTP/domain: Product Feedback Test. |
| `tests/Feature/ProfileTest.php` | `-` | Regresi HTTP/domain: Profile Test. |
| `tests/Feature/PublicLegalPagesTest.php` | `-` | Regresi HTTP/domain: Public Legal Pages Test. |
| `tests/Feature/PublicSeoTest.php` | `-` | Regresi HTTP/domain: Public Seo Test. |
| `tests/Feature/QuickQuizTest.php` | `-` | Regresi HTTP/domain: Quick Quiz Test. |
| `tests/Feature/RepetisiPembelajaranTest.php` | `-` | Regresi HTTP/domain: Repetisi Pembelajaran Test. |
| `tests/Feature/SecurityHardeningTest.php` | `-` | Regresi HTTP/domain: Security Hardening Test. |
| `tests/Feature/SuperAdminDashboardTest.php` | `-` | Regresi HTTP/domain: Super Admin Dashboard Test. |
| `tests/Feature/SuperAdminGamifikasiTest.php` | `-` | Regresi HTTP/domain: Super Admin Gamifikasi Test. |
| `tests/Feature/UserDashboardAccessTest.php` | `-` | Regresi HTTP/domain: User Dashboard Access Test. |
| `tests/Feature/UserExamTargetTest.php` | `UserExamTargetTest` | Regresi HTTP/domain: User Exam Target Test. |

## Unit test

| File | Symbol utama | Tujuan |
|---|---|---|
| `tests/Unit/ChartDataServiceTest.php` | `ChartDataServiceTest` | Unit test: Chart Data Service Test. |
| `tests/Unit/ExampleTest.php` | `-` | Unit test: Example Test. |
| `tests/Unit/InertiaPageIntegrityTest.php` | `-` | Unit test: Inertia Page Integrity Test. |
| `tests/Unit/SoalKuisHandwritingTest.php` | `SoalKuisHandwritingTest` | Unit test: Soal Kuis Handwriting Test. |

## Aturan

- Jangan mengubah migration yang sudah dijalankan production tanpa rencana kompatibilitas.
- Seeder demo tidak otomatis aman untuk production; baca implementasinya sebelum menjalankan.
- Test yang timed out atau dilewati tidak boleh dilaporkan sebagai lulus.
