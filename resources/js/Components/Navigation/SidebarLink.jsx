import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
    variant = 'default',
}) {
    const isUserVariant = variant === 'user';
    const opensNewTab = target === '_blank';
    const label = typeof children === 'string' ? children : undefined;
    const accessibleLabel = opensNewTab ? `${label} (dibuka di tab baru)` : label;
    const activeClasses = activeTone === 'learning'
        ? 'border border-[var(--toku-brand-border)] bg-[var(--toku-primary-soft)] text-brand-800 dark:border-green-800 dark:bg-[#12351f] dark:text-green-100 dark:hover:border-green-700 dark:hover:bg-[#173f25]'
        : 'border border-[var(--toku-brand-border)] bg-[var(--toku-primary-soft)] text-[#2D3742] dark:border-green-800 dark:bg-[#12351f] dark:text-green-100 dark:hover:border-green-700 dark:hover:bg-[#173f25]';

    const commonProps = {
        href,
        'aria-current': active ? 'page' : undefined,
        'aria-label': !isExpanded || opensNewTab ? accessibleLabel : undefined,
        title: !isExpanded ? label : undefined,
        onClick: onNavigate,
        className: `group relative mb-1 flex min-h-[44px] w-full items-center rounded-xl border border-transparent py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
            isExpanded ? 'flex-row justify-start px-3' : 'justify-center px-2'
        } ${
            active
                ? activeClasses
                : 'text-[#55616D] hover:bg-white hover:text-[#2D3742] hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
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

            {opensNewTab && isExpanded && <OpenInNewIcon aria-hidden="true" sx={{ fontSize: 15 }} className="ml-2 shrink-0 text-gray-500 dark:text-gray-400" />}

            {badge && (
                <span className={`absolute ${isExpanded ? 'right-3.5' : 'right-1.5 top-1.5'} rounded-md border border-white bg-yellow-400 px-1 py-0.5 text-[9px] font-black leading-none text-yellow-900 shadow-sm`}>
                    {badge}
                </span>
            )}
        </>
    );

    const link = opensNewTab ? (
        <a {...commonProps} target="_blank" rel={rel || 'noopener noreferrer'}>{content}</a>
    ) : (
        <Link {...commonProps}>{content}</Link>
    );
    return link;
}
