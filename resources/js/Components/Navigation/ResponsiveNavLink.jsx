import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ href, active = false, method, as, children, ...props }) {
    return (
        <Link
            href={href}
            method={method}
            as={as}
            className={`block w-full ps-3 pe-4 py-2 border-l-4 text-start text-base font-medium transition-colors ${active
                    ? 'border-brand-600 text-brand-700 bg-brand-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300'
                }`}
            {...props}
        >
            {children}
        </Link>
    );
}
