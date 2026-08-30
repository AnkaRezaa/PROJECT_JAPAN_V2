import { Link } from '@inertiajs/react';

export default function Breadcrumb({ items = [], className = '' }) {
    return (
        <nav className={`flex items-center gap-2 text-sm ${className}`}>
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300">/</span>}
                    {item.href ? (
                        <Link href={item.href} className="text-gray-500 hover:text-brand-700 transition-colors no-underline">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
