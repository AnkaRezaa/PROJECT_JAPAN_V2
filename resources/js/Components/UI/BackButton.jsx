import React from 'react';
import { Link } from '@inertiajs/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function BackButton({
    children,
    label,
    href,
    className = '',
    iconSize = 19,
    ...props
}) {
    const content = (
        <>
            <ArrowBackIcon sx={{ fontSize: iconSize }} />
            <span>{children || label || 'Kembali'}</span>
        </>
    );

    const baseClasses = `inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition ${className}`;

    if (href) {
        return (
            <Link href={href} className={baseClasses} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" className={baseClasses} {...props}>
            {content}
        </button>
    );
}
