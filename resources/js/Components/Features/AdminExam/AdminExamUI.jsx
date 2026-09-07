import React from 'react';
import { Link } from '@inertiajs/react';

export const fieldClassName = 'mt-1.5 block h-11 w-full rounded-md border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 shadow-none focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white';

const statusStyles = {
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    draft: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800',
    archived: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
    active: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800',
    scheduled: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
    closed: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700',
    passed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    failed: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    completed: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800',
};

const statusLabels = {
    published: 'Terbit', draft: 'Draft', archived: 'Arsip', active: 'Berjalan',
    scheduled: 'Terjadwal', closed: 'Selesai', passed: 'Lulus', failed: 'Belum lulus', completed: 'Selesai',
};

export function StatusBadge({ status }) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset ${statusStyles[status] || statusStyles.archived}`}>{statusLabels[status] || status}</span>;
}

export function PrototypeNotice() {
    return <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800">Prototipe frontend</span>;
}

export function AdminExamHeader({ eyebrow, title, description, action }) {
    return (
        <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">{eyebrow}</p>
                <h1 className="mt-1 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">{title}</h1>
                <p className="mt-2 text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            {action}
        </header>
    );
}

export function AdminExamTabs() {
    const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
    const items = [
        ['/admin/exams', 'Paket ujian', pathname === '/admin/exams'],
        ['/admin/exams/sessions', 'Sesi & akses', pathname.startsWith('/admin/exams/sessions')],
        ['/admin/exams/results', 'Hasil peserta', pathname.startsWith('/admin/exams/results')],
    ];

    return (
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800" aria-label="Navigasi pengelolaan ujian">
            {items.map(([href, label, active]) => (
                <Link key={href} href={href} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black ${active ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                    {label}
                </Link>
            ))}
        </nav>
    );
}

export function Metric({ label, value, detail }) {
    return (
        <div className="border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums text-gray-950 dark:text-white">{value}</p>
            {detail && <p className="mt-1 text-xs font-semibold text-gray-400 dark:text-gray-500">{detail}</p>}
        </div>
    );
}
