import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

export default function DetailUser({ student, filters = {}, studentActivitySeries = [], levelProgress = [], recentProgress = [], recentAttempts = [], rewardHistory = [], backHref, backLabel = 'Kembali ke Kloter dan Siswa', activityRouteName = 'admin.users.show' }) {
    const [activeTab, setActiveTab] = useState('profile');
    const totalModules = levelProgress.reduce((total, level) => total + Number(level.total_lessons || 0), 0);
    const completedModules = levelProgress.reduce((total, level) => total + Number(level.completed_lessons || 0), 0);
    const progressDistribution = [{ label: 'Selesai', value: completedModules }, { label: 'Belum selesai', value: Math.max(0, totalModules - completedModules) }];

    return (
        <AuthenticatedLayout>
            <Head title={`${student.username} - Detail Murid`} />
            <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        {student.avatar ? <img src={student.avatar} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/50" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-black text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">{student.username?.slice(0, 1)?.toUpperCase()}</div>}
                        <div className="min-w-0"><Link href={backHref || route('admin.users', filters.kloter ? { kloter: filters.kloter } : {})} className="text-sm font-bold text-brand-600 hover:underline dark:text-brand-400">{backLabel}</Link><h1 className="truncate text-2xl font-black text-gray-900 dark:text-white">{student.username}</h1><p className="truncate text-sm text-gray-500 dark:text-gray-400">{student.email}</p></div>
                    </div>
                    <span className="w-fit rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-200">Akun {student.status} - {student.subscription_status}</span>
                </div>

                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
                    <button type="button" onClick={() => setActiveTab('profile')} className={`border-b-2 px-3 py-3 text-sm font-black ${activeTab === 'profile' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Profil dan Akses</button>
                    <button type="button" onClick={() => setActiveTab('monitoring')} className={`border-b-2 px-3 py-3 text-sm font-black ${activeTab === 'monitoring' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>Monitoring Belajar</button>
                </div>

                {activeTab === 'profile' && <>
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4"><StatCard title="XP" value={student.xp.toLocaleString()} icon="XP" /><StatCard title="Level" value={`Lv ${student.level}`} icon="L" /><StatCard title="Streak" value={`${student.streak_count} hari`} icon="S" /><StatCard title="Kuis Selesai" value={student.quizzes_done} icon="Q" /></div>
                    <div className="grid gap-5 xl:grid-cols-2">
                        <Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Kelas dan Kloter</h2><div className="mt-4 space-y-3">{student.kloters?.length ? student.kloters.map((kloter) => <div key={kloter.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><p className="font-black text-gray-900 dark:text-white">{kloter.name}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{kloter.program || 'Program belum tersedia'}</p><p className="mt-2 text-xs font-bold text-brand-600 dark:text-brand-400">{kloter.status} - bergabung {kloter.joined_at || '-'}</p></div>) : <Empty text="Belum terdaftar pada kloter." />}</div></Card>
                        <Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Status Pembayaran dan Akses</h2><div className="mt-4 space-y-3">{student.subscriptions?.length ? student.subscriptions.map((subscription) => <div key={subscription.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"><p className="font-black text-gray-900 dark:text-white">{subscription.plan || 'Paket akses'}</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subscription.scope} - berakhir {subscription.ends_at || '-'}</p><p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">{subscription.status}</p></div>) : <Empty text="Belum ada akses kelas aktif." />}</div></Card>
                    </div>
                </>}

                {activeTab === 'monitoring' && <>
                    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                        <ChartCard title="Progres Kelas" subtitle={`${completedModules} dari ${totalModules} modul selesai`}>{totalModules > 0 ? <ChartContainer config={{ complete: { label: 'Selesai', color: '#15803d' } }}><PieChart><ChartTooltip content={<ChartTooltipContent />} /><Pie data={progressDistribution} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={3}><Cell fill="#15803d" /><Cell fill="#e5e7eb" /></Pie></PieChart></ChartContainer> : <ChartEmpty>Belum ada modul dalam cakupan siswa ini.</ChartEmpty>}</ChartCard>
                        <ChartCard title="Aktivitas 30 Hari" subtitle="Progres dan attempt kuis" action={<ChartPeriodSelect routeName={activityRouteName} routeParams={student.id} filters={filters} />}>{studentActivitySeries.some((item) => item.progress || item.quiz_attempts) ? <ChartContainer config={{ progress: { label: 'Progres', color: '#15803d' }, quiz_attempts: { label: 'Kuis', color: '#1d4ed8' } }}><BarChart data={studentActivitySeries} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" /><XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" /><YAxis allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="progress" fill="var(--color-progress)" radius={[4, 4, 0, 0]} /><Bar dataKey="quiz_attempts" fill="var(--color-quiz_attempts)" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer> : <ChartEmpty>Belum ada aktivitas pada periode ini.</ChartEmpty>}</ChartCard>
                    </div>
                    <div><Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Progres per Level</h2><div className="mt-4 space-y-4">{levelProgress.map((level) => <div key={level.id}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-bold text-gray-700 dark:text-gray-300">{level.name}</span><span className="text-gray-500 dark:text-gray-400">{level.completed_lessons}/{level.total_lessons}</span></div><div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${level.percentage}%` }} /></div></div>)}</div></Card></div>
                    <div className="grid gap-5 xl:grid-cols-3"><Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Modul Terbaru</h2><List items={recentProgress} empty="Belum ada modul selesai." render={(item) => <><p className="font-black text-gray-900 dark:text-white">{item.lesson}</p><p className="text-xs text-gray-500 dark:text-gray-400">{item.completed_at}</p></>} /></Card><Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Attempt Kuis</h2><List items={recentAttempts} empty="Belum ada attempt kuis." render={(item) => <><p className="font-black text-gray-900 dark:text-white">{item.lesson || item.quiz}</p><p className="text-xs font-bold text-brand-600 dark:text-brand-400">Skor {item.score} / {item.xp_earned > 0 ? `+${item.xp_earned} XP` : 'Tidak ada XP tambahan'}</p></>} /></Card><Card><h2 className="text-lg font-black text-gray-900 dark:text-white">Reward History</h2><List items={rewardHistory} empty="Belum ada reward." render={(item) => <><p className="font-black text-gray-900 dark:text-white">{item.description || item.source_type}</p><p className="text-xs text-gray-500 dark:text-gray-400">+{item.xp_amount} XP - {item.created_at}</p></>} /></Card></div>
                </>}
            </div>
        </AuthenticatedLayout>
    );
}

function Empty({ text }) { return <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">{text}</p>; }
function List({ items, empty, render }) { return <div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">{render(item)}</div>) : <Empty text={empty} />}</div>; }
