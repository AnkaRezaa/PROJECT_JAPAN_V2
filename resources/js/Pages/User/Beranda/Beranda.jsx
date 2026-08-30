import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { HitodamaIcon, KabutoIcon, ScrollIcon } from '@/Components/JapaneseIcons';
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
        <aside className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Target Hari Ini</p>
                    <h3 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Satu sesi, 30 XP</h3>
                </div>
                <CheckCircleIcon className={goal.completed ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
            <div className="mt-4 space-y-3">
                <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                        <span>XP hari ini</span>
                        <span>{xpEarned}/{xpTarget}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/60">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${xpProgress}%` }} />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/80 px-3 py-2.5 text-xs font-black text-gray-700 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200">
                    <span>Sesi selesai</span>
                    <span className={goal.sessions_done ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}>{sessionsCompleted >= 1 ? 'Selesai' : '0/1'}</span>
                </div>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-gray-700 dark:text-gray-300">
                {goal.completed ? 'Target hari ini sudah tercapai. Jaga ritmenya besok.' : 'Selesaikan satu sesi kuis dan kumpulkan 30 XP untuk menutup target hari ini.'}
            </p>
        </aside>
    );
}

export default function BerandaUser({
    user = {},
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
                        <h1 className="mb-7 text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-5xl">
                            Mau lanjut belajar apa hari ini?
                        </h1>

                        <form onSubmit={handleSearch} className="relative mb-4 w-full max-w-2xl">
                            <div className="relative rounded-full border border-white/70 bg-white/95 shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-600 dark:text-gray-300">
                                    <SearchIcon sx={{ fontSize: 21 }} />
                                </div>
                                <input
                                    type="search"
                                    role="combobox"
                                    aria-autocomplete="list"
                                    aria-expanded={isSearchOpen && isSearchReady}
                                    aria-controls="dashboard-search-results"
                                    value={searchQuery}
                                    onFocus={() => setIsSearchOpen(true)}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);
                                        setActiveSuggestionIndex(0);
                                        setIsSearchOpen(true);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                            setIsSearchOpen(false);
                                        }

                                        if (event.key === 'ArrowDown' && searchResults.length > 0) {
                                            event.preventDefault();
                                            setActiveSuggestionIndex((index) => Math.min(index + 1, searchResults.length - 1));
                                        }

                                        if (event.key === 'ArrowUp' && searchResults.length > 0) {
                                            event.preventDefault();
                                            setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
                                        }
                                    }}
                                    className="h-12 w-full rounded-full border-0 bg-transparent py-3 pl-12 pr-20 text-sm font-medium text-gray-800 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-learning-200 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:ring-learning-900/50"
                                    placeholder="Cari materi di kelas aktif..."
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setActiveSuggestionIndex(0);
                                        }}
                                        className="absolute inset-y-0 right-11 my-auto h-8 px-2 text-xs font-black text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                    >
                                        Hapus
                                    </button>
                                )}
                                <button type="submit" aria-label="Buka hasil pencarian" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-600 transition hover:text-learning-700 dark:text-gray-300 dark:hover:text-learning-200">
                                    <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                </button>
                            </div>

                            {isSearchOpen && isSearchReady && (
                                <div id="dashboard-search-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-white/80 bg-white/95 p-1.5 text-left shadow-xl shadow-brand-950/10 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                                    {searchResults.length > 0 ? searchResults.map((item, index) => {
                                        const Icon = item.icon;
                                        const isActive = index === activeSuggestionIndex;

                                        return (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                role="option"
                                                aria-selected={isActive}
                                                onMouseEnter={() => setActiveSuggestionIndex(index)}
                                                onClick={() => setIsSearchOpen(false)}
                                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${isActive ? 'bg-learning-50 dark:bg-learning-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'}`}
                                            >
                                                <Icon sx={{ fontSize: 20 }} className="shrink-0 text-learning-700 dark:text-learning-200" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">{item.title}</p>
                                                    <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{item.subtitle}</p>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">{item.type}</span>
                                            </Link>
                                        );
                                    }) : (
                                        <p className="px-3 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">Tidak ada materi yang bisa dibuka dengan kata kunci ini.</p>
                                    )}
                                </div>
                            )}
                        </form>

                        <nav aria-label="Akses cepat" className="mb-4 grid w-full max-w-3xl grid-cols-2 gap-2 sm:flex sm:justify-center">
                            {quickLinks.map((item) => {
                                const Icon = item.icon;
                                const isPrimary = item.label === 'Kelas Saya';
                                const isQuiz = item.label === 'Kuis';

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`group inline-flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-black shadow-sm backdrop-blur transition sm:min-w-36 ${isPrimary
                                            ? 'border-[var(--toku-brand-border)] bg-[var(--toku-primary-soft)] text-[#2D3742] hover:border-brand-500 hover:bg-brand-100'
                                            : isQuiz
                                                ? 'border-[#A9C5F3] bg-[#DBEAFE] text-learning-800 hover:border-learning-400 hover:bg-learning-100 dark:border-learning-700 dark:bg-learning-950/40 dark:text-learning-200'
                                                : 'border-white/80 bg-white/90 text-gray-700 hover:border-learning-200 hover:bg-white hover:text-learning-700 dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:border-learning-800 dark:hover:text-learning-200'}`}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPrimary ? 'bg-white/60 text-brand-800' : isQuiz ? 'bg-white/60 text-learning-700' : 'bg-learning-50 text-learning-700 dark:bg-learning-950/40 dark:text-learning-200'}`}>
                                                <Icon sx={{ fontSize: 18 }} />
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </span>
                                        <ArrowRightAltIcon className="shrink-0 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" sx={{ fontSize: 18 }} />
                                    </Link>
                                );
                            })}
                        </nav>

                        <dl className="grid w-full max-w-2xl grid-cols-3 divide-x divide-gray-200/80 overflow-hidden rounded-xl border border-white/80 bg-white/90 text-left shadow-sm backdrop-blur dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/90">
                            <div className="min-w-0 px-3 py-3 sm:px-5">
                                <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                                    <span className="rounded-md bg-achievement-100 px-1.5 py-0.5 text-achievement-900 dark:bg-achievement-900/40 dark:text-achievement-100">Lv.{user.level || 1}</span>
                                    <span className="truncate">Total XP</span>
                                </dt>
                                <dd className="mt-1 text-lg font-black tabular-nums text-gray-950 dark:text-white sm:text-xl">{user.xp || 0}</dd>
                            </div>
                            <div className="min-w-0 px-3 py-3 sm:px-5">
                                <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                                    <HitodamaIcon className="h-4 w-4 shrink-0 text-orange-500" />
                                    <span className="truncate">Beruntun</span>
                                </dt>
                                <dd className="mt-1 truncate text-lg font-black tabular-nums text-gray-950 dark:text-white sm:text-xl">{user.streak_count || 0} hari</dd>
                            </div>
                            <div className="min-w-0 px-3 py-3 sm:px-5">
                                <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                                    {isPremium ? <KabutoIcon className="h-4 w-4 shrink-0 text-amber-500" /> : <ScrollIcon className="h-4 w-4 shrink-0 text-gray-500" />}
                                    <span className="truncate">Akses</span>
                                </dt>
                                <dd className={`mt-1 truncate text-lg font-black sm:text-xl ${isPremium ? 'text-amber-700 dark:text-amber-300' : 'text-gray-950 dark:text-white'}`}>{isPremium ? 'Premium' : 'Gratis'}</dd>
                            </div>
                        </dl>

                        {isPremium && activeSubscription && (
                            <div className="mt-5 rounded-full border border-yellow-200 bg-yellow-50 px-5 py-2 text-xs font-black text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-300">
                                Premium aktif sampai {new Date(activeSubscription.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-10 mx-auto -mt-10 max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--toku-border)] bg-white shadow-lg sm:rounded-[2rem] dark:border-gray-800 dark:bg-gray-950">
                        <div className="grid gap-5 rounded-[1.4rem] bg-white p-4 sm:gap-6 sm:rounded-[1.8rem] sm:p-7 dark:bg-gray-950 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                            <div className="grid gap-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#A9C5F3] bg-[#DBEAFE] text-learning-700 shadow-sm">
                                        <DashboardIcon sx={{ fontSize: 28 }} />
                                    </div>
                                    <div>
                                    <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                                        Belajar Hari Ini
                                    </p>
                                    <h2 className="text-xl font-black text-gray-900 sm:text-2xl dark:text-white">
                                        {activeLearning ? activeLearning.title : 'Belum ada kelas aktif'}
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                                        {activeLearning
                                            ? `${activeLearning.program_title} - Week ${activeLearning.week_number}${activeLearning.current_day ? `, Hari ${activeLearning.current_day.number} - ${activeLearning.current_day.title}` : ''}. Pilih satu resource lalu lanjutkan progres.`
                                            : 'Pilih kelas untuk memulai roadmap belajar dan membuka materi mingguan.'}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black sm:mt-4">
                                        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                                            {totalModules} modul tersedia
                                        </span>
                                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                            {ownedPrograms.length} kelas aktif
                                        </span>
                                        <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                                            {isPremium ? 'Akses premium aktif' : 'Preview tersedia'}
                                        </span>
                                    </div>
                                    </div>
                                </div>

                            <div className="grid gap-3">
                                <Link
                                    href={nextAction?.href || activeLearning?.roadmap_url || route('user.kelas.index')}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-action-primary px-6 py-3 text-sm font-black text-ink-900 shadow-sm transition lg:hover:-translate-y-0.5 lg:hover:bg-action-primary-hover"
                                >
                                    {nextAction?.label || (activeLearning ? 'Buka Roadmap' : 'Jelajahi Kelas')}
                                    <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                </Link>
                                <div className="grid grid-cols-2 gap-2">
                                    {visibleResourceCards.filter((item) => item.available && item.href).slice(0, 4).map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <Link key={item.category} href={item.href} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 text-xs font-black text-gray-700 transition hover:border-learning-300 hover:text-learning-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:text-learning-200">
                                                <Icon sx={{ fontSize: 16 }} />
                                                {item.title}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                            </div>
                            <DailyGoalCard goal={dailyGoal} />
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/70 bg-white/55 p-4 shadow-xl shadow-brand-900/5 backdrop-blur-md sm:rounded-[2rem] sm:p-7 dark:border-gray-800 dark:bg-gray-900/55">
                        <SectionHeader
                            eyebrow="Kelas Saya"
                            title="Roadmap yang dapat kamu ikuti"
                            actionHref={route('user.kelas.index')}
                            actionLabel="Lihat semua kelas"
                        />

                        <div className="space-y-3">
                            {ownedPrograms.slice(0, 2).map((program) => {
                                const cardClass = 'relative grid grid-cols-[72px_minmax(0,1fr)] gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4 dark:border-gray-800 dark:bg-gray-950';
                                const content = (
                                    <>
                                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(48,192,96,0.11),transparent_48%),repeating-linear-gradient(90deg,rgba(21,128,61,0.06)_0_1px,transparent_1px_42px),repeating-linear-gradient(0deg,rgba(21,128,61,0.05)_0_1px,transparent_1px_42px)] dark:bg-[linear-gradient(135deg,rgba(74,222,128,0.10),transparent_48%),repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_42px),repeating-linear-gradient(0deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_42px)]" />
                                        <span aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-2 text-5xl font-black leading-none text-brand-900/[0.14] sm:-bottom-7 sm:right-3 sm:text-7xl dark:text-white/[0.11]">学</span>
                                        <span aria-hidden="true" className="pointer-events-none absolute -top-3 right-16 text-3xl font-black leading-none text-amber-700/[0.12] sm:right-28 sm:text-4xl dark:text-amber-200/[0.09]">語</span>
                                        <div className="relative z-10 h-16 w-[72px] overflow-hidden rounded-lg bg-slate-100 sm:h-[72px] sm:w-24 dark:bg-gray-800">
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
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${program.waiting_for_kloter
                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                                    {program.waiting_for_kloter ? 'Menunggu kloter' : 'Kelas aktif'}
                                                </span>
                                                {!program.waiting_for_kloter && <span className="text-xs font-bold text-slate-600 dark:text-gray-300">{program.total_modules || 0} modul</span>}
                                            </div>
                                            <h3 className="truncate text-base font-black text-slate-950 sm:text-lg dark:text-white">{program.title}</h3>
                                            <p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-gray-300">
                                                {program.waiting_for_kloter
                                                    ? 'Roadmap tersedia setelah jadwal kloter dimulai.'
                                                    : (program.next_module ? `Berikutnya: Week ${program.next_module.week_number} - ${program.next_module.title}` : 'Semua modul yang tersedia telah selesai.')}
                                            </p>
                                            {!program.waiting_for_kloter && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${program.progress}%` }} />
                                                    </div>
                                                    <span className="shrink-0 text-xs font-black text-slate-700 dark:text-gray-300">{program.progress}%</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`relative z-10 col-span-2 inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-4 text-sm font-black sm:col-auto sm:min-h-11 ${program.waiting_for_kloter
                                            ? 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
                                            : 'bg-brand-600 text-white lg:group-hover:bg-brand-700'}`}>
                                            {program.waiting_for_kloter ? 'Menunggu jadwal' : 'Lanjutkan'}
                                            {!program.waiting_for_kloter && <ArrowRightAltIcon sx={{ fontSize: 20 }} />}
                                        </span>
                                    </>
                                );

                                return program.waiting_for_kloter ? (
                                    <article key={program.id} className={cardClass}>{content}</article>
                                ) : (
                                    <Link key={program.id} href={program.roadmap_url} className={`group ${cardClass} hover:border-brand-200 hover:shadow-md lg:dark:hover:border-brand-900/60`}>
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

                    <section className="overflow-hidden rounded-[1.5rem] border border-brand-100/80 bg-white/72 p-4 shadow-xl shadow-brand-900/5 backdrop-blur-md sm:rounded-[2rem] sm:p-7 dark:border-gray-800 dark:bg-gray-900/72">
                        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
                                    <QuizIcon sx={{ fontSize: 28 }} />
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                                        Quick Quiz
                                    </p>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                        {quickQuiz?.active
                                            ? 'Lanjutkan latihanmu'
                                            : (quickQuiz?.available ? 'Latihan campuran siap' : 'Belum ada materi terbuka')}
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                        {quickQuiz?.active
                                            ? `${quickQuiz.remaining_count} target tersisa. Sesi ini dapat dilanjutkan selama 30 menit.`
                                            : (quickQuiz?.available
                                                ? 'Ulangi materi yang sudah terbuka dari seluruh kelasmu. Jawaban yang belum tepat akan muncul kembali.'
                                                : 'Selesaikan materi pertama di roadmap agar Quick Kuis dapat menyusun latihan.')}
                                    </p>
                                    {quickQuiz?.available && (
                                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black">
                                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                Tanpa XP · fokus repetisi
                                            </span>
                                            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                                {quickQuiz.target_count} target
                                            </span>
                                            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                                                {quickQuiz.program_count} kelas
                                            </span>
                                            {!quickQuiz.active && quickQuiz.programs?.length > 1 && (
                                                <label className="flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
                                                    <span className="sr-only">Pilih kelas untuk Quick Quiz</span>
                                                    <select
                                                        value={quickQuizProgramId}
                                                        onChange={(event) => setQuickQuizProgramId(event.target.value)}
                                                        className="border-0 bg-transparent py-1 pr-8 text-xs font-black focus:ring-0"
                                                    >
                                                        <option value="">Semua kelas</option>
                                                        {quickQuiz.programs.map((program) => (
                                                            <option key={program.id} value={program.id}>
                                                                {program.title} ({program.question_count})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {quickQuiz?.available ? (
                                <button
                                    type="button"
                                    onClick={openQuickQuiz}
                                    disabled={isStartingQuickQuiz}
                                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-black text-white shadow-lg shadow-gray-900/15 transition-all disabled:cursor-wait disabled:opacity-70 sm:w-auto lg:hover:-translate-y-0.5 lg:hover:bg-brand-700 dark:bg-white dark:text-gray-950 lg:dark:hover:bg-brand-100"
                                >
                                    {isStartingQuickQuiz ? 'Menyiapkan...' : (quickQuiz.active ? 'Lanjutkan' : 'Mulai latihan')}
                                    <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                </button>
                            ) : (
                                <Link href={activeLearning?.roadmap_url || route('user.kelas.index')} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-black text-white shadow-lg shadow-gray-900/15 transition-all sm:w-auto lg:hover:-translate-y-0.5 lg:hover:bg-brand-700 dark:bg-white dark:text-gray-950 lg:dark:hover:bg-brand-100">
                                    Buka roadmap <ArrowRightAltIcon sx={{ fontSize: 22 }} />
                                </Link>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/70 bg-white/55 p-4 shadow-xl shadow-brand-900/5 backdrop-blur-md sm:rounded-[2rem] sm:p-7 dark:border-gray-800 dark:bg-gray-900/55">
                        <SectionHeader
                            eyebrow="Progress Mingguan"
                            title="Aktivitas belajar terbaru"
                            actionHref={route('user.progress')}
                            actionLabel="Detail progress"
                        />

                        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-brand-100/80 bg-white/85 p-4 sm:rounded-[1.5rem] sm:p-5 dark:border-gray-800 dark:bg-gray-950/80">
                                <div className="mb-3 flex items-center gap-3 sm:mb-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#A9C5F3] bg-[#DBEAFE] text-learning-700">
                                        <CheckCircleIcon />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-600 dark:text-gray-300">Ringkasan</p>
                                        <p className="font-black text-gray-900 dark:text-white">Belajar minggu ini</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-achievement-50 px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3 dark:bg-achievement-900/30">
                                        <p className="text-xl font-black text-achievement-700 dark:text-achievement-100">{user.xp || 0}</p>
                                        <p className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">XP</p>
                                    </div>
                                    <div className="rounded-xl bg-amber-50 px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3 dark:bg-amber-950/30">
                                        <p className="text-xl font-black text-amber-600 dark:text-amber-300">{user.streak_count || 0}</p>
                                        <p className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Streak</p>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50 px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3 dark:bg-emerald-950/30">
                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-300">{rewardHistory.length}</p>
                                        <p className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Log</p>
                                    </div>
                                </div>
                                <Link href={route('user.leaderboard')} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:border-learning-200 hover:text-learning-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-learning-200">
                                    Lihat peringkat liga <ArrowRightAltIcon sx={{ fontSize: 17 }} />
                                </Link>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-brand-100/70 bg-white/85 sm:rounded-[1.5rem] dark:border-gray-800 dark:bg-gray-950/80">
                                {recentActivities.length > 0 ? (
                                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {recentActivities.map((activity, index) => (
                                            <div key={activity.id || index} className="flex items-center justify-between gap-3 px-4 py-3 transition sm:gap-4 sm:px-5 sm:py-4 lg:hover:bg-gray-50 lg:dark:hover:bg-gray-900">
                                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                                                        {activity.source_type === 'quiz' ? <QuizIcon sx={{ fontSize: 18 }} /> : <AutoStoriesIcon sx={{ fontSize: 18 }} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{activity.description || activity.title || activity.source_type || 'Aktivitas belajar'}</p>
                                                        <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                                            {activity.created_at
                                                                ? new Date(activity.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : 'Baru saja'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {activity.xp_amount !== undefined && (
                                                    <span className="shrink-0 rounded-lg bg-green-50 px-2 py-1 text-xs font-black text-green-600 sm:px-3 sm:text-sm dark:bg-green-900/30 dark:text-green-300">
                                                        +{activity.xp_amount} XP
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Belum ada aktivitas terbaru. Mulai dari kelas aktif untuk mengisi progress.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/70 bg-white/45 p-4 shadow-xl shadow-amber-900/5 backdrop-blur-md sm:rounded-[2rem] sm:p-7 dark:border-gray-800 dark:bg-gray-900/45">
                        <SectionHeader
                            eyebrow="Update"
                            title="Berita Terkini Jepang"
                            actionHref={route('user.news.index')}
                            actionLabel="Lihat semua berita"
                        />

                        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 touch-pan-x md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 lg:gap-8">
                            {news && news.length > 0 ? news.map((item, index) => (
                                <Link
                                    href={route('user.news.show', item.slug || item.id)}
                                    key={item.id || index}
                                    className="group flex h-full w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-amber-100/80 bg-white/90 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 sm:rounded-3xl md:w-auto md:max-w-none md:shrink lg:hover:shadow-[0_12px_36px_-16px_rgba(120,53,15,0.28)] dark:border-gray-800 dark:bg-gray-950/90 dark:shadow-none lg:dark:hover:border-gray-700"
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
                                    <div className="flex flex-grow flex-col p-4 sm:p-6">
                                        {item.is_pinned && (
                                            <div className="mb-3">
                                                <span className="rounded-md bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                                                    PIN Disematkan
                                                </span>
                                            </div>
                                        )}
                                        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{item.category?.replaceAll('-', ' ') || 'platform'}</span>
                                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                                            {item.published_at
                                                ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                                : 'TOKU-UP News'}
                                        </div>
                                        <h3 className="mb-2 text-lg font-extrabold leading-snug text-gray-900 transition-colors sm:mb-3 lg:group-hover:text-brand-600 dark:text-white lg:dark:group-hover:text-brand-400">
                                            {item.title}
                                        </h3>
                                        <p className="mb-4 line-clamp-2 flex-grow text-sm font-medium leading-relaxed text-gray-700 sm:mb-6 sm:line-clamp-3 dark:text-gray-300">
                                            {item.excerpt || (item.body ? `${item.body.replace(/<[^>]*>/g, '').substring(0, 100)}...` : 'Baca update terbaru dari TOKU-UP.')}
                                        </p>
                                        <div className="mt-auto flex items-center gap-2 text-sm font-black text-brand-600 dark:text-brand-400">
                                            Baca selengkapnya
                                            <ArrowRightAltIcon sx={{ fontSize: 20 }} />
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <p className="w-full text-sm font-medium text-gray-700 md:col-span-2 lg:col-span-3 dark:text-gray-300">Belum ada berita terbaru.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
