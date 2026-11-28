import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
import ExploreIcon from '@mui/icons-material/Explore';

const USER_PAGE_TOURS = {
    dashboard: {
        label: 'Beranda',
        steps: [
            {
                id: 'welcome',
                title: 'Selamat Datang di TokuUp!',
                description: 'Di Beranda ini kamu bisa melihat ringkasan progres, streak harian, dan akses cepat ke materi belajar. Kamu bisa melewati panduan ini kapan saja.',
                selector: null,
            },
            {
                id: 'classes',
                title: 'Kelas Saya & Roadmap Harian',
                description: 'Buka Kelas Saya untuk memilih program belajar dan mengikuti roadmap harian secara bertahap.',
                selector: 'a[href*="/user/kelas"]',
            },
            {
                id: 'review',
                title: 'Review Berkala (SRS)',
                description: 'Gunakan menu Review setiap hari untuk mengulang kosakata, kanji, dan soal yang masih perlu diperkuat.',
                selector: 'a[href*="/user/review"]',
            },
            {
                id: 'exams',
                title: 'Portal Ujian JLPT & SSW',
                description: 'Uji kesiapan kamu kapan saja lewat menu Ujian dengan mode latihan maupun simulasi berwaktu.',
                selector: 'a[href*="/user/exams"]',
            },
        ],
    },
    kelas: {
        label: 'Kelas Saya',
        steps: [
            {
                id: 'kelas-overview',
                title: 'Daftar Kelas & Program Belajar',
                description: 'Pilih program belajar yang sudah aktif di sini untuk masuk ke roadmap mingguan dan harian kamu.',
                selector: null,
            },
            {
                id: 'kelas-catalog',
                title: 'Ingin Menambah Program Lain?',
                description: 'Kamu bisa membuka Katalog Program untuk melihat pilihan paket belajar mandiri atau kelas mentor.',
                selector: 'a[href*="/katalog"]',
            },
        ],
    },
    roadmap: {
        label: 'Roadmap Belajar',
        steps: [
            {
                id: 'roadmap-weeks',
                title: 'Jalur Belajar per Minggu & Hari',
                description: 'Buka Minggu yang aktif lalu ketuk lingkaran Hari untuk memunculkan menu cepat materi hari tersebut.',
                selector: null,
            },
            {
                id: 'roadmap-bullets',
                title: 'Menu Bullet Moji-Goi, Grammar & Kuis',
                description: 'Ketuk 文字語彙 (Moji-Goi) untuk memilih latihan 漢字 (Kanji) atau 言葉 (Kotoba), lalu lanjutkan ke 文法 (Grammar) dan 総合 (Kuis Campuran).',
                selector: null,
            },
            {
                id: 'roadmap-library',
                title: 'Pustaka Materi & Dokkai Corner',
                description: 'Gunakan panel Pustaka & Dokkai di samping (atau bagian atas di HP) untuk mengakses kamus kosakata dan wacana bacaan modul.',
                selector: null,
            },
        ],
    },
    kosakata: {
        label: 'Pustaka Kosakata & Kanji',
        steps: [
            {
                id: 'vocab-overview',
                title: 'Kamus Kosakata & Kanji Modul',
                description: 'Gunakan filter kategori (Kosakata, Kanji, Bunpo) dan kolom pencarian untuk mempelajari ulang kata, cara baca furigana, serta contoh kalimat.',
                selector: null,
            },
        ],
    },
    presentasi: {
        label: 'Slide Presentasi',
        steps: [
            {
                id: 'slide-overview',
                title: 'Materi Slide Interaktif',
                description: 'Geser atau gunakan tombol navigasi untuk berpindah antar slide materi. Setelah selesai membaca, lanjutkan ke latihan harian.',
                selector: null,
            },
        ],
    },
    quiz_lobby: {
        label: 'Daftar Kuis',
        steps: [
            {
                id: 'quiz-lobby-overview',
                title: 'Lobi Kuis Evaluasi',
                description: 'Pilih kuis yang berstatus tersedia. Perhatikan estimasi durasi dan nilai minimal lulus sebelum mulai mengerjakan.',
                selector: null,
            },
        ],
    },
    quiz_runner: {
        label: 'Pengerjaan Kuis',
        steps: [
            {
                id: 'quiz-runner-1',
                title: 'Jawab Soal & Pantau Nyawa / Waktu',
                description: 'Pilih jawaban yang tepat atau ketik jawaban pada soal isian. Gunakan tombol audio untuk mendengarkan pelafalan bahasa Jepang.',
                selector: null,
            },
            {
                id: 'quiz-runner-2',
                title: 'Penguatan Otomatis & Flashcard',
                description: 'Soal yang salah akan muncul kembali di akhir sesi bersama kartu flashcard agar pemahaman kamu benar-benar matang.',
                selector: null,
            },
        ],
    },
    mixed_quiz: {
        label: 'Kuis Campuran',
        steps: [
            {
                id: 'mixed-overview',
                title: 'Evaluasi Campuran 3 Pilar',
                description: 'Kuis Campuran menggabungkan Kanji/Kosakata, Tata Bahasa (Bunpo), dan Wacana (Dokkai) dalam satu sesi cepat berhadiah bonus XP.',
                selector: null,
            },
        ],
    },
    quick_quiz: {
        label: 'Latihan Cepat',
        steps: [
            {
                id: 'quick-overview',
                title: 'Sesi Pemanasan Kilat',
                description: 'Selesaikan beberapa soal singkat untuk menjaga ritme dan streak belajar harian kamu langsung dari beranda.',
                selector: null,
            },
        ],
    },
    dokkai_index: {
        label: 'Dokkai Corner',
        steps: [
            {
                id: 'dokkai-list',
                title: 'Koleksi Wacana Bacaan (Dokkai)',
                description: 'Pilih wacana sesuai level JLPT kamu untuk melatih pemahaman bacaan bahasa Jepang lengkap dengan furigana.',
                selector: null,
            },
        ],
    },
    dokkai_runner: {
        label: 'Latihan Dokkai',
        steps: [
            {
                id: 'dokkai-run',
                title: 'Baca Wacana & Tandai Kosakata',
                description: 'Baca paragraf wacana dengan bantuan furigana, simpan kosakata baru ke bookmark SRS, lalu jawab pertanyaan pemahaman.',
                selector: null,
            },
        ],
    },
    review: {
        label: 'Review Berkala',
        steps: [
            {
                id: 'review-srs',
                title: 'Sistem Pengulangan Berkala (SRS)',
                description: 'Materi yang sering salah atau sudah jatuh tempo akan muncul otomatis di sini agar ingatan jangka panjang kamu semakin kuat.',
                selector: null,
            },
        ],
    },
    live_classes: {
        label: 'Kelas Live',
        steps: [
            {
                id: 'live-overview',
                title: 'Jadwal Kelas Live & Rekaman',
                description: 'Lihat jadwal kelas live bersama mentor, konfirmasi kehadiran (RSVP), atau tonton ulang rekaman sesi yang telah selesai.',
                selector: null,
            },
        ],
    },
    live_room: {
        label: 'Ruang Kelas Live',
        steps: [
            {
                id: 'live-room-overview',
                title: 'Ikuti Sesi Live Interaktif',
                description: 'Gunakan kontrol mikrofon, kamera, angkat tangan, dan chat untuk berinteraksi dengan mentor sambil mengikuti slide materi secara langsung.',
                selector: null,
            },
        ],
    },
    progress: {
        label: 'Progres Belajar',
        steps: [
            {
                id: 'progress-overview',
                title: 'Pantau Perkembangan Belajar',
                description: 'Di halaman ini kamu bisa memantau total XP, streak harian, ketuntasan modul, serta riwayat skor kuis kamu.',
                selector: null,
            },
        ],
    },
    leaderboard: {
        label: 'Papan Peringkat',
        steps: [
            {
                id: 'leaderboard-overview',
                title: 'Peringkat XP Belajar',
                description: 'Kumpulkan XP dari latihan harian, kuis, dan review untuk naik peringkat bersama peserta TokuUp lainnya.',
                selector: null,
            },
        ],
    },
    news: {
        label: 'Berita & Info',
        steps: [
            {
                id: 'news-overview',
                title: 'Artikel & Info JLPT / SSW',
                description: 'Baca tips belajar bahasa Jepang, informasi jadwal ujian, serta pembaruan terbaru dari tim TokuUp.',
                selector: null,
            },
        ],
    },
    profile: {
        label: 'Pengaturan Profil',
        steps: [
            {
                id: 'profile-overview',
                title: 'Kelola Akun & Preferensi Belajar',
                description: 'Perbarui profil, atur preferensi belajar, tukar kode akses/voucher, atau nyalakan ulang panduan interaktif kapan saja.',
                selector: null,
            },
        ],
    },
    referral: {
        label: 'Program Referral',
        steps: [
            {
                id: 'referral-overview',
                title: 'Ajak Teman & Dapatkan Diskon',
                description: 'Bagikan kode atau tautan referral kamu. Setiap teman yang bergabung memberi potongan harga otomatis saat checkout.',
                selector: null,
            },
        ],
    },
    catalog: {
        label: 'Katalog Program',
        steps: [
            {
                id: 'catalog-overview',
                title: 'Pilih Paket & Program Belajar',
                description: 'Bandingkan fitur program belajar mandiri maupun kelas mentor. Jika kamu punya diskon referral, potongan otomatis tampil di harga.',
                selector: null,
            },
        ],
    },
    checkout: {
        label: 'Pembayaran',
        steps: [
            {
                id: 'checkout-overview',
                title: 'Pembayaran Aman via Midtrans',
                description: 'Pilih metode pembayaran (QRIS, Virtual Account, E-Wallet, atau Minimarket). Akses kelas otomatis aktif setelah pembayaran terverifikasi.',
                selector: null,
            },
        ],
    },
    exam_index: {
        label: 'Beranda Ujian',
        steps: [
            {
                id: 'exam-home-1',
                title: 'Selamat Datang di Portal Ujian',
                description: 'Di sini kamu bisa melihat ringkasan kesiapan ujian JLPT/SSW dan langsung memilih ujian yang direkomendasikan.',
                selector: null,
            },
            {
                id: 'exam-home-2',
                title: 'Navigasi Portal Ujian',
                description: 'Gunakan menu Kumpulan Ujian untuk mencari paket soal, Ranking untuk perbandingan skor, dan Riwayat untuk evaluasi hasil.',
                selector: 'a[href*="/user/exams/library"]',
            },
        ],
    },
    exam_library: {
        label: 'Kumpulan Ujian',
        steps: [
            {
                id: 'exam-lib',
                title: 'Filter & Pilih Paket Ujian',
                description: 'Saring ujian berdasarkan kategori (JLPT / JFT-Basic / SSW) dan level, lalu klik paket ujian untuk melihat detail sebelum mulai.',
                selector: null,
            },
        ],
    },
    exam_show: {
        label: 'Detail Ujian',
        steps: [
            {
                id: 'exam-detail',
                title: 'Cek Aturan & Durasi Ujian',
                description: 'Pastikan koneksi stabil dan perhatikan jumlah soal, batas waktu, serta batas percobaan sebelum menekan tombol Mulai Ujian.',
                selector: null,
            },
        ],
    },
    exam_history: {
        label: 'Riwayat Ujian',
        steps: [
            {
                id: 'exam-hist',
                title: 'Evaluasi Riwayat Ujian',
                description: 'Lihat riwayat percobaan dan skor ujian terdahulu untuk mengetahui bagian mana yang perlu ditingkatkan.',
                selector: null,
            },
        ],
    },
    exam_ranking: {
        label: 'Ranking Ujian',
        steps: [
            {
                id: 'exam-rank',
                title: 'Peringkat Simulasi Ujian',
                description: 'Bandingkan hasil simulasi ujian kamu dengan peserta lain di kategori yang sama.',
                selector: null,
            },
        ],
    },
};

const ADMIN_STEPS = [
    {
        id: 'welcome',
        title: 'Selamat Datang di Panel Admin TokuUp',
        description: 'Panduan singkat ini memperkenalkan alur kerja utama pengajar dan admin. Kamu bisa melewati panduan ini kapan saja.',
        selector: null,
    },
    {
        id: 'programs',
        title: 'Kelola Kelas & Roadmap',
        description: 'Atur program pembelajaran, modul mingguan, dan aktivitas per hari (Flashcard, Kuis, Grammar, Dokkai, Presentasi) dari menu Kelas.',
        selector: 'a[href*="/admin/programs"]',
    },
    {
        id: 'content-bank',
        title: 'Pusat Bank Konten & Soal',
        description: 'Kelola bank kosakata, kanji, tata bahasa, dan soal ujian CBT secara terpusat agar mudah digunakan ulang di berbagai kelas.',
        selector: 'a[href*="/admin/bank-soal-konten"], a[href*="/admin/vocabulary"]',
    },
    {
        id: 'cohorts',
        title: 'Kloter & Pemantauan Siswa',
        description: 'Pantau progres siswa, jadwal kloter belajar, serta sesi kelas live dari panel manajemen siswa dan analitik.',
        selector: 'a[href*="/admin/kloters"], a[href*="/admin/users"]',
    },
];

function resolveUserPageKey(component = '', path = '') {
    const cleanPath = (path || '').split(/[?#]/)[0];

    if (component === 'User/Beranda/Beranda' || cleanPath === '/user/dashboard') return 'dashboard';
    if (component === 'User/Kelas/KelasPage' || cleanPath === '/user/kelas') return 'kelas';
    if (component === 'User/Kosakata/KosakataPage' || cleanPath.includes('/kosakata')) return 'kosakata';
    if (component === 'User/Presentasi/PresentasiPage' || cleanPath.includes('/presentasi')) return 'presentasi';
    if (component === 'User/Modul/DaftarModul' || cleanPath.startsWith('/user/modul')) return 'roadmap';
    if (component === 'User/Kuis/DaftarKuis' || cleanPath === '/user/quizzes') return 'quiz_lobby';
    if (component === 'User/Kuis/KerjakanKuis' || cleanPath.startsWith('/user/quizzes/')) return 'quiz_runner';
    if (component === 'User/Kuis/KuisCampuranRunner' || cleanPath.startsWith('/user/kuis-campuran')) return 'mixed_quiz';
    if (component === 'User/Kuis/QuickKuis' || cleanPath.startsWith('/user/dashboard-quiz')) return 'quick_quiz';
    if (component === 'User/Dokkai/Index' || cleanPath === '/user/dokkai') return 'dokkai_index';
    if (component === 'User/Dokkai/KerjakanDokkai' || cleanPath.startsWith('/user/dokkai/')) return 'dokkai_runner';
    if (component === 'User/Review/Index' || cleanPath.startsWith('/user/review')) return 'review';
    if (component === 'User/RuangKelas/Index' || cleanPath === '/user/live-classes') return 'live_classes';
    if (component === 'User/Progress/Progress' || cleanPath.startsWith('/user/progress')) return 'progress';
    if (component === 'User/Peringkat/Leaderboard' || cleanPath.startsWith('/user/leaderboard')) return 'leaderboard';
    if (component?.startsWith('User/Berita/') || cleanPath.startsWith('/user/news')) return 'news';
    if (component === 'User/Profil/Profil' || cleanPath === '/profile') return 'profile';
    if (component === 'User/Referral/Index' || cleanPath.startsWith('/user/referrals')) return 'referral';
    if (cleanPath === '/katalog' || cleanPath === '/pricing') return 'catalog';
    if (component === 'User/Checkout/Checkout' || cleanPath.startsWith('/checkout')) return 'checkout';
    if (component === 'User/Ujian/Portal/Index' || cleanPath === '/user/exams') return 'exam_index';
    if (component === 'User/Ujian/Portal/Library' || cleanPath.startsWith('/user/exams/library')) return 'exam_library';
    if (component === 'User/Ujian/Portal/History' || cleanPath.startsWith('/user/exams/history')) return 'exam_history';
    if (component === 'User/Ujian/Portal/Ranking' || cleanPath.startsWith('/user/exams/ranking')) return 'exam_ranking';
    if (component === 'User/Ujian/Portal/Show' || /^\/user\/exams\/[^/]+$/.test(cleanPath)) return 'exam_show';

    return null;
}

const pageStorageKey = (role, userId, pageKey) => `tokuup:tour:v2:${role}:${userId || 'anon'}:${pageKey}`;
const dismissAllKey = (role, userId) => `tokuup:tour:v2:dismiss-all:${role}:${userId || 'anon'}`;

export default function GuidedTour({ role: propRole = null, userId: propUserId = null, pageKey: propPageKey = null }) {
    const page = usePage();
    const authUser = page.props?.auth?.user;
    const userId = propUserId ?? authUser?.id ?? null;
    const role = propRole ?? (authUser?.role === 'admin' || authUser?.role === 'superadmin' ? 'admin' : 'user');

    const resolvedPageKey = useMemo(() => {
        if (role === 'admin') return 'admin-global';
        return propPageKey || resolveUserPageKey(page.component, page.url);
    }, [role, propPageKey, page.component, page.url]);

    const tourConfig = useMemo(() => {
        if (role === 'admin') {
            return { label: 'Admin', steps: ADMIN_STEPS };
        }
        if (!resolvedPageKey || !USER_PAGE_TOURS[resolvedPageKey]) {
            return null;
        }
        return USER_PAGE_TOURS[resolvedPageKey];
    }, [role, resolvedPageKey]);

    const steps = tourConfig?.steps || [];
    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightRect, setHighlightRect] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !userId || !resolvedPageKey || steps.length === 0) {
            setOpen(false);
            return undefined;
        }

        try {
            const dismissedAll = window.localStorage.getItem(dismissAllKey(role, userId));
            const seenPage = window.localStorage.getItem(pageStorageKey(role, userId, resolvedPageKey));
            if (!dismissedAll && !seenPage) {
                const timer = window.setTimeout(() => {
                    setStepIndex(0);
                    setOpen(true);
                }, 450);
                return () => window.clearTimeout(timer);
            }
            setOpen(false);
        } catch {
            // Ignore storage access errors in restricted browsers.
        }
        return undefined;
    }, [role, userId, resolvedPageKey, steps.length]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleRestart = () => {
            if (steps.length === 0) return;
            try {
                if (userId) {
                    window.localStorage.removeItem(dismissAllKey(role, userId));
                }
            } catch {
                // Ignore storage errors.
            }
            setStepIndex(0);
            setOpen(true);
        };

        window.addEventListener('tokuup:restart-tour', handleRestart);
        return () => window.removeEventListener('tokuup:restart-tour', handleRestart);
    }, [role, userId, steps.length]);

    const currentStep = steps[stepIndex] || steps[0];

    useEffect(() => {
        if (!open || typeof window === 'undefined') {
            setHighlightRect(null);
            return undefined;
        }

        const updateHighlight = () => {
            if (!currentStep?.selector) {
                setHighlightRect(null);
                return;
            }

            const candidates = Array.from(document.querySelectorAll(currentStep.selector));
            const target = candidates.find((el) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0;
            });

            if (!target) {
                setHighlightRect(null);
                return;
            }

            const rect = target.getBoundingClientRect();
            setHighlightRect({
                top: Math.max(4, rect.top - 4),
                left: Math.max(4, rect.left - 4),
                width: rect.width + 8,
                height: rect.height + 8,
            });
        };

        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        window.addEventListener('scroll', updateHighlight, true);

        return () => {
            window.removeEventListener('resize', updateHighlight);
            window.removeEventListener('scroll', updateHighlight, true);
        };
    }, [open, currentStep]);

    const finishTour = (dismissAll = false) => {
        setOpen(false);
        setHighlightRect(null);
        if (typeof window !== 'undefined' && userId && resolvedPageKey) {
            try {
                window.localStorage.setItem(pageStorageKey(role, userId, resolvedPageKey), 'done');
                if (dismissAll) {
                    window.localStorage.setItem(dismissAllKey(role, userId), 'done');
                }
            } catch {
                // Ignore storage errors.
            }
        }
    };

    useEffect(() => {
        if (!open || typeof window === 'undefined') return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                finishTour(false);
            } else if (event.key === 'ArrowRight') {
                if (stepIndex < steps.length - 1) {
                    setStepIndex((i) => i + 1);
                } else {
                    finishTour(false);
                }
            } else if (event.key === 'ArrowLeft' && stepIndex > 0) {
                setStepIndex((i) => i - 1);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, stepIndex, steps.length]);

    if (!open || !currentStep || typeof document === 'undefined') {
        return null;
    }

    const isLast = stepIndex === steps.length - 1;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-title"
            className="fixed inset-0 z-[10050] flex items-end justify-center p-4 sm:items-center"
        >
            <div
                className="fixed inset-0 bg-gray-950/60 backdrop-blur-[2px]"
                onClick={() => finishTour(false)}
                aria-hidden="true"
            />

            {highlightRect && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed z-[10051] rounded-xl ring-4 ring-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all duration-200"
                    style={{
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                    }}
                />
            )}

            <div className="relative z-[10052] w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                            <ExploreIcon sx={{ fontSize: 20 }} />
                        </span>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-brand-700 dark:text-brand-300">
                                Panduan {tourConfig?.label} · {stepIndex + 1}/{steps.length}
                            </p>
                            <h2 id="guided-tour-title" className="text-base font-black text-gray-900 dark:text-white">
                                {currentStep.title}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => finishTour(false)}
                        aria-label="Tutup panduan"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                <p className="mt-3 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
                    {currentStep.description}
                </p>

                {steps.length > 1 && (
                    <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
                        {steps.map((step, idx) => (
                            <span
                                key={step.id}
                                className={`h-1.5 rounded-full transition-all ${
                                    idx === stepIndex
                                        ? 'w-6 bg-brand-600 dark:bg-brand-400'
                                        : idx < stepIndex
                                            ? 'w-2 bg-brand-300 dark:bg-brand-700'
                                            : 'w-2 bg-gray-200 dark:bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => finishTour(false)}
                            className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                            Lewati
                        </button>
                        {role === 'user' && (
                            <button
                                type="button"
                                onClick={() => finishTour(true)}
                                className="inline-flex min-h-11 items-center rounded-xl px-2.5 py-2 text-[11px] font-semibold text-gray-400 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-500 dark:hover:text-gray-200"
                            >
                                Lewati semua
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <ChevronLeftIcon sx={{ fontSize: 16 }} />
                                Sebelumnya
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (isLast) {
                                    finishTour(false);
                                } else {
                                    setStepIndex((i) => i + 1);
                                }
                            }}
                            className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            {isLast ? (
                                <>
                                    <CheckIcon sx={{ fontSize: 16 }} />
                                    Mengerti
                                </>
                            ) : (
                                <>
                                    Lanjut
                                    <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
