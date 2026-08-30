import { Link } from '@inertiajs/react';

export default function Pagination({ links = [], className = '' }) {
    if (links.length <= 3) return null;

    return (
        <div className={`flex items-center justify-center gap-1 mt-6 ${className}`}>
            {links.map((link, i) => (
                <Link
                    key={i}
                    href={link.url || '#'}
                    preserveScroll
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${link.active
                            ? 'bg-[var(--toku-primary)] text-white'
                            : link.url
                                ? 'text-gray-600 hover:bg-gray-100'
                                : 'text-gray-300 pointer-events-none'
                        }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}
