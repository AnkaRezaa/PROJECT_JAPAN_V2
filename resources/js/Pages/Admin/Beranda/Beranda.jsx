import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import PersonOffRounded from '@mui/icons-material/PersonOffRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import QuizRounded from '@mui/icons-material/QuizRounded';
import ViewCarouselRounded from '@mui/icons-material/ViewCarouselRounded';
import TranslateRounded from '@mui/icons-material/TranslateRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import Card from '@/Components/UI/Card';
import KloterFilter from '@/Components/Features/Admin/KloterFilter';
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const iconMap = {
    groups: GroupsRounded,
    active: TrendingUpRounded,
    complete: FactCheckRounded,
    score: QuizRounded,
    module: AutoStoriesRounded,
    warning: ErrorOutlineRounded,
    quiz: QuizRounded,
    vocabulary: TranslateRounded,
};

const actionTone = {
    danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
};

function DashboardIcon({ name, className = '' }) {
    const Icon = iconMap[name] || AutoStoriesRounded;

    return <Icon className={className} fontSize="small" />;
}

function MetricGrid({ stats = [] }) {
    return (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((item) => (
                <div key={item.title} className="min-h-[136px] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-300">
                        <DashboardIcon name={item.icon} />
                    </span>
                    <p className="mt-5 text-2xl font-black tabular-nums text-gray-950 dark:text-white">{item.value}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-gray-500 dark:text-gray-400">{item.title}</p>
                </div>
            ))}
        </div>
    );
}

function ActionQueue({ items = [] }) {
    return (
        <section>
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Prioritas</p>
                    <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-white">Perlu ditindaklanjuti</h2>
                </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
                {items.map((item) => (
                    <Link key={item.label} href={item.href} className={`group border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${actionTone[item.tone] || actionTone.info}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-2xl font-black tabular-nums">{item.value}</p>
                                <h3 className="mt-2 text-sm font-black">{item.label}</h3>
                            </div>
                            <ArrowForwardRounded className="transition group-hover:translate-x-1" fontSize="small" />
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 opacity-80">{item.description}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function CohortWorkspace({ cohorts = [], atRiskStudents = [], lowScoreStudents = [], recentAttempts = [], activitySeries = [], filters = {} }) {
    return (
        <>
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-950 dark:text-white">Kelas yang diampu</h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Jadwal dan kapasitas kloter dalam cakupan Anda.</p>
                        </div>
                        <GroupsRounded className="text-brand-600 dark:text-brand-300" />
                    </div>
                    <div className="mt-5 divide-y divide-gray-100 dark:divide-gray-800">
                        {cohorts.map((cohort) => (
                            <Link key={cohort.id} href={route('admin.users', { kloter: cohort.id })} className="group block py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">{cohort.name}</p>
                                        <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{cohort.program_name || 'Tanpa program'} · {cohort.week_label}</p>
                                    </div>
                                    <span className="shrink-0 text-xs font-black text-gray-500 dark:text-gray-400">{cohort.capacity_label}</span>
                                </div>
                            </Link>
                        ))}
                        {cohorts.length === 0 && <p className="py-5 text-sm font-semibold text-gray-500 dark:text-gray-400">Belum ada kloter yang ditugaskan ke akun ini.</p>}
                    </div>
                </Card>

                <ChartCard title="Aktivitas kelas" subtitle="Siswa aktif, kuis dikerjakan, dan modul selesai." action={<ChartPeriodSelect routeName="admin.dashboard" filters={filters} />}>
                    {activitySeries.some((item) => item.active_students || item.quiz_attempts || item.modules_completed) ? (
                        <ChartContainer config={{
                            active_students: { label: 'Siswa aktif', theme: { light: '#15803d', dark: '#4ade80' } },
                            quiz_attempts: { label: 'Kuis', theme: { light: '#1d4ed8', dark: '#60a5fa' } },
                            modules_completed: { label: 'Modul selesai', theme: { light: '#0ea5e9', dark: '#38bdf8' } },
                        }}>
                            <BarChart data={activitySeries} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                <Bar dataKey="active_students" name="Siswa aktif" fill="var(--color-active_students)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="quiz_attempts" name="Kuis" fill="var(--color-quiz_attempts)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="modules_completed" name="Modul selesai" fill="var(--color-modules_completed)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    ) : <ChartEmpty>Belum ada aktivitas belajar pada periode ini.</ChartEmpty>}
                </ChartCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_0.85fr_1.3fr]">
                <StudentList title="Belum aktif" subtitle="Siswa yang belum mencatat aktivitas pada periode terpilih." items={atRiskStudents} tone="red" empty="Semua siswa sudah aktif." />
                <StudentList title="Nilai perlu dibantu" subtitle="Rata-rata hasil kuis di bawah batas intervensi." items={lowScoreStudents} tone="amber" empty="Belum ada siswa dengan nilai rendah." />
                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-gray-950 dark:text-white">Kuis terbaru</h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Sinyal cepat performa kelas.</p>
                        </div>
                        <Link href={route('admin.analytics')} className="text-xs font-black text-brand-600 hover:text-brand-700 dark:text-brand-300">Analitik</Link>
                    </div>
                    <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                        {recentAttempts.map((attempt) => (
                            <Link key={attempt.id} href={route('admin.users.show', attempt.student_id)} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">{attempt.student}</p>
                                    <p className="mt-1 truncate text-xs font-semibold text-gray-500 dark:text-gray-400">{attempt.module} · {attempt.attempted_at}</p>
                                </div>
                                <span className="shrink-0 text-sm font-black text-brand-600 dark:text-brand-300">{attempt.score}</span>
                            </Link>
                        ))}
                        {recentAttempts.length === 0 && <p className="py-5 text-sm font-semibold text-gray-500 dark:text-gray-400">Belum ada kuis yang dikerjakan.</p>}
                    </div>
                </Card>
            </div>
        </>
    );
}

function StudentList({ title, subtitle, items = [], tone, empty }) {
    const accent = tone === 'red' ? 'text-brand-600 dark:text-brand-300' : 'text-amber-600 dark:text-amber-300';

    return (
        <Card>
            <h2 className="text-lg font-black text-gray-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm font-medium leading-5 text-gray-500 dark:text-gray-400">{subtitle}</p>
            <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((student) => (
                    <Link key={student.id} href={route('admin.users.show', student.id)} className="block py-3 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{student.name}</p>
                        <p className={`mt-1 text-xs font-bold ${accent}`}>{student.detail}</p>
                    </Link>
                ))}
                {items.length === 0 && <p className="py-5 text-sm font-semibold text-gray-500 dark:text-gray-400">{empty}</p>}
            </div>
        </Card>
    );
}

function ContentWorkspace({ coverage = [] }) {
    return (
        <Card padding={false}>
            <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <h2 className="text-lg font-black text-gray-950 dark:text-white">Kesiapan konten per minggu</h2>
                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">PPT, kosakata, flashcard, dan kuis harus siap sebelum modul dipublikasikan.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {coverage.map((module) => (
                    <Link key={module.id} href={module.href} className="group grid gap-4 px-5 py-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{module.program} · {module.week}</p>
                            <p className="mt-1 truncate text-base font-black text-gray-950 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">{module.title}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {module.items.map((item) => (
                                <span key={item.label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${item.ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {item.ready ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <ErrorOutlineRounded sx={{ fontSize: 14 }} />}
                                    {item.label}
                                </span>
                            ))}
                        </div>
                        <span className="text-sm font-black text-gray-500 dark:text-gray-400">{module.ready_count}/4</span>
                    </Link>
                ))}
                {coverage.length === 0 && <p className="px-6 py-12 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">Belum ada modul dalam cakupan konten ini.</p>}
            </div>
        </Card>
    );
}

export default function BerandaAdmin({
    adminScope = 'global',
    kloters = [],
    filters = {},
    workspace = 'content',
    workspaceTitle = 'Dashboard Admin',
    workspaceDescription = '',
    stats = [],
    actionItems = [],
    cohorts = [],
    coverage = [],
    activitySeries = [],
    atRiskStudents = [],
    lowScoreStudents = [],
    recentAttempts = [],
}) {
    const isKloterWorkspace = workspace === 'kloter';

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard Admin" />

            <main className="space-y-7 px-4 py-6 sm:px-6 lg:px-8">
                <header className="border-b border-gray-200 pb-5 dark:border-gray-800">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">{isKloterWorkspace ? 'Mentor Kelas' : 'Admin Konten'}</p>
                            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">{workspaceTitle}</h1>
                            <p className="mt-2 text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">{workspaceDescription}</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
                            {isKloterWorkspace && <KloterFilter routeName="admin.dashboard" kloters={kloters} filters={filters} adminScope={adminScope} className="sm:w-72" />}
                            <Link href={isKloterWorkspace ? route('admin.analytics', filters.kloter ? { kloter: filters.kloter } : {}) : route('admin.modules.index')} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-black text-white transition hover:bg-brand-700">
                                {isKloterWorkspace ? <TrendingUpRounded fontSize="small" /> : <AutoStoriesRounded fontSize="small" />}
                                {isKloterWorkspace ? 'Buka Analitik' : 'Kelola Modul'}
                            </Link>
                        </div>
                    </div>
                </header>

                <MetricGrid stats={stats} />
                <ActionQueue items={actionItems} />

                {isKloterWorkspace ? (
                    <CohortWorkspace
                        cohorts={cohorts}
                        atRiskStudents={atRiskStudents}
                        lowScoreStudents={lowScoreStudents}
                        recentAttempts={recentAttempts}
                        activitySeries={activitySeries}
                        filters={filters}
                    />
                ) : <ContentWorkspace coverage={coverage} />}
            </main>
        </AuthenticatedLayout>
    );
}
