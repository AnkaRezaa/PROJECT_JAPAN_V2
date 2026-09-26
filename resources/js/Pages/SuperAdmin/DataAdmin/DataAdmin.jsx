import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import AdminDialog from '@/Components/UI/AdminDialog';

const emptyAdmin = {
    username: '',
    email: '',
    password: '',
    role: 'admin',
    admin_scope: 'global',
};

const generateStrongPassword = (length = 12) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
};

export default function DataAdmin({
    stats = [],
    admins = { data: [], links: [] },
    activities = [],
    filters = {},
    kloterOptions = [],
}) {
    const { flash = {} } = usePage().props;
    const [showForm, setShowForm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [reason, setReason] = useState('');
    const [editTarget, setEditTarget] = useState(null);
    const [kloterSearch, setKloterSearch] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [showActivities, setShowActivities] = useState(false);
    const [resetModalData, setResetModalData] = useState(null);
    const [copied, setCopied] = useState(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const { data, setData, post, processing, errors, reset } = useForm({ ...emptyAdmin });
    const filterForm = useForm({
        search: filters.search || '',
        status: filters.status || 'all',
        role: filters.role || 'all',
        scope: filters.scope || 'all',
    });
    const editForm = useForm({ username: '', status: 'active', password: '', kloter_ids: [] });

    useEffect(() => {
        const unbindStart = router.on('start', () => setIsNavigating(true));
        const unbindFinish = router.on('finish', () => setIsNavigating(false));
        return () => {
            unbindStart();
            unbindFinish();
        };
    }, []);

    useEffect(() => {
        if (flash.password_reset_data) {
            setResetModalData(flash.password_reset_data);
        } else if (flash.admin_created_data && flash.admin_created_data.password) {
            setResetModalData(flash.admin_created_data);
        } else if (flash.generated_password) {
            setResetModalData({ password: flash.generated_password });
        }
    }, [flash.password_reset_data, flash.admin_created_data, flash.generated_password]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const items = admins?.data || [];

    const submitAdmin = (e) => {
        e.preventDefault();
        post(route('superadmin.admins.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowForm(false);
                reset();
            },
        });
    };

    const submitStatus = () => {
        const nextStatus = statusTarget.raw_status === 'suspended' ? 'active' : 'suspended';
        setIsSubmittingStatus(true);

        router.patch(route('superadmin.admins.status', statusTarget.id), {
            status: nextStatus,
            reason: reason?.trim() || undefined,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setStatusTarget(null);
                setReason('');
            },
            onFinish: () => setIsSubmittingStatus(false),
        });
    };

    const resetPassword = (admin) => {
        openConfirm({
            variant: 'warning',
            title: 'Reset Password Admin?',
            message: 'Sistem akan membuat password baru acak 12 karakter yang aman secara otomatis. Password baru akan langsung ditampilkan di layar agar dapat Anda salin dan serahkan kepada pengelola admin.',
            details: [
                { label: 'Admin', value: admin.name },
                { label: 'Email', value: admin.email },
            ],
            confirmLabel: 'Ya, Reset Password',
            cancelLabel: 'Batal',
            onConfirm: () => router.post(route('superadmin.admins.reset-password', admin.id), {}, {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const removeAdmin = (admin) => {
        const anonymize = !admin.can_permanently_delete && admin.can_anonymize;

        openConfirm({
            variant: 'danger',
            title: anonymize ? 'Anonimkan Akun Admin?' : 'Hapus Permanen Admin?',
            message: anonymize
                ? 'Identitas pribadi akan dihapus, tetapi catatan yang wajib dipertahankan tetap tersedia untuk audit.'
                : 'Akun admin yang tidak memiliki tanggung jawab aktif akan dihapus permanen.',
            details: [
                { label: 'Admin', value: admin.name },
                { label: 'Proses', value: anonymize ? 'Anonimisasi data' : 'Hapus permanen' },
            ],
            confirmLabel: anonymize ? 'Anonimkan Akun' : 'Hapus Permanen',
            onConfirm: () => {
                const options = { preserveScroll: true, onFinish: closeConfirm };

                if (anonymize) {
                    router.post(route('superadmin.admins.anonymize', admin.id), {}, options);
                    return;
                }

                router.delete(route('superadmin.admins.destroy', admin.id), options);
            },
        });
    };

    const updateScope = (admin, adminScope) => {
        const nextLabel = adminScope === 'kloter' ? 'Mentor Kelas' : 'Admin Global';
        openConfirm({
            variant: 'warning',
            title: 'Ubah Cakupan Admin?',
            message: 'Cakupan menentukan data siswa dan kelas yang dapat dikelola akun ini.',
            details: [
                { label: 'Admin', value: admin.name },
                { label: 'Cakupan saat ini', value: admin.scope },
                { label: 'Cakupan baru', value: nextLabel },
            ],
            confirmLabel: 'Ubah Cakupan',
            onConfirm: () => router.patch(route('superadmin.admins.scope', admin.id), {
                admin_scope: adminScope,
            }, {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('superadmin.admins'), filterForm.data, { preserveState: true, preserveScroll: true });
    };

    const openEdit = (admin) => {
        setEditTarget(admin);
        setKloterSearch('');
        editForm.setData({
            username: admin.name,
            status: admin.raw_status,
            password: '',
            kloter_ids: admin.kloter_ids || [],
        });
    };

    const submitEdit = (event) => {
        event.preventDefault();
        editForm.patch(route('superadmin.admins.update', editTarget.id), {
            preserveScroll: true,
            onSuccess: () => setEditTarget(null),
        });
    };

    const toggleKloter = (kloterId) => {
        editForm.setData('kloter_ids', editForm.data.kloter_ids.includes(kloterId)
            ? editForm.data.kloter_ids.filter((id) => id !== kloterId)
            : [...editForm.data.kloter_ids, kloterId]);
    };

    const filteredKloterOptions = kloterOptions.filter((kloter) => (
        `${kloter.name} ${kloter.program || ''}`.toLowerCase().includes(kloterSearch.toLowerCase())
    ));

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Data Admin" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Data Admin</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Pengawasan dan kontrol akses admin dengan search, filter, dan pembuatan akun baru.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowActivities((prev) => !prev)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                showActivities
                                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-300'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span className="h-2 w-2 rounded-full bg-brand-500" />
                            {showActivities ? 'Sembunyikan Log' : `Log Aktivitas (${activities.length})`}
                        </button>
                        <button onClick={() => setShowForm(true)} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700">
                            Tambah Admin
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => <StatCard key={item.title} {...item} />)}
                </div>

                <Card>
                    <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_160px_160px_160px_110px]">
                        <input
                            value={filterForm.data.search}
                            onChange={(e) => filterForm.setData('search', e.target.value)}
                            placeholder="Cari username atau email..."
                            className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white"
                        />
                        <select value={filterForm.data.status} onChange={(e) => filterForm.setData('status', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                            <option value="all">Semua status</option>
                            <option value="active">Aktif</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <select value={filterForm.data.role} onChange={(e) => filterForm.setData('role', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                            <option value="all">Semua role</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                        </select>
                        <select value={filterForm.data.scope} onChange={(e) => filterForm.setData('scope', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                            <option value="all">Semua cakupan</option>
                            <option value="global">Admin Global</option>
                            <option value="kloter">Mentor Kelas</option>
                        </select>
                        <button className="rounded-xl bg-gray-900 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                    </form>
                </Card>

                <div className="space-y-6">
                    {showActivities && (
                        <Card>
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">Aktivitas Terkini Admin</h2>
                                </div>
                                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-bold text-gray-500">
                                    {activities.length} aktivitas tercatat
                                </span>
                            </div>
                            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                                {activities.length === 0 && (
                                    <p className="py-6 text-center text-sm font-medium text-gray-400">Belum ada aktivitas admin baru-baru ini.</p>
                                )}
                                {activities.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30 px-3.5 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                                        <span className="min-w-0 flex-1 truncate">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Roster Admin</h2>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Daftar akun pengelola operasional dan hak akses sistem.</p>
                            </div>
                            {isNavigating && (
                                <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                    <span>Memuat...</span>
                                </div>
                            )}
                        </div>
                        <div className="relative mt-5">
                            {isNavigating && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-900/60">
                                    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Memperbarui data admin...</span>
                                    </div>
                                </div>
                            )}
                            <div className={`space-y-4 transition-opacity duration-200 ${isNavigating ? 'pointer-events-none opacity-30' : 'opacity-100'}`}>
                                {items.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-10 text-center text-sm font-bold text-gray-400">Belum ada admin.</p>
                                )}
                                {items.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 transition hover:border-gray-200 dark:hover:border-gray-700">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-gray-900 dark:text-white">{item.name}</h3>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.email}</p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-black ${item.raw_status === 'suspended' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-brand-50 dark:bg-brand-900/20 px-3 py-1 text-xs font-black text-brand-600 dark:text-brand-400">{item.role}</span>
                                                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">{item.scope}</span>
                                                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400">Update terakhir {item.updated}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => openEdit(item)} className="rounded-lg border border-sky-100 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-50 dark:border-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-950/30">
                                                    Edit
                                                </button>
                                                {item.raw_role === 'admin' && (
                                                    <select
                                                        value={item.raw_scope || 'global'}
                                                        onChange={(event) => updateScope(item, event.target.value)}
                                                        className="h-9 rounded-lg border border-sky-200 bg-white px-2 text-xs font-black text-sky-700 dark:border-sky-900/40 dark:bg-gray-900 dark:text-sky-300"
                                                        aria-label={`Cakupan ${item.name}`}
                                                    >
                                                        <option value="global">Global</option>
                                                        <option value="kloter">Mentor Kelas</option>
                                                    </select>
                                                )}
                                                {!item.is_self && (
                                                    <>
                                                        <button onClick={() => setStatusTarget(item)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            {item.raw_status === 'suspended' ? 'Aktifkan' : 'Tangguhkan'}
                                                        </button>
                                                        <button onClick={() => resetPassword(item)} className="rounded-lg border border-brand-100 dark:border-brand-900/30 px-3 py-2 text-xs font-black text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                                                            Reset Password
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAdmin(item)}
                                                            disabled={!item.can_permanently_delete && !item.can_anonymize}
                                                            title={(item.deletion_blockers || []).join(' ') || 'Hapus atau anonimkan akun'}
                                                            className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {admins?.links && admins.links.length > 3 && (
                            <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-row dark:border-gray-800">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    Menampilkan {admins.from || 1} - {admins.to || items.length} dari {admins.total || items.length} admin
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {admins.links.map((link, index) => (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${link.active ? 'bg-brand-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {showForm && (
                <AdminDialog open onClose={() => setShowForm(false)} eyebrow="Akun dan role" title="Tambah Admin" description="Buat akun admin lalu tentukan cakupan operasionalnya." maxWidth="max-w-lg">
                        <form onSubmit={submitAdmin} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Username</label>
                                <input value={data.username} onChange={(e) => setData('username', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white" />
                                {errors.username && <p className="mt-1 text-xs font-bold text-red-500">{errors.username}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Email</label>
                                <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white" />
                                {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email}</p>}
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Role</label>
                                    <select value={data.role} onChange={(e) => setData('role', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Superadmin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Password Opsional</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="Otomatis jika kosong" className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white" />
                                        <button type="button" onClick={() => setData('password', generateStrongPassword())} className="rounded-xl border border-gray-200 px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Buat</button>
                                    </div>
                                    {errors.password && <p className="mt-1 text-xs font-bold text-red-500">{errors.password}</p>}
                                </div>
                            </div>
                            {data.role === 'admin' && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Cakupan Admin</label>
                                    <select value={data.admin_scope} onChange={(e) => setData('admin_scope', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                                        <option value="global">Admin Global</option>
                                        <option value="kloter">Mentor Kelas</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mentor Kelas hanya mengelola siswa dan materi dari kloter yang ditugaskan. Kelas mandiri tidak termasuk.</p>
                                    {errors.admin_scope && <p className="mt-1 text-xs font-bold text-red-500">{errors.admin_scope}</p>}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
                                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300">Batal</button>
                                <button disabled={processing} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">{processing ? 'Menyimpan...' : 'Buat Admin'}</button>
                            </div>
                        </form>
                </AdminDialog>
            )}

            {editTarget && (
                <AdminDialog open onClose={() => setEditTarget(null)} eyebrow="Akses pengelola" title={`Edit ${editTarget.scope}`} description="Ubah identitas tampilan, status, password, dan kloter yang diampu." maxWidth="max-w-2xl">
                    <form onSubmit={submitEdit} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Nama</span>
                                <input value={editForm.data.username} onChange={(event) => editForm.setData('username', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                                {editForm.errors.username && <span className="text-xs font-bold text-red-500">{editForm.errors.username}</span>}
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Email identitas</span>
                                <input value={editTarget.email} disabled className="h-11 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800" />
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</span>
                                <select value={editForm.data.status} onChange={(event) => editForm.setData('status', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                                    <option value="active">Aktif</option>
                                    <option value="suspended">Ditangguhkan</option>
                                </select>
                                {editForm.errors.status && <span className="text-xs font-bold text-red-500">{editForm.errors.status}</span>}
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Password baru (opsional)</span>
                                <div className="flex gap-2">
                                    <input value={editForm.data.password} onChange={(event) => editForm.setData('password', event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                                    <button type="button" onClick={() => editForm.setData('password', generateStrongPassword())} className="rounded-xl border border-gray-200 px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Buat</button>
                                </div>
                                {editForm.errors.password && <span className="text-xs font-bold text-red-500">{editForm.errors.password}</span>}
                            </label>
                        </div>

                        {editTarget.raw_role === 'admin' && editTarget.raw_scope === 'kloter' && (
                            <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">Kloter yang Diampu</h3>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Memilih kloter yang sedang diampu mentor lain akan memindahkan penugasannya.</p>
                                <input value={kloterSearch} onChange={(event) => setKloterSearch(event.target.value)} placeholder="Cari nama kloter atau kelas..." className="mt-3 h-10 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm dark:border-sky-900/40 dark:bg-gray-900 dark:text-white" />
                                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                                    {filteredKloterOptions.map((kloter) => (
                                        <label key={kloter.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent bg-white p-3 hover:border-sky-200 dark:bg-gray-900 dark:hover:border-sky-800">
                                            <input type="checkbox" checked={editForm.data.kloter_ids.includes(kloter.id)} onChange={() => toggleKloter(kloter.id)} className="mt-0.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{kloter.name}</span>
                                                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{kloter.program || 'Kelas belum ditentukan'}{kloter.mentor && kloter.mentor !== editTarget.name ? ` - Mentor: ${kloter.mentor}` : ''}</span>
                                            </span>
                                        </label>
                                    ))}
                                    {filteredKloterOptions.length === 0 && <p className="py-6 text-center text-xs font-bold text-gray-400">Kloter tidak ditemukan.</p>}
                                </div>
                            </section>
                        )}

                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <button type="button" onClick={() => setEditTarget(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                            <button disabled={editForm.processing} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">{editForm.processing ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                    </form>
                </AdminDialog>
            )}

            <ConfirmActionDialog
                show={Boolean(statusTarget)}
                variant={statusTarget?.raw_status === 'suspended' ? 'success' : 'danger'}
                title={statusTarget?.raw_status === 'suspended' ? 'Aktifkan Admin?' : 'Suspend Admin?'}
                message="Perubahan status akan langsung memengaruhi akses admin ke dashboard."
                details={[
                    { label: 'Admin', value: statusTarget?.name },
                    { label: 'Status baru', value: statusTarget?.raw_status === 'suspended' ? 'Aktif' : 'Suspended' },
                ]}
                confirmLabel="Konfirmasi"
                onConfirm={submitStatus}
                onCancel={() => {
                    setStatusTarget(null);
                    setReason('');
                }}
            >
                {statusTarget?.raw_status !== 'suspended' && (
                    <div className="mt-3 space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                            Alasan Penangguhan Akun <span className="font-normal text-gray-400">(opsional namun disarankan)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Mutasi staf, pelanggaran wewenang, dll."
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                )}
            </ConfirmActionDialog>

            {resetModalData && (
                <AdminDialog
                    open={Boolean(resetModalData)}
                    onClose={() => setResetModalData(null)}
                    eyebrow="Kredensial Baru"
                    title="Password Berhasil Diperbarui"
                    description="Password baru telah tersimpan di sistem. Salin password di bawah ini dan berikan kepada admin terkait."
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs dark:border-gray-800 dark:bg-gray-800/50">
                            {resetModalData.username && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-500 dark:text-gray-400">Username:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{resetModalData.username}</span>
                                </div>
                            )}
                            {resetModalData.email && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{resetModalData.email}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Password Sementara
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={resetModalData.password || ''}
                                    className="h-11 flex-1 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 font-mono text-sm font-black text-emerald-800 select-all dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(resetModalData.password || '')}
                                    className="h-11 rounded-xl border border-emerald-300 bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700"
                                >
                                    {copied ? 'Tersalin!' : 'Salin'}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3">
                            <button
                                type="button"
                                onClick={() => setResetModalData(null)}
                                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </AdminDialog>
            )}

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
