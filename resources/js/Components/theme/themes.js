// ============================================================
// TEMA WARNA TOKU-UP
// Ganti nilai ACTIVE_THEME untuk switch tema:
//   'tokuup' | 'spring' | 'autumn' | 'winter' | 'summer'
// ============================================================

export const DEFAULT_THEME = 'tokuup';

const getGlobalThemeConfig = () => {
    if (typeof window === 'undefined') {
        return { activeTheme: DEFAULT_THEME, customTheme: {} };
    }

    return window.__TOKU_UP_THEME__ || { activeTheme: DEFAULT_THEME, customTheme: {} };
};

const getGlobalThemeName = () => {
    if (typeof window === 'undefined') return DEFAULT_THEME;

    return getGlobalThemeConfig().activeTheme || DEFAULT_THEME;
};

const getGlobalCustomTheme = () => {
    const customTheme = getGlobalThemeConfig().customTheme;
    return customTheme && typeof customTheme === 'object' ? customTheme : {};
};

export const THEME_PRESETS = {

    // TOKU-UP - friendly EdTech brand default.
    tokuup: {
        primaryColor: '#30C060',
        primaryHover: '#15803D',
        primarySoft: '#D2F0DD',
        brandColor: '#30C060',
        inkColor: '#2D3742',
        infoColor: '#2563EB',
        achievementColor: '#F2B705',
        surfaceColor: '#FFFFFF',
        surfaceMuted: '#F7FAF8',
        borderColor: '#DDE7E1',
        focusColor: '#2563EB',
        heroBg: 'bg-[#F7FAF8]',
        heroText: 'text-ink-900',
        heroBlob1: 'bg-green-200',
        heroBlob2: 'bg-blue-100',
        heroAccent: 'text-brand-700',
        sectionBg: 'bg-[#F7FAF8]',
        pathGrad: ['#30C060', '#2563EB', '#E5E7EB'],
        doneColor: '#30C060',
        doneShadow: '#166534',
        activeColor: '#2563EB',
        activeShadow: '#1E3A8A',
        ctaBg: 'bg-brand-600',
        statBg: 'bg-ink-900',
        statAccent: 'text-brand-300',
        featureBgs: [
            'bg-brand-50 border-brand-100',
            'bg-learning-50 border-learning-100',
            'bg-achievement-50 border-achievement-100',
        ],
        landingHeroBg: 'bg-[#F7FAF8]',
        landingGradText: 'text-brand-700',
        landingBadgeBg: 'bg-brand-50 border-brand-100',
        landingBadgeDot: 'bg-brand-500',
        landingBadgeText: 'text-brand-700',
        landingGlow: 'bg-brand-100/60',
        landingCardGlow: 'bg-brand-100/50',
        landingHighlightBorder: 'border-2 border-brand-200 bg-white shadow-sm z-10',
        landingHighlightBadge: 'bg-brand-600',
        landingHighlightBtn: '!bg-brand-600',
        landingHighlightLevel: 'bg-brand-50 text-brand-700',
        landingLeagueBg: 'bg-learning-700',
        landingCtaBg: 'bg-ink-900',
        landingProBg: 'bg-brand-600',
    },

    // 🌸 SPRING (Sakura)
    spring: {
        primaryColor: '#BE185D',
        primaryHover: '#9D174D',
        primarySoft: '#FCE7F3',
        brandColor: '#EC4899',
        inkColor: '#18212B',
        infoColor: '#1D4ED8',
        achievementColor: '#FBBF24',
        surfaceColor: '#FFFFFF',
        surfaceMuted: '#FDF7FA',
        borderColor: '#F3D8E5',
        heroBg: 'from-pink-600 via-rose-500 to-pink-700',
        heroBlob1: 'bg-pink-200',
        heroBlob2: 'bg-rose-100',
        heroAccent: 'text-pink-600',
        sectionBg: 'bg-pink-50',
        pathGrad: ['#F9A8D4', '#FBCFE8', '#E5E5E5'],
        doneColor: '#EC4899',
        doneShadow: '#BE185D',
        activeColor: '#F472B6',
        activeShadow: '#DB2777',
        ctaBg: 'from-pink-500 to-rose-600',
        statBg: 'bg-pink-900',
        statAccent: 'text-pink-300',
        featureBgs: [
            'bg-pink-50 border-pink-100',
            'bg-rose-50 border-rose-100',
            'bg-fuchsia-50 border-fuchsia-100',
        ],
        // landing page
        landingHeroBg: 'bg-[#FDFEFE]',
        landingGradText: 'from-pink-500 via-rose-400 to-pink-600',
        landingBadgeBg: 'bg-pink-50 border-pink-100',
        landingBadgeDot: 'bg-pink-500',
        landingBadgeText: 'text-pink-600',
        landingGlow: 'from-pink-100/40 to-rose-100/40',
        landingCardGlow: 'bg-pink-100/50',
        landingHighlightBorder: 'border-2 border-pink-400 shadow-2xl scale-105 z-10',
        landingHighlightBadge: 'bg-pink-500',
        landingHighlightBtn: '!bg-pink-500',
        landingHighlightLevel: 'bg-pink-50 text-pink-600',
        landingLeagueBg: 'bg-pink-500',
        landingCtaBg: 'bg-gray-900',
        landingProBg: 'bg-pink-500',
    },

    // 🍂 AUTUMN (Musim Gugur)
    autumn: {
        primaryColor: '#C2410C',
        primaryHover: '#9A3412',
        primarySoft: '#FFEDD5',
        brandColor: '#F97316',
        inkColor: '#1C1917',
        infoColor: '#1D4ED8',
        achievementColor: '#FBBF24',
        surfaceColor: '#FFFFFF',
        surfaceMuted: '#FFFBF7',
        borderColor: '#F1DFD2',
        heroBg: 'from-orange-600 via-amber-500 to-red-600',
        heroBlob1: 'bg-orange-200',
        heroBlob2: 'bg-red-100',
        heroAccent: 'text-orange-600',
        sectionBg: 'bg-amber-50',
        pathGrad: ['#F97316', '#EF4444', '#E5E5E5'],
        doneColor: '#F97316',
        doneShadow: '#C2410C',
        activeColor: '#EF4444',
        activeShadow: '#B91C1C',
        ctaBg: 'from-orange-500 to-red-600',
        statBg: 'bg-orange-900',
        statAccent: 'text-orange-300',
        featureBgs: [
            'bg-orange-50 border-orange-100',
            'bg-amber-50 border-amber-100',
            'bg-red-50 border-red-100',
        ],
        landingHeroBg: 'bg-[#FFFBF7]',
        landingGradText: 'from-orange-600 via-amber-500 to-red-600',
        landingBadgeBg: 'bg-orange-50 border-orange-100',
        landingBadgeDot: 'bg-orange-600',
        landingBadgeText: 'text-orange-700',
        landingGlow: 'from-orange-100/40 to-red-100/40',
        landingCardGlow: 'bg-orange-100/50',
        landingHighlightBorder: 'border-2 border-orange-500 shadow-2xl scale-105 z-10',
        landingHighlightBadge: 'bg-orange-500',
        landingHighlightBtn: '!bg-orange-500',
        landingHighlightLevel: 'bg-orange-50 text-orange-600',
        landingLeagueBg: 'bg-orange-600',
        landingCtaBg: 'bg-stone-900',
        landingProBg: 'bg-orange-600',
    },

    // ❄️ WINTER (Salju) — Biru/Cyan/Indigo
    winter: {
        primaryColor: '#0369A1',
        primaryHover: '#075985',
        primarySoft: '#E0F2FE',
        brandColor: '#0EA5E9',
        inkColor: '#172033',
        infoColor: '#4338CA',
        achievementColor: '#FBBF24',
        surfaceColor: '#FFFFFF',
        surfaceMuted: '#F5F8FF',
        borderColor: '#D9E4F5',
        heroBg: 'from-sky-600 via-blue-500 to-indigo-700',
        heroBlob1: 'bg-sky-200',
        heroBlob2: 'bg-indigo-100',
        heroAccent: 'text-sky-600',
        sectionBg: 'bg-sky-50',
        pathGrad: ['#38BDF8', '#818CF8', '#E5E5E5'],
        doneColor: '#0EA5E9',
        doneShadow: '#0369A1',
        activeColor: '#6366F1',
        activeShadow: '#4338CA',
        ctaBg: 'from-sky-500 to-indigo-600',
        statBg: 'bg-indigo-950',
        statAccent: 'text-sky-300',
        featureBgs: [
            'bg-sky-50 border-sky-100',
            'bg-blue-50 border-blue-100',
            'bg-indigo-50 border-indigo-100',
        ],
        landingHeroBg: 'bg-[#F5F8FF]',
        landingGradText: 'from-sky-500 via-blue-400 to-indigo-600',
        landingBadgeBg: 'bg-sky-50 border-sky-100',
        landingBadgeDot: 'bg-sky-500',
        landingBadgeText: 'text-sky-600',
        landingGlow: 'from-sky-100/40 to-indigo-100/40',
        landingCardGlow: 'bg-sky-100/50',
        landingHighlightBorder: 'border-2 border-sky-500 shadow-2xl scale-105 z-10',
        landingHighlightBadge: 'bg-sky-600',
        landingHighlightBtn: '!bg-sky-600',
        landingHighlightLevel: 'bg-sky-50 text-sky-600',
        landingLeagueBg: 'bg-sky-600',
        landingCtaBg: 'bg-slate-900',
        landingProBg: 'bg-sky-600',
    },

    // 🏮 SUMMER (Festival)
    summer: {
        primaryColor: '#047857',
        primaryHover: '#065F46',
        primarySoft: '#D1FAE5',
        brandColor: '#10B981',
        inkColor: '#18212B',
        infoColor: '#1D4ED8',
        achievementColor: '#F59E0B',
        surfaceColor: '#FFFFFF',
        surfaceMuted: '#F5FFF9',
        borderColor: '#D8EDE1',
        heroBg: 'from-emerald-600 via-teal-500 to-emerald-800',
        heroBlob1: 'bg-yellow-200',
        heroBlob2: 'bg-emerald-100',
        heroAccent: 'text-emerald-600',
        sectionBg: 'bg-green-50',
        pathGrad: ['#10B981', '#F59E0B', '#E5E5E5'],
        doneColor: '#10B981',
        doneShadow: '#065F46',
        activeColor: '#F59E0B',
        activeShadow: '#B45309',
        ctaBg: 'from-emerald-500 to-teal-600',
        statBg: 'bg-emerald-900',
        statAccent: 'text-emerald-300',
        featureBgs: [
            'bg-green-50 border-green-100',
            'bg-emerald-50 border-emerald-100',
            'bg-yellow-50 border-yellow-100',
        ],
        landingHeroBg: 'bg-[#F5FFF9]',
        landingGradText: 'from-emerald-500 via-teal-400 to-green-600',
        landingBadgeBg: 'bg-green-50 border-green-100',
        landingBadgeDot: 'bg-emerald-500',
        landingBadgeText: 'text-emerald-700',
        landingGlow: 'from-emerald-100/40 to-teal-100/40',
        landingCardGlow: 'bg-emerald-100/50',
        landingHighlightBorder: 'border-2 border-emerald-500 shadow-2xl scale-105 z-10',
        landingHighlightBadge: 'bg-emerald-500',
        landingHighlightBtn: '!bg-emerald-500',
        landingHighlightLevel: 'bg-emerald-50 text-emerald-700',
        landingLeagueBg: 'bg-emerald-600',
        landingCtaBg: 'bg-gray-900',
        landingProBg: 'bg-emerald-600',
    },
};

const storedThemeName = getGlobalThemeName();
export const ACTIVE_THEME = THEME_PRESETS[storedThemeName] ? storedThemeName : DEFAULT_THEME;

const activeTheme = {
    ...(THEME_PRESETS[ACTIVE_THEME] || THEME_PRESETS[DEFAULT_THEME]),
    ...getGlobalCustomTheme(),
};

export const applyThemeVariables = (theme = activeTheme) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const toRgbChannels = (hex) => {
        const value = hex?.replace('#', '');
        if (!value || !/^[0-9a-f]{6}$/i.test(value)) return null;
        return `${parseInt(value.slice(0, 2), 16)} ${parseInt(value.slice(2, 4), 16)} ${parseInt(value.slice(4, 6), 16)}`;
    };
    const variables = {
        '--toku-theme-primary': theme.primaryColor,
        '--toku-theme-primary-hover': theme.primaryHover,
        '--toku-theme-primary-soft': theme.primarySoft,
        '--toku-theme-brand': theme.brandColor,
        '--toku-theme-ink': theme.inkColor,
        '--toku-theme-info': theme.infoColor,
        '--toku-theme-achievement': theme.achievementColor,
        '--toku-theme-surface': theme.surfaceColor,
        '--toku-theme-surface-muted': theme.surfaceMuted,
        '--toku-theme-border': theme.borderColor,
        '--toku-theme-focus': theme.focusColor || theme.primaryColor,
        '--toku-theme-focus-rgb': toRgbChannels(theme.focusColor || theme.primaryColor),
        '--toku-theme-primary-rgb': toRgbChannels(theme.primaryColor),
        '--toku-theme-primary-hover-rgb': toRgbChannels(theme.primaryHover),
        '--toku-theme-primary-soft-rgb': toRgbChannels(theme.primarySoft),
        '--toku-theme-brand-rgb': toRgbChannels(theme.brandColor),
        '--toku-theme-ink-rgb': toRgbChannels(theme.inkColor),
        '--toku-theme-border-rgb': toRgbChannels(theme.borderColor),
        '--toku-theme-info-rgb': toRgbChannels(theme.infoColor),
        '--toku-theme-achievement-rgb': toRgbChannels(theme.achievementColor),
        '--toku-action-primary': theme.primaryColor,
        '--toku-action-primary-hover': theme.primaryHover,
        '--toku-action-secondary': theme.infoColor,
        '--toku-action-secondary-hover': theme.infoHover || '#1E40AF',
        '--toku-state-info': theme.infoColor,
        '--toku-state-warning': theme.achievementColor,
        '--toku-progress-active': theme.infoColor,
        '--toku-progress-complete': theme.doneColor || '#22C55E',
    };

    Object.entries(variables).forEach(([property, value]) => {
        if (value) root.style.setProperty(property, value);
    });
};

export default activeTheme;
