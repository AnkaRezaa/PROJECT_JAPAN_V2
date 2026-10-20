import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);

    return [];
};

const THEME_MAP = {
    sky: {
        avatar: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
        bar: 'bg-sky-500',
        ringColor: '#0284c7',
        btn: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
    emerald: {
        avatar: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
        bar: 'bg-emerald-500',
        ringColor: '#059669',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    amber: {
        avatar: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
        bar: 'bg-amber-500',
        ringColor: '#d97706',
        btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
};

function CategoryDonutAvatar({ kanji, pct = 0, ringColor = '#059669', size = 48, strokeWidth = 3.5 }) {
    const clampedPct = clamp(pct);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedPct / 100) * circumference;

    return (
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            <svg className="-rotate-90 transform" width={size} height={size} aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-200 dark:stroke-slate-700"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-1 flex items-center justify-center rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                <span className="font-japanese text-base font-black leading-none" lang="ja">
                    {kanji}
                </span>
            </div>
        </div>
    );
}

function TotalProgressDonutGauge({ pct = 0, xp = 0, targetXp = 3200, size = 144, strokeWidth = 10 }) {
    const clampedPct = clamp(pct);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedPct / 100) * circumference;

    return (
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            <svg className="-rotate-90 transform" width={size} height={size} aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="#34d399"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black tabular-nums leading-none tracking-tight text-white">
                    {clampedPct}%
                </span>
                <span className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">
                    Total Progress
                </span>
                <span className="mt-0.5 text-[10px] font-bold tabular-nums text-emerald-200">
                    {(Number(xp) || 0).toLocaleString()} / {targetXp.toLocaleString()} XP
                </span>
            </div>
        </div>
    );
}

function WeakspotCategoryCard({ category }) {
    const {
        title,
        kanji_char,
        pct = 0,
        theme = 'emerald',
        weakspots = [],
        quiz_url = route('user.weakspot.show'),
        failed_count = 0,
        has_weakspot = false,
    } = category;

    const style = THEME_MAP[theme] || THEME_MAP.emerald;

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div>
                {/* Header Kartu: Avatar Kanji Berbalut Donut Ring Gauge & Info Penguasaan */}
                <div className="flex items-center gap-3">
                    <CategoryDonutAvatar
                        kanji={kanji_char}
                        pct={pct}
                        ringColor={style.ringColor}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-base font-black text-slate-950 dark:text-white">{title}</h3>
                            <span className="shrink-0 text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">{clamp(pct)}%</span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Tingkat Penguasaan
                        </p>
                    </div>
                </div>

                {/* Status Badge Weakspot */}
                <div className="mt-4 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${has_weakspot ? 'bg-amber-50 text-amber-900 border border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800' : 'bg-emerald-50 text-emerald-900 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'}`}>
                        <span className={has_weakspot ? "text-amber-600 dark:text-amber-400 text-xs leading-none" : "text-emerald-600 dark:text-emerald-400 text-xs leading-none"} aria-hidden="true">
                            {has_weakspot ? '▲' : '✓'}
                        </span>
                        {has_weakspot ? 'Perlu Dilatih' : 'Tuntas'}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {has_weakspot ? `${failed_count} butir keliru` : 'Semua soal dikuasai'}
                    </span>
                </div>

                {/* List Butir Soal Kelemahan Riil (Interaktif Sesuai IMG-WA0013) */}
                <div className="mt-3 min-h-[96px] space-y-1.5">
                    {weakspots.map((item, idx) => (
                        <Link
                            key={idx}
                            href={quiz_url}
                            className="group flex items-center justify-between gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100/90 dark:border-slate-800/80 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                            title={`Latih soal: ${item.title}`}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.is_cleared ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="truncate group-hover:text-slate-950 dark:group-hover:text-white">{item.title}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {item.is_cleared ? (
                                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Aman</span>
                                ) : (
                                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">Ulangi</span>
                                )}
                                <ChevronRightIcon sx={{ fontSize: 14 }} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer Kartu: Tombol CTA & Status Selesai Berkontras Tinggi */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {has_weakspot && failed_count > 0 ? (
                    <Link
                        href={quiz_url}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-black shadow-sm transition active:scale-[0.98] ${style.btn}`}
                    >
                        <PlayArrowIcon sx={{ fontSize: 16 }} />
                        Latih {failed_count} Soal Titik Lemah
                    </Link>
                ) : (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 py-2.5 px-3 text-xs font-extrabold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <CheckCircleIcon sx={{ fontSize: 16 }} className="text-emerald-600 dark:text-emerald-400" />
                        Semua Materi Tuntas Dikuasai
                    </div>
                )}
            </div>
        </div>
    );
}

function StatTile({ icon, label, value, tone }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-lg font-black leading-none text-slate-950 dark:text-white">
                    {(Number(value) || 0).toLocaleString()}
                </p>
                <p className="mt-1 truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                    {label}
                </p>
            </div>
        </div>
    );
}

function ActivityIcon({ type }) {
    if (type === 'lesson') return <AutoStoriesIcon sx={{ fontSize: 16 }} />;
    if (type === 'quiz') return <HelpCenterIcon sx={{ fontSize: 16 }} />;

    return <EmojiEventsIcon sx={{ fontSize: 16 }} />;
}

function EmptyState({ children }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            {children}
        </div>
    );
}

export default function Progress({
    stats = {},
    weekActivity = [],
    learningJourneys = [],
    jlptJourney = [],
    recentActivity = [],
    skills = [],
    category_cards = [],
    next_learning: nextLearning = null,
}) {
    const weekItems = toList(weekActivity);
    const journeyItems = toList(learningJourneys).length > 0
        ? toList(learningJourneys)
        : toList(jlptJourney);
    const recentItems = toList(recentActivity);
    const skillItems = toList(skills);
    const categoryList = toList(category_cards);
    const totalWeakspots = categoryList.reduce((acc, cat) => acc + (Number(cat.failed_count) || 0), 0);
    const totalXP = weekItems.reduce((total, day) => total + (Number(day.xp) || 0), 0);
    const activeDays = weekItems.filter((day) => Number(day.xp) > 0).length;
    const peakWeekXp = Math.max(1, ...weekItems.map((day) => Number(day.xp) || 0));
    const totalProgressPct = Math.min(100, Math.round(((Number(stats.xp) || 0) / 3200) * 100));
    const statCards = [
        {
            label: 'Total XP',
            value: stats.xp,
            icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,
            tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        },
        {
            label: 'Streak',
            value: stats.streak,
            icon: <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />,
            tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        },
        {
            label: 'Modul selesai',
            value: stats.lessonsDone,
            icon: <AutoStoriesIcon sx={{ fontSize: 20 }} />,
            tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        },
        {
            label: 'Kuis selesai',
            value: stats.quizzesDone,
            icon: <HelpCenterIcon sx={{ fontSize: 20 }} />,
            tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        },
    ];
    const skillTones = [
        'bg-slate-500',
        'bg-sky-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-indigo-500',
    ];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-white">
                    <ShowChartIcon className="text-brand-600 dark:text-brand-400" />
                    Progres Saya
                </h2>
            }
        >
            <Head title="Progres - TOKU-UP" />

            <div className="min-h-screen bg-slate-50/60 pb-12 text-slate-900 dark:bg-slate-950 dark:text-white">
                <main className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="p-6 sm:p-8">
                                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <TrendingUpIcon sx={{ fontSize: 15 }} />
                                    Ruang belajar
                                </div>
                                <h1 className="mt-4 max-w-xl text-3xl font-black tracking-normal text-slate-950 dark:text-white sm:text-4xl">
                                    Progres Belajar
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                                    Pantau aktivitas, XP, dan materi yang bisa kamu lanjutkan.
                                </p>

                                <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/35">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Langkah berikutnya</p>
                                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-base font-black text-slate-950 dark:text-white">
                                                {nextLearning?.title || 'Pilih kelas untuk mulai belajar'}
                                            </h2>
                                            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {nextLearning?.message || 'Pilih kelas aktif agar roadmap belajarmu tersedia di sini.'}
                                            </p>
                                        </div>
                                        <Link
                                            href={nextLearning?.url || route('user.kelas.index')}
                                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                                        >
                                            {nextLearning?.action_label || 'Jelajahi kelas'}
                                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-emerald-700 p-6 text-white dark:bg-emerald-900">
                                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:18px_18px]" />
                                <div className="relative flex flex-col items-center text-center">
                                    <TotalProgressDonutGauge
                                        pct={totalProgressPct}
                                        xp={stats.xp}
                                        targetXp={3200}
                                    />
                                    <p className="mt-4 font-japanese text-xs font-black tracking-wide text-emerald-100" lang="ja">「コツコツが勝つコツだ。」</p>
                                    <p className="mt-0.5 text-[11px] font-medium text-emerald-200">"Konsistensi kecil tetap berarti."</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {statCards.map((card) => <StatTile key={card.label} {...card} />)}
                    </section>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                        <div className="space-y-6">
                            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CalendarMonthIcon className="text-emerald-600 dark:text-emerald-400" sx={{ fontSize: 20 }} />
                                            <h2 className="text-lg font-black text-slate-950 dark:text-white">Aktivitas Mingguan</h2>
                                        </div>
                                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">XP yang dikumpulkan dalam tujuh hari terakhir.</p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {totalXP.toLocaleString()} XP
                                    </span>
                                </div>

                                {weekItems.length > 0 ? (
                                    <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
                                        {weekItems.map((day, index) => {
                                            const xp = Number(day.xp) || 0;
                                            const height = xp > 0 ? Math.max(14, Math.round((xp / peakWeekXp) * 100)) : 0;

                                            return (
                                                <div key={`${day.day}-${index}`} className="min-w-0 text-center">
                                                    <div className={`flex h-40 flex-col justify-end overflow-hidden rounded-xl sm:rounded-2xl border p-1 sm:p-2 transition ${day.today ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'}`}>
                                                        <span className={`mb-1 sm:mb-2 text-[9px] min-[380px]:text-[11px] font-black tabular-nums truncate ${day.today ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                                            {xp > 0 ? xp : '—'}
                                                        </span>
                                                        <div className="flex flex-1 items-end rounded-lg sm:rounded-xl bg-white/60 p-0.5 sm:p-1 dark:bg-slate-900/50">
                                                            <div
                                                                aria-label={`${day.day}: ${xp} XP`}
                                                                className={`w-full rounded-md sm:rounded-lg ${day.today ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                                                                style={{ height: `${height}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className={`mt-2 text-[9px] min-[380px]:text-[10px] font-black uppercase tracking-wider ${day.today ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{day.day}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-5"><EmptyState>Belum ada aktivitas pada tujuh hari terakhir.</EmptyState></div>
                                )}
                            </section>

                            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <TrackChangesIcon sx={{ fontSize: 20 }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-950 dark:text-white">Evaluasi Titik Lemah (Weakspot)</h2>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deteksi otomatis materi yang perlu diperbaiki dari riwayat kuis.</p>
                                        </div>
                                    </div>
                                    {totalWeakspots > 0 ? (
                                        <Link
                                            href={route('user.weakspot.show')}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 active:scale-95"
                                        >
                                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                                            Latih Semua Titik Lemah ({totalWeakspots} Soal)
                                        </Link>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            <CheckCircleIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                                            Semua Titik Lemah Bersih
                                        </span>
                                    )}
                                </div>

                                {categoryList.length > 0 ? (
                                    <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-3">
                                        {categoryList.map((cat) => (
                                            <WeakspotCategoryCard
                                                key={cat.id}
                                                category={cat}
                                            />
                                        ))}
                                    </div>
                                ) : skillItems.length > 0 ? (
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        {skillItems.map((skill, index) => (
                                            <div key={skill.label || index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">{skill.label}</span>
                                                    <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-300">{clamp(skill.value)}%</span>
                                                </div>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div className={`h-full rounded-full ${skillTones[index % skillTones.length]}`} style={{ width: `${clamp(skill.value)}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5"><EmptyState>Aktivitas topik akan muncul setelah kamu belajar.</EmptyState></div>
                                )}
                            </section>
                        </div>

                        <aside className="space-y-6">
                            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950 dark:text-white">Perjalanan Belajar</h2>
                                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Tahapan yang sudah kamu selesaikan.</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        <AutoStoriesIcon sx={{ fontSize: 20 }} />
                                    </div>
                                </div>

                                {journeyItems.length > 0 ? (
                                    <div className="mt-6 space-y-4">
                                        {journeyItems.map((level, index) => {
                                            const completed = Boolean(level.done);
                                            const progress = clamp(level.pct);

                                            return (
                                                <div key={`${level.program || level.label}-${index}`}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${completed ? 'bg-emerald-500 text-white' : progress > 0 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                {completed ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : (level.level || index + 1)}
                                                            </span>
                                                            <span className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{level.program || level.label}</span>
                                                        </div>
                                                        <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-300">{progress}%</span>
                                                    </div>
                                                    <div className="ml-9 mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div className={`h-full rounded-full ${completed ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-5"><EmptyState>Perjalanan belajar belum tersedia.</EmptyState></div>
                                )}
                            </section>

                            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950 dark:text-white">Aktivitas Terkini</h2>
                                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Pencapaian terbaru dari belajarmu.</p>
                                    </div>
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                        <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />
                                    </span>
                                </div>

                                {recentItems.length > 0 ? (
                                    <div className="mt-6 space-y-4">
                                        {recentItems.map((activity, index) => (
                                            <div key={`${activity.text}-${index}`} className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    <ActivityIcon type={activity.type} />
                                                </div>
                                                <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <p className="text-sm font-bold leading-5 text-slate-900 dark:text-white">{activity.text}</p>
                                                        <span className="shrink-0 text-xs font-black text-emerald-700 dark:text-emerald-300">+{activity.xp} XP</span>
                                                    </div>
                                                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{activity.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5"><EmptyState>Belum ada aktivitas yang tercatat.</EmptyState></div>
                                )}
                            </section>
                        </aside>
                    </div>

                    <section className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><PlayArrowIcon /></span>
                            <div>
                                <h2 className="text-sm font-black text-slate-950 dark:text-white">Belajar lagi saat kamu siap</h2>
                                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Progres akan diperbarui setelah kamu menyelesaikan latihan atau kuis.</p>
                            </div>
                        </div>
                        <Link href={nextLearning?.url || route('user.kelas.index')} className="mt-4 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-500 dark:hover:text-emerald-300 sm:mt-0">
                            Lanjut belajar <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Link>
                    </section>
                </main>
            </div>
        </AuthenticatedLayout>
    );
}
