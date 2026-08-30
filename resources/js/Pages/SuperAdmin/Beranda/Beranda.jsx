import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import WorkspacePremiumRounded from '@mui/icons-material/WorkspacePremiumRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import Diversity3Rounded from '@mui/icons-material/Diversity3Rounded';
import PeopleAltRounded from '@mui/icons-material/PeopleAltRounded';
import LibraryBooksRounded from '@mui/icons-material/LibraryBooksRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import Card from '@/Components/UI/Card';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const metricIcons = {
    payments: PaymentsRounded,
    premium: WorkspacePremiumRounded,
    learners: GroupsRounded,
    success: TaskAltRounded,
};

const actionIcons = {
    payments: PaymentsRounded,
    cohorts: Diversity3Rounded,
    users: PeopleAltRounded,
    content: LibraryBooksRounded,
    gamification: EmojiEventsRounded,
    activity: HistoryRounded,
};

const queueTone = {
    danger: 'text-red-700 dark:text-red-300',
    warning: 'text-amber-700 dark:text-amber-300',
    info: 'text-sky-700 dark:text-sky-300',
};

function EmptyState({ children }) {
    return <div className="py-10 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{children}</div>;
}

function MetricCard({ item }) {
    const Icon = metricIcons[item.icon] || TaskAltRounded;
    const changeClass = item.changeType === 'down'
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';

    return (
        <Link href={item.href} className="group min-h-[150px] border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-900/50">
            <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-300"><Icon fontSize="small" /></span>
                {item.change && <span className={`rounded-full px-2 py-1 text-[11px] font-black ${changeClass}`}>{item.changeType === 'down' ? '-' : '+'} {item.change}</span>}
            </div>
            <p className="mt-6 text-2xl font-black tabular-nums text-gray-950 dark:text-white">{item.value}</p>
            <p className="mt-1 text-xs font-bold text-gray-700 dark:text-gray-300">{item.title}</p>
        </Link>
    );
}

function AttentionQueue({ items = [] }) {
    return (
        <Card padding={false}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Operasional</p>
                    <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-white">Perlu perhatian</h2>
                    <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Masalah yang dapat menghambat akses siswa atau operasional kelas.</p>
                </div>
                <WarningAmberRounded className="shrink-0 text-brand-600 dark:text-brand-300" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                    <Link key={item.label} href={item.href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:px-6">
                        <span className={`w-8 text-right text-xl font-black tabular-nums ${queueTone[item.tone] || queueTone.info}`}>{item.value}</span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-gray-900 dark:text-white">{item.label}</span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-gray-700 dark:text-gray-300">{item.description}</span>
                        </span>
                        <ArrowForwardRounded className="shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-brand-600 dark:text-gray-600 dark:group-hover:text-brand-300" fontSize="small" />
                    </Link>
                ))}
                {items.length === 0 && <EmptyState>Tidak ada pekerjaan operasional yang perlu ditindaklanjuti.</EmptyState>}
            </div>
        </Card>
    );
}

function CohortPulse({ cohorts = [] }) {
    const cohortItems = Array.isArray(cohorts)
        ? cohorts
        : Array.isArray(cohorts?.data)
            ? cohorts.data
            : Object.values(cohorts || {});

    return (
        <Card padding={false}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                <div>
                    <h2 className="text-lg font-black text-gray-950 dark:text-white">Kondisi kloter aktif</h2>
                            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Mentor, kapasitas, minggu berjalan, dan kesiapan modul.</p>
                </div>
                <Link href={route('superadmin.kloters')} className="text-xs font-black text-brand-600 hover:text-brand-700 dark:text-brand-300">Kelola kloter</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {cohortItems.map((cohort) => (
                    <Link key={cohort.id} href={route('superadmin.kloters', { selected: cohort.id })} className="group grid gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-gray-950 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">{cohort.name}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-gray-500 dark:text-gray-400">{cohort.program} · {cohort.mentor}</p>
                        </div>
                        <div className="flex gap-2 sm:justify-end">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{cohort.week}</span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{cohort.capacity}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-black ${cohort.mentor_ready && cohort.content_ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                            {cohort.mentor_ready && cohort.content_ready ? <CheckCircleRounded sx={{ fontSize: 15 }} /> : <ErrorOutlineRounded sx={{ fontSize: 15 }} />}
                            {cohort.mentor_ready ? cohort.content_label : 'Mentor belum siap'}
                        </span>
                    </Link>
                ))}
                {cohortItems.length === 0 && <EmptyState>Belum ada kloter aktif.</EmptyState>}
            </div>
        </Card>
    );
}

function LearningFeedback({ items = [] }) {
    const toneClass = {
        red: 'border-brand-100 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-950/20',
        amber: 'border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
        emerald: 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20',
    };

    return (
        <Card>
            <h2 className="text-lg font-black text-gray-950 dark:text-white">Feedback belajar</h2>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Respon siswa setelah sesi kuis.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {items.map((item) => (
                    <div key={item.label} className={`rounded-xl border px-3 py-3 ${toneClass[item.tone] || toneClass.amber}`}>
                        <p className="text-xl font-black tabular-nums text-gray-950 dark:text-white">{item.value}</p>
                        <p className="mt-0.5 text-xs font-black text-gray-600 dark:text-gray-300">{item.label}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export default function SuperadminDashboard({
    metrics = [],
    attentionQueue = [],
    activities = [],
    learningBars = [],
    studentAccessDistribution = [],
    cohortPulse = [],
    learningFeedback = [],
    quickActions = [],
    filters = {},
}) {
    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Beranda" />

            <main className="space-y-7 px-4 py-6 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">Pusat Operasional</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">Pantau pembayaran, akses kelas, kesiapan kloter, dan kesehatan pembelajaran dari satu tempat.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('superadmin.payments')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-black text-white transition hover:bg-brand-700"><PaymentsRounded fontSize="small" />Pembayaran</Link>
                        <Link href={route('superadmin.kloters')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"><Diversity3Rounded fontSize="small" />Kloter</Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((item) => <MetricCard key={item.title} item={item} />)}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                    <AttentionQueue items={attentionQueue} />
                    <ChartCard title="Aktivitas pembelajaran" subtitle="Modul selesai dan kuis yang dikerjakan." action={<ChartPeriodSelect routeName="superadmin.dashboard" filters={filters} />}>
                        {learningBars.some((item) => item.modules_completed || item.quiz_attempts) ? (
                            <ChartContainer config={{ modules_completed: { label: 'Modul selesai', color: '#22c55e' }, quiz_attempts: { label: 'Kuis dikerjakan', color: '#1d4ed8' } }}>
                                <BarChart data={learningBars} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                    <Bar dataKey="modules_completed" name="Modul selesai" fill="var(--color-modules_completed)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="quiz_attempts" name="Kuis dikerjakan" fill="var(--color-quiz_attempts)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada aktivitas belajar pada periode ini.</ChartEmpty>}
                    </ChartCard>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                    <CohortPulse cohorts={cohortPulse} />
                    <div className="space-y-6">
                        <ChartCard title="Status akses siswa" subtitle="Distribusi akses pada seluruh platform.">
                            {studentAccessDistribution.some((item) => item.value > 0) ? (
                                <ChartContainer config={{ premium: { color: '#10b981' }, free: { color: '#94a3b8' }, suspended: { color: '#dc2626' } }}>
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                        <Pie data={studentAccessDistribution} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3}>
                                            {studentAccessDistribution.map((item) => <Cell key={item.label} fill={item.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            ) : <ChartEmpty>Belum ada data siswa.</ChartEmpty>}
                        </ChartCard>
                        <LearningFeedback items={learningFeedback} />
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <h2 className="text-lg font-black text-gray-950 dark:text-white">Akses cepat</h2>
                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Navigasi langsung ke pekerjaan operasional.</p>
                        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                            {quickActions.map((item) => {
                                const Icon = actionIcons[item.icon] || LibraryBooksRounded;

                                return (
                                    <Link key={item.label} href={item.href} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-gray-800 dark:text-gray-200"><Icon fontSize="small" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-black text-gray-900 dark:text-white">{item.label}</span>
                                            <span className="mt-0.5 block truncate text-xs font-semibold text-gray-700 dark:text-gray-300">{item.description}</span>
                                        </span>
                                        <ArrowForwardRounded className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-brand-600 dark:text-gray-600 dark:group-hover:text-brand-300" fontSize="small" />
                                    </Link>
                                );
                            })}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-gray-950 dark:text-white">Aktivitas terkini</h2>
                                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Audit singkat perubahan terakhir pada platform.</p>
                            </div>
                            <Link href={route('superadmin.activity')} className="shrink-0 text-xs font-black text-brand-600 hover:text-brand-700 dark:text-brand-300">Lihat semua</Link>
                        </div>
                        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                            {activities.map((item) => (
                                <div key={`${item.actor}-${item.time}-${item.action}`} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{item.action}</p>
                                        <span className="shrink-0 text-xs font-bold text-gray-600 dark:text-gray-300">{item.time}</span>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{item.actor} · {item.target}</p>
                                </div>
                            ))}
                            {activities.length === 0 && <EmptyState>Belum ada aktivitas yang tercatat.</EmptyState>}
                        </div>
                    </Card>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}
