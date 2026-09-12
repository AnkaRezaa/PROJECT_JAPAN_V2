import { Link } from '@inertiajs/react';

export default function SidebarLink({
    href,
    icon,
    children,
    active = false,
    badge,
    isExpanded = false,
    className = '',
    onNavigate,
    activeTone = 'brand',
    target,
    rel,
}) {
    const label = typeof children === 'string' ? children : undefined;
    const activeClasses = activeTone === 'learning'
        ? 'border border-[var(--toku-brand-border)] bg-[var(--toku-primary-soft)] text-[#2D3742] dark:border-green-800 dark:bg-[#12351f] dark:text-green-100 dark:hover:border-green-700 dark:hover:bg-[#173f25]'
        : 'border border-[var(--toku-brand-border)] bg-[var(--toku-primary-soft)] text-[#2D3742] dark:border-green-800 dark:bg-[#12351f] dark:text-green-100 dark:hover:border-green-700 dark:hover:bg-[#173f25]';

    const commonProps = {
        href,
        'aria-current': active ? 'page' : undefined,
        'aria-label': !isExpanded ? label : undefined,
        title: !isExpanded ? label : undefined,
        onClick: onNavigate,
        className: `group relative mb-1.5 flex min-h-[52px] w-full items-center rounded-xl border border-transparent py-2.5 transition-all duration-200 ${
            isExpanded ? 'flex-row justify-start px-3.5' : 'justify-center px-2'
        } ${
            active
                ? activeClasses
                : 'text-[#55616D] hover:border-[var(--toku-border)] hover:bg-white hover:text-[#2D3742] hover:shadow-sm dark:text-gray-300 dark:hover:border-green-900/80 dark:hover:bg-[#172d20] dark:hover:text-green-100'
        } ${className}`,
    };

    const content = (
        <>
            <span className={`flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${isExpanded ? 'mr-3' : ''}`}>
                {icon}
            </span>

            {isExpanded && (
                <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
                    {children}
                </span>
            )}

            {badge && (
                <span className={`absolute ${isExpanded ? 'right-3.5' : 'right-1.5 top-1.5'} rounded-md border border-white bg-yellow-400 px-1 py-0.5 text-[9px] font-black leading-none text-yellow-900 shadow-sm`}>
                    {badge}
                </span>
            )}
        </>
    );

    if (target === '_blank') {
        return (
            <a {...commonProps} target="_blank" rel={rel || 'noopener noreferrer'}>
                {content}
            </a>
        );
    }

    return (
        <Link {...commonProps}>
            {content}
        </Link>
    );
}
