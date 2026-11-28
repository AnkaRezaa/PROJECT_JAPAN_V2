import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
import ExploreIcon from '@mui/icons-material/Explore';

const SMOOTH_TRANSITION = {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1],
};

const USER_PAGE_TOURS = {
    dashboard: {
        label: 'Beranda',
        steps: [
            {
                id: 'beranda-continue',
                title: 'Lanjutkan Belajar',
                description: 'Klik tombol Lanjutkan di sini untuk langsung kembali ke Hari & Minggu terakhir tanpa perlu mencari manual.',
                selector: '[data-tour="beranda-continue"]',
            },
            {
                id: 'beranda-mixed',
                title: 'Kuis Campuran Harian',
                description: 'Kerjakan 10 soal terpadu (Kosakata, Grammar, Dokkai) dari materi yang sudah terbuka untuk bonus +30 XP.',
                selector: '[data-tour="beranda-mixed-quiz"]',
            },
            {
                id: 'beranda-weakspot',
                title: 'Pemulihan Titik Lemah',
                description: 'Soal yang pernah kamu jawab keliru otomatis dikumpulkan di sini agar mudah dilatih ulang sampai paham.',
                selector: '[data-tour="beranda-weakspot"]',
            },
        ],
    },
    kelas: {
        label: 'Kelas Saya',
        steps: [
            {
                id: 'kelas-enrolled',
                title: 'Program Aktifmu',
                description: 'Klik Lanjutkan pada kartu program di sini untuk masuk ke Roadmap belajar mingguan dan harian.',
                selector: '[data-tour="kelas-enrolled"]',
            },
            {
                id: 'kelas-live',
                title: 'Jadwal Kelas Live',
                description: 'Cek jadwal sesi tatap muka bersama mentor dan link ruang live langsung dari tombol ini.',
                selector: '[data-tour="kelas-live-btn"]',
            },
            {
                id: 'kelas-catalog',
                title: 'Tambah Kelas Baru',
                description: 'Buka katalog untuk melihat pilihan program belajar mandiri atau kelas mentor lainnya.',
                selector: '[data-tour="kelas-catalog-btn"], a[href*="/katalog"]',
            },
        ],
    },
    roadmap: {
        label: 'Roadmap',
        steps: [
            {
                id: 'roadmap-day',
                title: 'Node Hari & Cincin 4 Warna',
                description: 'Ketuk node Hari untuk membuka menu 文字語彙 (Kanji & Kotoba), Grammar, dan Kuis. Tiap busur warna menyala saat aktivitasnya selesai.',
                selector: '[data-tour="roadmap-day-active"], [data-tour="roadmap-day-node"]',
            },
            {
                id: 'roadmap-library',
                title: 'Pustaka & Dokkai',
                description: 'Buka kamus Kosakata/Kanji modul dan latihan bacaan Dokkai kapan saja dari panel ini.',
                selector: '[data-tour="roadmap-library"], a[href*="/kosakata"]',
            },
        ],
    },
    kosakata: {
        label: 'Pustaka',
        steps: [
            {
                id: 'vocab-overview',
                title: 'Kamus Kosakata & Kanji',
                description: 'Gunakan pencarian dan filter tipe (Kanji, Kosakata, Bunpo) untuk mengulang arti, furigana, dan pelafalan.',
                selector: 'input[type="search"], input[placeholder*="Cari"]',
            },
        ],
    },
    presentasi: {
        label: 'Slide',
        steps: [
            {
                id: 'slide-overview',
                title: 'Materi Slide Interaktif',
                description: 'Gunakan tombol navigasi atau geser layar untuk berpindah slide, lalu lanjut ke latihan harian.',
                selector: null,
            },
        ],
    },
    quiz_lobby: {
        label: 'Daftar Kuis',
        steps: [
            {
                id: 'quiz-lobby-overview',
                title: 'Pilih Kuis Evaluasi',
                description: 'Perhatikan durasi dan target nilai lulus pada kartu kuis sebelum menekan tombol Mulai.',
                selector: null,
            },
        ],
    },
    quiz_runner: {
        label: 'Kuis',
        steps: [
            {
                id: 'quiz-header',
                title: 'Progres, Nyawa & Audio',
                description: 'Pantau sisa soal/nyawa di bagian atas, dan klik ikon speaker di kanan atas untuk mengatur narator otomatis.',
                selector: '[data-tour="quiz-header"]',
            },
            {
                id: 'quiz-answer',
                title: 'Jawab & Penguatan Otomatis',
                description: 'Pilih atau ketik jawabanmu di sini. Soal yang keliru otomatis diulang di akhir sesi hingga kamu paham.',
                selector: '[data-tour="quiz-answer-area"]',
            },
        ],
    },
    mixed_quiz: {
        label: 'Kuis Campuran',
        steps: [
            {
                id: 'mixed-overview',
                title: 'Evaluasi 3 Pilar',
                description: 'Gabungan soal Kanji/Kosakata, Grammar, dan Dokkai dalam satu sesi singkat berhadiah bonus XP.',
                selector: null,
            },
        ],
    },
    quick_quiz: {
        label: 'Latihan Cepat',
        steps: [
            {
                id: 'quick-overview',
                title: 'Pemanasan Kilat',
                description: 'Selesaikan beberapa soal singkat untuk menjaga ritme dan streak belajar harianmu.',
                selector: null,
            },
        ],
    },
    dokkai_index: {
        label: 'Dokkai',
        steps: [
            {
                id: 'dokkai-list',
                title: 'Wacana Bacaan (Dokkai)',
                description: 'Pilih wacana sesuai level JLPT untuk melatih membaca paragraf lengkap dengan furigana.',
                selector: null,
            },
        ],
    },
    dokkai_runner: {
        label: 'Dokkai',
        steps: [
            {
                id: 'dokkai-run',
                title: 'Baca & Tandai Kata',
                description: 'Ketuk kata sulit untuk melihat artinya atau simpan ke daftar review, lalu jawab soal pemahaman.',
                selector: null,
            },
        ],
    },
    review: {
        label: 'Review',
        steps: [
            {
                id: 'review-stats',
                title: 'Ringkasan Mastery',
                description: 'Pantau persentase materi yang sudah dikuasai dan akurasi latihanmu dalam 7 atau 30 hari terakhir.',
                selector: '[data-tour="review-stats"]',
            },
            {
                id: 'review-history',
                title: 'Riwayat & Filter Latihan',
                description: 'Saring aktivitas berdasarkan kelas atau jenis latihan untuk melihat materi mana yang perlu diulang.',
                selector: '[data-tour="review-history"]',
            },
        ],
    },
    live_classes: {
        label: 'Kelas Live',
        steps: [
            {
                id: 'live-join',
                title: 'Masuk dengan Kode Kelas',
                description: 'Ketik kode dari mentor (mis. ABC-1234) lalu klik Gabung untuk langsung masuk ke ruang live.',
                selector: '[data-tour="live-join-code"]',
            },
            {
                id: 'live-schedule',
                title: 'Jadwal & Rekaman Sesi',
                description: 'Lihat jadwal kelas mendatang, konfirmasi RSVP, atau putar ulang rekaman sesi sebelumnya di sini.',
                selector: '[data-tour="live-schedule"]',
            },
        ],
    },
    live_room: {
        label: 'Ruang Live',
        steps: [
            {
                id: 'live-room-overview',
                title: 'Kontrol Sesi Live',
                description: 'Gunakan tombol mic, kamera, angkat tangan, dan chat untuk berinteraksi langsung dengan mentor.',
                selector: null,
            },
        ],
    },
    progress: {
        label: 'Progres',
        steps: [
            {
                id: 'progress-hero',
                title: 'Ringkasan Perkembangan',
                description: 'Pantau total XP, streak belajar, dan tombol cepat untuk melanjutkan materi terakhir.',
                selector: '[data-tour="progress-hero"]',
            },
            {
                id: 'progress-metrics',
                title: 'Metrik Belajar',
                description: 'Cek jumlah materi selesai, rata-rata skor kuis, dan konsistensi belajarmu tiap minggu.',
                selector: '[data-tour="progress-metrics"]',
            },
        ],
    },
    leaderboard: {
        label: 'Peringkat',
        steps: [
            {
                id: 'leaderboard-overview',
                title: 'Papan Peringkat XP',
                description: 'Kumpulkan XP dari latihan harian, kuis, dan review untuk naik peringkat bersama siswa lain.',
                selector: null,
            },
        ],
    },
    news: {
        label: 'Info',
        steps: [
            {
                id: 'news-overview',
                title: 'Artikel & Info JLPT',
                description: 'Baca tips belajar bahasa Jepang, jadwal ujian, dan pembaruan terbaru dari TokuUp.',
                selector: null,
            },
        ],
    },
    profile: {
        label: 'Profil',
        steps: [
            {
                id: 'profile-overview',
                title: 'Akun & Preferensi',
                description: 'Ubah data profil, tukar voucher kelas, atau nyalakan ulang panduan interaktif kapan saja di sini.',
                selector: null,
            },
        ],
    },
    referral: {
        label: 'Referral',
        steps: [
            {
                id: 'referral-overview',
                title: 'Bagikan Kode Referral',
                description: 'Salin dan bagikan kodemu; teman yang mendaftar otomatis mendapat potongan harga saat checkout.',
                selector: null,
            },
        ],
    },
    catalog: {
        label: 'Katalog',
        steps: [
            {
                id: 'catalog-overview',
                title: 'Pilih Paket Belajar',
                description: 'Bandingkan fitur program belajar mandiri maupun kelas mentor sebelum mendaftar.',
                selector: null,
            },
        ],
    },
    checkout: {
        label: 'Checkout',
        steps: [
            {
                id: 'checkout-overview',
                title: 'Pembayaran Otomatis',
                description: 'Pilih QRIS, Virtual Account, atau E-Wallet. Akses kelas langsung aktif setelah pembayaran terverifikasi.',
                selector: null,
            },
        ],
    },
    exam_index: {
        label: 'Ujian',
        steps: [
            {
                id: 'exam-home-1',
                title: 'Portal Simulasi Ujian',
                description: 'Pantau kesiapan JLPT/SSW dan pilih paket ujian rekomendasi langsung dari halaman ini.',
                selector: null,
            },
            {
                id: 'exam-home-2',
                title: 'Kumpulan Ujian',
                description: 'Jelajahi seluruh paket soal, cek ranking, dan evaluasi riwayat percobaan ujianmu.',
                selector: 'a[href*="/user/exams/library"]',
            },
        ],
    },
    exam_library: {
        label: 'Kumpulan Ujian',
        steps: [
            {
                id: 'exam-lib',
                title: 'Filter Paket Ujian',
                description: 'Saring ujian berdasarkan kategori (JLPT / JFT-Basic / SSW) dan level targetmu.',
                selector: null,
            },
        ],
    },
    exam_show: {
        label: 'Detail Ujian',
        steps: [
            {
                id: 'exam-detail',
                title: 'Cek Aturan Ujian',
                description: 'Perhatikan jumlah soal, batas waktu, dan kestabilan koneksi sebelum menekan Mulai Ujian.',
                selector: null,
            },
        ],
    },
    exam_history: {
        label: 'Riwayat',
        steps: [
            {
                id: 'exam-hist',
                title: 'Evaluasi Riwayat',
                description: 'Tinjau skor ujian terdahulu untuk melihat bagian mana yang perlu ditingkatkan.',
                selector: null,
            },
        ],
    },
    exam_ranking: {
        label: 'Ranking',
        steps: [
            {
                id: 'exam-rank',
                title: 'Peringkat Simulasi',
                description: 'Bandingkan skor simulasi ujianmu dengan peserta lain di kategori yang sama.',
                selector: null,
            },
        ],
    },
};

const ADMIN_STEPS = [
    {
        id: 'programs',
        title: 'Kelas & Roadmap',
        description: 'Atur program, modul mingguan, dan materi harian (Moji-Goi, Grammar, Dokkai, Kuis) dari menu ini.',
        selector: 'a[href*="/admin/programs"]',
    },
    {
        id: 'content-bank',
        title: 'Bank Konten & Soal',
        description: 'Kelola kosakata, kanji, override audio TTS, dan soal CBT secara terpusat.',
        selector: 'a[href*="/admin/bank-soal-konten"], a[href*="/admin/vocabulary"]',
    },
    {
        id: 'cohorts',
        title: 'Kloter & Siswa',
        description: 'Pantau progres siswa, kloter belajar, serta jadwal sesi live.',
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

const CARD_WIDTH = 340;
const CARD_EST_HEIGHT = 196;

function findVisibleTarget(selector) {
    if (!selector || typeof document === 'undefined') return null;
    const candidates = Array.from(document.querySelectorAll(selector));
    return candidates.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 8 && rect.height > 8 && rect.top >= 0 && rect.bottom <= window.innerHeight;
    }) || candidates.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 8 && rect.height > 8;
    }) || null;
}

function computeAnchoredLayout(highlightRect, sidebarRight) {
    if (typeof window === 'undefined') {
        return { pos: { left: 24, top: 24, width: CARD_WIDTH }, arrowSide: null, arrowOffset: 28 };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;

    // Mobile: dock cleanly at bottom
    if (vw < 640) {
        const mobileWidth = Math.min(vw - 32, 400);
        return {
            pos: {
                left: Math.max(16, (vw - mobileWidth) / 2),
                top: Math.max(16, vh - CARD_EST_HEIGHT - 16),
                width: mobileWidth,
            },
            arrowSide: null,
            arrowOffset: 28,
        };
    }

    if (highlightRect) {
        const gap = 16;
        const rightEdge = highlightRect.left + highlightRect.width;
        const bottomEdge = highlightRect.top + highlightRect.height;
        const spaceRight = vw - rightEdge;
        const spaceLeft = highlightRect.left;
        const spaceBelow = vh - bottomEdge;
        const spaceAbove = highlightRect.top;

        // 1. Right side (ideal for sidebar items & left-column feature cards)
        if (spaceRight >= CARD_WIDTH + gap + pad) {
            const idealTop = highlightRect.top + (highlightRect.height / 2) - (CARD_EST_HEIGHT / 2);
            const top = Math.max(pad, Math.min(vh - CARD_EST_HEIGHT - pad, idealTop));
            const arrowOffset = Math.max(22, Math.min(CARD_EST_HEIGHT - 30, (highlightRect.top + highlightRect.height / 2) - top - 7));
            return {
                pos: { top, left: rightEdge + gap, width: CARD_WIDTH },
                arrowSide: 'left',
                arrowOffset,
            };
        }

        // 2. Left side (ideal for right-column cards & buttons)
        if (spaceLeft >= CARD_WIDTH + gap + pad) {
            const idealTop = highlightRect.top + (highlightRect.height / 2) - (CARD_EST_HEIGHT / 2);
            const top = Math.max(pad, Math.min(vh - CARD_EST_HEIGHT - pad, idealTop));
            const arrowOffset = Math.max(22, Math.min(CARD_EST_HEIGHT - 30, (highlightRect.top + highlightRect.height / 2) - top - 7));
            return {
                pos: { top, left: highlightRect.left - CARD_WIDTH - gap, width: CARD_WIDTH },
                arrowSide: 'right',
                arrowOffset,
            };
        }

        // 3. Below target (ideal for wide sections/headers)
        if (spaceBelow >= CARD_EST_HEIGHT + gap + pad) {
            const idealLeft = highlightRect.left + (highlightRect.width / 2) - (CARD_WIDTH / 2);
            const left = Math.max(pad, Math.min(vw - CARD_WIDTH - pad, idealLeft));
            const arrowOffset = Math.max(24, Math.min(CARD_WIDTH - 32, (highlightRect.left + highlightRect.width / 2) - left - 7));
            return {
                pos: { top: bottomEdge + gap, left, width: CARD_WIDTH },
                arrowSide: 'top',
                arrowOffset,
            };
        }

        // 4. Above target
        if (spaceAbove >= CARD_EST_HEIGHT + gap + pad) {
            const idealLeft = highlightRect.left + (highlightRect.width / 2) - (CARD_WIDTH / 2);
            const left = Math.max(pad, Math.min(vw - CARD_WIDTH - pad, idealLeft));
            const arrowOffset = Math.max(24, Math.min(CARD_WIDTH - 32, (highlightRect.left + highlightRect.width / 2) - left - 7));
            return {
                pos: { top: highlightRect.top - CARD_EST_HEIGHT - gap, left, width: CARD_WIDTH },
                arrowSide: 'bottom',
                arrowOffset,
            };
        }
    }

    // Fallback when no specific element is highlighted: dock near sidebar bottom-left on desktop
    const dockedLeft = sidebarRight > 0 && vw - sidebarRight >= CARD_WIDTH + 32
        ? sidebarRight + 16
        : 24;

    return {
        pos: {
            left: dockedLeft,
            top: Math.max(pad, vh - CARD_EST_HEIGHT - 24),
            width: CARD_WIDTH,
        },
        arrowSide: null,
        arrowOffset: 28,
    };
}

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

    const rawSteps = tourConfig?.steps || [];
    const [open, setOpen] = useState(false);
    const [activeSteps, setActiveSteps] = useState(rawSteps);
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightRect, setHighlightRect] = useState(null);
    const [sidebarRight, setSidebarRight] = useState(0);
    const rafRef = useRef(null);

    const resolveActiveSteps = useCallback(() => {
        if (typeof document === 'undefined') return rawSteps;
        const filtered = rawSteps.filter((step) => !step.selector || Boolean(findVisibleTarget(step.selector)));
        return filtered.length > 0 ? filtered : rawSteps;
    }, [rawSteps]);

    useEffect(() => {
        if (typeof window === 'undefined' || !userId || !resolvedPageKey || rawSteps.length === 0) {
            setOpen(false);
            return undefined;
        }

        try {
            const dismissedAll = window.localStorage.getItem(dismissAllKey(role, userId));
            const seenPage = window.localStorage.getItem(pageStorageKey(role, userId, resolvedPageKey));
            if (!dismissedAll && !seenPage) {
                const timer = window.setTimeout(() => {
                    setActiveSteps(resolveActiveSteps());
                    setStepIndex(0);
                    setOpen(true);
                }, 420);
                return () => window.clearTimeout(timer);
            }
            setOpen(false);
        } catch {
            // Ignore storage access errors in restricted browsers.
        }
        return undefined;
    }, [role, userId, resolvedPageKey, rawSteps.length, resolveActiveSteps]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleRestart = () => {
            if (rawSteps.length === 0) return;
            try {
                if (userId) {
                    window.localStorage.removeItem(dismissAllKey(role, userId));
                }
            } catch {
                // Ignore storage errors.
            }
            setActiveSteps(resolveActiveSteps());
            setStepIndex(0);
            setOpen(true);
        };

        window.addEventListener('tokuup:restart-tour', handleRestart);
        return () => window.removeEventListener('tokuup:restart-tour', handleRestart);
    }, [role, userId, rawSteps.length, resolveActiveSteps]);

    const currentStep = activeSteps[stepIndex] || activeSteps[0];

    useEffect(() => {
        if (!open || typeof window === 'undefined') {
            setHighlightRect(null);
            return undefined;
        }

        const measure = (allowScroll = false) => {
            const sidebarEl = document.querySelector('aside');
            if (sidebarEl) {
                const sRect = sidebarEl.getBoundingClientRect();
                setSidebarRight(sRect.width > 40 && sRect.left <= 20 ? sRect.right : 0);
            } else {
                setSidebarRight(0);
            }

            if (!currentStep?.selector) {
                setHighlightRect(null);
                return;
            }

            const target = findVisibleTarget(currentStep.selector);
            if (!target) {
                setHighlightRect(null);
                return;
            }

            const rect = target.getBoundingClientRect();
            if (allowScroll && (rect.top < 72 || rect.bottom > window.innerHeight - 72)) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }

            const updated = target.getBoundingClientRect();
            const pad = 6;
            setHighlightRect({
                top: Math.max(4, updated.top - pad),
                left: Math.max(4, updated.left - pad),
                width: Math.min(window.innerWidth - 8, updated.width + (pad * 2)),
                height: Math.min(window.innerHeight - 8, updated.height + (pad * 2)),
            });
        };

        const scheduleMeasure = () => {
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            rafRef.current = window.requestAnimationFrame(() => measure(false));
        };

        measure(true);
        // Track target smoothly while smooth scroll settles
        const settleTimer = window.setTimeout(() => measure(false), 320);

        window.addEventListener('resize', scheduleMeasure);
        window.addEventListener('scroll', scheduleMeasure, true);

        return () => {
            window.clearTimeout(settleTimer);
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', scheduleMeasure);
            window.removeEventListener('scroll', scheduleMeasure, true);
        };
    }, [open, currentStep]);

    const finishTour = useCallback((dismissAll = false) => {
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
    }, [role, userId, resolvedPageKey]);

    useEffect(() => {
        if (!open || typeof window === 'undefined') return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                finishTour(false);
            } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
                if (stepIndex < activeSteps.length - 1) {
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
    }, [open, stepIndex, activeSteps.length, finishTour]);

    if (!open || !currentStep || typeof document === 'undefined') {
        return null;
    }

    const isLast = stepIndex === activeSteps.length - 1;
    const { pos, arrowSide, arrowOffset } = computeAnchoredLayout(highlightRect, sidebarRight);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-title"
            className="pointer-events-none fixed inset-0 z-[10050]"
        >
            {/* Clean click-to-dismiss backdrop — zero blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`pointer-events-auto fixed inset-0 transition-colors duration-300 ${
                    highlightRect ? 'bg-transparent' : 'bg-slate-950/32'
                }`}
                onClick={() => finishTour(false)}
                aria-hidden="true"
            />

            {/* Silky gliding spotlight cutout */}
            {highlightRect && (
                <motion.div
                    aria-hidden="true"
                    initial={{
                        opacity: 0,
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                    }}
                    animate={{
                        opacity: 1,
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                    }}
                    transition={SMOOTH_TRANSITION}
                    className="pointer-events-none fixed z-[10051] rounded-2xl ring-2 ring-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.38)]"
                >
                    <motion.span
                        className="absolute -inset-1.5 rounded-[18px] border-2 border-brand-400/65"
                        animate={{ opacity: [0.75, 0.2, 0.75], scale: [1, 1.015, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>
            )}

            {/* Single persistent card that glides smoothly between feature targets */}
            <motion.div
                initial={{
                    opacity: 0,
                    scale: 0.96,
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                }}
                transition={SMOOTH_TRANSITION}
                className="pointer-events-auto fixed z-[10052] rounded-2xl border border-gray-200/90 bg-white p-4 shadow-[0_22px_54px_-12px_rgba(15,23,42,0.38)] dark:border-gray-700/90 dark:bg-gray-900"
            >
                {arrowSide === 'left' && (
                    <span
                        aria-hidden="true"
                        style={{ top: arrowOffset }}
                        className="absolute -left-2 h-3.5 w-3.5 rotate-45 border-b border-l border-gray-200/90 bg-white transition-all duration-300 dark:border-gray-700/90 dark:bg-gray-900"
                    />
                )}
                {arrowSide === 'right' && (
                    <span
                        aria-hidden="true"
                        style={{ top: arrowOffset }}
                        className="absolute -right-2 h-3.5 w-3.5 rotate-45 border-r border-t border-gray-200/90 bg-white transition-all duration-300 dark:border-gray-700/90 dark:bg-gray-900"
                    />
                )}
                {arrowSide === 'top' && (
                    <span
                        aria-hidden="true"
                        style={{ left: arrowOffset }}
                        className="absolute -top-2 h-3.5 w-3.5 rotate-45 border-l border-t border-gray-200/90 bg-white transition-all duration-300 dark:border-gray-700/90 dark:bg-gray-900"
                    />
                )}
                {arrowSide === 'bottom' && (
                    <span
                        aria-hidden="true"
                        style={{ left: arrowOffset }}
                        className="absolute -bottom-2 h-3.5 w-3.5 rotate-45 border-b border-r border-gray-200/90 bg-white transition-all duration-300 dark:border-gray-700/90 dark:bg-gray-900"
                    />
                )}

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={currentStep.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                        <div className="flex items-start justify-between gap-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                                    <ExploreIcon sx={{ fontSize: 18 }} />
                                </span>
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <h2 id="guided-tour-title" className="truncate text-sm font-black text-gray-900 dark:text-white">
                                        {currentStep.title}
                                    </h2>
                                    {activeSteps.length > 1 && (
                                        <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-black text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                                            {stepIndex + 1}/{activeSteps.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => finishTour(false)}
                                aria-label="Tutup panduan"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:hover:bg-gray-800 dark:hover:text-white"
                            >
                                <CloseIcon sx={{ fontSize: 16 }} />
                            </button>
                        </div>

                        <p className="mt-2.5 text-xs font-medium leading-5 text-gray-600 dark:text-gray-300">
                            {currentStep.description}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        {activeSteps.length > 1 && (
                            <div className="flex items-center gap-1">
                                {activeSteps.map((step, idx) => (
                                    <button
                                        key={step.id}
                                        type="button"
                                        onClick={() => setStepIndex(idx)}
                                        aria-label={`Langkah ${idx + 1}: ${step.title}`}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            idx === stepIndex
                                                ? 'w-5 bg-brand-600 dark:bg-brand-400'
                                                : idx < stepIndex
                                                    ? 'w-1.5 bg-brand-300 hover:bg-brand-500 dark:bg-brand-700'
                                                    : 'w-1.5 bg-gray-200 hover:bg-gray-400 dark:bg-gray-700'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        {role === 'user' && (
                            <button
                                type="button"
                                onClick={() => finishTour(true)}
                                className="text-[11px] font-semibold text-gray-400 transition hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                            >
                                Jangan tampilkan
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                                aria-label="Langkah sebelumnya"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <ChevronLeftIcon sx={{ fontSize: 17 }} />
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
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-black text-white shadow-xs transition hover:bg-brand-700 active:scale-95"
                        >
                            {isLast ? (
                                <>
                                    <CheckIcon sx={{ fontSize: 15 }} />
                                    OK
                                </>
                            ) : (
                                <>
                                    Lanjut
                                    <ChevronRightIcon sx={{ fontSize: 15 }} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body,
    );
}
