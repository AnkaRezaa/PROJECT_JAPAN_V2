import React, { useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const stateCards = (stats) => {
    const total = Math.max(1, stats.total_count || 0);
    const percentage = (value) => Math.round(((value || 0) / total) * 100);

    return [
        { label: 'Baru', value: stats.new_count || 0, percentage: percentage(stats.new_count), tone: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200' },
        { label: 'Dipelajari', value: stats.learning_count || 0, percentage: percentage(stats.learning_count), tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200' },
        { label: 'Review', value: stats.review_count || 0, percentage: percentage(stats.review_count), tone: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200' },
    ];
};

const resultConfig = {
    correct: { label: 'Benar', Icon: CheckCircleIcon, className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200' },
    wrong: { label: 'Salah', Icon: ErrorOutlineIcon, className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200' },
    skipped: { label: 'Dilewati', Icon: RemoveCircleOutlineIcon, className: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200' },
};

const paginationLabel = (label) => label
    .replace('&laquo; Previous', 'Sebelumnya')
    .replace('Next &raquo;', 'Berikutnya')
    .replace(/&laquo;|&raquo;/g, '');

export default function ReviewIndex({
    reviewStats,
    reviewEvents,
    filters,
    filterOptions,
    purgeUrl,
    resetUrl,
}) {
    const menuRef = useRef(null);
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const groupedEvents = useMemo(() => (reviewEvents.data || []).reduce((groups, event) => {
        (groups[event.date_group] ||= []).push(event);
        return groups;
    }, {}), [reviewEvents.data]);

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value };
        Object.keys(next).forEach((name) => {
            if (!next[name]) delete next[name];
        });

        router.get(route('user.review.index'), next, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const submitAction = (url) => {
        setConfirmProcessing(true);
        router.delete(url, {
            preserveScroll: true,
            onFinish: closeConfirm,
        });
    };

    const confirmPurge = () => {
        menuRef.current?.removeAttribute('open');
        openConfirm({
            variant: 'warning',
            title: 'Hapus riwayat Review?',
            message: 'Daftar aktivitas Review akan dikosongkan. Status belajar dan progres Anda tetap tersimpan.',
            confirmLabel: 'Hapus riwayat',
            onConfirm: () => submitAction(purgeUrl),
        });
    };

    const confirmReset = () => {
        menuRef.current?.removeAttribute('open');
        openConfirm({
            variant: 'danger',
            title: 'Reset status Review?',
            message: 'Riwayat akan dihapus dan semua status Review kembali menjadi Baru. Nilai, XP, akses kelas, dan progres roadmap tidak berubah.',
            confirmLabel: 'Reset Review',
            onConfirm: () => submitAction(resetUrl),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Review" />

            <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
                <header className="flex items-start justify-between gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
                    <div>
                        <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Riwayat belajar</p>
                        <h1 className="mt-2 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">Review</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Lihat kembali latihan yang sudah dikerjakan dan perkembangan status materimu.
                        </p>
                    </div>

                    <details ref={menuRef} className="relative">
                        <summary aria-label="Buka menu Review" title="Menu Review" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white">
                            <MoreVertIcon />
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                            <button type="button" onClick={confirmPurge} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                <DeleteSweepIcon sx={{ fontSize: 20 }} className="mt-0.5" />
                                <span><strong className="block text-sm">Hapus riwayat</strong><span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Mastery tetap tersimpan</span></span>
                            </button>
                            <button type="button" onClick={confirmReset} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
                                <RestartAltIcon sx={{ fontSize: 20 }} className="mt-0.5" />
                                <span><strong className="block text-sm">Reset Review</strong><span className="mt-0.5 block text-xs text-red-600/75 dark:text-red-300/75">Status kembali menjadi Baru</span></span>
                            </button>
                        </div>
                    </details>
                </header>

                <section aria-labelledby="review-stats" className="py-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="review-stats" className="text-base font-black text-gray-950 dark:text-white">Ringkasan {filters.range} hari</h2>
                        <select value={filters.range} onChange={(event) => updateFilter('range', event.target.value)} aria-label="Rentang statistik" className="rounded-lg border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-bold text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            <option value="7">7 hari</option>
                            <option value="30">30 hari</option>
                        </select>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {stateCards(reviewStats).map((card) => (
                            <article key={card.label} className={`rounded-xl border p-4 ${card.tone}`}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <h3 className="text-sm font-black">{card.label}</h3>
                                    <span className="text-2xl font-black">{card.percentage}%</span>
                                </div>
                                <p className="mt-2 text-xs font-bold opacity-75">{card.value} aktivitas</p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-gray-200 py-3 text-sm font-bold dark:border-gray-800">
                        <span className="text-emerald-700 dark:text-emerald-300">{reviewStats.correct_count} benar</span>
                        <span className="text-red-700 dark:text-red-300">{reviewStats.wrong_count} salah</span>
                        <span className="text-gray-600 dark:text-gray-300">{reviewStats.skipped_count} dilewati</span>
                        <span className="ml-auto text-gray-950 dark:text-white">Akurasi {reviewStats.accuracy}%</span>
                    </div>
                </section>

                <section aria-labelledby="review-history" className="border-t border-gray-200 pt-6 dark:border-gray-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 id="review-history" className="text-base font-black text-gray-950 dark:text-white">Aktivitas terbaru</h2>
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                            <select value={filters.program} onChange={(event) => updateFilter('program', event.target.value)} aria-label="Filter kelas" className="min-w-0 rounded-lg border-gray-300 bg-white py-2 pl-2 pr-7 text-xs font-bold text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                <option value="">Semua kelas</option>
                                {(filterOptions.programs || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={filters.activity} onChange={(event) => updateFilter('activity', event.target.value)} aria-label="Filter jenis latihan" className="min-w-0 rounded-lg border-gray-300 bg-white py-2 pl-2 pr-7 text-xs font-bold text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                <option value="">Semua latihan</option>
                                {filterOptions.activities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={filters.state} onChange={(event) => updateFilter('state', event.target.value)} aria-label="Filter status belajar" className="min-w-0 rounded-lg border-gray-300 bg-white py-2 pl-2 pr-7 text-xs font-bold text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                <option value="">Semua status</option>
                                {filterOptions.states.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <select value={filters.result} onChange={(event) => updateFilter('result', event.target.value)} aria-label="Filter hasil" className="min-w-0 rounded-lg border-gray-300 bg-white py-2 pl-2 pr-7 text-xs font-bold text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                <option value="">Semua hasil</option>
                                {filterOptions.results.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {Object.keys(groupedEvents).length > 0 ? (
                        <div className="mt-5 space-y-6">
                            {Object.entries(groupedEvents).map(([date, events]) => (
                                <div key={date}>
                                    <h3 className="mb-2 text-xs font-black uppercase text-gray-500 dark:text-gray-400">{date}</h3>
                                    <div className="space-y-2">
                                        {events.map((event) => {
                                            const config = resultConfig[event.result] || resultConfig.skipped;
                                            const Icon = config.Icon;
                                            return (
                                                <article key={event.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${config.className}`}><Icon sx={{ fontSize: 21 }} /></span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-black text-gray-950 dark:text-white">{event.label}</p>
                                                        {event.reading && <p className="truncate text-xs font-semibold text-gray-500 dark:text-gray-400">{event.reading}</p>}
                                                        <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                            {[event.program_title, event.activity_label, event.state_label].filter(Boolean).join(' · ')}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{event.occurred_at}</p>
                                                        <p className={`mt-1 text-xs font-black ${event.result === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : event.result === 'wrong' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{config.label}</p>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            Belum ada aktivitas yang sesuai filter ini.
                        </p>
                    )}

                    {reviewEvents.links?.length > 3 && (
                        <nav aria-label="Halaman riwayat Review" className="mt-5 flex flex-wrap gap-1.5">
                            {reviewEvents.links.map((link, index) => link.url ? (
                                <Link key={`${link.label}-${index}`} href={link.url} preserveScroll className={`rounded-lg border px-3 py-2 text-xs font-black ${link.active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{paginationLabel(link.label)}</Link>
                            ) : null)}
                        </nav>
                    )}
                </section>
            </main>

            <ConfirmActionDialog
                {...confirmState}
                onCancel={closeConfirm}
                onConfirm={confirmState.onConfirm}
            />
        </AuthenticatedLayout>
    );
}
