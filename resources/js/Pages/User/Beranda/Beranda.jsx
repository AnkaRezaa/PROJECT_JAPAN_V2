import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PromoPopup from '@/Components/Marketing/PromoPopup';
import { HitodamaIcon, KabutoIcon, ScrollIcon } from '@/Components/UI/JapaneseIcons';
import theme from '@/Components/theme/themes';
import MountFujiBg from '../../../../Images/Mount-Fuji-New.jpg';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import TranslateIcon from '@mui/icons-material/Translate';

function SectionHeader({ eyebrow, title, actionHref, actionLabel }) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow && (
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                        {eyebrow}
                    </p>
                )}
                <h2 className="text-xl font-black text-gray-900 dark:text-white md:text-2xl">{title}</h2>
            </div>
            {actionHref && (
                <Link href={actionHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-learning-700 transition lg:hover:text-learning-600 dark:text-learning-200">
                    {actionLabel}
                    <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                </Link>
            )}
        </div>
    );
}

function DailyGoalCard({ goal = {} }) {
    const xpTarget = Number(goal.xp_target || 30);
    const xpEarned = Number(goal.xp_earned || 0);
    const xpProgress = Math.min(100, Number(goal.xp_progress || 0));
    const sessionsCompleted = Number(goal.sessions_completed || 0);

    return (
        <aside className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-6 shadow-sm dark:border-amber-900/40 dark:bg-gradient-to-br dark:from-gray-900 dark:to-amber-950/20">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <HitodamaIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Target Hari Ini</p>
                        <h3 className="text-base font-black text-gray-900 dark:text-white">Capai 30 XP</h3>
                    </div>
                </div>
                <CheckCircleIcon className={goal.completed ? 'text-emerald-500' : 'text-amber-400/80'} />
            </div>
            <div className="mt-5 space-y-3">
                <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                        <span>XP Terkumpul</span>
                        <span className="font-black text-gray-900 dark:text-white">{xpEarned} <span className="font-normal text-gray-400">/ {xpTarget} XP</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-amber-200/60 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${xpProgress}%` }} />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-amber-200/50 bg-white/90 px-4 py-3 text-xs font-bold text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-200">
                    <span className="flex items-center gap-2">
                        <QuizIcon sx={{ fontSize: 17 }} className="text-amber-500" />
                        Sesi Latihan
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${goal.sessions_done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {sessionsCompleted >= 1 ? 'Selesai' : '0/1 Sesi'}
                    </span>
                </div>
            </div>
            <p className="mt-4 text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                {goal.completed ? 'Target hari ini sudah tercapai! Pertahankan ritme belajarmu besok.' : 'Selesaikan satu sesi latihan kuis untuk menutup target harian.'}
            </p>
        </aside>
    );
}

export default function BerandaUser({
    user = {},
    activePopup = null,
    recentProgress = [],
    learningDashboard = { programs: [], resources: [] },
    rewardHistory = [],
    news = [],
    activeSubscription = null,
    quickQuiz = null,
    lastCompletedQuiz = null,
    dailyGoal = {},
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [isStartingQuickQuiz, setIsStartingQuickQuiz] = useState(false);
    const [quickQuizProgramId, setQuickQuizProgramId] = useState('');

    const authUser = usePage().props.auth?.user || {};
    const accessStatus = authUser.access_status || user.access_status || {};
    const isPremium = user.subscription_status === 'premium' || accessStatus.is_premium;

    const ownedPrograms = learningDashboard?.programs || [];
    const activeLearning = learningDashboard?.next_module || null;
    const nextAction = learningDashboard?.next_action || null;
    const totalModules = ownedPrograms.reduce((total, program) => total + Number(program.total_modules || 0), 0);
    const recentActivities = recentProgress.length > 0 ? recentProgress.slice(0, 4) : rewardHistory.slice(0, 4);

    const resourceVisuals = {
        presentasi: { icon: SlideshowIcon, tone: 'from-brand-500 to-brand-700' },
        kosakata: { icon: TranslateIcon, tone: 'from-learning-500 to-learning-700' },
        kuis: { icon: QuizIcon, tone: 'from-achievement-400 to-amber-600' },
    };
    const resourceCards = (learningDashboard?.resources || []).map((item) => ({
        ...item,
        icon: resourceVisuals[item.category]?.icon || AutoStoriesIcon,
        tone: resourceVisuals[item.category]?.tone || theme.ctaBg,
    }));
    const visibleResourceCards = resourceCards.filter((item) => item.category !== 'flashcard');
    const resourceByCategory = Object.fromEntries(visibleResourceCards.map((item) => [item.category, item]));
    const quizShortcutUrl = resourceByCategory.kuis?.available && resourceByCategory.kuis?.href
        ? resourceByCategory.kuis.href
        : lastCompletedQuiz?.url || null;
    const quickLinks = [
        { label: 'Kelas Saya', href: activeLearning?.roadmap_url || route('user.kelas.index'), icon: SchoolIcon },
        resourceByCategory.presentasi?.available && resourceByCategory.presentasi?.href
            ? { label: 'Presentasi', href: resourceByCategory.presentasi.href, icon: SlideshowIcon }
            : null,
        resourceByCategory.kosakata?.available && resourceByCategory.kosakata?.href
            ? { label: 'Kosakata', href: resourceByCategory.kosakata.href, icon: TranslateIcon }
            : null,
        quizShortcutUrl ? { label: 'Kuis', href: quizShortcutUrl, icon: QuizIcon } : null,
    ].filter(Boolean);

    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (query.length < 2) return [];

        const items = [
            ...ownedPrograms.map((program) => ({
                id: `program-${program.id}`,
                type: 'Kelas',
                title: program.title,
                subtitle: program.waiting_for_kloter
                    ? 'Menunggu jadwal kloter'
                    : (program.next_module ? `Week ${program.next_module.week_number} - ${program.next_module.title}` : 'Roadmap kelas'),
                href: program.roadmap_url,
                icon: SchoolIcon,
                searchText: `${program.title} ${program.level || ''} ${program.next_module?.title || ''}`,
            })),
            ...(activeLearning ? [{
                id: `module-${activeLearning.id}`,
                type: 'Modul',
                title: activeLearning.title,
                subtitle: `${activeLearning.program_title} - Week ${activeLearning.week_number}`,
                href: activeLearning.roadmap_url,
                icon: AutoStoriesIcon,
                searchText: `${activeLearning.title} ${activeLearning.program_title} week ${activeLearning.week_number}`,
            }] : []),
            ...visibleResourceCards
                .filter((item) => item.available && item.href)
                .map((item) => ({
                    id: `resource-${item.category}`,
                    type: item.category === 'presentasi' ? 'PPT' : item.category.charAt(0).toUpperCase() + item.category.slice(1),
                    title: item.title,
                    subtitle: item.description,
                    href: item.href,
                    icon: item.icon,
                    searchText: `${item.category} ${item.title} ${item.description}`,
                })),
        ];

        return items
            .filter((item) => item.searchText.toLowerCase().includes(query))
            .filter((item, index, list) => list.findIndex((candidate) => candidate.href === item.href) === index)
            .slice(0, 6);
    }, [activeLearning, ownedPrograms, searchQuery, visibleResourceCards]);

    const isSearchReady = searchQuery.trim().length >= 2;

    const handleSearch = (event) => {
        event.preventDefault();

        const result = searchResults[activeSuggestionIndex] || searchResults[0];

        if (result) {
            router.visit(result.href);
        }
    };

    const openQuickQuiz = () => {
        if (quickQuiz?.active && quickQuiz?.resume_url) {
            router.visit(quickQuiz.resume_url);
            return;
        }

        if (!quickQuiz?.available || !quickQuiz?.start_url || isStartingQuickQuiz) return;

        setIsStartingQuickQuiz(true);
        router.post(quickQuiz.start_url, {
            program_id: quickQuizProgramId || null,
        }, {
            onFinish: () => setIsStartingQuickQuiz(false),
        });
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Beranda Utama" />

            <div className="relative min-h-screen w-full overflow-hidden bg-[#F7FAF8] pb-16 transition-colors duration-300 dark:bg-gray-950">
                <div className="pointer-events-none absolute inset-x-0 top-[360px] h-[620px] bg-[radial-gradient(circle_at_18%_20%,rgba(48,192,96,0.08),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(37,99,235,0.07),transparent_32%),linear-gradient(180deg,rgba(247,250,248,0)_0%,rgba(247,250,248,0.78)_22%,rgba(255,255,255,0.88)_52%,rgba(247,250,248,0.9)_100%)] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(48,192,96,0.09),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(37,99,235,0.08),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0)_0%,rgba(3,7,18,0.58)_24%,rgba(17,24,39,0.88)_58%,rgba(3,7,18,1)_100%)]" />
                <div className="pointer-events-none absolute left-8 top-[560px] hidden text-[11rem] font-black leading-none text-brand-900/[0.04] dark:text-white/[0.035] lg:block">学</div>
                <div className="pointer-events-none absolute right-10 top-[860px] hidden text-[10rem] font-black leading-none text-amber-900/[0.05] dark:text-white/[0.03] lg:block">語</div>

                <div
                    className="relative w-full overflow-hidden bg-cover bg-center pb-20 pt-12 sm:pb-24 sm:pt-16"
                    style={{ backgroundImage: `url(${MountFujiBg})` }}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.58)_52%,rgba(247,250,248,0.94)_86%,#F7FAF8_100%)] transition-colors duration-300 dark:bg-[linear-gradient(180deg,rgba(3,7,18,0.20)_0%,rgba(3,7,18,0.55)_56%,rgba(3,7,18,0.92)_88%,#030712_100%)]" />
                    <div className="pointer-events-none absolute inset-x-0 -bottom-px h-40 bg-gradient-to-b from-transparent via-[#F7FAF8]/90 to-[#F7FAF8] dark:via-gray-950/90 dark:to-gray-950" />

                    <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-brand-600 dark:text-brand-300">
                            Learning Hub
                        </p>
                        <h1 className="mb-6 text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-5xl">
                            Mau lanjut belajar apa hari ini?
                        </h1>

                        <nav aria-label="Akses cepat" className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
                            {quickLinks.map((item) => {
                                const Icon = item.icon;
                                const isPrimary = item.label === 'Kelas Saya';
                                const isQuiz = item.label === 'Kuis';

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`group inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 ${isPrimary
                                            ? 'border-brand-500 bg-brand-600 text-white hover:bg-brand-700 dark:border-brand-500'
                                            : isQuiz
                                                ? 'border-learning-200 bg-white/95 text-learning-800 hover:border-learning-400 hover:bg-white dark:border-learning-700 dark:bg-gray-900 dark:text-learning-200'
                                                : 'border-white/80 bg-white/90 text-gray-700 hover:border-brand-200 hover:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                                    >
                                        <Icon sx={{ fontSize: 18 }} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Stats Floating Pill Bar */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
                                <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                    Lv.{user.level || 1}
                                </span>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">XP:</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white">{user.xp || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
                                <HitodamaIcon className="h-4 w-4 text-orange-500" />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Streak:</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white">{user.streak_count || 0} Hari</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
                                {isPremium ? <KabutoIcon className="h-4 w-4 text-amber-500" /> : <ScrollIcon className="h-4 w-4 text-gray-500" />}
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Akses:</span>
                                <span className={`text-xs font-black ${isPremium ? 'text-amber-600 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>{isPremium ? 'Premium' : 'Gratis'}</span>
                            </div>
                        </div>

                        {isPremium && activeSubscription && (
                            <div className="mt-4 rounded-full border border-yellow-200 bg-yellow-50/90 px-4 py-1.5 text-xs font-bold text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-300">
                                Premium aktif sampai {new Date(activeSubscription.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* Kolom Kiri: Jalur Belajar (lg:col-span-8) */}
                        <div className="space-y-8 lg:col-span-8">
                            {/* 1. Quick Quiz - Energetic Action Card */}
                            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-7">
                                <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-3 select-none text-9xl font-black text-white/[0.08]">
                                    問
                                </span>
                                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-4 sm:gap-5">
                                        <div className="hidden sm:flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-3xl bg-white/10 p-1 shadow-inner backdrop-blur-sm">
                                            <img
                                                src="/images/quick_quiz_anime.svg"
                                                alt="Quick Quiz Mascot Anime"
                                                className="h-full w-full object-contain filter drop-shadow"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-100">
                                                    Latihan Cepat
                                                </span>
                                                {quickQuiz?.active && (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> Sesi Sedang Berjalan
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-xl font-black text-white sm:text-2xl">
                                                {quickQuiz?.active ? 'Lanjutkan Sesi Latihan' : (quickQuiz?.available ? 'Asah Refleks Kosakata & Tata Bahasa' : 'Quick Quiz Siap')}
                                            </h2>
                                            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-emerald-50/90">
                                                {quickQuiz?.active
                                                    ? `Tersisa ${quickQuiz.remaining_count} pertanyaan dalam sesi ini. Berlaku selama 30 menit.`
                                                    : (quickQuiz?.available
                                                        ? 'Ulangi materi yang sudah terbuka dari seluruh kelasmu. Jawaban yang belum tepat akan muncul kembali.'
                                                        : 'Selesaikan materi pertama di roadmap agar Quick Quiz dapat menyusun latihan harianmu.')}
                                            </p>
                                            {quickQuiz?.available && (
                                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-white/90">
                                                    <span className="rounded-xl bg-white/15 px-3 py-1 backdrop-blur-sm">
                                                        {quickQuiz.target_count} Target Soal
                                                    </span>
                                                    <span className="rounded-xl bg-white/15 px-3 py-1 backdrop-blur-sm">
                                                        {quickQuiz.program_count} Kelas Aktif
                                                    </span>
                                                    {!quickQuiz.active && quickQuiz.programs?.length > 1 && (
                                                        <label className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1 text-xs font-bold text-white">
                                                            <span className="text-emerald-200">Filter:</span>
                                                            <select
                                                                value={quickQuizProgramId}
                                                                onChange={(event) => setQuickQuizProgramId(event.target.value)}
                                                                className="cursor-pointer border-0 bg-transparent py-0.5 pr-6 text-xs font-bold text-white focus:ring-0"
                                                            >
                                                                <option value="" className="text-gray-900">Semua Kelas</option>
                                                                {quickQuiz.programs.map((program) => (
                                                                    <option key={program.id} value={program.id} className="text-gray-900">
                                                                        {program.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        {quickQuiz?.available ? (
                                            <button
                                                type="button"
                                                onClick={openQuickQuiz}
                                                disabled={isStartingQuickQuiz}
                                                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-black text-emerald-900 shadow-md transition-all hover:bg-emerald-50 hover:shadow-lg hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                                            >
                                                {isStartingQuickQuiz ? 'Menyiapkan...' : (quickQuiz.active ? 'Lanjutkan Kuis' : 'Mulai Latihan')}
                                                <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                            </button>
                                        ) : (
                                            <Link
                                                href={activeLearning?.roadmap_url || route('user.kelas.index')}
                                                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-black text-emerald-900 shadow-md transition-all hover:bg-emerald-50 hover:-translate-y-0.5 sm:w-auto"
                                            >
                                                Buka Roadmap <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* 2. Belajar Hari Ini - Clean Educational Card with Study Desk Visual */}
                            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-4 sm:gap-5">
                                        <div className="hidden sm:flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-[28px] border border-slate-200/80 shadow-sm dark:border-gray-800">
                                            <img
                                                src="/images/study_desk_anime.svg"
                                                alt="Meja Belajar Anime"
                                                className="h-full w-full rounded-[28px] object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                                Lanjutkan Belajar
                                            </p>
                                            <h2 className="text-xl font-black text-gray-900 sm:text-2xl dark:text-white">
                                                {activeLearning ? activeLearning.title : 'Belum Ada Kelas Aktif'}
                                            </h2>
                                            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                                {activeLearning
                                                    ? `${activeLearning.program_title} • Week ${activeLearning.week_number}${activeLearning.current_day ? `, Hari ${activeLearning.current_day.number}: ${activeLearning.current_day.title}` : ''}`
                                                    : 'Pilih kelas untuk memulai roadmap belajar dan membuka materi mingguan.'}
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {totalModules} Modul
                                                </span>
                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    {ownedPrograms.length} Kelas Aktif
                                                </span>
                                                <span className={`rounded-full px-3 py-1 ${isPremium ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                    {isPremium ? 'Akses Premium' : 'Akses Gratis'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                                        <Link
                                            href={nextAction?.href || activeLearning?.roadmap_url || route('user.kelas.index')}
                                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-7 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-brand-600 hover:-translate-y-0.5 dark:bg-white dark:text-gray-950 dark:hover:bg-brand-300"
                                        >
                                            {nextAction?.label || (activeLearning ? 'Buka Roadmap' : 'Jelajahi Kelas')}
                                            <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                        </Link>
                                        <div className="grid grid-cols-2 gap-2">
                                            {visibleResourceCards.filter((item) => item.available && item.href).slice(0, 4).map((item) => {
                                                const Icon = item.icon;

                                                return (
                                                    <Link
                                                        key={item.category}
                                                        href={item.href}
                                                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                                    >
                                                        <Icon sx={{ fontSize: 16 }} />
                                                        {item.title}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Kelas Saya - Modern Roadmap Cards */}
                            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-gray-800 dark:bg-gray-900">
                                <SectionHeader
                                    eyebrow="Kelas Saya"
                                    title="Roadmap yang dapat kamu ikuti"
                                    actionHref={route('user.kelas.index')}
                                    actionLabel="Lihat semua kelas"
                                />

                                <div className="space-y-3">
                                    {ownedPrograms.slice(0, 3).map((program) => {
                                        const cardClass = 'relative grid grid-cols-[72px_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4 dark:border-gray-800 dark:bg-gray-950';
                                        const content = (
                                            <>
                                                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(48,192,96,0.06),transparent_48%)]" />
                                                <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-2 text-5xl font-black leading-none text-brand-900/[0.08] sm:-bottom-7 sm:right-3 sm:text-7xl dark:text-white/[0.06]">学</span>
                                                <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-16 text-3xl font-black leading-none text-amber-700/[0.07] sm:right-28 sm:text-4xl dark:text-amber-200/[0.05]">語</span>
                                                <div className="relative z-10 h-16 w-[72px] overflow-hidden rounded-xl bg-slate-100 sm:h-[72px] sm:w-24 dark:bg-gray-800">
                                                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                                                        <SchoolIcon sx={{ fontSize: 26 }} />
                                                    </div>
                                                    {program.thumbnail_url && (
                                                        <img
                                                            src={program.thumbnail_url}
                                                            alt=""
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                            loading="lazy"
                                                            onError={(event) => event.currentTarget.classList.add('hidden')}
                                                        />
                                                    )}
                                                </div>
                                                <div className="relative z-10 min-w-0">
                                                    <div className="mb-1.5 flex items-center gap-2">
                                                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${program.waiting_for_kloter
                                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                                            {program.waiting_for_kloter ? 'Menunggu kloter' : 'Kelas aktif'}
                                                        </span>
                                                        {!program.waiting_for_kloter && <span className="text-xs font-bold text-slate-500 dark:text-gray-400">{program.total_modules || 0} modul</span>}
                                                    </div>
                                                    <h3 className="truncate text-base font-black text-slate-900 sm:text-lg dark:text-white">{program.title}</h3>
                                                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                                                        {program.waiting_for_kloter
                                                            ? 'Roadmap tersedia setelah jadwal kloter dimulai.'
                                                            : (program.next_module ? `Berikutnya: Week ${program.next_module.week_number} - ${program.next_module.title}` : 'Semua modul yang tersedia telah selesai.')}
                                                    </p>
                                                    {!program.waiting_for_kloter && (
                                                        <div className="mt-2.5 flex items-center gap-3">
                                                            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                                                <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${program.progress}%` }} />
                                                            </div>
                                                            <span className="shrink-0 text-xs font-black text-slate-700 dark:text-gray-300">{program.progress}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`relative z-10 col-span-2 inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-4 text-xs font-black sm:col-auto sm:min-h-11 ${program.waiting_for_kloter
                                                    ? 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
                                                    : 'bg-brand-600 text-white lg:group-hover:bg-brand-700 shadow-sm'}`}>
                                                    {program.waiting_for_kloter ? 'Menunggu jadwal' : 'Lanjutkan'}
                                                    {!program.waiting_for_kloter && <ArrowRightAltIcon sx={{ fontSize: 18 }} />}
                                                </span>
                                            </>
                                        );

                                        return program.waiting_for_kloter ? (
                                            <article key={program.id} className={cardClass}>{content}</article>
                                        ) : (
                                            <Link key={program.id} href={program.roadmap_url} className={`group ${cardClass} hover:border-brand-300 hover:shadow-md lg:dark:hover:border-brand-900/60`}>
                                                {content}
                                            </Link>
                                        );
                                    })}
                                    {ownedPrograms.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-950/70">
                                            <SchoolIcon sx={{ fontSize: 30 }} className="mb-2 text-brand-500" />
                                            <p className="font-black text-gray-900 dark:text-white">Belum ada kelas aktif</p>
                                            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pilih kelas untuk memulai roadmap belajar.</p>
                                            <Link href={route('user.kelas.index')} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-black text-brand-600 dark:text-brand-400">
                                                Jelajahi kelas <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Kolom Kanan: Tracker Habit & Progress (lg:col-span-4) */}
                        <div className="space-y-6 lg:col-span-4">
                            {/* Target Hari Ini */}
                            <DailyGoalCard goal={dailyGoal} />

                            {/* Progress & Aktivitas Kelas */}
                            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <SectionHeader
                                    eyebrow="Progress"
                                    title="Aktivitas Belajar"
                                    actionHref={route('user.progress')}
                                    actionLabel="Detail"
                                />

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/80">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-xl bg-achievement-50 px-2 py-2.5 dark:bg-achievement-900/30">
                                                <p className="text-xl font-black text-achievement-700 dark:text-achievement-100">{user.xp || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">XP</p>
                                            </div>
                                            <div className="rounded-xl bg-amber-50 px-2 py-2.5 dark:bg-amber-950/30">
                                                <p className="text-xl font-black text-amber-600 dark:text-amber-300">{user.streak_count || 0}</p>
                                                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Streak</p>
                                            </div>
                                            <div className="rounded-xl bg-emerald-50 px-2 py-2.5 dark:bg-emerald-950/30">
                                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-300">{rewardHistory.length}</p>
                                                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Log</p>
                                            </div>
                                        </div>
                                        <Link href={route('user.leaderboard')} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                            Lihat peringkat liga <ArrowRightAltIcon sx={{ fontSize: 17 }} />
                                        </Link>
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-gray-800 dark:bg-gray-950/80">
                                        {recentActivities.length > 0 ? (
                                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {recentActivities.map((activity, index) => (
                                                    <div key={activity.id || index} className="flex items-center justify-between gap-2 px-3 py-3 transition sm:px-4 lg:hover:bg-gray-50 lg:dark:hover:bg-gray-900">
                                                        <div className="flex min-w-0 items-center gap-2.5">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                                                                {activity.source_type === 'quiz' ? <QuizIcon sx={{ fontSize: 16 }} /> : <AutoStoriesIcon sx={{ fontSize: 16 }} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{activity.description || activity.title || activity.source_type || 'Aktivitas belajar'}</p>
                                                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-400">
                                                                    {activity.created_at
                                                                        ? new Date(activity.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                                        : 'Baru saja'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {activity.xp_amount !== undefined && (
                                                            <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-xs font-black text-green-600 dark:bg-green-900/30 dark:text-green-300">
                                                                +{activity.xp_amount} XP
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-xs font-medium text-gray-400 dark:text-gray-400">
                                                Belum ada aktivitas terbaru. Mulai dari kelas aktif untuk mengisi progress.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Berita Terkini Jepang (Bawah Penuh & Simetris) */}
                    <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
                        <SectionHeader
                            eyebrow="Update"
                            title="Berita Terkini Jepang"
                            actionHref={route('user.news.index')}
                            actionLabel="Lihat semua berita"
                        />

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {news && news.length > 0 ? news.slice(0, 4).map((item, index) => (
                                <Link
                                    href={route('user.news.show', item.slug || item.id)}
                                    key={item.id || index}
                                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <div className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        {item.thumbnail_url || item.cover_url ? (
                                            <img src={item.thumbnail_url || item.cover_url} alt={item.cover_image_alt || item.title} className="h-full w-full object-cover transition-transform duration-500 lg:group-hover:scale-105" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-3xl font-black text-brand-200 dark:from-gray-800 dark:to-gray-900 dark:text-gray-700">
                                                JP
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-grow flex-col p-4 sm:p-5">
                                        {item.is_pinned && (
                                            <div className="mb-2.5">
                                                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:bg-[#12351f] dark:text-green-200">
                                                    PIN Disematkan
                                                </span>
                                            </div>
                                        )}
                                        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-[#12351f] dark:text-green-200">{item.category?.replaceAll('-', ' ') || 'platform'}</span>
                                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                                            {item.published_at
                                                ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : 'TOKU-UP'}
                                        </div>
                                        <h3 className="mb-2 text-base font-extrabold leading-snug text-gray-900 transition-colors sm:mb-2.5 lg:group-hover:text-brand-600 dark:text-white lg:dark:group-hover:text-brand-400 line-clamp-2">
                                            {item.title}
                                        </h3>
                                        <p className="mb-4 line-clamp-2 flex-grow text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-300">
                                            {item.excerpt || (item.body ? `${item.body.replace(/<[^>]*>/g, '').substring(0, 100)}...` : 'Baca update terbaru dari TOKU-UP.')}
                                        </p>
                                        <div className="mt-auto flex items-center gap-1.5 text-xs font-black text-brand-600 dark:text-brand-400">
                                            Baca selengkapnya
                                            <ArrowRightAltIcon sx={{ fontSize: 18 }} />
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <p className="w-full text-sm font-medium text-gray-700 md:col-span-4 dark:text-gray-300">Belum ada berita terbaru.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
            <PromoPopup popup={activePopup} />
        </AuthenticatedLayout>
    );
}
