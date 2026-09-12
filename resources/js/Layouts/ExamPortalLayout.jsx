import React, { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

const navigation = [
    { label: 'Beranda Ujian', href: '/user/exams', icon: HomeRoundedIcon, exact: true },
    { label: 'Kumpulan Ujian', href: '/user/exams/library', icon: Inventory2OutlinedIcon },
    { label: 'Ranking', href: '/user/exams/ranking', icon: EmojiEventsOutlinedIcon },
    { label: 'Riwayat Ujian', href: '/user/exams/history', icon: HistoryOutlinedIcon },
];

const resolveDarkMode = () => {
    if (typeof window === 'undefined') return false;
    const preference = window.localStorage.getItem('theme') || 'system';
    return preference === 'dark'
        || (preference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
};

export default function ExamPortalLayout({ children }) {
    const { auth } = usePage().props;
    const currentPath = usePage().url?.split(/[?#]/)[0] || '/user/exams';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(resolveDarkMode);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    useEffect(() => {
        setMobileOpen(false);
    }, [currentPath]);

    const toggleTheme = () => {
        const next = !darkMode;
        window.localStorage.setItem('theme', next ? 'dark' : 'light');
        setDarkMode(next);
        window.dispatchEvent(new CustomEvent('toku-up:theme-changed', {
            detail: { mode: next ? 'dark' : 'light' },
        }));
    };

    const isExamDetail = /^\/user\/exams\/[^/]+$/.test(currentPath)
        && !['/user/exams/library', '/user/exams/ranking', '/user/exams/history'].includes(currentPath);
    const isActive = (item) => {
        if (item.href === '/user/exams/library' && isExamDetail) return true;
        return item.exact
            ? currentPath === item.href
            : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
    };

    return (
        <div className="min-h-screen bg-[#f5f8f6] text-[#17231d] dark:bg-[#0d1511] dark:text-gray-100">
            <header className="sticky top-0 z-50 border-b border-[#dce7e0] bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#111b16]/95">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px]">
                    <Link href={route('user.exams.index')} className="flex shrink-0 items-center gap-2.5" aria-label="Beranda Ujian TOKU-UP">
                        <img src="/images/logos/toku-up-mark.png" alt="" className="h-8 w-8 object-contain rounded-full transition-all dark:ring-1 dark:ring-white/20 dark:shadow-[0_0_12px_rgba(34,197,94,0.35)] sm:h-9 sm:w-9" />
                        <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-6 w-auto dark:invert dark:hue-rotate-180 dark:brightness-110 sm:h-7" />
                    </Link>

                    <nav className="ml-auto hidden h-full items-center gap-1 lg:flex" aria-label="Navigasi portal ujian">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex h-full items-center gap-2 px-4 text-sm font-bold transition-colors ${active ? 'text-brand-700 dark:text-green-300' : 'text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'}`}
                                >
                                    <Icon sx={{ fontSize: 19 }} />
                                    {item.label}
                                    {active && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-brand-500" />}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
                        <Link
                            href={route('user.dashboard')}
                            className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                            title="Kembali ke dashboard"
                            aria-label="Kembali ke dashboard"
                        >
                            <ArrowBackRoundedIcon sx={{ fontSize: 21 }} />
                        </Link>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                            title={darkMode ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
                            aria-label={darkMode ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
                        >
                            {darkMode ? <LightModeOutlinedIcon sx={{ fontSize: 21 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 21 }} />}
                        </button>
                        <div className="hidden items-center gap-2 border-l border-gray-200 pl-3 sm:flex dark:border-white/10">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e2f7e8] text-sm font-black text-brand-800 dark:bg-green-900/50 dark:text-green-200">
                                {(auth?.user?.name || 'U').trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="max-w-32 truncate text-sm font-bold">{auth?.user?.name || 'Pengguna'}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileOpen((current) => !current)}
                            className="grid h-10 w-10 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-200 dark:hover:bg-white/10 lg:hidden"
                            aria-expanded={mobileOpen}
                            aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                        >
                            {mobileOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <nav className="border-t border-gray-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#111b16] lg:hidden" aria-label="Navigasi portal ujian seluler">
                        <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold ${active ? 'bg-brand-50 text-brand-800 dark:bg-green-900/40 dark:text-green-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10'}`}
                                    >
                                        <Icon sx={{ fontSize: 20 }} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                )}
            </header>

            <main>{children}</main>
        </div>
    );
}
