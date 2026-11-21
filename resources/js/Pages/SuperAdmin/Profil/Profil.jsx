import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockIcon from '@mui/icons-material/Lock';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';

const TABS = [
    { key: 'settings', label: 'Setelan Root', icon: <ManageAccountsIcon sx={{ fontSize: 20 }} /> },
    { key: 'security', label: 'Keamanan Sistem', icon: <SecurityIcon sx={{ fontSize: 20 }} /> },
];

const InputField = ({ label, error, ...inputProps }) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <input {...inputProps} aria-invalid={Boolean(error)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
        {error && <span role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</span>}
    </label>
);

const BentoCard = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8 transition-colors duration-300 ${className}`}>
        {children}
    </div>
);

const SectionTitle = ({ icon, children, subtitle, color = 'text-brand-500 dark:text-brand-400' }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
            <span className={`transition-colors duration-300 ${color}`}>{icon}</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg transition-colors duration-300">{children}</h3>
        </div>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 ml-8 transition-colors duration-300">{subtitle}</p>}
    </div>
);

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

export default function ProfilSuperAdmin() {
    const { user } = usePage().props.auth;
    const [activeTab, setActiveTab] = useState('settings');
    const [themeLabel, setThemeLabel] = useState(resolveThemeLabel);
    const passwordForm = useForm({ current_password: '', password: '', password_confirmation: '' });

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

    const handleSave = (event) => {
        event.preventDefault();
        if (passwordForm.processing) return;
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Profil SuperAdmin — TOKU-UP" />

            <div className="min-h-screen bg-surface-muted py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    {/* Header Page */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors duration-300">Profil SuperAdmin</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Kelola preferensi dan keamanan level root.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* ── SIDEBAR KIRI (lg:col-span-4) ── */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Card 1: Profil */}
                            <BentoCard className="flex flex-col items-center text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-50 dark:from-brand-900/20 to-transparent transition-colors duration-300" />
                                
                                <div className="relative mb-4">
                                    <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-brand-300 to-learning-100 dark:from-brand-600 dark:to-learning-700 flex items-center justify-center text-4xl font-black text-ink-900 dark:text-white shadow-lg shadow-brand-200/50 dark:shadow-brand-900/30 ring-4 ring-white dark:ring-gray-900 transition-all duration-300">
                                        {user.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                        <WorkspacePremiumIcon className="w-5 h-5 text-amber-500 inline-block" />
                                    </div>
                                </div>

                                <div className="relative z-10 w-full">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5 transition-colors duration-300">
                                        {user.username}
                                        <VerifiedUserIcon sx={{ fontSize: 18, color: '#e11d48' }} />
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 transition-colors duration-300">{user.email}</p>
                                    
                                    <div className="mt-4 flex justify-center">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-900/50 transition-colors duration-300">
                                            <ShieldIcon sx={{ fontSize: 14 }} /> Root SuperAdmin
                                        </span>
                                    </div>
                                </div>
                            </BentoCard>

                            {/* Card 2: Navigasi */}
                            <BentoCard className="!p-4">
                                <nav className="flex flex-col gap-2">
                                    {TABS.map(tab => {
                                        const isActive = activeTab === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 w-full text-left
                                                    ${isActive 
                                                        ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-md dark:shadow-none' 
                                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'}`}
                                            >
                                                <span className={`transition-colors duration-300 ${isActive ? 'text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </BentoCard>

                        </div>

                        {/* ── KONTEN KANAN (lg:col-span-8) ── */}
                        <div className="lg:col-span-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'settings' && (
                                    <motion.div key="settings"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <BentoCard>
                                            <SectionTitle 
                                                icon={<PaletteIcon sx={{ fontSize: 22 }} />} 
                                                subtitle="Sesuaikan tampilan antarmuka sistem backend."
                                            >
                                                Theme Settings
                                            </SectionTitle>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-slate-100 dark:border-gray-800 p-5 transition-colors duration-300">
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white transition-colors duration-300">Mode Tampilan Global</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-300">Tema diatur dari tombol kanan atas agar tidak ada kontrol ganda.</p>
                                                </div>
                                                <span className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white dark:bg-white dark:text-slate-900">
                                                    {themeLabel}
                                                </span>
                                            </div>
                                        </BentoCard>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <BentoCard className="md:col-span-2">
                                                <SectionTitle 
                                                    icon={<LockIcon sx={{ fontSize: 22 }} />} 
                                                    subtitle="Perbarui kata sandi akun SuperAdmin."
                                                >
                                                    Kata Sandi
                                                </SectionTitle>
                                                
                                                <form onSubmit={handleSave} className="space-y-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <InputField label="Email akun" type="email" defaultValue={user.email} disabled />
                                                        {[
                                                            ['current_password', 'Sandi Lama', 'current-password'],
                                                            ['password', 'Sandi Baru', 'new-password'],
                                                            ['password_confirmation', 'Konfirmasi Sandi', 'new-password'],
                                                        ].map(([name, label, autoComplete]) => (
                                                            <InputField key={name} name={name} label={label} type="password" autoComplete={autoComplete}
                                                                value={passwordForm.data[name]} error={passwordForm.errors[name]}
                                                                onChange={(event) => passwordForm.setData(name, event.target.value)} required />
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap items-center justify-end gap-3">
                                                        {passwordForm.recentlySuccessful && <span role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Sandi tersimpan.</span>}
                                                        <button type="submit" disabled={passwordForm.processing} className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
                                                            {passwordForm.processing ? 'Menyimpan...' : 'Perbarui Sandi'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </BentoCard>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'security' && (
                                    <motion.div key="security"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { label: 'Status Sistem', value: 'Online', icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500 inline-block" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
                                                { label: 'Mode Akses', value: 'Produksi', icon: <RocketLaunchIcon className="w-5 h-5 inline-block text-brand-500" />, bg: 'bg-brand-50 dark:bg-brand-900/20', border: 'border-brand-100 dark:border-brand-900/30', text: 'text-brand-700 dark:text-brand-400' },
                                                { label: 'Role Aktif', value: 'Root', icon: <WorkspacePremiumIcon className="w-5 h-5 text-amber-500 inline-block" />, bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-900/30', text: 'text-rose-700 dark:text-rose-400' },
                                            ].map(stat => (
                                                <BentoCard key={stat.label} className={`!p-6 ${stat.bg} ${stat.border}`}>
                                                    <div className="flex flex-col h-full justify-between gap-3">
                                                        <div className="text-2xl">{stat.icon}</div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 transition-colors duration-300">{stat.label}</p>
                                                            <p className={`text-xl font-black transition-colors duration-300 ${stat.text}`}>{stat.value}</p>
                                                        </div>
                                                    </div>
                                                </BentoCard>
                                            ))}
                                        </div>

                                        <BentoCard className="border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-900/10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 transition-colors duration-300">
                                                    <WarningAmberIcon sx={{ fontSize: 24 }} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-red-700 dark:text-red-400 text-lg transition-colors duration-300">Danger Zone</h3>
                                                    <p className="text-sm text-brand-600/80 dark:text-brand-400/80 font-medium transition-colors duration-300">Tindakan berdampak pada seluruh operasional platform.</p>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-brand-100 dark:border-brand-900/30 p-5 mt-6 transition-colors duration-300">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
                                                            <BuildIcon sx={{ fontSize: 18, color: '#e11d48' }} /> Mode Maintenance
                                                        </p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Aktifkan untuk mengunci akses pengguna reguler selama perbaikan.</p>
                                                    </div>
                                                    <Link
                                                        href={route('superadmin.system')}
                                                        className="shrink-0 px-6 py-3 rounded-xl font-bold text-sm text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors duration-300 border border-brand-100 dark:border-brand-900/30"
                                                    >
                                                        Pengaturan Sistem
                                                    </Link>
                                                </div>
                                            </div>
                                        </BentoCard>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
