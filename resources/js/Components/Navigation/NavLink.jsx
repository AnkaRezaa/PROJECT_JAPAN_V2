import { Link } from '@inertiajs/react';

export default function NavLink({ href, active, children, className = '' }) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center px-1 pt-1 text-sm font-medium leading-5 transition-colors border-b-2 ${active
                    ? 'border-brand-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } ${className}`}
        >
            {children}
        </Link>
    );
}
