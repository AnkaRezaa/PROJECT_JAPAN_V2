import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);

    return [];
};

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
    next_learning: nextLearning = null,
}) {
    const weekItems = toList(weekActivity);
    const journeyItems = toList(learningJourneys).length > 0
        ? toList(learningJourneys)
        : toList(jlptJourney);
    const recentItems = toList(recentActivity);
    const skillItems = toList(skills);
    const totalXP = weekItems.reduce((total, day) => total + (Number(day.xp) || 0), 0);
    const activeDays = weekItems.filter((day) => Number(day.xp) > 0).length;
    const peakWeekXp = Math.max(1, ...weekItems.map((day) => Number(day.xp) || 0));
    const activityRate = Math.round((activeDays / Math.max(weekItems.length, 7)) * 100);
    const statCards = [
        {
            label: 'Total XP',
            value: stats.xp,
            icon: <EmojiEventsIcon sx={{ fontSize: 21 }} />,
            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        },
        {
            label: 'Streak',
            value: stats.streak,
            icon: <LocalFireDepartmentIcon sx={{ fontSize: 21 }} />,
            tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        },
        {
            label: 'Modul selesai',
            value: stats.lessonsDone,
            icon: <AutoStoriesIcon sx={{ fontSize: 21 }} />,
            tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        },
        {
            label: 'Kuis selesai',
            value: stats.quizzesDone,
            icon: <HelpCenterIcon sx={{ fontSize: 21 }} />,
            tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        },
    ];
    const skillTones = [
        'bg-rose-500',
        'bg-sky-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-violet-500',
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

            <div className="relative min-h-screen overflow-hidden bg-[#f3f7f5] pb-12 text-slate-900 dark:bg-slate-950 dark:text-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(243,247,245,0)_32%,rgba(226,232,240,0.42)_100%),repeating-linear-gradient(90deg,rgba(15,23,42,0.035)_0_1px,transparent_1px_76px),repeating-linear-gradient(0deg,rgba(15,23,42,0.026)_0_1px,transparent_1px_76px)] dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(2,6,23,0)_30%,rgba(15,23,42,0.56)_100%),repeating-linear-gradient(90deg,rgba(255,255,255,0.026)_0_1px,transparent_1px_76px),repeating-linear-gradient(0deg,rgba(255,255,255,0.02)_0_1px,transparent_1px_76px)]"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500" />

                <main className="relative z-10 mx-auto max-w-7xl px-4 pt-7 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-950 dark:bg-slate-900">
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
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
                                    <div
                                        className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-white/20 bg-emerald-800/30 shadow-xl"
                                        style={{ background: `conic-gradient(#fbbf24 ${activityRate}%, rgba(255,255,255,0.18) 0)` }}
                                    >
                                        <div className="flex h-[102px] w-[102px] flex-col items-center justify-center rounded-full bg-emerald-700 dark:bg-emerald-900">
                                            <span className="text-3xl font-black">{totalXP.toLocaleString()}</span>
                                            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">XP minggu ini</span>
                                        </div>
                                    </div>
                                    <p className="mt-5 text-sm font-black">Aktif {activeDays} dari {Math.max(weekItems.length, 7)} hari</p>
                                    <p className="mt-1 text-xs font-medium text-emerald-100">Konsistensi kecil tetap berarti.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {statCards.map((card) => <StatTile key={card.label} {...card} />)}
                    </section>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                        <div className="space-y-6">
                            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
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

                            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950 dark:text-white">Aktivitas per Topik</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Jejak latihan berdasarkan modul dan kuis yang telah kamu kerjakan.</p>
                                </div>

                                {skillItems.length > 0 ? (
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
                            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950 dark:text-white">Perjalanan Belajar</h2>
                                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Tahapan yang sudah kamu selesaikan.</p>
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                        <AutoStoriesIcon sx={{ fontSize: 21 }} />
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
                                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${completed ? 'bg-emerald-500 text-white' : progress > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                                {completed ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : (level.level || index + 1)}
                                                            </span>
                                                            <span className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{level.program || level.label}</span>
                                                        </div>
                                                        <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-300">{progress}%</span>
                                                    </div>
                                                    <div className="ml-9 mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div className={`h-full rounded-full ${completed ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-5"><EmptyState>Perjalanan belajar belum tersedia.</EmptyState></div>
                                )}
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950 dark:text-white">Aktivitas Terkini</h2>
                                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Pencapaian terbaru dari belajarmu.</p>
                                    </div>
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                        <LocalFireDepartmentIcon sx={{ fontSize: 21 }} />
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

                    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:p-5">
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
