# Katalog File Frontend dan Resources

> Dibangkitkan oleh `scripts/generate-code-reference.ps1`. Semua JS, JSX, CSS, Blade, dan source image di `resources/` tercantum di bawah.

Total file dalam `resources/`: 158.

## Stylesheet

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/css/app.css` | `-` | Style global Tailwind dan aturan visual aplikasi. |

## Source image

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/Images/bahasa-jepang-guru-1.jpg` | `-` | Asset gambar sumber untuk bahasa jepang guru 1. |
| `resources/Images/bahasa-jepangnya-guru.jpg` | `-` | Asset gambar sumber untuk bahasa jepangnya guru. |
| `resources/Images/japannese_student.jpg` | `-` | Asset gambar sumber untuk japannese student. |
| `resources/Images/Mount-Fuji-New.jpg` | `-` | Asset gambar sumber untuk Mount Fuji New. |

## Inertia entrypoint

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/app.jsx` | `seoSiteName` | Bootstrap React/Inertia, resolver halaman, dan provider aplikasi. |

## HTTP bootstrap

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/bootstrap.js` | `-` | Konfigurasi Axios dan header request aplikasi. |

## Shared component

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/Admin/LearningResourceCreateDialog.jsx` | `LearningResourceCreateDialog` | Komponen/resource untuk Learning Resource Create Dialog. |
| `resources/js/Components/Admin/ModuleDayDialog.jsx` | `ModuleDayDialog` | Komponen/resource untuk Module Day Dialog. |
| `resources/js/Components/ApplicationLogo.jsx` | `ApplicationLogo` | Komponen/resource untuk Application Logo. |
| `resources/js/Components/Gamification/LeagueIcon.jsx` | `LeagueIcon` | Komponen/resource untuk League Icon. |
| `resources/js/Components/JapaneseIcons.jsx` | `SakuraIcon` | Komponen/resource untuk Japanese Icons. |
| `resources/js/Components/Marketing/WhatsAppContact.jsx` | `WhatsAppContact` | Komponen/resource untuk Whats App Contact. |
| `resources/js/Components/Modal.jsx` | `Modal` | Komponen/resource untuk Modal. |
| `resources/js/Components/NavLink.jsx` | `NavLink` | Komponen/resource untuk Nav Link. |
| `resources/js/Components/ResponsiveNavLink.jsx` | `ResponsiveNavLink` | Komponen/resource untuk Responsive Nav Link. |
| `resources/js/Components/SEO/SeoHead.jsx` | `SeoHead` | Komponen/resource untuk Seo Head. |
| `resources/js/Components/theme/FallEffect.js` | `-` | Komponen/resource untuk Fall Effect. |
| `resources/js/Components/theme/FallEffect.jsx` | `FallEffect` | Komponen/resource untuk Fall Effect. |
| `resources/js/Components/theme/themes.js` | `DEFAULT_THEME` | Komponen/resource untuk themes. |
| `resources/js/Components/User/UserVisuals.jsx` | `SeasonalScene` | Komponen/resource untuk User Visuals. |

## Breeze primitive

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/Breeze/Checkbox.jsx` | `Checkbox` | Primitive bawaan/warisan Breeze untuk Checkbox; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/DangerButton.jsx` | `DangerButton` | Primitive bawaan/warisan Breeze untuk Danger Button; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/Dropdown.jsx` | `DropDownContext` | Primitive bawaan/warisan Breeze untuk Dropdown; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/InputError.jsx` | `InputError` | Primitive bawaan/warisan Breeze untuk Input Error; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/InputLabel.jsx` | `InputLabel` | Primitive bawaan/warisan Breeze untuk Input Label; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/PrimaryButton.jsx` | `PrimaryButton` | Primitive bawaan/warisan Breeze untuk Primary Button; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/SecondaryButton.jsx` | `SecondaryButton` | Primitive bawaan/warisan Breeze untuk Secondary Button; audit pemakaian sebelum dihapus. |
| `resources/js/Components/Breeze/TextInput.jsx` | `TextInput` | Primitive bawaan/warisan Breeze untuk Text Input; audit pemakaian sebelum dihapus. |

## Feature component

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/Features/Admin/KloterFilter.jsx` | `KloterFilter` | Komponen fitur reusable untuk Kloter Filter. |
| `resources/js/Components/Features/Board/BoardCanvas.jsx` | `BoardCanvas` | Komponen fitur reusable untuk Board Canvas. |
| `resources/js/Components/Features/Board/EditableBoardCanvas.jsx` | `EditableBoardCanvas` | Komponen fitur reusable untuk Editable Board Canvas. |
| `resources/js/Components/Features/Certificate/CertificateTemplate.jsx` | `CertificateTemplate` | Komponen fitur reusable untuk Certificate Template. |
| `resources/js/Components/Features/Dashboard/ChartCard.jsx` | `ChartCard` | Komponen fitur reusable untuk Chart Card. |
| `resources/js/Components/Features/Dashboard/ChartPeriodSelect.jsx` | `ChartPeriodSelect` | Komponen fitur reusable untuk Chart Period Select. |
| `resources/js/Components/Features/Dashboard/RecentActivity.jsx` | `RecentActivity` | Komponen fitur reusable untuk Recent Activity. |
| `resources/js/Components/Features/Dashboard/StatCard.jsx` | `StatCard` | Komponen fitur reusable untuk Stat Card. |
| `resources/js/Components/Features/Dashboard/StreakWidget.jsx` | `StreakWidget` | Komponen fitur reusable untuk Streak Widget. |
| `resources/js/Components/Features/Editor/NewsEditor.jsx` | `NewsEditor` | Komponen fitur reusable untuk News Editor. |
| `resources/js/Components/Features/Editor/QuillEditor.jsx` | `QuillEditor` | Komponen fitur reusable untuk Quill Editor. |
| `resources/js/Components/Features/Feedback/ProductFeedbackButton.jsx` | `ProductFeedbackButton` | Komponen fitur reusable untuk Product Feedback Button. |
| `resources/js/Components/Features/Form/Checkbox.jsx` | `Checkbox` | Komponen fitur reusable untuk Checkbox. |
| `resources/js/Components/Features/Form/FileUpload.jsx` | `FileUpload` | Komponen fitur reusable untuk File Upload. |
| `resources/js/Components/Features/Form/FormSection.jsx` | `FormSection` | Komponen fitur reusable untuk Form Section. |
| `resources/js/Components/Features/Form/RadioGroup.jsx` | `RadioGroup` | Komponen fitur reusable untuk Radio Group. |
| `resources/js/Components/Features/Form/SelectInput.jsx` | `SelectInput` | Komponen fitur reusable untuk Select Input. |
| `resources/js/Components/Features/Form/TextInput.jsx` | `TextInput` | Komponen fitur reusable untuk Text Input. |
| `resources/js/Components/Features/Handwriting/HandwritingFlashcardWorkspace.jsx` | `HandwritingFlashcardWorkspace` | Komponen fitur reusable untuk Handwriting Flashcard Workspace. |
| `resources/js/Components/Features/Handwriting/KanjiHandwritingCanvas.jsx` | `KanjiHandwritingCanvas` | Komponen fitur reusable untuk Kanji Handwriting Canvas. |
| `resources/js/Components/Features/Handwriting/StrokeCharacterPreview.jsx` | `StrokeCharacterPreview` | Komponen fitur reusable untuk Stroke Character Preview. |
| `resources/js/Components/Features/Handwriting/strokeData.js` | `strokeCache` | Komponen fitur reusable untuk stroke Data. |
| `resources/js/Components/Features/Learning/CertificateCard.jsx` | `CertificateCard` | Komponen fitur reusable untuk Certificate Card. |
| `resources/js/Components/Features/Learning/HighlightedLearningText.jsx` | `HighlightedLearningText` | Komponen fitur reusable untuk Highlighted Learning Text. |
| `resources/js/Components/Features/Learning/JapaneseReading.jsx` | `JapaneseReading` | Komponen fitur reusable untuk Japanese Reading. |
| `resources/js/Components/Features/Learning/LeaderboardItem.jsx` | `LeaderboardItem` | Komponen fitur reusable untuk Leaderboard Item. |
| `resources/js/Components/Features/Learning/LessonCard.jsx` | `LessonCard` | Komponen fitur reusable untuk Lesson Card. |
| `resources/js/Components/Features/Learning/LevelBadge.jsx` | `LevelBadge` | Komponen fitur reusable untuk Level Badge. |
| `resources/js/Components/Features/Learning/QuizQuestion.jsx` | `QuizQuestion` | Komponen fitur reusable untuk Quiz Question. |
| `resources/js/Components/Features/Learning/XPBar.jsx` | `XPBar` | Komponen fitur reusable untuk XPBar. |
| `resources/js/Components/Features/Lesson/LessonArticle.jsx` | `LessonArticle` | Komponen fitur reusable untuk Lesson Article. |
| `resources/js/Components/Features/News/ArticleBody.jsx` | `ArticleBody` | Komponen fitur reusable untuk Article Body. |
| `resources/js/Components/Features/Presentation/EmbedFrame.jsx` | `EmbedFrame` | Komponen fitur reusable untuk Embed Frame. |
| `resources/js/Components/Features/Presentation/FabricSlideCanvas.jsx` | `FabricSlideCanvas` | Komponen fitur reusable untuk Fabric Slide Canvas. |
| `resources/js/Components/Features/Presentation/LiveClassRoom.jsx` | `LiveClassRoom` | Komponen fitur reusable untuk Live Class Room. |
| `resources/js/Components/Features/Presentation/PdfCarousel.jsx` | `PdfCarousel` | Komponen fitur reusable untuk Pdf Carousel. |
| `resources/js/Components/Features/Presentation/PresentationStage.jsx` | `PresentationStage` | Komponen fitur reusable untuk Presentation Stage. |
| `resources/js/Components/Features/Profile/DeleteUserForm.jsx` | `DeleteUserForm` | Komponen fitur reusable untuk Delete User Form. |
| `resources/js/Components/Features/Profile/UpdatePasswordForm.jsx` | `UpdatePasswordForm` | Komponen fitur reusable untuk Update Password Form. |
| `resources/js/Components/Features/Profile/UpdateProfileInformationForm.jsx` | `UpdateProfileInformation` | Komponen fitur reusable untuk Update Profile Information Form. |
| `resources/js/Components/Features/StudentPreviewModal.jsx` | `StudentPreviewModal` | Komponen fitur reusable untuk Student Preview Modal. |
| `resources/js/Components/Features/Table/DataTable.jsx` | `DataTable` | Komponen fitur reusable untuk Data Table. |
| `resources/js/Components/Features/Table/Pagination.jsx` | `Pagination` | Komponen fitur reusable untuk Pagination. |

## Layout component

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/Layout/GuestAuthLayout.jsx` | `GuestAuthLayout` | Komponen/resource untuk Guest Auth Layout. |
| `resources/js/Components/Layout/GuestFooter.jsx` | `Footer` | Komponen/resource untuk Guest Footer. |
| `resources/js/Components/Layout/GuestNavbar.jsx` | `GuestNavbar` | Komponen/resource untuk Guest Navbar. |

## Navigation component

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/Navigation/ApplicationLogo.jsx` | `ApplicationLogo` | Komponen/resource untuk Application Logo. |
| `resources/js/Components/Navigation/Breadcrumb.jsx` | `Breadcrumb` | Komponen/resource untuk Breadcrumb. |
| `resources/js/Components/Navigation/NavLink.jsx` | `NavLink` | Komponen/resource untuk Nav Link. |
| `resources/js/Components/Navigation/ResponsiveNavLink.jsx` | `ResponsiveNavLink` | Komponen/resource untuk Responsive Nav Link. |
| `resources/js/Components/Navigation/SidebarLink.jsx` | `SidebarLink` | Komponen/resource untuk Sidebar Link. |

## UI primitive

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Components/UI/AdminDialog.jsx` | `AdminDialog` | Primitive UI bersama untuk Admin Dialog. |
| `resources/js/Components/UI/Alert.jsx` | `Alert` | Primitive UI bersama untuk Alert. |
| `resources/js/Components/UI/Avatar.jsx` | `Avatar` | Primitive UI bersama untuk Avatar. |
| `resources/js/Components/UI/Badge.jsx` | `Badge` | Primitive UI bersama untuk Badge. |
| `resources/js/Components/UI/Button.jsx` | `Button` | Primitive UI bersama untuk Button. |
| `resources/js/Components/UI/Card.jsx` | `Card` | Primitive UI bersama untuk Card. |
| `resources/js/Components/UI/Chart.jsx` | `chartVariableStyles` | Primitive UI bersama untuk Chart. |
| `resources/js/Components/UI/ConfirmActionDialog.jsx` | `ConfirmActionDialog` | Primitive UI bersama untuk Confirm Action Dialog. |
| `resources/js/Components/UI/Dropdown.jsx` | `Dropdown` | Primitive UI bersama untuk Dropdown. |
| `resources/js/Components/UI/Input.jsx` | `Input` | Primitive UI bersama untuk Input. |
| `resources/js/Components/UI/JapaneseSpeechButton.jsx` | `JapaneseSpeechButton` | Primitive UI bersama untuk Japanese Speech Button. |
| `resources/js/Components/UI/Modal.jsx` | `Modal` | Primitive UI bersama untuk Modal. |
| `resources/js/Components/UI/ProgressBar.jsx` | `ProgressBar` | Primitive UI bersama untuk Progress Bar. |
| `resources/js/Components/UI/SearchableMultiSelect.jsx` | `SearchableMultiSelect` | Primitive UI bersama untuk Searchable Multi Select. |
| `resources/js/Components/UI/SearchableSelect.jsx` | `SearchableSelect` | Primitive UI bersama untuk Searchable Select. |
| `resources/js/Components/UI/SoundEffects.js` | `areSoundEffectsEnabled` | Primitive UI bersama untuk Sound Effects. |

## Layout

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Layouts/AuthenticatedLayout.jsx` | `AuthenticatedLayout` | Kerangka halaman untuk Authenticated Layout. |
| `resources/js/Layouts/GuestLayout.jsx` | `GuestLayout` | Kerangka halaman untuk Guest Layout. |

## Frontend integration

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/lib/echo.js` | `getEcho` | Integrasi frontend untuk echo. |

## Public/shared page

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Pages/About.jsx` | `About` | Komponen/resource untuk About. |
| `resources/js/Pages/Errors/Status.jsx` | `Status` | Komponen/resource untuk Status. |
| `resources/js/Pages/landingPage.jsx` | `theme` | Komponen/resource untuk landing Page. |
| `resources/js/Pages/Legal/LegalPage.jsx` | `LegalPage` | Komponen/resource untuk Legal Page. |
| `resources/js/Pages/Notifikasi/Index.jsx` | `NotificationIndex` | Komponen/resource untuk Index. |
| `resources/js/Pages/Pricing.jsx` | `Pricing` | Komponen/resource untuk Pricing. |
| `resources/js/Pages/Public/Kelas/Show.jsx` | `PublicClassShow` | Komponen/resource untuk Show. |
| `resources/js/Pages/Roadmap.jsx` | `Roadmap` | Komponen/resource untuk Roadmap. |

## Admin page

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Pages/Admin/Analitik/Analitik.jsx` | `Analitik` | Halaman admin untuk Analitik. |
| `resources/js/Pages/Admin/Beranda/Beranda.jsx` | `BerandaAdmin` | Halaman admin untuk Beranda. |
| `resources/js/Pages/Admin/DataUser/DataUser.jsx` | `Users` | Halaman admin untuk Data User. |
| `resources/js/Pages/Admin/DataUser/DetailUser.jsx` | `DetailUser` | Halaman admin untuk Detail User. |
| `resources/js/Pages/Admin/Flashcard/BuilderFlashcard.jsx` | `BuilderFlashcard` | Halaman admin untuk Builder Flashcard. |
| `resources/js/Pages/Admin/Kosakata/Kosakata.jsx` | `Kosakata` | Halaman admin untuk Kosakata. |
| `resources/js/Pages/Admin/Kuis/Builder/helpers.js` | `QUESTION_TYPES` | Halaman admin untuk helpers. |
| `resources/js/Pages/Admin/Kuis/BuilderKuis.jsx` | `QuizBuilder` | Halaman admin untuk Builder Kuis. |
| `resources/js/Pages/Admin/Level/ManajemenLevel.jsx` | `ManajemenLevel` | Halaman admin untuk Manajemen Level. |
| `resources/js/Pages/Admin/ModulMateri/ManajemenKelas.jsx` | `ManajemenKelas` | Halaman admin untuk Manajemen Kelas. |
| `resources/js/Pages/Admin/ModulMateri/ManajemenModulMateri.jsx` | `ModulesIndex` | Halaman admin untuk Manajemen Modul Materi. |
| `resources/js/Pages/Admin/Presentasi/BuilderPresentasi.jsx` | `BuilderPresentasi` | Halaman admin untuk Builder Presentasi. |
| `resources/js/Pages/Admin/Presentasi/ModePresentasi.jsx` | `ModePresentasi` | Halaman admin untuk Mode Presentasi. |
| `resources/js/Pages/Admin/Profil/Profil.jsx` | `ProfilAdmin` | Halaman admin untuk Profil. |
| `resources/js/Pages/Admin/RuangKelas/Show.jsx` | `Show` | Halaman admin untuk Show. |
| `resources/js/Pages/Admin/Ujian/BuilderUjian.jsx` | `BuilderUjian` | Halaman admin untuk Builder Ujian. |

## Auth page

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Pages/Auth/ConfirmPassword.jsx` | `ConfirmPassword` | Halaman autentikasi untuk Confirm Password. |
| `resources/js/Pages/Auth/Login.jsx` | `Login` | Halaman autentikasi untuk Login. |
| `resources/js/Pages/Auth/PasswordResetOtp.jsx` | `PasswordResetOtp` | Halaman autentikasi untuk Password Reset Otp. |
| `resources/js/Pages/Auth/Register.jsx` | `Register` | Halaman autentikasi untuk Register. |
| `resources/js/Pages/Auth/VerifyEmail.jsx` | `VerifyEmail` | Halaman autentikasi untuk Verify Email. |

## Superadmin page

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Pages/SuperAdmin/Aktivitas/Aktivitas.jsx` | `Activity` | Halaman superadmin untuk Aktivitas. |
| `resources/js/Pages/SuperAdmin/Beranda/Beranda.jsx` | `SuperadminDashboard` | Halaman superadmin untuk Beranda. |
| `resources/js/Pages/SuperAdmin/DataAdmin/DataAdmin.jsx` | `DataAdmin` | Halaman superadmin untuk Data Admin. |
| `resources/js/Pages/SuperAdmin/DataUser/DataUser.jsx` | `DataUser` | Halaman superadmin untuk Data User. |
| `resources/js/Pages/SuperAdmin/Gamifikasi/Gamifikasi.jsx` | `Gamification` | Halaman superadmin untuk Gamifikasi. |
| `resources/js/Pages/SuperAdmin/Kloter/Kloter.jsx` | `Kloter` | Halaman superadmin untuk Kloter. |
| `resources/js/Pages/SuperAdmin/Konten/Konten.jsx` | `Konten` | Halaman superadmin untuk Konten. |
| `resources/js/Pages/SuperAdmin/Pemasukan/Pemasukan.jsx` | `Pemasukan` | Halaman superadmin untuk Pemasukan. |
| `resources/js/Pages/SuperAdmin/Profil/Profil.jsx` | `ProfilSuperAdmin` | Halaman superadmin untuk Profil. |
| `resources/js/Pages/SuperAdmin/Sistem/Sistem.jsx` | `System` | Halaman superadmin untuk Sistem. |

## User page

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/js/Pages/User/Beranda/Beranda.jsx` | `BerandaUser` | Halaman pengguna untuk Beranda. |
| `resources/js/Pages/User/Berita/DaftarBerita.jsx` | `NewsIndex` | Halaman pengguna untuk Daftar Berita. |
| `resources/js/Pages/User/Berita/DetailBerita.jsx` | `NewsShow` | Halaman pengguna untuk Detail Berita. |
| `resources/js/Pages/User/Checkout/Checkout.jsx` | `Checkout` | Halaman pengguna untuk Checkout. |
| `resources/js/Pages/User/Kelas/KelasPage.jsx` | `KelasPage` | Halaman pengguna untuk Kelas Page. |
| `resources/js/Pages/User/Kosakata/KosakataPage.jsx` | `KosakataPage` | Halaman pengguna untuk Kosakata Page. |
| `resources/js/Pages/User/Kuis/DaftarKuis.jsx` | `DaftarKuis` | Halaman pengguna untuk Daftar Kuis. |
| `resources/js/Pages/User/Kuis/KerjakanKuis.jsx` | `Quiz` | Halaman pengguna untuk Kerjakan Kuis. |
| `resources/js/Pages/User/Kuis/QuickKuis.jsx` | `QuickKuis` | Halaman pengguna untuk Quick Kuis. |
| `resources/js/Pages/User/Modul/DaftarModul.jsx` | `DaftarModul` | Halaman pengguna untuk Daftar Modul. |
| `resources/js/Pages/User/Peringkat/Leaderboard.jsx` | `Leaderboard` | Halaman pengguna untuk Leaderboard. |
| `resources/js/Pages/User/Presentasi/PresentasiPage.jsx` | `PresentasiPage` | Halaman pengguna untuk Presentasi Page. |
| `resources/js/Pages/User/Profil/Profil.jsx` | `Profile` | Halaman pengguna untuk Profil. |
| `resources/js/Pages/User/Progress/Progress.jsx` | `Progress` | Halaman pengguna untuk Progress. |
| `resources/js/Pages/User/RuangKelas/Show.jsx` | `Show` | Halaman pengguna untuk Show. |
| `resources/js/Pages/User/Sertifikat/DetailSertifikat.jsx` | `DetailSertifikat` | Halaman pengguna untuk Detail Sertifikat. |
| `resources/js/Pages/User/Sertifikat/Sertifikat.jsx` | `Certificate` | Halaman pengguna untuk Sertifikat. |
| `resources/js/Pages/User/Ujian/KerjakanUjian.jsx` | `KerjakanUjian` | Halaman pengguna untuk Kerjakan Ujian. |

## Blade shell

| File | Export/symbol utama | Tanggung jawab |
|---|---|---|
| `resources/views/app.blade.php` | `-` | Shell HTML Laravel untuk mount Inertia dan asset Vite. |
| `resources/views/seo/sitemap.blade.php` | `-` | Shell HTML Laravel untuk mount Inertia dan asset Vite. |

## Kandidat Legacy atau Duplikasi

Nama yang mirip bukan bukti aman untuk dihapus. Komponen Breeze, root navigation, `Components/Navigation`, `FallEffect.js/.jsx`, dan primitive UI harus ditelusuri import-nya sebelum cleanup.

## Catatan Pemeliharaan

- Page Inertia mengikuti nama yang dirender controller.
- Komponen shared tidak boleh menggandakan aturan domain backend.
- File baru wajib masuk katalog dengan menjalankan generator ini.
