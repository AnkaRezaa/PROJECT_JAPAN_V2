import BoltIcon from '@mui/icons-material/Bolt';
import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockIcon from '@mui/icons-material/Lock';
import PaletteIcon from '@mui/icons-material/Palette';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

const InputField = ({ label, type = 'text', defaultValue, placeholder, disabled }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 transition-colors duration-300">{label}</label>
        <input
            type={type}
            defaultValue={defaultValue}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        />
    </div>
);

const SectionTitle = ({ icon, children }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 transition-colors duration-300">
            {icon}
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white text-lg transition-colors duration-300">{children}</h3>
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

export default function ProfilAdmin() {
    const { user } = usePage().props.auth;
    const [activeTab, setActiveTab] = useState('settings');
    const [themeLabel, setThemeLabel] = useState(resolveThemeLabel);
    const [saved, setSaved] = useState(false);

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

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Profil Admin — TOKU-UP" />

            <div className="min-h-screen bg-surface-muted py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight transition-colors duration-300">Profil Admin</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300">Kelola informasi akun dan preferensi sistem Anda.</p>
                    </div>

                    {/* Bento Grid Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Sidebar Kiri */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Card 1: Profil Admin */}
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center text-center transition-colors duration-300">
                                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-rose-500 to-brand-600 p-1 shadow-lg mb-6 relative group cursor-pointer transform transition-transform duration-300 hover:scale-105">
                                    <div className="w-full h-full rounded-[1.8rem] bg-white/10 backdrop-blur-sm flex items-center justify-center text-5xl font-black text-white overflow-hidden relative">
                                        {user.username?.charAt(0).toUpperCase()}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                            <EditIcon sx={{ color: 'white', fontSize: 28 }} />
                                        </div>
                                    </div>
                                </div>
                                
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 justify-center transition-colors duration-300">
                                    {user.username}
                                    <VerifiedUserIcon sx={{ fontSize: 22 }} className="text-rose-600 dark:text-rose-400" />
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium mt-1 mb-4 transition-colors duration-300">{user.email}</p>
                                
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold text-sm border border-indigo-100 dark:border-indigo-800/50 transition-colors duration-300">
                                    <AutoStoriesIcon sx={{ fontSize: 18 }} /> Admin Sensei
                                </div>
                            </div>

                            {/* Card 2: Menu Navigasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-colors duration-300">
                                <nav className="space-y-2">
                                    <button
                                        onClick={() => setActiveTab('settings')}
                                        className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                                            activeTab === 'settings' 
                                            ? 'bg-rose-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/50' 
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <ManageAccountsIcon sx={{ fontSize: 22 }} />
                                        Pengaturan Akun
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('activity')}
                                        className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                                            activeTab === 'activity' 
                                            ? 'bg-rose-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/50' 
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <HistoryIcon sx={{ fontSize: 22 }} />
                                        Log Aktivitas
                                    </button>
                                </nav>
                            </div>
                        </div>

                        {/* Konten Kanan */}
                        <div className="lg:col-span-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'settings' && (
                                    <motion.div 
                                        key="settings"
                                        initial={{ opacity: 0, scale: 0.98 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }} 
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        {/* Card Pengaturan Tema & Email */}
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-colors duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                
                                                {/* Theme Settings */}
                                                <div>
                                                    <SectionTitle icon={<PaletteIcon />}>Preferensi Tema</SectionTitle>
                                                    <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 transition-colors duration-300">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors duration-300">Mode Tampilan</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed transition-colors duration-300">Tema diatur dari tombol kanan atas agar konsisten di semua halaman.</p>
                                                            </div>
                                                            <span className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white dark:bg-white dark:text-gray-900">
                                                                {themeLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Email Info */}
                                                <div>
                                                    <SectionTitle icon={<EmailIcon />}>Informasi Kontak</SectionTitle>
                                                    <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4 transition-colors duration-300">
                                                        <InputField label="Alamat Email" type="email" defaultValue={user.email} disabled />
                                                        <div className="flex items-start gap-2 bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 transition-colors duration-300">
                                                            <span className="text-lg"><BoltIcon className="w-5 h-5 text-yellow-500 inline-block" /></span>
                                                            <p className="text-xs font-medium leading-relaxed">Alamat email digunakan untuk login dan notifikasi. Hubungi SuperAdmin untuk melakukan perubahan.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Ganti Password */}
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-colors duration-300">
                                            <SectionTitle icon={<LockIcon />}>Keamanan Kata Sandi</SectionTitle>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                <InputField label="Sandi Lama" type="password" placeholder="••••••••" />
                                                <InputField label="Sandi Baru" type="password" placeholder="Min. 8 karakter" />
                                                <InputField label="Ulangi Sandi" type="password" placeholder="Konfirmasi sandi" />
                                            </div>
                                            
                                            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
                                                <button
                                                    onClick={handleSave}
                                                    className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 transform active:scale-95
                                                        ${saved
                                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 dark:shadow-green-900/30'
                                                            : 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-indigo-600/30 dark:shadow-indigo-900/30'}`}
                                                >
                                                    {saved ? <><CheckCircleIcon sx={{ fontSize: 20 }} /> Perubahan Disimpan</> : 'Perbarui Kata Sandi'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'activity' && (
                                    <motion.div 
                                        key="activity"
                                        initial={{ opacity: 0, scale: 0.98 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }} 
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-12 min-h-[500px] flex flex-col items-center justify-center text-center transition-colors duration-300">
                                            <div className="w-32 h-32 bg-rose-50 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-8 relative transition-colors duration-300">
                                                <div className="absolute inset-0 bg-rose-100 dark:bg-rose-900/50 rounded-full animate-ping opacity-20"></div>
                                                <HistoryIcon sx={{ fontSize: 64 }} className="text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 transition-colors duration-300">Log Aktivitas</h2>
                                            <p className="text-gray-500 dark:text-gray-400 max-w-md leading-relaxed transition-colors duration-300">
                                                Semua rekam jejak aktivitas operasional Anda terpusat dan dapat dilihat langsung pada dashboard utama SuperAdmin untuk keperluan audit dan keamanan.
                                            </p>
                                            <button 
                                                onClick={() => setActiveTab('settings')}
                                                className="mt-8 text-rose-600 dark:text-rose-400 font-bold hover:text-rose-700 dark:hover:text-rose-300 transition-colors duration-300"
                                            >
                                                &larr; Kembali ke Pengaturan
                                            </button>
                                        </div>
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
