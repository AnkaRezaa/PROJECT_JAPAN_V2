import React from 'react';
import { Link } from '@inertiajs/react';

export default function NewsPreview({ item }) {
    return (
        <article className="min-w-0 border-b border-gray-200 pb-6 dark:border-gray-700">
            {item.thumbnail_url && <Link href={item.url} tabIndex={-1} aria-hidden="true" className="mb-4 block overflow-hidden rounded-lg">
                <img src={item.thumbnail_url} alt="" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
            </Link>}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                {item.category && <span className="font-semibold capitalize text-emerald-800 dark:text-emerald-300">{item.category.replaceAll('-', ' ')}</span>}
                {item.published_label && <span>{item.published_label}</span>}
            </div>
            <h3 className="mt-2 break-words text-lg font-bold leading-snug text-gray-900 dark:text-white">
                <Link href={item.url} className="inline-flex min-h-11 items-center rounded-sm hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:hover:text-emerald-300">{item.title}</Link>
            </h3>
            {item.excerpt && <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-gray-600 dark:text-gray-300">{item.excerpt}</p>}
        </article>
    );
}
