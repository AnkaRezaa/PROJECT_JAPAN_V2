import BrandWordmark from '@/Components/Navigation/BrandWordmark';
import { Link } from '@inertiajs/react';

export default function ApplicationLogo({ className = '', wordmarkClassName = '', adaptive = true }) {
    return (
        <Link href="/" aria-label="TOKU-UP - Beranda" className="flex items-center gap-2.5 no-underline">
            <BrandWordmark adaptive={adaptive} className={`h-8 w-auto object-contain ${className} ${wordmarkClassName}`} />
        </Link>
    );
}
