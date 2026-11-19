import React, { useEffect, useMemo, useState } from 'react';
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import TranslateIcon from '@mui/icons-material/Translate';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import useMediaQuery from '@mui/material/useMediaQuery';

const heroSlides = [
    { src: MountFujiBg, label: 'Gunung Fuji' },
    { src: '/images/dashboard/kiyomizu.jpg', label: 'Kuil Kiyomizu-dera' },
    { src: '/images/dashboard/arashiyama.jpg', label: 'Hutan bambu Arashiyama' },
];

function HeroCarousel({ children }) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [focused, setFocused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(true);
    const [visible, setVisible] = useState(true);
    const [ready, setReady] = useState([0]);

    useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncMotion = () => setReducedMotion(preference.matches);
        const syncVisibility = () => setVisible(!document.hidden);
        syncMotion();
        syncVisibility();
        preference.addEventListener('change', syncMotion);
        document.addEventListener('visibilitychange', syncVisibility);
        return () => {
            preference.removeEventListener('change', syncMotion);
            document.removeEventListener('visibilitychange', syncVisibility);
        };
    }, []);

    useEffect(() => {
        if (paused || focused || reducedMotion || !visible || ready.length < 2) return;
        const timer = window.setInterval(() => {
            setActive(current => ready[(ready.indexOf(current) + 1) % ready.length]);
        }, 8000);
        return () => window.clearInterval(timer);
    }, [paused, focused, reducedMotion, visible, ready]);

    return (
        <div className="relative mx-auto flex min-h-[520px] w-[97%] items-center justify-center overflow-hidden py-20"
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {heroSlides.map((slide, index) => (
                    <img key={slide.src} src={slide.src} alt="" loading={index === 0 ? 'eager' : 'lazy'}
                        fetchpriority={index === 0 ? 'high' : 'low'} decoding="async"
                        onLoad={() => setReady(current => current.includes(index) ? current : [...current, index].sort())}
                        onError={() => { setReady(current => current.filter(item => item !== index)); setActive(current => current === index ? 0 : current); }}
                        className={`absolute inset-0 h-full w-full object-cover object-[center_35%] transition-opacity duration-1000 motion-reduce:transition-none ${active === index ? 'opacity-100' : 'opacity-0'}`} />
                ))}
            </div>
            {children}
            <details className="absolute bottom-11 left-4 z-20 text-xs text-gray-700 sm:left-6 dark:text-gray-200">
                <summary className="cursor-pointer rounded-full bg-white/95 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-gray-900/95">Kredit foto</summary>
                <div className="absolute bottom-full mb-2 w-64 rounded-xl border border-gray-200 bg-white p-3 leading-relaxed shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    Kiyomizu-dera: <a className="underline" href="https://commons.wikimedia.org/wiki/File:JAP_Kyoto_Kiyomizu-dera.jpg" target="_blank" rel="noopener noreferrer">Grueslayer @Wikipedia</a>, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Foto diperkecil dan ditampilkan dengan crop serta overlay.
                    <br />Arashiyama: Erol Ahmed, CC0.
                </div>
            </details>
            <div role="group" aria-label="Pilihan latar Jepang" className="absolute bottom-11 right-4 z-20 flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 shadow-sm sm:right-6 dark:border-gray-700 dark:bg-gray-900/95">
                {heroSlides.map((slide, index) => (
                    <button key={slide.src} type="button" disabled={!ready.includes(index)}
                        aria-label={`Tampilkan ${slide.label}`} aria-pressed={active === index}
                        onClick={() => { setActive(index); setPaused(true); }}
                        className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-30">
                        <span className={`h-2 w-2 rounded-full ${active === index ? 'bg-green-700 dark:bg-green-300' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    </button>
                ))}
                {!reducedMotion && <button type="button" aria-label={paused ? 'Putar pergantian latar' : 'Jeda pergantian latar'}
                    onClick={() => setPaused(current => !current)}
                    className="min-h-11 rounded-full px-3 text-xs font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-gray-200">
                    {paused ? 'Putar' : 'Jeda'}
                </button>}
            </div>
        </div>
    );
}

function SectionHeader({ eyebrow, title, actionHref, actionLabel }) {
    return (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 lg:mb-5 lg:items-end lg:gap-3">
            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                        {eyebrow}
                    </p>
                )}
                <h2 className="text-base font-semibold text-gray-900 [overflow-wrap:anywhere] dark:text-white lg:text-2xl">{title}</h2>
            </div>
            {actionHref && (
                <Link href={actionHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-green-700 transition lg:hover:text-green-800 dark:text-green-300">
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
        <aside className="min-w-0 rounded-lg border border-amber-200/70 bg-amber-50/80 p-3.5 dark:border-amber-900/40 dark:bg-gray-900 lg:rounded-3xl lg:bg-gradient-to-br lg:from-amber-50/80 lg:to-orange-50/40 lg:p-6 lg:shadow-sm dark:lg:from-gray-900 dark:lg:to-amber-950/20">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <HitodamaIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Target Hari Ini</p>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white lg:text-base">Capai {xpTarget} XP</h3>
                    </div>
                </div>
                <CheckCircleIcon className={goal.completed ? 'text-emerald-500' : 'text-amber-400/80'} />
            </div>
            <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-3">
                <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                        <span>XP Terkumpul</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{xpEarned} <span className="font-normal text-gray-400">/ {xpTarget} XP</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-amber-200/60 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${xpProgress}%` }} />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 lg:rounded-2xl lg:border lg:border-amber-200/50 lg:bg-white/90 lg:px-4 lg:py-3 lg:shadow-sm dark:lg:border-gray-800 dark:lg:bg-gray-900/90">
                    <span className="flex items-center gap-2">
                        <QuizIcon sx={{ fontSize: 17 }} className="text-amber-500" />
                        Sesi Latihan
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${goal.sessions_done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {sessionsCompleted >= 1 ? 'Selesai' : '0/1 Sesi'}
                    </span>
                </div>
            </div>
            <p className="mt-4 hidden text-sm font-normal leading-relaxed text-gray-600 dark:text-gray-400 lg:block">
                {goal.completed ? 'Target hari ini sudah tercapai! Pertahankan ritme belajarmu besok.' : 'Selesaikan satu sesi latihan kuis untuk menutup target harian.'}
            </p>

            <Link
                href={goal.quiz_url || route('user.kelas.index')}
                className="mt-2 inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-amber-800 lg:mt-4 lg:flex lg:w-full lg:gap-2 lg:rounded-2xl lg:bg-linear-to-r lg:from-amber-500 lg:to-orange-500 lg:px-4 lg:py-2.5 lg:text-xs lg:font-black lg:shadow-md fine-pointer:lg:hover:from-amber-600 fine-pointer:lg:hover:to-orange-600"
            >
                <PlayArrowIcon sx={{ fontSize: 18 }} />
                <span className="lg:hidden">{goal.completed ? 'Latihan tambahan' : 'Mulai kuis'}</span>
                <span className="hidden lg:inline">{goal.completed ? 'Latihan Tambahan (+5 XP)' : 'Mulai Kuis Campuran Harian (10 Soal · +30 XP)'}</span>
            </Link>
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
    dashboardMixedQuiz = { available: false, program_count: 0, programs: [], start_url: '', target_count: 10, xp_reward: 30 },
    lastCompletedQuiz = null,
    dailyGoal = {},
    weakspotSummary = { has_weakspot: false, count: 0, url: '' },
    liveAlert = null,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [selectedMixedProgramId, setSelectedMixedProgramId] = useState('');
    const showPhotoCarousel = useMediaQuery('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

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
        { label: 'Kelas Live', href: route('user.live-classes.index'), icon: VideoCameraFrontIcon },
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

    const handleStartMixedQuiz = () => {
        const query = selectedMixedProgramId ? { program_id: selectedMixedProgramId } : {};
        router.visit(route('user.kuis-campuran.dashboard', query));
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Beranda Utama">
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" />
            </Head>

            <div className="relative min-h-screen w-full overflow-hidden bg-[#F7FAF8] pb-16 transition-colors duration-300 dark:bg-gray-950">
                <div className="pointer-events-none absolute inset-x-0 top-[360px] hidden h-[620px] bg-[radial-gradient(circle_at_18%_20%,rgba(48,192,96,0.08),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(37,99,235,0.07),transparent_32%),linear-gradient(180deg,rgba(247,250,248,0)_0%,rgba(247,250,248,0.78)_22%,rgba(255,255,255,0.88)_52%,rgba(247,250,248,0.9)_100%)] lg:block dark:bg-[radial-gradient(circle_at_18%_20%,rgba(48,192,96,0.09),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(37,99,235,0.08),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0)_0%,rgba(3,7,18,0.58)_24%,rgba(17,24,39,0.88)_58%,rgba(3,7,18,1)_100%)]" />
                <div className="pointer-events-none absolute left-8 top-[560px] hidden text-[11rem] font-black leading-none text-brand-900/[0.04] dark:text-white/[0.035] lg:block">学</div>
                <div className="pointer-events-none absolute right-10 top-[860px] hidden text-[10rem] font-black leading-none text-amber-900/[0.05] dark:text-white/[0.03] lg:block">語</div>

                {!showPhotoCarousel && <header className="mx-auto max-w-7xl px-3 pb-3 pt-4 min-[380px]:px-4 sm:px-6">
                    <h1 className="text-xl font-semibold text-gray-950 dark:text-white">Beranda</h1>
                    <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-2.5 dark:divide-gray-800 dark:border-gray-800">
                        <div className="min-w-0 pr-2">
                            <dt className="text-xs text-gray-600 dark:text-gray-400">Lv.{user.level || 1}</dt>
                            <dd className="text-sm font-semibold tabular-nums text-gray-900 [overflow-wrap:anywhere] dark:text-white">{user.xp || 0} XP</dd>
                        </div>
                        <div className="min-w-0 px-2.5">
                            <dt className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"><HitodamaIcon className="size-3 shrink-0 text-orange-600" aria-hidden="true" /> Streak</dt>
                            <dd className="text-sm font-semibold tabular-nums text-gray-900 [overflow-wrap:anywhere] dark:text-white">{user.streak_count || 0} hari</dd>
                        </div>
                        <div className="min-w-0 pl-2.5">
                            <dt className="text-xs text-gray-600 dark:text-gray-400">Akses</dt>
                            <dd className={`text-sm font-semibold ${isPremium ? 'text-amber-800 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>{isPremium ? 'Premium' : 'Gratis'}</dd>
                        </div>
                    </dl>
                    {isPremium && activeSubscription && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Premium aktif sampai {new Date(activeSubscription.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    )}
                </header>}

                {showPhotoCarousel && <HeroCarousel>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.45)_0%,rgba(3,7,18,0.28)_58%,rgba(247,250,248,0.20)_76%,#F7FAF8_100%)] transition-colors duration-300 dark:bg-[linear-gradient(180deg,rgba(3,7,18,0.45)_0%,rgba(3,7,18,0.28)_58%,rgba(3,7,18,0.45)_80%,#030712_100%)]" />
                    <div className="pointer-events-none absolute inset-x-0 -bottom-px h-20 bg-gradient-to-b from-transparent via-[#F7FAF8]/90 to-[#F7FAF8] dark:via-gray-950/90 dark:to-gray-950" />

                    <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                            Learning Hub
                        </p>
                        <h1 style={{ fontFamily: '"DM Serif Display", Georgia, serif' }} className="mx-auto mb-6 w-full max-w-4xl text-center text-[38px] font-normal leading-[1.12] tracking-[-0.015em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] sm:text-[48px] md:text-[56px]">
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
                                        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 group inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-all  ${isPrimary
                                            ? 'border-green-700 bg-green-700 text-white hover:bg-green-800 dark:border-brand-500'
                                            : isQuiz
                                                ? 'border-gray-200 bg-white/95 text-gray-700 hover:border-gray-400 hover:bg-white dark:border-learning-700 dark:bg-gray-900 dark:text-learning-200'
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
                                <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                    Lv.{user.level || 1}
                                </span>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">XP:</span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{user.xp || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
                                <HitodamaIcon className="h-4 w-4 text-orange-500" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Streak:</span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{user.streak_count || 0} Hari</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
                                {isPremium ? <KabutoIcon className="h-4 w-4 text-amber-500" /> : <ScrollIcon className="h-4 w-4 text-gray-600" />}
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Akses:</span>
                                <span className={`text-xs font-semibold ${isPremium ? 'text-amber-600 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>{isPremium ? 'Premium' : 'Gratis'}</span>
                            </div>
                        </div>

                        {isPremium && activeSubscription && (
                            <div className="mt-4 rounded-full border border-yellow-200 bg-yellow-50/90 px-4 py-1.5 text-xs font-bold text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-300">
                                Premium aktif sampai {new Date(activeSubscription.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                </HeroCarousel>}

                <div className={`relative z-10 mx-auto max-w-7xl space-y-3 px-3 min-[380px]:px-4 sm:px-6 lg:space-y-6 lg:px-8 ${showPhotoCarousel ? 'lg:-mt-10' : ''}`}>
                    {liveAlert && (
                        <aside aria-label="Pengingat Sesi Live" className={`overflow-hidden rounded-lg border p-3.5 transition lg:rounded-3xl lg:p-6 lg:shadow-lg lg:backdrop-blur-md ${
                            liveAlert.is_live
                                ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-900/90 to-emerald-950/95 text-white shadow-emerald-950/30'
                                : 'border-amber-400/40 bg-gradient-to-r from-slate-900/95 to-slate-950/95 text-white shadow-black/40'
                        }`}>
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between lg:gap-4">
                                <div className="flex min-w-0 items-start gap-2.5 lg:gap-4">
                                    <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg lg:size-12 lg:rounded-2xl lg:shadow-md ${
                                        liveAlert.is_live ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                                    }`}>
                                        <VideoCameraFrontIcon sx={{ fontSize: 26 }} />
                                    </div>
                                    <div className="min-w-0 [overflow-wrap:anywhere]">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                                                liveAlert.is_live ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                                            }`}>
                                                {liveAlert.is_live ? (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                                                        Sedang Berlangsung
                                                    </>
                                                ) : (
                                                    <>
                                                        <AccessTimeIcon sx={{ fontSize: 13 }} />
                                                        Hari Ini {liveAlert.time_formatted}
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-300">
                                                {liveAlert.program_title} • {liveAlert.kloter_name}
                                            </span>
                                        </div>
                                        <h3 className="mt-1 text-base font-black text-white sm:text-lg">
                                            {liveAlert.topic}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-300">
                                            {liveAlert.mentor_name ? `Bersama Sensei ${liveAlert.mentor_name}` : 'Sesi Bimbingan Mentor'}
                                            {liveAlert.starts_in_minutes !== null && liveAlert.starts_in_minutes > 0
                                                ? ` · Dimulai dalam ${liveAlert.starts_in_minutes} menit`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 sm:self-center">
                                    <Link
                                        href={liveAlert.join_url}
                                        className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition lg:min-h-12 lg:gap-2 lg:rounded-xl lg:px-5 lg:font-black lg:shadow-md ${
                                            liveAlert.is_live
                                                ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                                : 'bg-white text-slate-950 hover:bg-slate-100'
                                        }`}
                                    >
                                        <PlayArrowIcon sx={{ fontSize: 16 }} />
                                        {liveAlert.is_live ? 'Masuk Sekarang' : 'Ruang Tunggu'}
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    )}
                    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-8">
                        {/* Kolom Kiri: Jalur Belajar (lg:col-span-8) */}
                        <div className="min-w-0 space-y-3 lg:col-span-8 lg:space-y-8">
                            {!showPhotoCarousel && <section className="min-w-0 rounded-lg border border-emerald-200 bg-white px-3.5 py-3 dark:border-emerald-900 dark:bg-gray-900">
                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Lanjutkan Belajar</p>
                                <h2 className="mt-1 text-base font-semibold leading-snug text-gray-950 [overflow-wrap:anywhere] dark:text-white">
                                    {activeLearning?.title || 'Belum Ada Kelas Aktif'}
                                </h2>
                                <p className="mt-1 text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere] dark:text-gray-300">
                                    {activeLearning
                                        ? `${activeLearning.program_title} · Minggu ${activeLearning.week_number}${activeLearning.current_day ? ` · Hari ${activeLearning.current_day.number}` : ''}`
                                        : 'Pilih kelas untuk mulai belajar.'}
                                </p>
                                <Link href={nextAction?.href || activeLearning?.roadmap_url || route('user.kelas.index')}
                                    className="mt-2.5 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-3.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-green-800">
                                    {activeLearning ? 'Lanjutkan' : 'Jelajahi Kelas'} <ArrowRightAltIcon aria-hidden="true" sx={{ fontSize: 18 }} />
                                </Link>
                            </section>}

                            {!showPhotoCarousel && <nav aria-label="Akses cepat" className="flex flex-wrap gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-gray-800 dark:bg-gray-800">
                                {quickLinks.map(({ label, href, icon: Icon }) => (
                                    <Link key={label} href={href} className="flex min-h-11 min-w-0 grow basis-[calc(33.333%_-_1px)] items-center gap-1.5 bg-white px-2 text-xs font-semibold text-gray-800 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus active:bg-emerald-50 dark:bg-gray-900 dark:text-gray-200 dark:active:bg-emerald-950">
                                        <Icon aria-hidden="true" className="shrink-0 text-green-700 dark:text-emerald-300" sx={{ fontSize: 17 }} />
                                        <span className="[overflow-wrap:anywhere]">{label}</span>
                                    </Link>
                                ))}
                            </nav>}
                            {/* 1. Hub Latihan Harian - Grid 2 Kolom: Kuis Campuran & Pemulihan Titik Lemah */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:gap-5">
                                {/* Kartu 1: Kuis Campuran Harian (10 Soal Komprehensif) */}
                                <section className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-emerald-700/40 bg-emerald-900 p-3.5 text-white lg:rounded-3xl lg:bg-gradient-to-br lg:from-emerald-800 lg:to-emerald-950 lg:p-7 lg:shadow-sm">
                                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-2 hidden select-none text-9xl font-black text-white/[0.07] lg:block">
                                        混
                                    </span>
                                    <div className="relative z-10">
                                        <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
                                            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-100">
                                                Latihan Terpadu
                                            </span>
                                            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200">
                                                +30 XP
                                            </span>
                                        </div>
                                        <h2 className="text-base font-semibold text-white lg:text-2xl">
                                            Kuis Campuran Harian
                                        </h2>
                                        <p className="mt-1 text-xs text-emerald-100 lg:hidden">10 soal · +30 XP</p>
                                        <p className="mt-1.5 hidden text-sm leading-relaxed text-emerald-50/90 lg:block">
                                            10 soal pilihan dari seluruh materi yang sudah terbuka. Uji penguasaan Kosakata, Tata Bahasa, dan Wacana.
                                        </p>
                                        <div className="mt-4 hidden flex-wrap items-center gap-2 text-xs font-bold text-white/90 lg:flex">
                                            <span className="rounded-xl bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                                                4 Kosakata
                                            </span>
                                            <span className="rounded-xl bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                                                3 Bunpo
                                            </span>
                                            <span className="rounded-xl bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                                                3 Dokkai
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-2.5 space-y-2 lg:mt-6 lg:space-y-2.5 lg:pt-2">
                                        {dashboardMixedQuiz?.programs?.length > 1 && (
                                            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 text-xs font-bold text-white lg:min-h-0 lg:rounded-xl lg:px-3 lg:py-2 lg:backdrop-blur-sm">
                                                <span className="shrink-0 text-emerald-200">Kelas:</span>
                                                <select
                                                    value={selectedMixedProgramId}
                                                    onChange={(event) => setSelectedMixedProgramId(event.target.value)}
                                                    className="min-h-11 min-w-0 w-full cursor-pointer truncate border-0 bg-transparent py-0 pr-6 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white lg:min-h-0"
                                                >
                                                    <option value="" className="text-gray-900">Semua Kelas Aktif</option>
                                                    {dashboardMixedQuiz.programs.map((program) => (
                                                        <option key={program.id} value={program.id} className="text-gray-900">
                                                            {program.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}

                                        {dashboardMixedQuiz?.available ? (
                                            <button
                                                type="button"
                                                onClick={handleStartMixedQuiz}
                                                className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-emerald-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-emerald-100 fine-pointer:hover:bg-emerald-50 lg:min-h-12 lg:w-full lg:gap-2 lg:rounded-xl lg:px-6 lg:py-3 lg:shadow-sm"
                                            >
                                                <span className="lg:hidden">Mulai kuis</span><span className="hidden lg:inline">Mulai Kuis Campuran</span>
                                                <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                            </button>
                                        ) : (
                                            <Link
                                                href={activeLearning?.roadmap_url || route('user.kelas.index')}
                                                className="inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-emerald-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-emerald-100 fine-pointer:hover:bg-emerald-50 lg:min-h-12 lg:w-full lg:gap-2 lg:rounded-xl lg:px-6 lg:py-3 lg:shadow-sm"
                                            >
                                                <span className="lg:hidden">Buka roadmap</span><span className="hidden lg:inline">Buka Roadmap Belajar</span>
                                                <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                            </Link>
                                        )}
                                    </div>
                                </section>

                                {/* Kartu 2: Pemulihan Titik Lemah (Weakspot Recovery) */}
                                <section className={`relative flex min-w-0 flex-col justify-between overflow-hidden rounded-lg border p-3.5 transition lg:rounded-3xl lg:p-7 lg:shadow-sm ${
                                    weakspotSummary?.has_weakspot
                                        ? 'bg-amber-950 text-white border-amber-700/50 lg:bg-gradient-to-br lg:from-amber-900 lg:via-amber-950 lg:to-orange-950'
                                        : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-800 text-gray-900 dark:text-white'
                                }`}>
                                    <span aria-hidden="true" className={`pointer-events-none absolute -bottom-6 right-2 hidden select-none text-9xl font-black lg:block ${
                                        weakspotSummary?.has_weakspot ? 'text-white/[0.06]' : 'text-gray-900/[0.03] dark:text-white/[0.03]'
                                    }`}>
                                        練
                                    </span>
                                    <div className="relative z-10">
                                        <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                                                weakspotSummary?.has_weakspot
                                                    ? 'bg-amber-500/25 text-amber-200'
                                                    : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                                Pemulihan Materi
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                weakspotSummary?.has_weakspot
                                                    ? 'bg-amber-400 text-amber-950'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                            }`}>
                                                {weakspotSummary?.has_weakspot ? '+20 XP' : 'Materi Bersih'}
                                            </span>
                                        </div>
                                        <h2 className="text-base font-semibold lg:text-2xl">
                                            Pemulihan Titik Lemah
                                        </h2>
                                        <p className={`mt-1 text-xs lg:hidden ${weakspotSummary?.has_weakspot ? 'text-amber-100' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {weakspotSummary?.has_weakspot ? `${weakspotSummary.count} soal untuk diulang · +20 XP` : 'Tidak ada soal yang perlu diulang.'}
                                        </p>
                                        <p className={`mt-1.5 hidden text-sm leading-relaxed lg:block ${
                                            weakspotSummary?.has_weakspot
                                                ? 'text-amber-100/90'
                                                : 'text-gray-600 dark:text-gray-300'
                                        }`}>
                                            {weakspotSummary?.has_weakspot
                                                ? `Ditemukan ${weakspotSummary.count} butir soal yang pernah kamu jawab keliru. Latih kembali untuk menutup celah pemahaman.`
                                                : 'Hebat! Seluruh titik lemah sudah dibersihkan. Kerjakan kuis campuran atau lanjutkan materi untuk mendeteksi area baru.'}
                                        </p>
                                        <div className="mt-4 hidden flex-wrap items-center gap-2 text-xs font-bold lg:flex">
                                            {weakspotSummary?.has_weakspot ? (
                                                <span className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 px-2.5 py-1 text-amber-200 backdrop-blur-sm">
                                                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                                                    <span>{weakspotSummary.count} Soal Butuh Review</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    <CheckCircleIcon sx={{ fontSize: 15 }} />
                                                    <span>0 Kesalahan Aktif</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-2.5 lg:mt-6 lg:pt-2">
                                        <Link
                                            href={weakspotSummary?.url || route('user.weakspot.show', { from: 'beranda' })}
                                            className={`inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:opacity-80 lg:min-h-12 lg:w-full lg:gap-2 lg:rounded-xl lg:px-6 lg:py-3 lg:shadow-sm ${
                                                weakspotSummary?.has_weakspot
                                                    ? 'bg-amber-400 text-amber-950 fine-pointer:hover:bg-amber-300 focus-visible:ring-amber-400 focus-visible:ring-offset-amber-950'
                                                    : 'border border-slate-300 bg-white text-gray-800 fine-pointer:hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:fine-pointer:hover:bg-gray-700 focus-visible:ring-blue-600 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900'
                                            }`}
                                        >
                                            {weakspotSummary?.has_weakspot ? (
                                                <>
                                                    <span className="lg:hidden">Ulangi soal</span><span className="hidden lg:inline">Latih Titik Lemah ({weakspotSummary.count})</span>
                                                    <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                                </>
                                            ) : (
                                                <>
                                                    <span className="lg:hidden">Riwayat soal</span><span className="hidden lg:inline">Tinjau Riwayat Soal</span>
                                                    <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                                </>
                                            )}
                                        </Link>
                                    </div>
                                </section>
                            </div>

                            {/* 2. Belajar Hari Ini - Clean Educational Card with Study Desk Visual */}
                            {showPhotoCarousel && <section className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300">
                                                Lanjutkan Belajar
                                            </p>
                                            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
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
                                            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-800 dark:bg-white dark:text-gray-950 dark:hover:bg-brand-300"
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
                                                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-brand-500 hover:text-green-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                                    >
                                                        <Icon sx={{ fontSize: 16 }} />
                                                        {item.title}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>}

                            {/* 3. Kelas Saya - Modern Roadmap Cards */}
                            <section className="min-w-0 border-t border-slate-200 pt-2 dark:border-gray-800 lg:rounded-3xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-7 lg:shadow-sm dark:lg:bg-gray-900">
                                <SectionHeader
                                    eyebrow="Kelas Saya"
                                    title="Roadmap yang dapat kamu ikuti"
                                    actionHref={route('user.kelas.index')}
                                    actionLabel="Lihat semua kelas"
                                />

                                <div className="space-y-2 lg:space-y-3">
                                    {ownedPrograms.slice(0, 3).map((program) => {
                                        const cardClass = `relative grid ${program.waiting_for_kloter ? 'grid-cols-[48px_minmax(0,1fr)]' : 'grid-cols-[48px_minmax(0,1fr)_20px]'} items-center gap-2.5 overflow-hidden rounded-lg border border-slate-200/80 bg-white p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:gap-4 lg:rounded-2xl lg:p-4 lg:shadow-sm dark:lg:bg-gray-950`;
                                        const content = (
                                            <>
                                                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(48,192,96,0.06),transparent_48%)]" />
                                                <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-2 text-5xl font-black leading-none text-brand-900/[0.08] sm:-bottom-7 sm:right-3 sm:text-7xl dark:text-white/[0.06]">学</span>
                                                <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-16 text-3xl font-black leading-none text-amber-700/[0.07] sm:right-28 sm:text-4xl dark:text-amber-200/[0.05]">語</span>
                                                <div className="relative z-10 size-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-gray-800 lg:h-[72px] lg:w-24 lg:rounded-xl">
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
                                                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 lg:mb-1.5">
                                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${program.waiting_for_kloter
                                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                                            {program.waiting_for_kloter ? 'Menunggu kloter' : 'Kelas aktif'}
                                                        </span>
                                                        {!program.waiting_for_kloter && <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{program.total_modules || 0} modul</span>}
                                                    </div>
                                                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere] dark:text-white lg:text-lg">{program.title}</h3>
                                                    <p className="mt-0.5 line-clamp-2 break-words text-sm font-normal leading-relaxed text-gray-600 dark:text-gray-400">
                                                        {program.waiting_for_kloter
                                                            ? 'Roadmap tersedia setelah jadwal kloter dimulai.'
                                                            : (program.next_module ? `Berikutnya: Week ${program.next_module.week_number} - ${program.next_module.title}` : 'Semua modul yang tersedia telah selesai.')}
                                                    </p>
                                                    {!program.waiting_for_kloter && (
                                                        <div className="mt-2.5 flex items-center gap-3">
                                                            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                                                <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${program.progress}%` }} />
                                                            </div>
                                                            <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-gray-300">{program.progress}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {!program.waiting_for_kloter && <ArrowRightAltIcon aria-hidden="true" className="text-green-700 dark:text-emerald-300 lg:hidden" sx={{ fontSize: 20 }} />}
                                                <span className={`relative z-10 hidden min-h-11 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold lg:inline-flex ${program.waiting_for_kloter
                                                    ? 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
                                                    : 'bg-green-700 text-white lg:group-hover:bg-green-800 shadow-sm'}`}>
                                                    {program.waiting_for_kloter ? 'Menunggu jadwal' : 'Lanjutkan'}
                                                    {!program.waiting_for_kloter && <ArrowRightAltIcon sx={{ fontSize: 18 }} />}
                                                </span>
                                            </>
                                        );

                                        return program.waiting_for_kloter ? (
                                            <article key={program.id} className={cardClass}>{content}</article>
                                        ) : (
                                            <Link key={program.id} href={program.roadmap_url} className={`group ${cardClass} active:bg-emerald-50 dark:active:bg-emerald-950 fine-pointer:hover:border-brand-300 fine-pointer:lg:hover:shadow-sm dark:fine-pointer:lg:hover:border-brand-900/60`}>
                                                {content}
                                            </Link>
                                        );
                                    })}
                                    {ownedPrograms.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 px-3.5 py-3 text-center dark:border-gray-700 dark:bg-gray-950/70 lg:rounded-2xl lg:px-5 lg:py-8">
                                            <SchoolIcon sx={{ fontSize: 30 }} className="mb-2 text-brand-500" />
                                            <p className="font-semibold text-gray-900 dark:text-white">Belum ada kelas aktif</p>
                                            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pilih kelas untuk memulai roadmap belajar.</p>
                                            <Link href={route('user.kelas.index')} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-300">
                                                Jelajahi kelas <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Kolom Kanan: Tracker Habit & Progress (lg:col-span-4) */}
                        <div className="min-w-0 space-y-3 lg:col-span-4 lg:space-y-6">
                            {/* Target Hari Ini */}
                            <DailyGoalCard goal={dailyGoal} />

                            {/* Progress & Aktivitas Kelas */}
                            <section className="min-w-0 border-t border-slate-200 pt-2 dark:border-gray-800 lg:rounded-3xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-6 lg:shadow-sm dark:lg:bg-gray-900">
                                <SectionHeader
                                    eyebrow="Progress"
                                    title="Aktivitas Belajar"
                                    actionHref={route('user.progress')}
                                    actionLabel="Detail"
                                />

                                <div className="space-y-2 lg:space-y-4">
                                    <div className="lg:rounded-2xl lg:border lg:border-slate-100 lg:bg-slate-50/70 lg:p-4 dark:lg:border-gray-800 dark:lg:bg-gray-950/80">
                                        <div className="hidden grid-cols-3 gap-2 text-center lg:grid">
                                            <div className="rounded-xl bg-achievement-50 px-2 py-2.5 dark:bg-achievement-900/30">
                                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{user.xp || 0}</p>
                                                <p className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">XP</p>
                                            </div>
                                            <div className="rounded-xl bg-amber-50 px-2 py-2.5 dark:bg-amber-950/30">
                                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{user.streak_count || 0}</p>
                                                <p className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Streak</p>
                                            </div>
                                            <div className="rounded-xl bg-emerald-50 px-2 py-2.5 dark:bg-emerald-950/30">
                                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{rewardHistory.length}</p>
                                                <p className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Log</p>
                                            </div>
                                        </div>
                                        <Link href={route('user.leaderboard')} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-100 fine-pointer:hover:border-brand-500 fine-pointer:hover:text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 lg:mt-3 lg:min-h-10 lg:w-full lg:rounded-xl lg:py-2">
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
                                                                <p className="line-clamp-2 break-words text-sm font-medium leading-relaxed text-gray-900 dark:text-white">{activity.description || activity.title || activity.source_type || 'Aktivitas belajar'}</p>
                                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                                    {activity.created_at
                                                                        ? new Date(activity.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                                        : 'Baru saja'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {activity.xp_amount !== undefined && (
                                                            <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-300">
                                                                +{activity.xp_amount} XP
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-sm font-normal leading-relaxed text-gray-600 dark:text-gray-400">
                                                Belum ada aktivitas terbaru. Mulai dari kelas aktif untuk mengisi progress.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Berita Terkini Jepang (Bawah Penuh & Simetris) */}
                    <section className="min-w-0 border-t border-slate-200 pt-2 dark:border-gray-800 lg:mt-8 lg:rounded-3xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-8 lg:shadow-sm dark:lg:bg-gray-900">
                        <SectionHeader
                            eyebrow="Update"
                            title="Berita Terkini Jepang"
                            actionHref={route('user.news.index')}
                            actionLabel="Lihat semua berita"
                        />

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                            {news && news.length > 0 ? news.slice(0, 4).map((item, index) => (
                                <Link
                                    href={route('user.news.show', item.slug || item.id)}
                                    key={item.id || index}
                                    className="group grid h-full min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-2.5 overflow-hidden rounded-lg border border-slate-200/80 bg-white p-2.5 outline-none transition focus-visible:ring-2 focus-visible:ring-focus active:bg-emerald-50 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-emerald-950 lg:flex lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-2xl lg:p-0 lg:shadow-sm dark:lg:bg-gray-950"
                                >
                                    <div className="size-16 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 lg:aspect-[16/9] lg:h-auto lg:w-full lg:rounded-none">
                                        {item.thumbnail_url || item.cover_url ? (
                                            <img src={item.thumbnail_url || item.cover_url} alt={item.cover_image_alt || item.title} className="h-full w-full object-cover transition-transform duration-500 lg:group-hover:scale-105" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-3xl font-semibold text-brand-200 dark:from-gray-800 dark:to-gray-900 dark:text-gray-700">
                                                JP
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-grow flex-col lg:p-5">
                                        {item.is_pinned && (
                                            <div className="mb-1 lg:mb-2.5">
                                                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-green-700 dark:bg-[#12351f] dark:text-green-200">
                                                    <span className="lg:hidden">Disematkan</span><span className="hidden lg:inline">PIN Disematkan</span>
                                                </span>
                                            </div>
                                        )}
                                        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 lg:mb-2.5">
                                            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-[#12351f] dark:text-green-200">{item.category?.replaceAll('-', ' ') || 'platform'}</span>
                                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                                            {item.published_at
                                                ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : 'TOKU-UP'}
                                        </div>
                                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors [overflow-wrap:anywhere] dark:text-white lg:mb-2.5 lg:text-base lg:font-bold lg:group-hover:text-green-700 lg:dark:group-hover:text-brand-400">
                                            {item.title}
                                        </h3>
                                        <p className="mb-4 hidden flex-grow text-sm font-normal leading-relaxed text-gray-600 dark:text-gray-300 lg:line-clamp-2">
                                            {item.excerpt || (item.body ? `${item.body.replace(/<[^>]*>/g, '').substring(0, 100)}...` : 'Baca update terbaru dari TOKU-UP.')}
                                        </p>
                                        <div className="mt-auto hidden items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-300 lg:flex">
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
