import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SchoolIcon from '@mui/icons-material/School';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';

const summaryCards = (summary) => [
    { label: 'Perlu diperbaiki', value: summary.wrong_count, helper: 'Terakhir dijawab salah', tone: 'red', icon: ErrorOutlineIcon },
    { label: 'Waktunya diulang', value: summary.due_count, helper: 'Sudah masuk jadwal hari ini', tone: 'amber', icon: ScheduleIcon },
    { label: 'Sedang dipelajari', value: summary.learning_count, helper: 'Belum stabil dikuasai', tone: 'sky', icon: ReplayIcon },
    { label: 'Materi baru', value: summary.new_count, helper: 'Maksimal 3 per sesi', tone: 'emerald', icon: SchoolIcon },
];

const tones = {
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200',
    sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200',
};

const eventTone = {
    correct: { label: 'Benar', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200', icon: CheckCircleIcon },
    wrong: { label: 'Salah', className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200', icon: ErrorOutlineIcon },
    skipped: { label: 'Dilewati', className: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200', icon: RemoveCircleOutlineIcon },
};

const paginationLabel = (label) => label
    .replace('&laquo; Previous', 'Sebelumnya')
    .replace('Next &raquo;', 'Berikutnya')
    .replace(/&laquo;|&raquo;/g, '');

export default function ReviewIndex({ reviewSummary, reviewHistory, recentEvents = [], activeSession, startUrl }) {
    const canStart = reviewSummary.session_count > 0;

    return (
        <AuthenticatedLayout>
            <Head title="Review" />

            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <header className="flex flex-col gap-5 border-b border-gray-200 pb-6 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Latihan terarah</p>
                        <h1 className="mt-2 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">Review hari ini</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Perkuat materi yang salah dan sudah jatuh tempo sebelum menambah materi baru.
                        </p>
                    </div>

                    {activeSession ? (
                        <Link href={activeSession.resume_url} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50">
                            Lanjutkan {activeSession.remaining_count} item <ArrowForwardIcon fontSize="small" />
                        </Link>
                    ) : (
                        <button type="button" disabled={!canStart} onClick={() => router.post(startUrl)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500">
                            <ReplayIcon fontSize="small" /> {canStart ? `Mulai ${reviewSummary.session_count} item` : 'Belum ada review'}
                        </button>
                    )}
                </header>

                <section aria-labelledby="review-composition" className="py-6">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="review-composition" className="text-base font-black text-gray-950 dark:text-white">Komposisi antrean</h2>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{reviewSummary.required_count} wajib hari ini</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {summaryCards(reviewSummary).map(({ label, value, helper, tone, icon: Icon }) => (
                            <article key={label} className={`rounded-xl border p-4 ${tones[tone]}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-2xl font-black">{value}</p>
                                        <h3 className="mt-1 text-sm font-black">{label}</h3>
                                    </div>
                                    <Icon sx={{ fontSize: 22 }} />
                                </div>
                                <p className="mt-3 text-xs font-semibold opacity-75">{helper}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <div className="grid gap-8 border-t border-gray-200 pt-6 dark:border-gray-800 lg:grid-cols-[1.25fr_0.75fr]">
                    <section aria-labelledby="recent-review-title">
                        <h2 id="recent-review-title" className="text-base font-black text-gray-950 dark:text-white">Jawaban terbaru</h2>
                        {recentEvents.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {recentEvents.map((event) => {
                                    const config = eventTone[event.result] || eventTone.skipped;
                                    const Icon = config.icon;
                                    return (
                                        <article key={event.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${config.className}`}>
                                            <Icon sx={{ fontSize: 21 }} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black">{event.label}</p>
                                                <p className="mt-0.5 text-xs font-semibold opacity-75">{event.skill_label} · {event.occurred_at}</p>
                                            </div>
                                            <span className="text-xs font-black">{config.label}</span>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">Jawaban Review akan muncul di sini.</p>
                        )}
                    </section>

                    <section aria-labelledby="review-history-title">
                        <h2 id="review-history-title" className="text-base font-black text-gray-950 dark:text-white">Sesi 30 hari terakhir</h2>
                        <div className="mt-4 space-y-2">
                            {reviewHistory.data.length > 0 ? reviewHistory.data.map((session) => (
                                <article key={session.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{session.started_at}</p>
                                        <span className={`text-[11px] font-black ${session.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>{session.completed ? 'Selesai' : 'Terhenti'}</span>
                                    </div>
                                    <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        <span className="text-emerald-600 dark:text-emerald-400">{session.correct_count} benar</span> · <span className="text-red-600 dark:text-red-400">{session.wrong_count} salah</span> · {session.skipped_count} dilewati
                                    </p>
                                </article>
                            )) : <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">Belum ada sesi Review.</p>}
                        </div>
                        {reviewHistory.links?.length > 3 && (
                            <nav aria-label="Halaman riwayat Review" className="mt-4 flex flex-wrap gap-1.5">
                                {reviewHistory.links.map((link, index) => link.url ? (
                                    <Link key={`${link.label}-${index}`} href={link.url} preserveScroll className={`rounded-lg border px-3 py-2 text-xs font-black ${link.active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{paginationLabel(link.label)}</Link>
                                ) : null)}
                            </nav>
                        )}
                    </section>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}
