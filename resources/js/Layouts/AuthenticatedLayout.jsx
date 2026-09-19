import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import SidebarLink from '@/Components/Navigation/SidebarLink';
import { useScrollLock } from '@/lib/scrollLock';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import ProductFeedbackButton from '@/Components/Features/Feedback/ProductFeedbackButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ShieldIcon from '@mui/icons-material/Shield';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SchoolIcon from '@mui/icons-material/School';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CheckIcon from '@mui/icons-material/Check';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReplayIcon from '@mui/icons-material/Replay';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';

// Ikon Bawah
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SettingsIcon from '@mui/icons-material/Settings';

const resolveThemeMode = () => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    return window.localStorage.getItem('theme') || 'system';
};

const shouldUseDarkMode = (mode) => {
    if (typeof window === 'undefined') {
        return false;
    }

    if (mode === 'dark') {
        return true;
    }

    if (mode === 'light') {
        return false;
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

const applyDocumentTheme = (mode = resolveThemeMode()) => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', shouldUseDarkMode(mode));
};

const flashNoticeConfig = {
    error: {
        label: 'Tidak dapat melanjutkan',
        icon: CloseIcon,
        duration: 8000,
        accent: 'bg-red-500',
        iconStyle: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    },
    warning: {
        label: 'Perlu diperhatikan',
        icon: WarningAmberIcon,
        duration: 7000,
        accent: 'bg-amber-500',
        iconStyle: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    },
    success: {
        label: 'Berhasil',
        icon: CheckIcon,
        duration: 4500,
        accent: 'bg-emerald-500',
        iconStyle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    info: {
        label: 'Informasi',
        icon: InfoOutlinedIcon,
        duration: 5500,
        accent: 'bg-sky-500',
        iconStyle: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
};

function FlashToast({ notice, onDismiss, soundEnabled = false }) {
    const timerRef = useRef(null);
    const config = flashNoticeConfig[notice.type] || flashNoticeConfig.info;
    const Icon = config.icon;

    const startTimer = () => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(onDismiss, config.duration);
    };

    useEffect(() => {
        if (soundEnabled) {
            const effect = notice.type === 'error'
                ? 'incorrect'
                : notice.type === 'warning'
                    ? 'warning'
                    : 'notification';
            playSoundEffect(effect, { deduplicate: true });
        }
        startTimer();
        return () => window.clearTimeout(timerRef.current);
    }, [notice.id]);

    return (
        <div className="pointer-events-none fixed inset-x-3 top-[4.5rem] z-[100] flex justify-end sm:inset-x-auto sm:right-5 sm:top-20 lg:right-6">
            <section
                role={notice.type === 'error' || notice.type === 'warning' ? 'alert' : 'status'}
                aria-live={notice.type === 'error' ? 'assertive' : 'polite'}
                className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-950 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.4)] dark:border-gray-700 dark:bg-[#111827] dark:text-white"
                style={{ animation: 'flash-toast-in 180ms ease-out both' }}
            >
                <div className={`absolute inset-y-0 left-0 w-1 ${config.accent}`} />
                <div className="flex items-start gap-3 py-3 pl-4 pr-3 sm:py-3.5 sm:pl-5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.iconStyle}`}>
                        <Icon sx={{ fontSize: 20 }} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-black text-gray-950 dark:text-white">{config.label}</p>
                        <p className="mt-0.5 break-words text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">{notice.message}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Tutup pesan"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>
                <span
                    key={notice.id}
                    className={`absolute bottom-0 left-0 h-0.5 ${config.accent}`}
                    style={{ animation: `flash-toast-progress ${config.duration}ms linear forwards` }}
                />
            </section>
        </div>
    );
}

const resolveSidebarExpanded = () => {
    if (typeof window === 'undefined') {
        return true;
    }

    return window.localStorage.getItem('toku-up:sidebar-expanded') !== 'false';
};

export default function AuthenticatedLayout({ children }) {
    const page = usePage();
    const { user } = page.props.auth;
    const flash = page.props.flash || {};
    const currentPath = page.url?.split(/[?#]/)[0] || '/';
    const flashNotice = [
        ['error', flash.error],
        ['warning', flash.warning],
        ['success', flash.success],
        ['info', flash.info],
    ].find(([, message]) => typeof message === 'string' && message.trim().length > 0);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [themeMode, setThemeMode] = useState(resolveThemeMode);
    const [isExpanded, setIsExpanded] = useState(resolveSidebarExpanded);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openMenuGroups, setOpenMenuGroups] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef(null);
    const mobileAccountRef = useRef(null);
    const mobileMenuButtonRef = useRef(null);
    const [activeFlashNotice, setActiveFlashNotice] = useState(null);

    const [toastAchievements, setToastAchievements] = useState([]);

    useEffect(() => {
        if (!flashNotice) return;

        const [type, message] = flashNotice;
        setActiveFlashNotice({
            id: `${Date.now()}-${type}`,
            type,
            message: message.trim(),
        });
        router.replaceProp('flash', (current) => ({
            ...(current || {}),
            error: null,
            warning: null,
            success: null,
            info: null,
        }));
    }, [flash.error, flash.info, flash.success, flash.warning]);

    useEffect(() => {
        const syncTheme = () => {
            const mode = resolveThemeMode();
            setThemeMode(mode);
            applyDocumentTheme(mode);
        };
        const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

        syncTheme();
        window.addEventListener('storage', syncTheme);
        mediaQuery?.addEventListener?.('change', syncTheme);

        return () => {
            window.removeEventListener('storage', syncTheme);
            mediaQuery?.removeEventListener?.('change', syncTheme);
        };
    }, []);

    const toggleThemeMode = () => {
        const nextMode = shouldUseDarkMode(themeMode) ? 'light' : 'dark';

        window.localStorage.setItem('theme', nextMode);
        setThemeMode(nextMode);
        applyDocumentTheme(nextMode);
        window.dispatchEvent(new CustomEvent('toku-up:theme-changed', { detail: { mode: nextMode } }));
    };

    useEffect(() => {
        if (flash.achievement_unlocked) {
            setToastAchievements((prev) => [...prev, flash.achievement_unlocked]);
            setTimeout(() => {
                setToastAchievements((prev) => prev.filter((a) => a.id !== flash.achievement_unlocked.id));
            }, 5000);
        }
    }, [flash.achievement_unlocked]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/notifications');
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unread_count || 0);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        if (user?.role) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        function handleClickOutside(event) {
            const outsideSidebarMenu = !menuRef.current?.contains(event.target);
            const outsideMobileAccount = !mobileAccountRef.current?.contains(event.target);

            if (outsideSidebarMenu && outsideMobileAccount) {
                setProfileMenuOpen(false);
                setMobileAccountOpen(false);
                setNotificationOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                return;
            }

            setMobileOpen(false);
            setMobileAccountOpen(false);
            setProfileMenuOpen(false);
            setNotificationOpen(false);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useScrollLock(mobileOpen);

    useEffect(() => {
        if (!mobileOpen) {
            return undefined;
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
                setMobileAccountOpen(false);
                setProfileMenuOpen(false);
                setNotificationOpen(false);
            }
        };

        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('keydown', closeOnEscape);
            mobileMenuButtonRef.current?.focus();
        };
    }, [mobileOpen]);

    useEffect(() => {
        if (!mobileAccountOpen && !profileMenuOpen && !notificationOpen) {
            return undefined;
        }

        const closePopoversOnEscape = (event) => {
            if (event.key === 'Escape') {
                setMobileAccountOpen(false);
                setProfileMenuOpen(false);
                setNotificationOpen(false);
            }
        };

        document.addEventListener('keydown', closePopoversOnEscape);
        return () => document.removeEventListener('keydown', closePopoversOnEscape);
    }, [mobileAccountOpen, notificationOpen, profileMenuOpen]);

    const handleMarkAsRead = (id, url = null) => {
        router.post(route('notifications.read', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setNotifications((current) => current.filter((notification) => notification.id !== id));
                setUnreadCount((current) => Math.max(0, current - 1));
                setNotificationOpen(false);

                if (url) {
                    handleNavigation();
                    router.visit(url);
                }
            }
        });
    };

    const handleMarkAllAsRead = () => {
        router.post(route('notifications.readAll'), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setNotifications([]);
                setUnreadCount(0);
            }
        });
    };

    const notificationCategoryLabel = (category = 'system') => {
        const labels = {
            payment: 'Pembayaran',
            access: 'Akses',
            content: 'Konten',
            progress: 'Progress',
            system: 'Sistem',
        };

        return labels[category] || 'Sistem';
    };

    const accessStatus = user?.access_status || {};
    const isPremiumUser = accessStatus.is_premium ?? user?.subscription_status === 'premium';

    const userMenu = [
        { href: '/user/dashboard', activePaths: ['/user/dashboard'], icon: <DashboardIcon sx={{ fontSize: 24 }} />, label: 'Beranda' },
        { href: '/user/kelas', activePaths: ['/user/kelas', '/user/modul', '/user/quizzes', '/user/flashcards'], icon: <SchoolIcon sx={{ fontSize: 24 }} />, label: 'Kelas' },
        { href: '/user/exams', activePaths: ['/user/exams'], icon: <FactCheckOutlinedIcon sx={{ fontSize: 24 }} />, label: 'Ujian', target: '_blank' },
        { href: '/user/review', activePaths: ['/user/review'], icon: <ReplayIcon sx={{ fontSize: 24 }} />, label: 'Review' },
        { href: '/user/leaderboard', activePaths: ['/user/leaderboard'], icon: <EmojiEventsIcon sx={{ fontSize: 24 }} />, label: 'Peringkat' },
        { href: '/user/progress', activePaths: ['/user/progress'], icon: <MonitorHeartIcon sx={{ fontSize: 24 }} />, label: 'Progress' },
    ];

    const adminMenu = [
        { href: '/admin/dashboard', activePaths: ['/admin/dashboard'], icon: <DashboardIcon sx={{ fontSize: 24 }} />, label: 'Beranda' },
        { href: '/admin/users', activePaths: ['/admin/users', '/admin/kloters', '/admin/analytics'], icon: <PeopleIcon sx={{ fontSize: 24 }} />, label: 'Kloter & Siswa' },
        { href: '/admin/exams', activePaths: ['/admin/exams'], icon: <FactCheckOutlinedIcon sx={{ fontSize: 24 }} />, label: 'Ujian' },
        {
            href: '/admin/programs',
            activePaths: ['/admin/programs', '/admin/modules', '/admin/module-days', '/admin/quizzes', '/admin/questions', '/admin/flashcards', '/admin/presentations', '/admin/boards'],
            icon: <SchoolIcon sx={{ fontSize: 24 }} />,
            label: 'Kelas',
        },
        {
            href: '/admin/bank-soal-konten',
            activePaths: ['/admin/bank-soal-konten', '/admin/vocabulary', '/admin/exams/question-banks', '/admin/grammar-banks'],
            icon: <LibraryBooksIcon sx={{ fontSize: 24 }} />,
            label: 'Pusat Bank Konten & Soal',
        },
    ];
    
    const superadminMenu = [
        { href: '/superadmin/dashboard', icon: <DashboardIcon sx={{ fontSize: 24 }} />, label: 'Beranda' },
        {
            type: 'group',
            key: 'superadmin-accounts',
            label: 'Akun & Role',
            icon: <PeopleIcon sx={{ fontSize: 24 }} />,
            items: [
                { href: '/superadmin/users', icon: <PeopleIcon sx={{ fontSize: 18 }} />, label: 'Data User' },
                { href: '/superadmin/admins', icon: <ShieldIcon sx={{ fontSize: 18 }} />, label: 'Data Admin' },
            ],
        },
        {
            type: 'group',
            key: 'superadmin-content',
            label: 'Konten Belajar',
            icon: <MenuBookIcon sx={{ fontSize: 24 }} />,
            items: [
                { href: '/superadmin/content', icon: <MonitorHeartIcon sx={{ fontSize: 18 }} />, label: 'News & Konten' },
            ],
        },
        {
            type: 'group',
            key: 'superadmin-operations',
            label: 'Operasional',
            icon: <SchoolIcon sx={{ fontSize: 24 }} />,
            items: [
                { href: '/superadmin/kloters', icon: <SchoolIcon sx={{ fontSize: 18 }} />, label: 'Kloter' },
                { href: '/superadmin/payments', icon: <WorkspacePremiumIcon sx={{ fontSize: 18 }} />, label: 'Pemasukan' },
                { href: '/superadmin/activity', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Aktivitas' },
            ],
        },
        {
            type: 'group',
            key: 'superadmin-system',
            label: 'Platform',
            icon: <SettingsIcon sx={{ fontSize: 24 }} />,
            items: [
                { href: '/superadmin/gamification', icon: <EmojiEventsIcon sx={{ fontSize: 18 }} />, label: 'Gamifikasi' },
                { href: '/superadmin/system', icon: <SettingsIcon sx={{ fontSize: 18 }} />, label: 'Pengaturan Sistem' },
            ],
        },
    ];

    const isSuperadmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin' || isSuperadmin;
    const isUser = user?.role === 'user';
    const notificationContext = {
        user: {
            label: 'Notifikasi',
            title: 'Notifikasi',
            empty: 'Tidak ada notifikasi baru.',
            allLabel: 'Lihat semua notifikasi',
        },
        admin: {
            label: 'Aktivitas Baru',
            title: 'Aktivitas Kelas',
            empty: 'Tidak ada aktivitas kelas baru.',
            allLabel: 'Lihat semua aktivitas kelas',
        },
        superadmin: {
            label: 'Aktivitas Baru',
            title: 'Aktivitas Operasional',
            empty: 'Tidak ada aktivitas operasional baru.',
            allLabel: 'Lihat semua aktivitas operasional',
        },
    }[user?.role] || {
        label: 'Notifikasi',
        title: 'Notifikasi',
        empty: 'Tidak ada notifikasi baru.',
        allLabel: 'Lihat semua notifikasi',
    };
    const activeMenu = isSuperadmin ? superadminMenu : (isAdmin ? adminMenu : userMenu);
    const navigationExpanded = mobileOpen || isExpanded;
    const profileHref = user?.role === 'superadmin'
        ? route('superadmin.profile')
        : user?.role === 'admin'
            ? route('admin.profile')
            : route('profile.edit');
    const matchesPath = (path) => currentPath === path || currentPath.startsWith(`${path}/`);
    const isActivePath = (paths) => (Array.isArray(paths) ? paths : [paths]).some(matchesPath);
    const isActiveItem = (item) => isActivePath(item.activePaths || item.href);

    const workspaceTitleRules = [
        ['/admin/bank-soal-konten', 'Pusat Bank Konten & Soal'],
        ['/admin/grammar-banks', 'Pusat Bank Konten & Soal'],
        ['/admin/exams/question-banks', 'Bank Soal Ujian (CBT)'],
        ['/admin/vocabulary', 'Bank Kosakata & Kanji (N3)'],
        ['/admin/exams', 'Ujian'],
        ['/admin/presentations', 'Presentasi'],
        ['/admin/flashcards', 'Flashcard'],
        ['/admin/quizzes', 'Kuis & Repetisi'],
        ['/admin/questions', 'Bank Soal'],
        ['/admin/modules', 'Roadmap Kelas'],
        ['/admin/module-days', 'Roadmap Kelas'],
        ['/admin/programs', 'Kelas'],
        ['/admin/users', 'Kloter & Siswa'],
        ['/admin/kloters', 'Kloter & Siswa'],
        ['/admin/analytics', 'Monitoring Kloter'],
        ['/admin/gamification', 'Gamifikasi'],
        ['/admin/achievements', 'Pencapaian'],
        ['/admin/levels', 'Level'],
        ['/admin/profile', 'Pengaturan Profil'],
        ['/user/modul', 'Roadmap Belajar'],
        ['/user/quizzes', 'Latihan & Kuis'],
        ['/user/flashcards', 'Latihan & Kuis'],
        ['/user/exams', 'Ujian'],
        ['/user/review', 'Review'],
        ['/user/kelas', 'Kelas'],
        ['/user/leaderboard', 'Peringkat'],
        ['/user/progress', 'Progress'],
        ['/user/news', 'Berita'],
        ['/user/notifications', 'Notifikasi'],
        ['/superadmin/profile', 'Pengaturan Profil'],
        ['/profile', 'Pengaturan Profil'],
    ];
    const activeMenuItems = activeMenu.flatMap((item) => item.type === 'group' ? item.items : [item]);
    const workspaceTitle = workspaceTitleRules.find(([path]) => matchesPath(path))?.[1]
        || activeMenuItems.find(isActiveItem)?.label
        || 'Beranda';

    const setSidebarExpanded = (expanded) => {
        setIsExpanded(expanded);
        window.localStorage.setItem('toku-up:sidebar-expanded', String(expanded));
    };
    const handleNavigation = () => {
        setMobileOpen(false);
        setMobileAccountOpen(false);
        setProfileMenuOpen(false);
        setNotificationOpen(false);
    };
    const toggleMenuGroup = (key) => {
        if (!navigationExpanded) {
            setSidebarExpanded(true);
        }

        setOpenMenuGroups((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };
    const closeMobileMenu = () => {
        setMobileOpen(false);
        setMobileAccountOpen(false);
        setProfileMenuOpen(false);
        setNotificationOpen(false);
    };
    const desktopPopoverPosition = isExpanded ? 'lg:left-[232px]' : 'lg:left-[88px]';
    const renderAdminGroup = (item) => {
        const groupActive = item.items.some((child) => isActiveItem(child));
        const isOpen = openMenuGroups[item.key] || groupActive;
        const groupPanelId = `${item.key}-items`;

        return (
            <div key={item.key} className="space-y-1">
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={groupPanelId}
                    aria-label={!navigationExpanded ? item.label : undefined}
                    title={!navigationExpanded ? item.label : undefined}
                    onClick={(event) => {
                        event.stopPropagation();
                        toggleMenuGroup(item.key);
                    }}
                    className={`flex min-h-[42px] w-full items-center rounded-xl py-2 transition-all ${
                        navigationExpanded ? 'flex-row justify-start px-3' : 'justify-center px-2'
                    } ${
                        groupActive
                            ? 'bg-brand-50 text-brand-700 dark:bg-[#12351f] dark:text-green-200'
                            : 'text-gray-700 hover:bg-white hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                >
                    <span className={`flex shrink-0 items-center justify-center ${navigationExpanded ? 'mr-3' : ''} ${groupActive ? 'text-brand-600 dark:text-brand-300' : ''}`}>
                        {item.icon}
                    </span>
                    {navigationExpanded && (
                        <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
                            {item.label}
                        </span>
                    )}
                    {navigationExpanded && (
                        <KeyboardArrowRightIcon
                            sx={{ fontSize: 18 }}
                            className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                    )}
                </button>

                {isOpen && (
                    <div id={groupPanelId} className={`${navigationExpanded ? 'ml-3 border-l border-gray-200 pl-2 dark:border-gray-800' : 'space-y-1'}`}>
                        {item.items.map((child) => (
                            <SidebarLink
                                key={child.href}
                                href={child.href}
                                icon={child.icon}
                                active={isActiveItem(child)}
                                target={child.target}
                                isExpanded={navigationExpanded}
                                onNavigate={handleNavigation}
                                className={navigationExpanded ? 'min-h-[44px] py-2' : 'min-h-[48px]'}
                            >
                                {child.label}
                            </SidebarLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    const isDarkModeActive = shouldUseDarkMode(themeMode);
    const renderUtilityControls = (compact = false) => (
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
            <button
                type="button"
                onClick={toggleThemeMode}
                aria-label={isDarkModeActive ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                title={isDarkModeActive ? 'Mode terang' : 'Mode gelap'}
                className={`${compact ? 'h-10 w-10' : 'h-11 px-3'} inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-500/40 dark:hover:text-brand-300`}
            >
                {isDarkModeActive ? <LightModeIcon sx={{ fontSize: 19 }} /> : <DarkModeIcon sx={{ fontSize: 19 }} />}
                {!compact && <span>{isDarkModeActive ? 'Terang' : 'Gelap'}</span>}
            </button>
        </div>
    );
    const renderProfileMenuPanel = (id, positionClass) => (
        <div
            id={id}
            className={`max-h-[60dvh] overflow-y-auto rounded-2xl border border-gray-100 bg-white text-left shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] animate-in dark:border-gray-800 dark:bg-gray-900 ${positionClass}`}
        >
            <Link
                href={profileHref}
                onClick={handleNavigation}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus dark:hover:bg-gray-800"
            >
                <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-black text-white shadow-sm">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            (user?.username || user?.name || 'User')?.charAt(0).toUpperCase()
                        )}
                    </span>
                    <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                {user?.username || user?.name || 'User'}
                            </span>
                            {isPremiumUser && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    <WorkspacePremiumIcon sx={{ fontSize: 11 }} /> Premium
                                </span>
                            )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>
                        {isPremiumUser && accessStatus.active_until_label && (
                            <span className="mt-0.5 block truncate text-[10px] font-bold text-amber-600 dark:text-amber-300">
                                Aktif sampai {accessStatus.active_until_label}
                            </span>
                        )}
                    </span>
                </span>
                <KeyboardArrowRightIcon sx={{ fontSize: 18 }} className="shrink-0 text-gray-600 dark:text-gray-300" />
            </Link>

            <div className="border-t border-gray-100 py-2 dark:border-gray-800">
                <Link
                    href={profileHref}
                    onClick={handleNavigation}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-gray-800"
                >
                    <SettingsOutlinedIcon sx={{ fontSize: 18 }} className="text-gray-700 dark:text-gray-300" />
                    Pengaturan profil
                </Link>
            </div>

            <div className="border-t border-gray-100 py-1 dark:border-gray-800">
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    onClick={handleNavigation}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                    <LogoutOutlinedIcon sx={{ fontSize: 18 }} /> Keluar Akun
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col lg:flex-row w-full overflow-x-clip transition-colors duration-300">
            {/* ====== HEADER MOBILE ====== */}
            <div className="lg:hidden flex min-h-[64px] items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-2 sticky top-0 z-30 shadow-sm transition-colors duration-300">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button
                        ref={mobileMenuButtonRef}
                        type="button"
                        onClick={() => {
                            setMobileAccountOpen(false);
                            setMobileOpen(true);
                        }}
                        aria-label="Buka navigasi"
                        aria-controls="main-sidebar"
                        aria-expanded={mobileOpen}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <MenuIcon sx={{ fontSize: 26 }} />
                    </button>
                    <div className="min-w-0">
                        <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="block h-5 w-auto max-w-[9rem] object-contain object-left dark:invert dark:hue-rotate-180 dark:brightness-110" />
                        <span className="block truncate text-[11px] font-semibold text-gray-700 dark:text-gray-300">{workspaceTitle}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {renderUtilityControls(true)}
                    <div ref={mobileAccountRef} className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setMobileAccountOpen((open) => !open);
                                setMobileOpen(false);
                            }}
                            aria-label="Buka menu akun"
                            aria-controls="mobile-account-menu"
                            aria-expanded={mobileAccountOpen}
                            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-black text-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                (user?.username || user?.name || 'User')?.charAt(0).toUpperCase()
                            )}
                        </button>
                        {mobileAccountOpen && renderProfileMenuPanel(
                            'mobile-account-menu',
                            'absolute right-0 top-[calc(100%+0.5rem)] z-[90] w-[min(20rem,calc(100vw-1.5rem))]',
                        )}
                    </div>
                </div>
            </div>

            {/* ====== OVERLAY MOBILE ====== */}
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Tutup navigasi"
                    className="fixed inset-0 z-40 border-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* ====== SIDEBAR VERTIKAL ====== */}
            <aside id="main-sidebar" aria-label="Navigasi utama" className={`fixed inset-y-0 left-0 z-[80] flex w-[calc(100vw-3rem)] max-w-[20rem] flex-col border-r border-gray-200 bg-gray-100 transition-[transform,width] duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${isExpanded ? 'lg:w-[224px]' : 'lg:w-[80px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                
                <div className="relative mb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex h-14 items-center justify-between px-3 lg:hidden">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-8 w-auto max-w-[10rem] shrink-0 object-contain object-left dark:invert dark:hue-rotate-180 dark:brightness-110" />
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileMenu}
                            aria-label="Tutup navigasi"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                            <CloseIcon sx={{ fontSize: 22 }} />
                        </button>
                    </div>
                    <div className={`hidden h-14 items-center px-3 lg:flex ${isExpanded ? 'gap-3' : 'justify-center'}`}>
                        <img src="/images/logos/toku-up-mark.png" alt="TOKU-UP" className={`${isExpanded ? 'h-8 w-8' : 'h-7 w-7'} shrink-0 object-contain rounded-full transition-all duration-300 dark:ring-1 dark:ring-white/20 dark:shadow-[0_0_12px_rgba(34,197,94,0.35)]`} />
                        {isExpanded && (
                            <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-6 w-auto max-w-[7.5rem] object-contain object-left dark:invert dark:hue-rotate-180 dark:brightness-110 animate-in fade-in slide-in-from-left-2 duration-300" />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSidebarExpanded(!isExpanded)}
                        aria-label={isExpanded ? 'Ciutkan sidebar' : 'Perluas sidebar'}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Ciutkan sidebar' : 'Perluas sidebar'}
                        className="absolute -right-3 top-[18px] hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--toku-border)] bg-white text-[#55616D] shadow-sm transition hover:border-[var(--toku-brand-border)] hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300 lg:flex"
                    >
                        <KeyboardArrowRightIcon
                            sx={{ fontSize: 18 }}
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                <nav className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
                    {activeMenu.map((item) => (
                        item.type === 'group' ? renderAdminGroup(item) : (
                            <SidebarLink 
                                key={item.href}
                                href={item.href} 
                                icon={item.icon} 
                                active={isActiveItem(item)}
                                target={item.target}
                                isExpanded={navigationExpanded}
                                activeTone={isUser ? 'learning' : 'brand'}
                                badge={item.badge}
                                onNavigate={handleNavigation}
                            >
                                {item.label}
                            </SidebarLink>
                        )
                    ))}
                </nav>

                <div className={`relative mt-auto flex flex-col border-t border-gray-200/60 p-3 dark:border-gray-800 ${navigationExpanded ? 'gap-2 px-4' : 'items-center'}`} ref={menuRef}>
                    {/* Lonceng Notifikasi */}
                    <button
                        type="button"
                        onClick={() => {
                            setNotificationOpen((open) => !open);
                            setProfileMenuOpen(false);
                        }}
                        aria-label={unreadCount > 0 ? `${notificationContext.label}, ${unreadCount} belum dibaca` : notificationContext.label}
                        aria-controls="sidebar-notification-menu"
                        aria-expanded={notificationOpen}
                        title={!navigationExpanded ? notificationContext.label : undefined}
                        className={`relative mb-2 flex min-h-11 w-full items-center rounded-xl text-[#55616D] transition-colors hover:bg-gray-200 hover:text-[#2D3742] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white ${navigationExpanded ? 'justify-start px-3' : 'justify-center'}`}
                    >
                        <NotificationsOutlinedIcon sx={{ fontSize: 24 }} />
                        {navigationExpanded && <span className="ml-3 text-sm font-semibold animate-in">{notificationContext.label}</span>}
                        {unreadCount > 0 && (
                            <span className={`absolute inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand-600 px-1 text-[9px] font-black leading-4 text-white dark:border-gray-900 ${navigationExpanded ? 'right-2 top-2' : 'right-0.5 top-0.5'}`}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Popup Notifikasi */}
                    {notificationOpen && (
                        <div id="sidebar-notification-menu" className={`fixed inset-x-3 bottom-3 z-[70] max-h-[75dvh] origin-bottom overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-2xl animate-in dark:border-gray-700 dark:bg-gray-950 lg:absolute lg:inset-x-auto lg:bottom-[110px] lg:max-h-[420px] lg:w-[340px] lg:origin-bottom-left ${desktopPopoverPosition}`}>
                            <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
                                <div>
                                    <h3 className="font-black text-gray-950 dark:text-white">{notificationContext.title}</h3>
                                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{unreadCount > 0 ? `${unreadCount} belum dibaca` : notificationContext.empty}</p>
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllAsRead}
                                        className="min-h-9 rounded-lg border border-gray-200 px-2.5 text-[10px] font-bold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                                    >
                                        Tandai semua dibaca
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[calc(75dvh-132px)] overflow-y-auto lg:max-h-[300px]">
                                {unreadCount === 0 ? (
                                    <div className="p-6 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {notificationContext.empty}
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map((notif) => (
                                        <button
                                            type="button"
                                            key={notif.id}
                                            onClick={() => handleMarkAsRead(notif.id, notif.data.url)}
                                            className="group relative block w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus dark:border-gray-800 dark:hover:bg-gray-900"
                                        >
                                            <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-brand-500 transition-transform group-hover:scale-150" />
                                            <span className={`mb-2 inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-black ${notif.severity === 'danger' || notif.data?.severity === 'danger' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300' : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
                                                {notificationCategoryLabel(notif.category || notif.data?.category)}
                                            </span>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 pr-4">{notif.data.title || 'Pemberitahuan Sistem'}</p>
                                            <p className="text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300">{notif.data.message || 'Silakan cek pembaruan terbaru di dashboard Anda.'}</p>
                                            <p className="mt-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400">{notif.created_at}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                            <Link
                                href={route('notifications.page')}
                                onClick={() => {
                                    setNotificationOpen(false);
                                    handleNavigation();
                                }}
                                className="flex min-h-11 items-center justify-center border-t border-gray-200 px-4 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-900"
                            >
                                {notificationContext.allLabel}
                            </Link>
                        </div>
                    )}

                    {/* Avatar Pemicu Popup */}
                    <button
                        type="button"
                        onClick={() => {
                            setProfileMenuOpen((open) => !open);
                            setNotificationOpen(false);
                        }}
                        aria-label="Buka menu akun"
                        aria-controls="sidebar-profile-menu"
                        aria-expanded={profileMenuOpen}
                        title={!navigationExpanded ? 'Akun' : undefined}
                        className={`relative flex min-h-[42px] w-full items-center overflow-hidden rounded-2xl ring-2 transition-all focus:outline-none focus-visible:ring-focus ${
                            navigationExpanded
                                ? 'gap-2.5 border border-gray-200 bg-white px-2 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-800'
                                : 'justify-center'
                        } ${profileMenuOpen ? 'ring-gray-300 ring-offset-2 dark:ring-gray-600 dark:ring-offset-gray-900' : 'ring-transparent'}`}
                    >
                        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 font-black text-white shadow-sm transition-all ${navigationExpanded ? 'h-7 w-7 text-xs' : 'h-[36px] w-[36px] text-lg'}`}>
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                (user?.username || user?.name || 'User')?.charAt(0).toUpperCase()
                            )}
                            {isPremiumUser && (
                                <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-amber-400 text-gray-950 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                                    <WorkspacePremiumIcon sx={{ fontSize: 12 }} />
                                </span>
                            )}
                        </div>
                        {navigationExpanded && (
                            <div className="min-w-0 flex-1 text-left animate-in">
                                <p className="truncate text-xs font-bold leading-tight text-gray-900 dark:text-white">{user?.username || user?.name || 'User'}</p>
                                <p className="mt-0.5 truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">Pengaturan akun</p>
                            </div>
                        )}
                    </button>

                    {profileMenuOpen && renderProfileMenuPanel(
                        'sidebar-profile-menu',
                        `absolute bottom-16 left-3 right-3 z-50 w-auto ${desktopPopoverPosition} lg:right-auto lg:max-h-[360px] lg:w-[300px]`,
                    )}
                </div>
            </aside>

            <div className={`flex-1 w-full transition-all duration-300 ${isExpanded ? 'lg:ml-[224px]' : 'lg:ml-[80px]'}`}>
                <header className="sticky top-0 z-20 hidden min-h-[56px] items-center justify-between border-b border-gray-200/80 bg-white/85 px-5 shadow-sm backdrop-blur-xl transition-colors duration-300 dark:border-gray-800 dark:bg-gray-950/80 lg:flex">
                    <div className="min-w-0">
                        <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-4 w-auto max-w-[7.5rem] object-contain object-left dark:invert dark:hue-rotate-180 dark:brightness-110" />
                        <p className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {workspaceTitle}
                        </p>
                    </div>
                    {renderUtilityControls(false)}
                </header>
                <main className="min-h-screen bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-slate-100 shadow-[-5px_0_30px_-10px_rgba(0,0,0,0.05)] relative z-0 transition-colors duration-300">
                    {children}
                </main>
                {isUser && (
                    <footer className="border-t border-gray-200/80 bg-white px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
                            <span>© {new Date().getFullYear()} TOKU-UP</span>
                            <Link href={route('about')} className="inline-flex min-h-11 items-center px-2 font-semibold text-gray-600 transition-colors hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:text-brand-400 dark:focus-visible:ring-offset-gray-950">
                                Tentang TOKU-UP
                            </Link>
                        </div>
                    </footer>
                )}
            </div>

            {activeFlashNotice && (
                <FlashToast
                    notice={activeFlashNotice}
                    soundEnabled={user?.role === 'user'}
                    onDismiss={() => setActiveFlashNotice(null)}
                />
            )}

            <ProductFeedbackButton />

            {toastAchievements.length > 0 && (
                <div className="fixed inset-x-3 top-3 z-[100] flex flex-col gap-3 animate-in sm:inset-x-auto sm:right-6 sm:top-6">
                    {toastAchievements.map((ach, i) => (
                        <div key={i} className="flex w-full min-w-0 items-center gap-3 rounded-2xl border-2 border-[#E8C95B] bg-white p-4 shadow-[0_10px_40px_-10px_rgba(45,55,66,0.25)] dark:border-amber-700/70 dark:bg-gray-900 dark:shadow-black/35 sm:w-[320px] sm:gap-4 sm:p-5" style={{ animation: `fade-in-slide-up 0.4s ${i * 0.15}s both` }}>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEF0B8] text-2xl text-[#8A6100] shadow-lg shadow-amber-400/20 dark:bg-amber-950/60 dark:text-amber-300 sm:h-14 sm:w-14 sm:text-3xl">
                                {ach.icon || '<KabutoIcon className="w-5 h-5 inline-block text-yellow-500" />'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Lencana Terbuka!</p>
                                <p className="break-words text-sm font-black text-gray-900 dark:text-white">{ach.name}</p>
                                <p className="break-words text-xs font-medium text-gray-700 dark:text-gray-300">{ach.description}</p>
                                {ach.xp_reward > 0 && <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black text-green-600 dark:bg-green-950/50 dark:text-green-300">+{ach.xp_reward} XP</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html:`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes flash-toast-in {
                    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes flash-toast-progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .goog-te-banner-frame,
                .goog-te-gadget,
                .goog-te-balloon-frame,
                #goog-gt-tt {
                    display: none !important;
                }
                body {
                    top: 0 !important;
                }
                iframe.skiptranslate {
                    display: none !important;
                }
                @keyframes fade-in-slide-up {
                    0% { opacity: 0; transform: translateY(10px) scale(0.98); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-in { animation: fade-in-slide-up 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
}
