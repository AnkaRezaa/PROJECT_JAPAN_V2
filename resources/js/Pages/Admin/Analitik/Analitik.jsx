import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import KloterFilter from '@/Components/Features/Admin/KloterFilter';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const scoreColors = ['#dc2626', '#f97316', '#0ea5e9', '#10b981'];

export default function Analitik({ adminScope = 'global', kloters = [], filters = {}, summary = {}, scoreDistribution = [], lowScoreQuizzes = [], popularModules = [], inactiveStudents = [], recentAttempts = [], questionPerformance = [], learningFeedback = [] }) {
    return (
        <AuthenticatedLayout>
            <Head title="Admin - Analitik Sensei" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Sensei Analytics</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Analitik Pembelajaran</h1>
                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pantau quiz sulit, murid pasif, dan modul yang paling sering diselesaikan.</p>
                    </div>
                    <KloterFilter routeName="admin.analytics" kloters={kloters} filters={filters} adminScope={adminScope} />
                </div>

                <div className="flex w-full gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                    <Link
                        href={route('admin.users', filters.kloter ? { kloter: filters.kloter } : {})}
                        className="border-b-2 border-transparent px-3 py-3 text-sm font-black text-gray-700 transition hover:border-gray-300 hover:text-gray-950 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                    >
                        Siswa
                    </Link>
                    <Link
                        href={route('admin.users', { ...(filters.kloter ? { kloter: filters.kloter } : {}), tab: 'pending' })}
                        className="border-b-2 border-transparent px-3 py-3 text-sm font-black text-gray-700 transition hover:border-gray-300 hover:text-gray-950 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                    >
                        Persetujuan
                    </Link>
                    <Link
                        href={route('admin.users', { ...(filters.kloter ? { kloter: filters.kloter } : {}), tab: 'kloter' })}
                        className="border-b-2 border-transparent px-3 py-3 text-sm font-black text-gray-700 transition hover:border-gray-300 hover:text-gray-950 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                    >
                        Kelola Kloter
                    </Link>
                    <Link
                        href={route('admin.analytics', filters.kloter ? { kloter: filters.kloter } : {})}
                        className="border-b-2 border-brand-600 px-3 py-3 text-sm font-black text-brand-600 dark:text-brand-400"
                    >
                        Monitoring
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Total Murid" value={summary.total_students || 0} icon="U" />
                    <StatCard title="Quiz Attempt" value={summary.total_attempts || 0} icon="Q" />
                    <StatCard title="Rata-rata Skor" value={summary.average_score || 0} icon="S" />
                    <StatCard title="Murid Pasif" value={summary.inactive_students || 0} icon="I" />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <ChartCard
                        title="Distribusi Skor"
                        subtitle="Attempt kuis pada periode terpilih"
                        action={<ChartPeriodSelect routeName="admin.analytics" filters={filters} />}
                    >
                        {scoreDistribution.some((item) => item.value > 0) ? (
                            <ChartContainer config={{ score: { label: 'Attempt', theme: { light: '#1d4ed8', dark: '#60a5fa' } } }}>
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Pie data={scoreDistribution} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={3}>
                                        {scoreDistribution.map((item, index) => <Cell key={item.label} fill={scoreColors[index % scoreColors.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada attempt kuis pada periode ini.</ChartEmpty>}
                    </ChartCard>

                    <ChartCard title="Modul Populer" subtitle="Berdasarkan jumlah penyelesaian siswa">
                        {popularModules.length > 0 ? (
                            <ChartContainer config={{ completions: { label: 'Selesai', theme: { light: '#15803d', dark: '#4ade80' } } }}>
                                <BarChart data={popularModules} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <YAxis type="category" dataKey="title" width={130} tickLine={false} axisLine={false} className="fill-gray-500 text-xs" tick={{ fontSize: 11 }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="completions_count" name="Selesai" fill="var(--color-completions)" radius={[0, 5, 5, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada progres modul.</ChartEmpty>}
                    </ChartCard>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Quiz dengan Skor Rendah</h2>
                        <div className="mt-4 space-y-3">
                            {lowScoreQuizzes.map((item) => (
                                <div key={item.quiz_id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{item.lesson || item.quiz_type}</p>
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.module || 'Tanpa modul'} - {item.attempts_count} attempt</p>
                                        </div>
                                        <span className="text-sm font-black text-brand-600 dark:text-brand-400">{item.average_score}</span>
                                    </div>
                                </div>
                            ))}
                            {lowScoreQuizzes.length === 0 && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada attempt quiz.</p>}
                        </div>
                    </Card>

                </div>

                <Card>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Feedback Intensitas Belajar</h2>
                    <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">Ringkasan feedback setelah sesi kuis pada periode terpilih.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {learningFeedback.map((item) => (
                            <div key={item.label} className={`rounded-2xl border p-4 ${item.tone === 'red'
                                ? 'border-brand-100 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-950/20'
                                : item.tone === 'emerald'
                                    ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                    : 'border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'}`}>
                                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{item.value}</p>
                                <p className="mt-1 text-xs font-black text-gray-600 dark:text-gray-300">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Performa Soal</h2>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Soal dengan persentase benar terendah muncul paling atas.</p>
                        </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-[11px] font-black uppercase tracking-widest text-gray-600 dark:border-gray-800 dark:text-gray-300">
                                    <th className="py-3 pr-4">Soal</th>
                                    <th className="px-4 py-3">Materi</th>
                                    <th className="px-4 py-3 text-center">Attempt</th>
                                    <th className="px-4 py-3 text-center">Benar</th>
                                    <th className="py-3 pl-4 text-right">Akurasi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questionPerformance.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800/70">
                                        <td className="max-w-[320px] py-4 pr-4 font-bold text-gray-900 dark:text-white">
                                            <span className="line-clamp-2">{item.question_text}</span>
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                                            <p className="font-bold text-gray-700 dark:text-gray-300">{item.lesson || item.quiz_type || 'Tanpa modul'}</p>
                                            <p className="text-xs">{item.module || 'Tanpa modul'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-center font-black text-gray-700 dark:text-gray-300">{item.attempts_count}</td>
                                        <td className="px-4 py-4 text-center font-black text-green-600 dark:text-green-400">{item.correct_count}</td>
                                        <td className="py-4 pl-4 text-right">
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ${item.correct_rate < 50 ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300'}`}>
                                                {item.correct_rate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {questionPerformance.length === 0 && <p className="py-6 text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada data jawaban per soal. Data akan muncul setelah user mengerjakan kuis terbaru.</p>}
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Murid Pasif</h2>
                        <div className="mt-4 space-y-3">
                            {inactiveStudents.map((student) => (
                                <Link key={student.id} href={route('admin.users.show', student.id)} className="block rounded-2xl border border-gray-100 dark:border-gray-800 p-4 transition-colors hover:border-brand-200 dark:hover:border-brand-900/40">
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{student.username}</p>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{student.email}</p>
                                    <p className="mt-2 text-xs font-bold text-gray-600 dark:text-gray-300">Aktivitas terakhir: {student.last_activity_label}</p>
                                </Link>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Attempt Terbaru</h2>
                        <div className="mt-4 space-y-3">
                            {recentAttempts.map((attempt) => (
                                <div key={attempt.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{attempt.student}</p>
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{attempt.lesson || attempt.quiz_type}</p>
                                        </div>
                                        <span className="text-sm font-black text-brand-600 dark:text-brand-400">{attempt.score}</span>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">{attempt.attempted_at}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
