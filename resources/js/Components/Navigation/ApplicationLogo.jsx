import { Link } from '@inertiajs/react';

export default function ApplicationLogo({ className = '', wordmarkClassName = '' }) {
    return (
        <Link href="/" aria-label="TOKU-UP - Beranda" className="flex items-center gap-2.5 no-underline">
            <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className={`h-10 w-auto object-contain dark:invert dark:hue-rotate-180 dark:brightness-110 ${className} ${wordmarkClassName}`} />
        </Link>
    );
}
