import { Link } from '@inertiajs/react';

const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus-visible:ring-brand-500',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

const sizes = {
    sm: 'min-h-[36px] px-3.5 py-1.5 text-xs rounded-xl',
    md: 'min-h-[40px] px-4 py-2 text-sm rounded-xl',
    lg: 'min-h-[44px] px-6 py-2.5 text-sm sm:text-base rounded-xl',
};

export default function Button({ children, variant = 'primary', size = 'md', href, className = '', disabled, ...props }) {
    const classes = `inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toku-focus)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus-visible:ring-offset-gray-950 ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        return <Link href={href} className={classes} {...props}>{children}</Link>;
    }

    return <button className={classes} disabled={disabled} {...props}>{children}</button>;
}
