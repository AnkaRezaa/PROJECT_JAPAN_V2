import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';

function toneClasses(tone) {
    const styles = {
        red: 'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-900/30',
        amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
        blue: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-900/30',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30',
    };

    return styles[tone] || styles.blue;
}

function Pagination({ links = [] }) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="flex flex-wrap justify-center gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            {links.map((link, index) => (
                <Link
                    key={`${link.label}-${index}`}
                    href={link.url || '#'}
                    preserveScroll
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${link.active ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                />
            ))}
        </div>
    );
}

function FeedbackWorkspace({ feedback = { data: [], links: [] }, stats = {}, filters = {} }) {
    const [editing, setEditing] = React.useState(null);
    const editForm = useForm({ status: 'reviewing', resolution_note: '' });
    const feedbackFilter = useForm({
        view: 'feedback',
        feedback_search: filters.feedback_search || '',
        feedback_category: filters.feedback_category || 'all',
        feedback_status: filters.feedback_status || 'all',
        feedback_role: filters.feedback_role || 'all',
    });

    const openEditor = (item) => {
        setEditing(item);
        editForm.setData({
            status: item.status === 'new' ? 'reviewing' : item.status,
            resolution_note: item.resolution_note || '',
        });
    };

    const saveStatus = (event) => {
        event.preventDefault();
        editForm.patch(route('superadmin.activity.feedback.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const submitFilters = (event) => {
        event.preventDefault();
        router.get(route('superadmin.activity'), feedbackFilter.data, { preserveState: true, preserveScroll: true });
    };

    const exportHref = route('superadmin.activity.feedback.export', feedbackFilter.data);
    const categoryLabels = { bug: 'Kendala', suggestion: 'Saran', content: 'Materi', payment: 'Pembayaran', other: 'Lainnya' };
    const statusLabels = { new: 'Baru', reviewing: 'Ditinjau', resolved: 'Selesai' };

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    ['Baru', stats.new || 0, 'text-rose-600'],
                    ['Ditinjau', stats.reviewing || 0, 'text-amber-600'],
                    ['Selesai', stats.resolved || 0, 'text-emerald-600'],
                ].map(([label, value, tone]) => (
                    <Card key={label}><p className="text-xs font-black uppercase text-gray-400">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p></Card>
                ))}
            </div>

            <Card>
                <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">
                    <input value={feedbackFilter.data.feedback_search} onChange={(event) => feedbackFilter.setData('feedback_search', event.target.value)} placeholder="Cari pesan, pelapor, atau halaman" className="h-11 rounded-xl border border-gray-200 px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                    <select value={feedbackFilter.data.feedback_category} onChange={(event) => feedbackFilter.setData('feedback_category', event.target.value)} className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                        <option value="all">Semua kategori</option><option value="bug">Kendala</option><option value="suggestion">Saran</option><option value="content">Materi</option><option value="payment">Pembayaran</option><option value="other">Lainnya</option>
                    </select>
                    <select value={feedbackFilter.data.feedback_status} onChange={(event) => feedbackFilter.setData('feedback_status', event.target.value)} className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                        <option value="all">Semua status</option><option value="new">Baru</option><option value="reviewing">Ditinjau</option><option value="resolved">Selesai</option>
                    </select>
                    <select value={feedbackFilter.data.feedback_role} onChange={(event) => feedbackFilter.setData('feedback_role', event.target.value)} className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                        <option value="all">Semua role</option><option value="user">User</option><option value="admin">Admin/Mentor</option><option value="superadmin">Superadmin</option>
                    </select>
                    <button className="h-11 rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                    <a href={exportHref} className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300">Ekspor CSV</a>
                </form>
            </Card>

            <div className="space-y-3">
                {(feedback.data || []).map((item) => (
                    <Card key={item.id}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">{categoryLabels[item.category] || item.category}</span>
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{statusLabels[item.status] || item.status}</span>
                                    <span className="text-xs font-bold text-gray-400">#{item.id} · {item.created_at}</span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-gray-800 dark:text-gray-200">{item.message}</p>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{item.reporter} · {item.role}</span>
                                    {item.page_url && <span className="break-all">Halaman: {item.page_url}</span>}
                                </div>
                                {item.resolution_note && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{item.resolution_note}</p>}
                            </div>
                            <button type="button" onClick={() => openEditor(item)} className="min-h-10 shrink-0 rounded-xl border border-gray-200 px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Kelola</button>
                        </div>

                        {editing?.id === item.id && (
                            <form onSubmit={saveStatus} className="mt-4 grid gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-[160px_1fr_auto]">
                                <select value={editForm.data.status} onChange={(event) => editForm.setData('status', event.target.value)} className="h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white"><option value="new">Baru</option><option value="reviewing">Ditinjau</option><option value="resolved">Selesai</option></select>
                                <input value={editForm.data.resolution_note} onChange={(event) => editForm.setData('resolution_note', event.target.value)} placeholder="Catatan penyelesaian (opsional)" className="h-11 rounded-xl border border-gray-200 px-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                <button disabled={editForm.processing} className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50">Simpan</button>
                            </form>
                        )}
                    </Card>
                ))}
                {(feedback.data || []).length === 0 && <Card><p className="py-8 text-center text-sm font-bold text-gray-400">Belum ada feedback yang sesuai filter.</p></Card>}
            </div>
            <Pagination links={feedback.links} />
        </div>
    );
}

export default function Activity({
    activityStats = [],
    timeline = { data: [], links: [] },
    logins = { data: [], links: [] },
    riskyEvents = [],
    filters = {},
    filterOptions = { actors: [], actions: [] },
    productFeedback = { data: [], links: [] },
    feedbackStats = {},
}) {
    const filterForm = useForm({
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        actor_id: filters.actor_id || '',
        action: filters.action || 'all',
        login_status: filters.login_status || 'all',
    });

    const timelineItems = timeline?.data || [];
    const loginItems = logins?.data || [];
    const showFeedback = filters.view === 'feedback';

    const submitFilters = (event) => {
        event.preventDefault();
        router.get(route('superadmin.activity'), filterForm.data, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const resetFilters = () => {
        router.get(route('superadmin.activity'), {}, {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Aktivitas" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Aktivitas Platform</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Audit trail, login history, dan aktivitas sensitif admin maupun superadmin.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                        Data dipaginasi agar query tetap ringan
                    </div>
                </div>

                <div className="inline-flex w-full gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900 sm:w-auto">
                    <Link href={route('superadmin.activity')} preserveScroll className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-black sm:flex-none ${!showFeedback ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>Audit & Login</Link>
                    <Link href={route('superadmin.activity', { view: 'feedback' })} preserveScroll className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-black sm:flex-none ${showFeedback ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>Feedback & Bug</Link>
                </div>

                {showFeedback && <FeedbackWorkspace feedback={productFeedback} stats={feedbackStats} filters={filters} />}

                {!showFeedback && <>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {activityStats.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                    {activityStats.length === 0 && (
                        <Card className="sm:col-span-2 xl:col-span-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Belum ada statistik aktivitas.</p>
                        </Card>
                    )}
                </div>

                <Card>
                    <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.2fr_1fr_auto_auto]">
                        <input
                            type="date"
                            value={filterForm.data.date_from}
                            onChange={(event) => filterForm.setData('date_from', event.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        />
                        <input
                            type="date"
                            value={filterForm.data.date_to}
                            onChange={(event) => filterForm.setData('date_to', event.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        />
                        <select
                            value={filterForm.data.actor_id}
                            onChange={(event) => filterForm.setData('actor_id', event.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        >
                            <option value="">Semua actor</option>
                            {(filterOptions.actors || []).map((actor) => (
                                <option key={actor.id} value={actor.id}>{actor.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterForm.data.action}
                            onChange={(event) => filterForm.setData('action', event.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        >
                            <option value="all">Semua action</option>
                            {(filterOptions.actions || []).map((action) => (
                                <option key={action.value} value={action.value}>{action.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterForm.data.login_status}
                            onChange={(event) => filterForm.setData('login_status', event.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        >
                            <option value="all">Semua login</option>
                            <option value="success">Berhasil</option>
                            <option value="failed">Ditolak</option>
                        </select>
                        <button className="h-11 rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">
                            Filter
                        </button>
                        <button type="button" onClick={resetFilters} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-black text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                            Reset
                        </button>
                    </form>
                </Card>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card padding={false}>
                        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Timeline Aktivitas</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">15 item per halaman dari activity_logs.</p>
                        </div>
                        <div className="space-y-4 p-6">
                            {timelineItems.map((item) => (
                                <div key={`${item.time}-${item.actor}-${item.target}`} className="flex gap-4 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border font-black ${toneClasses(item.tone)}`}>
                                        {(item.actor || 'S').charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{item.action}</p>
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{item.time}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{item.actor}</span> terhadap{' '}
                                            <span className="font-bold text-brand-600 dark:text-brand-400">{item.target}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {timelineItems.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm font-bold text-gray-400 dark:border-gray-800">
                                    Belum ada timeline aktivitas.
                                </div>
                            )}
                        </div>
                        <Pagination links={timeline?.links} />
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Status Risiko</h2>
                            <div className="mt-4 space-y-3">
                                {riskyEvents.map((item) => (
                                    <div key={item} className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                <Card padding={false}>
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Login History</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">10 item per halaman dari login_histories.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-sm">
                            <thead className="bg-gray-50 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:bg-gray-800/50 dark:text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">IP</th>
                                    <th className="px-6 py-3">Perangkat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loginItems.map((item) => (
                                    <tr key={`${item.user}-${item.device}-${item.location}`} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.user}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.role}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === 'Berhasil' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.location}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.device}</td>
                                    </tr>
                                ))}
                                {loginItems.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-sm font-bold text-gray-400">Belum ada riwayat login.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={logins?.links} />
                </Card>
                </>}
            </div>
        </AuthenticatedLayout>
    );
}
