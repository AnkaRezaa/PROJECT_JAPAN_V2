import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,jsx}',
    ],

    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: 'rgb(var(--toku-primary-soft-rgb) / <alpha-value>)',
                    100: 'rgb(var(--toku-primary-soft-rgb) / <alpha-value>)',
                    200: 'rgb(var(--toku-border-rgb) / <alpha-value>)',
                    300: 'rgb(var(--toku-brand-rgb) / <alpha-value>)',
                    400: 'rgb(var(--toku-brand-rgb) / <alpha-value>)',
                    500: 'rgb(var(--toku-brand-rgb) / <alpha-value>)',
                    600: 'rgb(var(--toku-primary-rgb) / <alpha-value>)',
                    700: 'rgb(var(--toku-primary-hover-rgb) / <alpha-value>)',
                    800: 'rgb(var(--toku-primary-hover-rgb) / <alpha-value>)',
                    900: 'rgb(var(--toku-primary-hover-rgb) / <alpha-value>)',
                    950: 'rgb(var(--toku-ink-rgb) / <alpha-value>)',
                },
                ink: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    600: '#667085',
                    700: '#55616D',
                    800: '#34434F',
                    900: '#2D3742',
                    950: '#25303A',
                },
                learning: {
                    50: '#EFF6FF',
                    100: '#DBEAFE',
                    200: '#BFDBFE',
                    300: '#93C5FD',
                    400: '#60A5FA',
                    500: '#3B82F6',
                    600: '#2563EB',
                    700: '#1D4ED8',
                    800: '#1E40AF',
                    900: '#1E3A8A',
                    950: '#172554',
                },
                achievement: {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    400: '#FBBF24',
                    500: '#F59E0B',
                    700: '#B45309',
                    900: '#78350F',
                },
                action: {
                    primary: 'var(--toku-action-primary)',
                    'primary-hover': 'var(--toku-action-primary-hover)',
                    secondary: 'var(--toku-action-secondary)',
                    'secondary-hover': 'var(--toku-action-secondary-hover)',
                },
                state: {
                    success: 'var(--toku-state-success)',
                    info: 'var(--toku-state-info)',
                    warning: 'var(--toku-state-warning)',
                    danger: 'var(--toku-state-danger)',
                },
                progress: {
                    active: 'var(--toku-progress-active)',
                    complete: 'var(--toku-progress-complete)',
                },
                surface: {
                    DEFAULT: 'var(--toku-surface)',
                    muted: 'var(--toku-surface-muted)',
                },
                focus: 'rgb(var(--toku-focus-rgb) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['"Noto Sans JP"', '"Inter"', ...defaultTheme.fontFamily.sans],
                display: ['"Yuji Syuku"', '"Noto Sans JP"', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms],
};
