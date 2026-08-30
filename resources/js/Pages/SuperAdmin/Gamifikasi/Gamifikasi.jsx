import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ChartPeriodSelect from '@/Components/Features/Dashboard/ChartPeriodSelect';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import LeagueIcon, { LEAGUE_ICON_OPTIONS, resolveLeagueIconKey } from '@/Components/Gamification/LeagueIcon';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/Edit';

const defaultSettings = {
    quiz_xp: {
        perfect: 50,
        score_80: 35,
        score_60: 20,
        participation: 10,
    },
    streak: {
        enabled: true,
        milestones: [
            { days: 7, xp: 50 },
            { days: 30, xp: 200 },
            { days: 100, xp: 1000 },
        ],
    },
    leagues: [
        { name: 'Bronze', min_xp: 0, icon: 'bronze_kabuto' },
        { name: 'Silver', min_xp: 500, icon: 'silver_shuriken' },
        { name: 'Gold', min_xp: 2000, icon: 'gold_sakura' },
        { name: 'Diamond', min_xp: 5000, icon: 'diamond_torii' },
        { name: 'Amethyst', min_xp: 12000, icon: 'amethyst_scroll' },
    ],
};

const achievementConditions = {
    lessons_completed: 'Modul selesai',
    quiz_perfect: 'Kuis sempurna',
    streak_days: 'Hari beruntun',
};

const emptyAchievementForm = {
    name: '',
    description: '',
    icon: '',
    xp_reward: 0,
    condition_type: 'lessons_completed',
    condition_value: 1,
};

function NumberField({ label, value, onChange, helper, min = 0, max = 100000 }) {
    return (
        <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
            />
            {helper && <span className="mt-1 block text-xs font-semibold text-gray-400">{helper}</span>}
        </label>
    );
}

export default function Gamification({
    stats = [],
    leaderboard = [],
    xpSeries = [],
    leagueDistribution = [],
    filters = {},
    settings = defaultSettings,
    achievements = [],
}) {
    const initialSettings = {
        quiz_xp: {
            ...defaultSettings.quiz_xp,
            ...(settings.quiz_xp || {}),
        },
        streak: {
            ...defaultSettings.streak,
            ...(settings.streak || {}),
            milestones: settings.streak?.milestones?.length ? settings.streak.milestones : defaultSettings.streak.milestones,
        },
        leagues: (settings.leagues?.length ? settings.leagues : defaultSettings.leagues).map((league) => ({
            ...league,
            icon: resolveLeagueIconKey(league.icon),
        })),
    };

    const { data, setData, put, processing, errors } = useForm(initialSettings);
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const [achievementForm, setAchievementForm] = useState(emptyAchievementForm);
    const [editingAchievementId, setEditingAchievementId] = useState(null);

    const updateQuizXp = (key, value) => {
        setData('quiz_xp', {
            ...data.quiz_xp,
            [key]: Math.max(0, value || 0),
        });
    };

    const updateMilestone = (index, key, value) => {
        const milestones = [...data.streak.milestones];
        milestones[index] = {
            ...milestones[index],
            [key]: Math.max(key === 'days' ? 1 : 0, value || 0),
        };
        setData('streak', { ...data.streak, milestones });
    };

    const addMilestone = () => {
        setData('streak', {
            ...data.streak,
            milestones: [...data.streak.milestones, { days: 1, xp: 0 }],
        });
    };

    const removeMilestone = (index) => {
        setData('streak', {
            ...data.streak,
            milestones: data.streak.milestones.filter((_, itemIndex) => itemIndex !== index),
        });
    };

    const updateLeague = (index, key, value) => {
        const leagues = [...data.leagues];
        leagues[index] = {
            ...leagues[index],
            [key]: key === 'min_xp' ? Math.max(0, Number(value) || 0) : value,
        };
        setData('leagues', leagues);
    };

    const addLeague = () => {
        const lastLeague = data.leagues[data.leagues.length - 1];
        setData('leagues', [
            ...data.leagues,
            {
                name: 'Liga Baru',
                min_xp: (Number(lastLeague?.min_xp) || 0) + 1000,
                icon: 'bronze_kabuto',
            },
        ]);
    };

    const removeLeague = (index) => {
        setData('leagues', data.leagues.filter((_, itemIndex) => itemIndex !== index));
    };

    const saveSettings = (event) => {
        event.preventDefault();
        put(route('superadmin.gamification.settings.update'), {
            preserveScroll: true,
        });
    };

    const confirmRecalculate = () => {
        openConfirm({
            variant: 'warning',
            title: 'Evaluasi ulang pencapaian?',
            message: 'Sistem akan mengecek seluruh user dan membuka lencana yang memenuhi syarat. Reward achievement hanya diberikan untuk lencana yang belum pernah terbuka.',
            details: [
                'Aman untuk XP kuis dan streak yang sudah tercatat.',
                'Tidak menghapus progress lama.',
            ],
            confirmLabel: 'Jalankan',
            onConfirm: () => {
                setConfirmProcessing(true);
                router.post(route('superadmin.gamification.achievements.recalculate'), {}, {
                    preserveScroll: true,
                    onFinish: () => {
                        setConfirmProcessing(false);
                        closeConfirm();
                    },
                });
            },
        });
    };

    const resetAchievementForm = () => {
        setAchievementForm(emptyAchievementForm);
        setEditingAchievementId(null);
    };

    const saveAchievement = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: resetAchievementForm,
        };

        if (editingAchievementId) {
            router.put(route('superadmin.gamification.achievements.update', editingAchievementId), achievementForm, options);
            return;
        }

        router.post(route('superadmin.gamification.achievements.store'), achievementForm, options);
    };

    const editAchievement = (achievement) => {
        setEditingAchievementId(achievement.id);
        setAchievementForm({
            name: achievement.name || '',
            description: achievement.description || '',
            icon: achievement.icon || '',
            xp_reward: Number(achievement.xp_reward || 0),
            condition_type: achievement.condition_type || 'lessons_completed',
            condition_value: Number(achievement.condition_value || 1),
        });
    };

    const confirmDeleteAchievement = (achievement) => {
        openConfirm({
            variant: 'danger',
            title: 'Hapus lencana global?',
            message: 'Lencana ini berhenti dievaluasi untuk seluruh siswa. Riwayat lencana yang sudah dibuka juga akan dihapus.',
            details: [
                { label: 'Lencana', value: achievement.name },
                { label: 'Bonus XP', value: `${achievement.xp_reward || 0} XP` },
            ],
            confirmLabel: 'Hapus lencana',
            onConfirm: () => {
                setConfirmProcessing(true);
                router.delete(route('superadmin.gamification.achievements.destroy', achievement.id), {
                    preserveScroll: true,
                    onFinish: () => {
                        setConfirmProcessing(false);
                        closeConfirm();
                    },
                });
            },
        });
    };

    const ruleValues = [
        `100% = ${data.quiz_xp.perfect} XP`,
        `80%+ = ${data.quiz_xp.score_80} XP`,
        `60%+ = ${data.quiz_xp.score_60} XP`,
        `Di bawah 60% = ${data.quiz_xp.participation} XP jika ada jawaban benar`,
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Gamification Control" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
                                <SettingsIcon sx={{ fontSize: 25 }} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                                <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Gamification Control Center</h1>
                                <p className="mt-2 max-w-2xl text-sm font-semibold text-gray-500 dark:text-gray-400">
                                    Atur angka XP global, bonus streak, dan evaluasi achievement tanpa mengubah alur kuis yang sudah berjalan.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={confirmRecalculate}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
                        >
                            <RestartAltIcon sx={{ fontSize: 18 }} />
                            Evaluasi Achievement
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                    {stats.length === 0 && (
                        <Card className="sm:col-span-2 xl:col-span-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Belum ada statistik gamifikasi.</p>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <ChartCard title="XP Terdistribusi" subtitle="Reward yang benar-benar dicatat per hari" action={<ChartPeriodSelect routeName="superadmin.gamification" filters={filters} />}>
                        {xpSeries.some((item) => item.xp > 0) ? (
                            <ChartContainer config={{ xp: { label: 'XP', theme: { light: '#fbbf24', dark: '#fcd34d' } } }}>
                                <BarChart data={xpSeries} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => `${Number(value).toLocaleString('id-ID')} XP`} />} />
                                    <Bar dataKey="xp" name="XP" fill="var(--color-xp)" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada reward XP pada periode ini.</ChartEmpty>}
                    </ChartCard>

                    <ChartCard title="Distribusi Liga" subtitle="Posisi siswa berdasarkan XP saat ini">
                        {leagueDistribution.some((item) => item.value > 0) ? (
                            <ChartContainer config={Object.fromEntries(leagueDistribution.map((item) => [item.chart_key, { color: item.color }]))}>
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Pie data={leagueDistribution} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3}>
                                        {leagueDistribution.map((item) => <Cell key={item.label} fill={item.fill} />)}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada siswa dalam liga.</ChartEmpty>}
                    </ChartCard>
                </div>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <Card>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                                    <EmojiEventsIcon sx={{ fontSize: 20 }} />
                                    {editingAchievementId ? 'Edit Lencana' : 'Lencana Global'}
                                </h2>
                                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Aturan lencana berlaku untuk seluruh siswa, bukan hanya satu kelas.
                                </p>
                            </div>
                            {editingAchievementId && (
                                <button
                                    type="button"
                                    onClick={resetAchievementForm}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                                    title="Batal edit"
                                >
                                    <CloseIcon sx={{ fontSize: 18 }} />
                                </button>
                            )}
                        </div>

                        <form onSubmit={saveAchievement} className="mt-5 space-y-4">
                            <div className="grid grid-cols-[88px_1fr] gap-3">
                                <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Ikon</span>
                                    <input
                                        value={achievementForm.icon}
                                        onChange={(event) => setAchievementForm({ ...achievementForm, icon: event.target.value })}
                                        maxLength={10}
                                        placeholder="Badge"
                                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-center text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Nama lencana</span>
                                    <input
                                        required
                                        value={achievementForm.name}
                                        onChange={(event) => setAchievementForm({ ...achievementForm, name: event.target.value })}
                                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Deskripsi</span>
                                <input
                                    value={achievementForm.description}
                                    onChange={(event) => setAchievementForm({ ...achievementForm, description: event.target.value })}
                                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className="block sm:col-span-2">
                                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Kondisi</span>
                                    <select
                                        value={achievementForm.condition_type}
                                        onChange={(event) => setAchievementForm({ ...achievementForm, condition_type: event.target.value })}
                                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                    >
                                        {Object.entries(achievementConditions).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Target</span>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={achievementForm.condition_value}
                                        onChange={(event) => setAchievementForm({ ...achievementForm, condition_value: Math.max(1, Number(event.target.value) || 1) })}
                                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Bonus XP</span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={achievementForm.xp_reward}
                                    onChange={(event) => setAchievementForm({ ...achievementForm, xp_reward: Math.max(0, Number(event.target.value) || 0) })}
                                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                />
                            </label>

                            <div className="flex justify-end gap-3">
                                {editingAchievementId && (
                                    <button type="button" onClick={resetAchievementForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                        Batal
                                    </button>
                                )}
                                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-700">
                                    {editingAchievementId ? <SaveIcon sx={{ fontSize: 17 }} /> : <AddIcon sx={{ fontSize: 17 }} />}
                                    {editingAchievementId ? 'Simpan' : 'Tambah lencana'}
                                </button>
                            </div>
                        </form>
                    </Card>

                    <Card className="!p-0 overflow-hidden">
                        <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Daftar Lencana Aktif</h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Dievaluasi otomatis saat user memenuhi progres kuis, modul, atau streak.</p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {achievements.length === 0 && <p className="p-8 text-center text-sm font-bold text-gray-400">Belum ada lencana.</p>}
                            {achievements.map((achievement) => (
                                <article key={achievement.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-black text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
                                        {achievement.icon || <EmojiEventsIcon sx={{ fontSize: 20 }} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-gray-900 dark:text-white">{achievement.name}</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{achievement.description || 'Tanpa deskripsi.'}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black">
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{achievementConditions[achievement.condition_type] || achievement.condition_type}</span>
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Target {achievement.condition_value}</span>
                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">+{achievement.xp_reward} XP</span>
                                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">{achievement.users_count || 0} unlock</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => editAchievement(achievement)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300" title="Edit lencana">
                                            <EditIcon sx={{ fontSize: 18 }} />
                                        </button>
                                        <button type="button" onClick={() => confirmDeleteAchievement(achievement)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50 dark:border-red-900/40" title="Hapus lencana">
                                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </Card>
                </section>

                <form onSubmit={saveSettings} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Card>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                                    <BoltIcon sx={{ fontSize: 20 }} />
                                    XP Kuis
                                </h2>
                                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Angka ini dipakai saat user menyelesaikan kuis. Logic benar/salah, nyawa, timer, dan repetisi tidak berubah.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <NumberField label="Skor 100%" value={data.quiz_xp.perfect} onChange={(value) => updateQuizXp('perfect', value)} helper="Reward tertinggi untuk jawaban sempurna." max={10000} />
                            <NumberField label="Skor 80%+" value={data.quiz_xp.score_80} onChange={(value) => updateQuizXp('score_80', value)} helper="Reward untuk hasil sangat baik." max={10000} />
                            <NumberField label="Skor 60%+" value={data.quiz_xp.score_60} onChange={(value) => updateQuizXp('score_60', value)} helper="Reward untuk hasil lulus minimum." max={10000} />
                            <NumberField label="Partisipasi" value={data.quiz_xp.participation} onChange={(value) => updateQuizXp('participation', value)} helper="Dipakai jika ada jawaban benar tapi belum 60%." max={10000} />
                        </div>

                        {Object.keys(errors).length > 0 && (
                            <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-bold text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-200">
                                Periksa lagi input konfigurasi gamifikasi.
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                            <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />
                            Streak Bonus
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Bonus tambahan saat user mencapai hari streak tertentu.
                        </p>

                        <label className="mt-5 flex items-center justify-between rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                            <span>
                                <span className="block text-sm font-black text-gray-900 dark:text-white">Aktifkan bonus streak</span>
                                <span className="mt-1 block text-xs font-semibold text-gray-400">Jika mati, streak tetap tercatat tapi tanpa bonus XP.</span>
                            </span>
                            <input
                                type="checkbox"
                                checked={Boolean(data.streak.enabled)}
                                onChange={(event) => setData('streak', { ...data.streak, enabled: event.target.checked })}
                                className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-focus"
                            />
                        </label>

                        <div className="mt-4 space-y-3">
                            {data.streak.milestones.map((milestone, index) => (
                                <div key={`${milestone.days}-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
                                    <NumberField label="Hari" value={milestone.days} onChange={(value) => updateMilestone(index, 'days', value)} min={1} max={3650} />
                                    <NumberField label="XP" value={milestone.xp} onChange={(value) => updateMilestone(index, 'xp', value)} max={100000} />
                                    <button
                                        type="button"
                                        onClick={() => removeMilestone(index)}
                                        disabled={data.streak.milestones.length <= 1}
                                        className="mb-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addMilestone}
                            className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-black text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                        >
                            Tambah Milestone
                        </button>
                    </Card>

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                            <EmojiEventsIcon sx={{ fontSize: 20 }} />
                            Perjalanan Liga
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Threshold XP ini dipakai di profile user untuk menentukan liga saat ini dan progres menuju liga berikutnya.
                        </p>

                        <div className="mt-5 space-y-3">
                            {data.leagues.map((league, index) => (
                                <div key={`${league.name}-${index}`} className="grid grid-cols-[88px_1fr_160px_120px_auto] items-end gap-3 rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-rose-700 text-white shadow-lg shadow-brand-500/20">
                                        <LeagueIcon iconKey={league.icon} className="h-6 w-6" />
                                    </div>
                                    <label className="block">
                                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Nama Liga</span>
                                        <input
                                            value={league.name || ''}
                                            onChange={(event) => updateLeague(index, 'name', event.target.value)}
                                            className="mt-2 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Icon</span>
                                        <select
                                            value={league.icon || 'bronze_kabuto'}
                                            onChange={(event) => updateLeague(index, 'icon', event.target.value)}
                                            className="mt-2 h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                        >
                                            {LEAGUE_ICON_OPTIONS.map((option) => (
                                                <option key={option.key} value={option.key}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <NumberField label="Minimal XP" value={league.min_xp} onChange={(value) => updateLeague(index, 'min_xp', value)} max={10000000} />
                                    <button
                                        type="button"
                                        onClick={() => removeLeague(index)}
                                        disabled={data.leagues.length <= 1}
                                        className="mb-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addLeague}
                            className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-black text-gray-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                        >
                            Tambah Liga
                        </button>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Top Learners</h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Diambil dari XP user aktif.</p>
                        <div className="mt-5 space-y-3">
                            {leaderboard.map((item) => (
                                <div key={item.rank} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 font-black text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                                            {item.rank}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{item.name}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.streak}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-gray-900 dark:text-white">{item.xp}</span>
                                </div>
                            ))}
                            {leaderboard.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm font-bold text-gray-400 dark:border-gray-800">
                                    Belum ada leaderboard user.
                                </p>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white">
                            <EmojiEventsIcon sx={{ fontSize: 20 }} />
                            Aturan Aktif
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Ringkasan config yang akan dipakai backend setelah disimpan.
                        </p>

                        <div className="mt-5 space-y-4">
                            <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">XP Kuis</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {ruleValues.map((value) => (
                                        <span key={value} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {value}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">Streak</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        {data.streak.enabled ? 'Bonus aktif' : 'Bonus nonaktif'}
                                    </span>
                                    {data.streak.milestones.map((milestone, index) => (
                                        <span key={`${milestone.days}-${index}-summary`} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {milestone.days} hari = {milestone.xp} XP
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">Liga</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {[...data.leagues]
                                        .sort((a, b) => Number(a.min_xp || 0) - Number(b.min_xp || 0))
                                        .map((league, index) => (
                                            <span key={`${league.name}-${index}-summary`} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                <LeagueIcon iconKey={league.icon} className="h-3.5 w-3.5" />
                                                {league.name}: {Number(league.min_xp || 0).toLocaleString()} XP
                                            </span>
                                        ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-50"
                            >
                                <SaveIcon sx={{ fontSize: 18 }} />
                                {processing ? 'Menyimpan...' : 'Simpan Config Global'}
                            </button>
                        </div>
                    </Card>
                </form>
            </div>

            <ConfirmActionDialog
                {...confirmState}
                onCancel={closeConfirm}
            />
        </AuthenticatedLayout>
    );
}
