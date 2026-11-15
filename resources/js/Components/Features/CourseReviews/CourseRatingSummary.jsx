import React from 'react';
import { Link } from '@inertiajs/react';
import StarIcon from '@mui/icons-material/Star';

export default function CourseRatingSummary({ summary, title = '', tone = 'light' }) {
    const count = Number(summary?.count) || 0;
    const hasRating = count > 0 && summary?.average != null && Number.isFinite(Number(summary.average));
    const average = hasRating ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.average) : '';
    const countLabel = new Intl.NumberFormat('id-ID').format(count);
    const label = hasRating ? `${title}: ${average} dari 5, ${countLabel} ulasan` : `${title}: Belum ada ulasan`;
    const className = `inline-flex min-h-[44px] max-w-full flex-wrap items-center gap-x-2 gap-y-0 rounded-sm py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${tone === 'dark' ? 'text-slate-300 focus-visible:ring-offset-slate-900' : 'text-gray-600'}`;
    const content = hasRating ? <>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <StarIcon aria-hidden="true" sx={{ fontSize: 18 }} className={tone === 'dark' ? 'text-amber-400' : 'text-amber-700'} />
            <strong className={tone === 'dark' ? 'text-white' : 'text-gray-900'}>{average}<span className="font-normal"> / 5</span></strong>
        </span>
        <span className={summary?.url ? 'underline decoration-current/40 underline-offset-4' : ''}>{countLabel} ulasan</span>
    </> : <span>Belum ada ulasan</span>;

    return summary?.url
        ? <Link href={summary.url} aria-label={label} data-course-rating className={className}>{content}</Link>
        : <span aria-label={label} data-course-rating className={className}>{content}</span>;
}
