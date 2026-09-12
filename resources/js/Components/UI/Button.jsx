import { Link } from '@inertiajs/react';

const variants = {
    primary: 'bg-action-primary text-ink-900 hover:bg-action-primary-hover hover:text-white shadow-sm',
    secondary: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-gray-100',
    outline: 'border border-[var(--toku-border)] bg-transparent text-gray-700 hover:border-[var(--toku-primary)] hover:bg-[var(--toku-primary-soft)] dark:text-gray-200',
    ghost: 'text-gray-600 hover:bg-[var(--toku-primary-soft)] hover:text-[var(--toku-primary-hover)] dark:text-gray-300',
    danger: 'bg-state-danger text-white hover:bg-red-700',
    success: 'bg-state-success text-white hover:bg-green-700',
};

const sizes = {
    sm: 'min-h-[32px] px-3 py-1 text-xs rounded-lg',
    md: 'min-h-[38px] px-4 py-2 text-xs sm:text-sm rounded-xl',
    lg: 'min-h-11 px-6 py-2.5 text-sm sm:text-base rounded-xl',
};

export default function Button({ children, variant = 'primary', size = 'md', href, className = '', disabled, ...props }) {
    const classes = `inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toku-focus)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus-visible:ring-offset-gray-950 ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        return <Link href={href} className={classes} {...props}>{children}</Link>;
    }

    return <button className={classes} disabled={disabled} {...props}>{children}</button>;
}
