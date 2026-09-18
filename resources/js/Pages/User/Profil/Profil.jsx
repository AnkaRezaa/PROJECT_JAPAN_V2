import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';
import LeagueIcon from '@/Components/Gamification/LeagueIcon';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import theme from '@/Components/theme/themes';

import PersonIcon from '@mui/icons-material/Person';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import BoltIcon from '@mui/icons-material/Bolt';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LockIcon from '@mui/icons-material/Lock';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import TranslateIcon from '@mui/icons-material/Translate';
import {
    areSoundEffectsEnabled,
    playSoundEffect,
    setSoundEffectsEnabled,
} from '@/Components/UI/SoundEffects';

const DEFAULT_LEAGUE_TIERS = [
    { name: 'Bronze', min_xp: 0, icon: 'bronze_kabuto' },
    { name: 'Silver', min_xp: 500, icon: 'silver_shuriken' },
    { name: 'Gold', min_xp: 2000, icon: 'gold_sakura' },
    { name: 'Diamond', min_xp: 5000, icon: 'diamond_torii' },
    { name: 'Amethyst', min_xp: 12000, icon: 'amethyst_scroll' },
];

const LEAGUE_STYLES = [
    { color: 'text-amber-700 dark:text-amber-500', bar: 'bg-amber-500', frame: 'from-amber-500 to-orange-700 shadow-amber-500/25' },
    { color: 'text-slate-600 dark:text-slate-400', bar: 'bg-slate-500', frame: 'from-slate-300 to-slate-700 shadow-slate-500/25' },
    { color: 'text-yellow-600 dark:text-yellow-400', bar: 'bg-yellow-500', frame: 'from-yellow-300 to-amber-600 shadow-yellow-500/25' },
    { color: 'text-brand-600 dark:text-brand-400', bar: 'bg-brand-500', frame: 'from-cyan-300 via-brand-500 to-rose-700 shadow-brand-500/25' },
    { color: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', frame: 'from-fuchsia-400 to-purple-800 shadow-purple-500/25' },
];

const normalizeLeagueTiers = (leagues = []) => {
    const source = leagues.length ? leagues : DEFAULT_LEAGUE_TIERS;

    return source
        .map((league, index) => ({
            name: league.name || 'Liga',
            min: Number(league.min_xp ?? league.min ?? 0),
            icon: league.icon || 'bronze_kabuto',
            ...(LEAGUE_STYLES[index] || LEAGUE_STYLES[LEAGUE_STYLES.length - 1]),
        }))
        .sort((a, b) => a.min - b.min);
};

const getLeague = (xp, tiers) => {
    const xpNum = parseInt(String(xp).replace(/\D/g, '')) || 0;
    return [...tiers].reverse().find(t => xpNum >= t.min) || tiers[0];
};

const InputField = ({ label, type = 'text', value, defaultValue, onChange, placeholder, disabled, error, autoComplete }) => (
    <div>
        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{label}</label>
        <input
            type={type}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`w-full bg-gray-50/50 dark:bg-gray-800/50 border rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-900 focus:border-rose-400 dark:focus:border-rose-500 transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed font-medium ${error ? 'border-rose-500 dark:border-rose-500 ring-1 ring-rose-500' : 'border-gray-200 dark:border-gray-700'}`}
        />
        {error && <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>}
    </div>
);

const JapanesePattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-5 dark:opacity-[0.03] pointer-events-none text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="jppattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M10 20 L20 10 L30 20 L20 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#jppattern)" />
    </svg>
);

const transactionTone = (status) => {
    if (status === 'success') {
        return {
            icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400',
            badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
        };
    }

    if (status === 'pending') {
        return {
            icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400',
            badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
        };
    }

    return {
        icon: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400',
        badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
    };
};

const resolveThemeLabel = () => {
    if (typeof window === 'undefined') {
        return 'System';
    }

    const mode = window.localStorage.getItem('theme') || 'system';

    if (mode === 'dark') {
        return 'Dark';
    }

    if (mode === 'light') {
        return 'Light';
    }

    return 'System';
};

export default function Profile({ recentTransactions = [], achievements = [], gamificationSettings = {}, deletionAuth = {} }) {
    const { user } = usePage().props.auth;
    const passwordLoginEnabled = deletionAuth.password_login_enabled !== false;
    const googleReauthenticated = Boolean(deletionAuth.google_reauthenticated);
    const [activeTab, setActiveTab] = useState(deletionAuth.open_dialog ? 'settings' : 'stats');
    const [deleteConfirm, setDeleteConfirm] = useState(Boolean(deletionAuth.open_dialog));
    const [themeLabel, setThemeLabel] = useState(resolveThemeLabel);
    const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState(areSoundEffectsEnabled);
    const [learningPreferences, setLearningPreferences] = useState({
        show_romaji: Boolean(user.show_romaji),
        show_indonesian_translation: Boolean(user.show_indonesian_translation),
    });
    const accessKeyForm = useForm({ code: '' });
    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [passwordSaved, setPasswordSaved] = useState(false);
    const deleteAccountForm = useForm({
        confirmation_username: '',
        password: '',
    });
    const accessStatus = user.access_status || {};
    const transactionInvoices = recentTransactions.map((transaction) => ({
        id: transaction.code || transaction.transaction_code || null,
        date: transaction.created_at_label || 'Tanggal belum tersedia',
        plan: `${transaction.plan}${transaction.scope_label ? ` - ${transaction.scope_label}` : ''}`,
        price: transaction.amount_formatted,
        status: transaction.status,
        statusLabel: transaction.status_label || (transaction.status === 'success' ? 'Berhasil' : 'Gagal'),
    }));

    useEffect(() => {
        const syncThemeLabel = () => setThemeLabel(resolveThemeLabel());

        syncThemeLabel();
        window.addEventListener('storage', syncThemeLabel);
        window.addEventListener('toku-up:theme-changed', syncThemeLabel);

        return () => {
            window.removeEventListener('storage', syncThemeLabel);
            window.removeEventListener('toku-up:theme-changed', syncThemeLabel);
        };
    }, []);

    useEffect(() => {
        const syncSoundEffects = () => setSoundEffectsEnabledState(areSoundEffectsEnabled());

        window.addEventListener('storage', syncSoundEffects);
        window.addEventListener('toku-up:sound-effects-changed', syncSoundEffects);

        return () => {
            window.removeEventListener('storage', syncSoundEffects);
            window.removeEventListener('toku-up:sound-effects-changed', syncSoundEffects);
        };
    }, []);

    const toggleSoundEffects = () => {
        const nextValue = !soundEffectsEnabled;
        setSoundEffectsEnabled(nextValue);
        setSoundEffectsEnabledState(nextValue);

        if (nextValue) {
            playSoundEffect('select');
        }
    };

    const updateLearningPreference = (key) => {
        const nextPreferences = { ...learningPreferences, [key]: !learningPreferences[key] };
        setLearningPreferences(nextPreferences);
        router.patch(route('profile.learning-preferences.update'), nextPreferences, {
            preserveScroll: true,
            preserveState: true,
            onError: () => setLearningPreferences(learningPreferences),
        });
    };

    const submitPassword = (event) => {
        event.preventDefault();
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                setPasswordSaved(true);
                setTimeout(() => setPasswordSaved(false), 2500);
            },
        });
    };

    const submitAccessKey = (event) => {
        event.preventDefault();
        accessKeyForm.post(route('profile.access-keys.redeem'), {
            preserveScroll: true,
            onSuccess: () => accessKeyForm.reset(),
        });
    };

    const deleteAccount = () => {
        deleteAccountForm.delete(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteConfirm(false);
                deleteAccountForm.reset();
            },
        });
    };

    const confirmAccountDeletion = () => {
        if (!passwordLoginEnabled && !googleReauthenticated) {
            window.location.assign(route('profile.delete.google.redirect'));
            return;
        }

        deleteAccount();
    };

    const xp = user.xp || 0;
    const streak = user.streak_count || 0;
    const isPrem = Boolean(accessStatus.is_premium ?? user.subscription_status === 'premium');
    const shouldShowUpgrade = accessStatus.should_show_upgrade ?? !isPrem;
    const activeUntilLabel = accessStatus.active_until_label;
    const leagueTiers = normalizeLeagueTiers(gamificationSettings.leagues || []);
    const league = getLeague(xp, leagueTiers);

    const currentTierIndex = leagueTiers.findIndex(t => t.name === league.name);
    const nextTier = leagueTiers[currentTierIndex + 1];
    const progressPct = nextTier 
        ? Math.min(100, Math.round(((xp - league.min) / (nextTier.min - league.min)) * 100))
        : 100;
    const achievementSlots = Array.from({ length: 8 }, (_, index) => achievements[index] || null);
    const achievementPreviewCount = achievements.length;
    const nextAchievementHint = achievements.length > 0
        ? 'Pertahankan streak dan skor kuis untuk membuka lencana berikutnya.'
        : 'Mulai dari kuis pertama atau selesaikan modul mingguan untuk membuka lencana.';

    return (
        <MotionConfig reducedMotion="user">
        <AuthenticatedLayout header={false}>
            <Head title={`Profil ${user.username} — TOKU-UP`} />

            <div className="min-h-screen bg-surface-muted py-10 px-4 sm:px-6 relative overflow-x-clip transition-colors duration-300">
                <JapanesePattern />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Bento Grid Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* ── SIDEBAR KIRI ── */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Card 1: Profil */}
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center relative overflow-hidden transition-colors">
                                {isPrem && (
                                    <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-sm flex items-center gap-1 bg-gradient-to-r ${theme.ctaBg || 'from-amber-400 to-orange-500'}`}>
                                        <WorkspacePremiumIcon sx={{ fontSize: 14 }} /> Premium
                                    </div>
                                )}

                                <div className="relative inline-block mt-4 mb-5">
                                    <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-pink-500 rounded-[2rem] flex items-center justify-center text-5xl font-black text-white shadow-xl shadow-rose-200 dark:shadow-rose-900/20 overflow-hidden"
                                         style={{ border: `2px solid ${theme.activeColor || 'transparent'}` }}>
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            user?.username?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                </div>

                                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user.username}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{user.email}</p>
                            </div>

                            {/* Card 2: Menu Navigasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-colors">
                                <nav className="flex flex-col gap-2">
                                    {[
                                        { id: 'stats', label: 'Dashboard Profil', icon: <PersonIcon /> },
                                        { id: 'settings', label: 'Pengaturan Akun', icon: <ManageAccountsIcon /> },
                                        { id: 'billing', label: 'Riwayat Tagihan', icon: <ReceiptLongIcon /> },
                                        { id: 'accessKey', label: 'Access Key', icon: <VpnKeyIcon /> },
                                    ].map((item) => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`flex items-center gap-3 w-full px-5 py-4 rounded-2xl text-sm font-black transition-all
                                                ${activeTab === item.id 
                                                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'}`}
                                        >
                                            <span className={`${activeTab === item.id ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                        </div>

                        {/* ── KONTEN KANAN ── */}
                        <div className="lg:col-span-8">
                            <AnimatePresence mode="wait">
                                
                                {/* ── TAB STATS ── */}
                                {activeTab === 'stats' && (
                                    <motion.div 
                                        key="stats"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:gap-6"
                                    >
                                        {/* Streak Card */}
                                        <div className="col-span-1 bg-orange-50 dark:bg-orange-900/10 rounded-[2rem] border border-orange-100 dark:border-orange-500/20 p-5 sm:p-8 flex flex-col justify-center relative overflow-hidden transition-colors">
                                            <div className="relative z-10">
                                                <div className="w-12 h-12 bg-white dark:bg-orange-500/20 rounded-2xl shadow-sm flex items-center justify-center text-orange-500 dark:text-orange-400 mb-4">
                                                    <LocalFireDepartmentIcon sx={{ fontSize: 24 }} />
                                                </div>
                                                <h3 className="text-3xl sm:text-4xl font-black text-orange-600 dark:text-orange-400 tracking-tight">{streak}</h3>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-500/80 sm:text-xs sm:tracking-widest dark:text-orange-400/80">Hari Streak</p>
                                            </div>
                                        </div>

                                        {/* XP Card */}
                                        <div className="relative col-span-1 flex flex-col justify-center overflow-hidden rounded-[2rem] border border-brand-100 bg-brand-50 p-5 transition-colors dark:border-green-900/60 dark:bg-[#12351f]/70 sm:p-8">
                                            <div className="relative z-10">
                                                <div className="w-12 h-12 bg-white dark:bg-brand-500/20 rounded-2xl shadow-sm flex items-center justify-center text-brand-500 dark:text-brand-400 mb-4">
                                                    <BoltIcon sx={{ fontSize: 24 }} />
                                                </div>
                                                <h3 className="break-words text-3xl sm:text-4xl font-black text-brand-600 dark:text-brand-400 tracking-tight">{xp.toLocaleString()}</h3>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-brand-500/80 sm:text-xs sm:tracking-widest dark:text-brand-400/80">Total XP</p>
                                            </div>
                                        </div>

                                        {/* League / Liga Card */}
                                        <div className="col-span-1 min-[380px]:col-span-2 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-8 transition-colors">
                                            <div className="flex items-center gap-2 mb-6">
                                                <EmojiEventsIcon sx={{ color: '#f43f5e' }} />
                                                <h3 className="font-black text-gray-900 dark:text-white text-lg">Perjalanan Liga</h3>
                                            </div>
                                            
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center border border-white/40 bg-gradient-to-br ${league.frame} text-white shadow-xl`}>
                                                    <LeagueIcon iconKey={league.icon} className="h-10 w-10 drop-shadow" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Liga Saat Ini</p>
                                                    <h4 className={`text-2xl font-black ${league.color}`}>{league.name}</h4>
                                                    {nextTier ? (
                                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                            Sisa <strong className="text-gray-900 dark:text-white">{(nextTier.min - xp).toLocaleString()} XP</strong> untuk naik ke {nextTier.name}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Anda berada di liga tertinggi!</p>
                                                    )}
                                                </div>
                                            </div>

                                            {nextTier && (
                                                <div className="relative">
                                                    <div className="flex justify-between text-xs font-black text-gray-400 dark:text-gray-500 mb-2">
                                                        <span>{league.min.toLocaleString()} XP</span>
                                                        <span>{nextTier.min.toLocaleString()} XP</span>
                                                    </div>
                                                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progressPct}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className={`h-full rounded-full ${league.bar}`}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Badges / Pencapaian Card */}
                                        <div className="col-span-2 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                                            <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-brand-500 to-orange-500 p-6 text-white sm:p-8">
                                                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                                                <div className="absolute bottom-0 right-8 text-8xl font-black text-white/10">達</div>
                                                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                                                    <div>
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                                                                <MilitaryTechIcon />
                                                            </div>
                                                            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/75">Achievement Board</p>
                                                        </div>
                                                        <h3 className="text-2xl font-black tracking-tight">Pencapaian</h3>
                                                        <p className="mt-2 max-w-xl text-sm font-semibold text-white/80">{nextAchievementHint}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-center">
                                                        <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                                                            <p className="text-2xl font-black">{achievementPreviewCount}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Terbuka</p>
                                                        </div>
                                                        <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                                                            <p className="text-2xl font-black">{achievementSlots.length}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Slot</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 sm:p-6">
                                                <div className="mb-5 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">Galeri Lencana</p>
                                                        <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                            {achievementPreviewCount > 0 ? 'Lencana terbaru dan slot target berikutnya.' : 'Slot target disiapkan untuk progres berikutnya.'}
                                                        </p>
                                                    </div>
                                                    <Link href={route('user.progress')} className="rounded-full bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300">
                                                        Lihat Semua
                                                    </Link>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                    {achievementSlots.map((achievement, idx) => {
                                                        const tone = [
                                                            'from-emerald-400 to-teal-600 shadow-emerald-500/20',
                                                            'from-violet-400 to-purple-700 shadow-violet-500/20',
                                                            'from-sky-400 to-blue-700 shadow-sky-500/20',
                                                            'from-rose-400 to-brand-700 shadow-rose-500/20',
                                                        ][idx % 4];

                                                        if (!achievement) {
                                                            return (
                                                                <div key={`locked-${idx}`} className="group rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center transition hover:border-rose-200 hover:bg-rose-50/40 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/20">
                                                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-300 shadow-sm transition group-hover:text-rose-300 dark:bg-gray-900 dark:text-gray-600">
                                                                        <LockIcon sx={{ fontSize: 20 }} />
                                                                    </div>
                                                                    <p className="text-xs font-black text-gray-400 dark:text-gray-500">Terkunci</p>
                                                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Baru</p>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={achievement.id} className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950">
                                                                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-xl text-white shadow-lg`}>
                                                                    {achievement.icon || <MilitaryTechIcon />}
                                                                </div>
                                                                <p className="line-clamp-2 min-h-[2.25rem] text-sm font-black leading-tight text-gray-800 dark:text-gray-200">{achievement.name}</p>
                                                                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-rose-500">+{achievement.xp_reward || 0} XP</p>
                                                                {achievement.unlocked_at_label && (
                                                                    <p className="mt-1 text-[10px] font-semibold text-gray-400">{achievement.unlocked_at_label}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── TAB PENGATURAN ── */}
                                {activeTab === 'settings' && (
                                    <motion.div 
                                        key="settings"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8 transition-colors">
                                            <div className="flex items-center gap-2 mb-6">
                                                <ManageAccountsIcon sx={{ color: '#f43f5e' }} />
                                                <h3 className="font-black text-gray-900 dark:text-white text-lg">Pengaturan Akun</h3>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Penampilan */}
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Penampilan</h4>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                                <PaletteIcon sx={{ fontSize: 20 }} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Mode Tampilan</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tema diatur dari tombol kanan atas.</p>
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm dark:bg-white dark:text-gray-900">
                                                            {themeLabel}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                                                                {soundEffectsEnabled ? <VolumeUpIcon sx={{ fontSize: 20 }} /> : <VolumeOffIcon sx={{ fontSize: 20 }} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Efek Suara</p>
                                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Feedback untuk kuis, flashcard, roadmap, dan pembayaran.</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={toggleSoundEffects}
                                                            aria-pressed={soundEffectsEnabled}
                                                            className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${soundEffectsEnabled
                                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                                        >
                                                            {soundEffectsEnabled ? 'Aktif' : 'Nonaktif'}
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-gray-800 dark:text-sky-300">
                                                                <TranslateIcon sx={{ fontSize: 20 }} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Bantuan Baca Jepang</p>
                                                                <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">Atur bantuan yang tampil di materi, flashcard, kuis, dan berita.</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                            {[
                                                                { key: 'show_romaji', label: 'Romaji', description: 'Tampilkan ejaan latin di bawah bacaan Jepang.' },
                                                                { key: 'show_indonesian_translation', label: 'Terjemahan Indonesia', description: 'Tampilkan arti saat materi menyediakannya.' },
                                                            ].map((preference) => (
                                                                <button
                                                                    key={preference.key}
                                                                    type="button"
                                                                    onClick={() => updateLearningPreference(preference.key)}
                                                                    aria-pressed={learningPreferences[preference.key]}
                                                                    className={`flex min-h-[4.5rem] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${learningPreferences[preference.key]
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}
                                                                >
                                                                    <span className="min-w-0">
                                                                        <span className="block text-sm font-bold">{preference.label}</span>
                                                                        <span className="mt-0.5 block text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">{preference.description}</span>
                                                                    </span>
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${learningPreferences[preference.key] ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                                    >
                                                                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${learningPreferences[preference.key] ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                                                            <p lang="ja" className="text-base font-black text-gray-900 dark:text-white">日本語を勉強します</p>
                                                            <p lang="ja" className="mt-1 text-xs font-semibold text-sky-700 dark:text-sky-300">にほんごをべんきょうします</p>
                                                            {learningPreferences.show_romaji && <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">nihongo o benkyou shimasu</p>}
                                                            {learningPreferences.show_indonesian_translation && <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Saya belajar bahasa Jepang.</p>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Kontak */}
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Informasi Kontak</h4>
                                                    <InputField label="Alamat Email" type="email" defaultValue={user.email} disabled />
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">Hubungi Admin untuk mengubah alamat email Anda.</p>
                                                </div>

                                                {/* Password */}
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Ubah Kata Sandi</h4>
                                                    {!passwordLoginEnabled ? (
                                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm font-medium text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                                                            <p className="font-bold text-blue-900 dark:text-blue-200 mb-1">Login Menggunakan Akun Google</p>
                                                            Akun Anda terhubung langsung dengan autentikasi Google dan tidak menggunakan kata sandi lokal terpisah.
                                                        </div>
                                                    ) : (
                                                        <form onSubmit={submitPassword}>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="sm:col-span-2">
                                                                    <InputField
                                                                        label="Sandi Lama"
                                                                        type="password"
                                                                        placeholder="••••••••"
                                                                        value={passwordForm.data.current_password}
                                                                        onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                                                        error={passwordForm.errors.current_password}
                                                                        autoComplete="current-password"
                                                                    />
                                                                </div>
                                                                <InputField
                                                                    label="Sandi Baru"
                                                                    type="password"
                                                                    placeholder="Minimal 8 karakter"
                                                                    value={passwordForm.data.password}
                                                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                                                    error={passwordForm.errors.password}
                                                                    autoComplete="new-password"
                                                                />
                                                                <InputField
                                                                    label="Ulangi Sandi"
                                                                    type="password"
                                                                    placeholder="Konfirmasi sandi baru"
                                                                    value={passwordForm.data.password_confirmation}
                                                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                                                    error={passwordForm.errors.password_confirmation}
                                                                    autoComplete="new-password"
                                                                />
                                                            </div>
                                                            <div className="mt-6 flex justify-end">
                                                                <button
                                                                    type="submit"
                                                                    disabled={passwordForm.processing}
                                                                    className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-sm disabled:opacity-60
                                                                        ${passwordSaved ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200 dark:shadow-rose-900/20'}`}
                                                                >
                                                                    {passwordSaved ? (
                                                                        <><CheckCircleIcon sx={{ fontSize: 18 }} /> Tersimpan!</>
                                                                    ) : passwordForm.processing ? (
                                                                        'Menyimpan...'
                                                                    ) : (
                                                                        'Simpan Perubahan'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Danger zone */}
                                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20 rounded-[2rem] p-6 sm:p-8 transition-colors">
                                            <div className="flex items-center gap-2 mb-4">
                                                <WarningAmberIcon sx={{ fontSize: 24, color: '#e11d48' }} />
                                                <h3 className="font-black text-rose-700 dark:text-rose-400 text-lg">Zona Berbahaya</h3>
                                            </div>
                                            <p className="text-sm text-rose-600 dark:text-rose-400/90 font-medium leading-relaxed mb-6">
                                                Akun tidak dapat digunakan kembali setelah dihapus. Identitas pribadi akan dihapus, sedangkan riwayat pembayaran tetap disimpan tanpa data pribadi bila diwajibkan.
                                            </p>
                                            
                                            <button
                                                type="button"
                                                onClick={() => setDeleteConfirm(true)}
                                                className="px-6 py-3 rounded-xl font-black text-sm text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm"
                                            >
                                                Hapus Akun Saya
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── TAB TAGIHAN ── */}
                                {activeTab === 'billing' && (
                                    <motion.div 
                                        key="billing"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        {/* Paket Saat Ini */}
                                        <div className={`rounded-[2rem] p-6 sm:p-8 border flex flex-col sm:flex-row sm:items-center gap-6 transition-colors
                                            ${isPrem ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-500/20' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm'}`}>
                                            <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-3xl shadow-sm 
                                                ${isPrem ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                  {isPrem ? <WorkspacePremiumIcon sx={{ fontSize: 32 }} /> : <WorkspacePremiumIcon className="w-8 h-8 text-amber-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Paket Saat Ini</p>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white">{isPrem ? 'Akses Aktif' : 'Preview Week 1'}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                                                    {isPrem 
                                                        ? (accessStatus.has_full_access ? 'Anda memiliki akses penuh ke seluruh kelas.' : `Anda memiliki akses aktif untuk ${accessStatus.active_program_count || 1} kelas.`)
                                                        : 'Akses Anda terbatas. Upgrade sekarang untuk membuka seluruh pelajaran.'}
                                                </p>
                                                {isPrem && activeUntilLabel && (
                                                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        <WorkspacePremiumIcon sx={{ fontSize: 14 }} /> Masa aktif sampai {activeUntilLabel}
                                                    </p>
                                                )}
                                            </div>
                                            {shouldShowUpgrade && (
                                                <Link href={route('pricing')}
                                                    className={`shrink-0 px-6 py-3.5 rounded-xl text-white font-black text-sm shadow-md shadow-amber-300/40 dark:shadow-amber-900/20 hover:-translate-y-0.5 transition-transform text-center bg-gradient-to-r ${theme.ctaBg || 'from-amber-400 to-orange-500'}`}>
                                                    {isPrem ? 'Perpanjang Akses' : 'Tingkatkan Akses'}
                                                </Link>
                                            )}
                                        </div>

                                        {/* Riwayat */}
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8 transition-colors">
                                            <div className="flex items-center gap-2 mb-6">
                                                <ReceiptLongIcon sx={{ color: '#f43f5e' }} />
                                                <h3 className="font-black text-gray-900 dark:text-white text-lg">Riwayat Transaksi</h3>
                                            </div>

                                            <div className="space-y-3">
                                                {transactionInvoices.map((inv) => inv.id && (
                                                    <Link
                                                        key={inv.id}
                                                        href={route('user.checkout', { transactionCode: inv.id })}
                                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors gap-4"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inv.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400' : inv.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400'}`}>
                                                                {inv.status === 'success' ? <CheckCircleIcon /> : <WarningAmberIcon />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-gray-900 dark:text-gray-100 text-sm">{inv.plan}</h4>
                                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{inv.id} • {inv.date}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-1 pl-16 sm:pl-0">
                                                            <p className="font-black text-gray-900 dark:text-white">{inv.price}</p>
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                                                                ${inv.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : inv.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'}`}>
                                                                {inv.statusLabel}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                ))}
                                                {transactionInvoices.length === 0 && (
                                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center dark:border-gray-800 dark:bg-gray-950/60">
                                                        <ReceiptLongIcon sx={{ fontSize: 36 }} className="text-gray-300 dark:text-gray-700" />
                                                        <p className="mt-3 text-sm font-black text-gray-700 dark:text-gray-200">Belum ada transaksi</p>
                                                        <p className="mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                                                            Riwayat pembayaran Midtrans atau access key akan tampil di sini.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* TAB ACCESS KEY */}
                                {activeTab === 'accessKey' && (
                                    <motion.div
                                        key="accessKey"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8 transition-colors">
                                            <div className="flex items-center gap-2 mb-6">
                                                <VpnKeyIcon sx={{ color: '#f43f5e' }} />
                                                <h3 className="font-black text-gray-900 dark:text-white text-lg">Access Key</h3>
                                            </div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                                                Masukkan kode dari sensei untuk membuka akses belajar. Form ini dipindah dari dashboard agar halaman awal tetap fokus ke aktivitas belajar.
                                            </p>
                                            {isPrem && activeUntilLabel && (
                                                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                                    Akses aktif sampai {activeUntilLabel}.
                                                </div>
                                            )}
                                            <form onSubmit={submitAccessKey} className="flex flex-col gap-3 sm:flex-row">
                                                <input
                                                    value={accessKeyForm.data.code}
                                                    onChange={(event) => accessKeyForm.setData('code', event.target.value.toUpperCase())}
                                                    placeholder="JL-XXXX-XXXX"
                                                    className="h-12 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black uppercase tracking-widest text-gray-900 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-rose-900/30"
                                                />
                                                <button disabled={accessKeyForm.processing} className="h-12 rounded-2xl bg-rose-600 px-6 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-700 disabled:opacity-50">
                                                    {accessKeyForm.processing ? 'Mengecek...' : 'Redeem'}
                                                </button>
                                            </form>
                                            {accessKeyForm.errors.access_key && <p className="mt-3 text-xs font-bold text-rose-600">{accessKeyForm.errors.access_key}</p>}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>
                </div>
            </div>
            <ConfirmActionDialog
                show={deleteConfirm}
                variant="danger"
                title="Hapus Akun?"
                message={passwordLoginEnabled
                    ? 'Ketik username dan masukkan password akun. Tindakan ini tidak dapat dibatalkan.'
                    : googleReauthenticated
                        ? 'Identitas Google sudah terverifikasi. Ketik username untuk mengonfirmasi penghapusan akun.'
                        : 'Verifikasi kembali akun Google yang terhubung sebelum menghapus akun.'}
                details={[
                    { label: 'Akun', value: user.username },
                    { label: 'Email', value: user.email },
                    { label: 'Verifikasi', value: passwordLoginEnabled ? 'Password akun' : 'Akun Google' },
                ]}
                confirmLabel={!passwordLoginEnabled && !googleReauthenticated
                    ? 'Verifikasi dengan Google'
                    : 'Ya, Hapus Akun'}
                processing={deleteAccountForm.processing}
                onConfirm={confirmAccountDeletion}
                onCancel={() => {
                    setDeleteConfirm(false);
                    deleteAccountForm.reset();
                    deleteAccountForm.clearErrors();
                }}
            >
                {!passwordLoginEnabled && !googleReauthenticated ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                        Google akan memastikan bahwa akun yang dipilih sama dengan akun TOKU-UP ini. Anda akan kembali ke halaman profil setelah verifikasi.
                        {deleteAccountForm.errors.google_confirmation && (
                            <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400">{deleteAccountForm.errors.google_confirmation}</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!passwordLoginEnabled && (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <CheckCircleIcon sx={{ fontSize: 18 }} />
                                Akun Google sudah diverifikasi
                            </div>
                        )}

                        <label className="block space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Ketik Username</span>
                            <input
                                type="text"
                                value={deleteAccountForm.data.confirmation_username}
                                onChange={(event) => deleteAccountForm.setData('confirmation_username', event.target.value)}
                                className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900/40 dark:bg-gray-950 dark:text-white"
                                placeholder={user.username}
                                autoComplete="off"
                            />
                            {deleteAccountForm.errors.confirmation_username && <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{deleteAccountForm.errors.confirmation_username}</p>}
                        </label>

                        {passwordLoginEnabled && (
                            <label className="block space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Password</span>
                                <input
                                    type="password"
                                    value={deleteAccountForm.data.password}
                                    onChange={(event) => deleteAccountForm.setData('password', event.target.value)}
                                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900/40 dark:bg-gray-950 dark:text-white"
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                />
                                {deleteAccountForm.errors.password && <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{deleteAccountForm.errors.password}</p>}
                            </label>
                        )}

                        {deleteAccountForm.errors.google_confirmation && (
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{deleteAccountForm.errors.google_confirmation}</p>
                        )}
                    </div>
                )}
            </ConfirmActionDialog>
        </AuthenticatedLayout>
        </MotionConfig>
    );
}
