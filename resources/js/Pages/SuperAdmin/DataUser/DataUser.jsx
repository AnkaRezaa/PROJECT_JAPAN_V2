import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

export default function DataUser({
    stats = [],
    users = { data: [], links: [] },
    filters = {},
}) {
    const { flash = {} } = usePage().props;
    const [statusTarget, setStatusTarget] = useState(null);
    const [reason, setReason] = useState('');
    const [isNavigating, setIsNavigating] = useState(false);
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [resetModalData, setResetModalData] = useState(null);
    const [copied, setCopied] = useState(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const filterForm = useForm({
        search: filters.search || '',
        status: filters.status || 'all',
    });

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
        } else if (flash.generated_password) {
            setResetModalData({ password: flash.generated_password });
        }
    }, [flash.password_reset_data, flash.generated_password]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const items = users?.data || [];

    const submitStatus = () => {
        const nextStatus = statusTarget.raw_status === 'suspended' ? 'active' : 'suspended';
        setIsSubmittingStatus(true);

        router.patch(route('superadmin.users.status', statusTarget.id), {
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

    const resetPassword = (user) => {
        openConfirm({
            variant: 'warning',
            title: 'Reset Password Student?',
            message: 'Sistem akan membuat password baru secara otomatis. Password baru akan langsung ditampilkan di layar agar dapat Anda salin dan sampaikan kepada student.',
            details: [
                { label: 'Student', value: user.name },
                { label: 'Email', value: user.email },
            ],
            confirmLabel: 'Ya, Reset Password',
            cancelLabel: 'Batal',
            onConfirm: () => router.post(route('superadmin.users.reset-password', user.id), {}, {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const removeUser = (user) => {
        const anonymize = !user.can_permanently_delete && user.can_anonymize;

        openConfirm({
            variant: 'danger',
            title: anonymize ? 'Anonimkan Akun Student?' : 'Hapus Permanen Student?',
            message: anonymize
                ? 'Identitas pribadi akan dihapus, sedangkan riwayat transaksi dan belajar tetap disimpan untuk kebutuhan audit.'
                : 'Akun dan data yang tidak memiliki kewajiban retensi akan dihapus permanen dan tidak dapat dipulihkan.',
            details: [
                { label: 'Student', value: user.name },
                { label: 'Proses', value: anonymize ? 'Anonimisasi data' : 'Hapus permanen' },
            ],
            confirmLabel: anonymize ? 'Anonimkan Akun' : 'Hapus Permanen',
            onConfirm: () => {
                const options = { preserveScroll: true, onFinish: closeConfirm };

                if (anonymize) {
                    router.post(route('superadmin.users.anonymize', user.id), {}, options);
                    return;
                }

                router.delete(route('superadmin.users.destroy', user.id), options);
            },
        });
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('superadmin.users'), { ...filterForm.data, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Data User" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Data User</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Monitoring student, status akun, dan progres belajar dengan filter dan pagination.
                        </p>
                    </div>
                </div>

                {flash.generated_password && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                        Password baru: <span className="font-black">{flash.generated_password}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => <StatCard key={item.title} {...item} />)}
                </div>

                <Card>
                    <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px_120px]">
                        <input
                            value={filterForm.data.search}
                            onChange={(e) => filterForm.setData('search', e.target.value)}
                            placeholder="Cari username atau email..."
                            className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white"
                        />
                        <select value={filterForm.data.status} onChange={(e) => filterForm.setData('status', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                            <option value="all">Semua status (Aktif & Suspended)</option>
                            <option value="active">Aktif</option>
                            <option value="suspended">Suspended</option>
                            <option value="anonymized">Dihapus / Anonim</option>
                        </select>
                        <button className="rounded-xl bg-gray-900 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                    </form>
                </Card>

                <div>
                    <Card padding={false}>
                        <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Daftar Student</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelola status akun, reset kredensial, dan pantau progres belajar student.</p>
                        </div>
                        <div className="relative overflow-x-auto">
                            {isNavigating && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 transition-all duration-200">
                                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Memuat data student...</span>
                                    </div>
                                </div>
                            )}
                            <table className={`min-w-[920px] w-full text-sm transition-opacity duration-200 ${isNavigating ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">XP</th>
                                        <th className="px-6 py-3">Level</th>
                                        <th className="px-6 py-3">Streak</th>
                                        <th className="px-6 py-3">Progress</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-sm font-bold text-gray-400">Belum ada student.</td>
                                        </tr>
                                    )}
                                    {items.map((item) => {
                                        const isAnonymized = item.raw_status === 'anonymized';
                                        return (
                                            <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                                            item.raw_status === 'suspended'
                                                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                                : isAnonymized
                                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                        {item.raw_status === 'suspended' && item.suspended_reason && (
                                                            <p className="mt-1 max-w-[200px] truncate text-[11px] italic text-red-600 dark:text-red-400" title={item.suspended_reason}>
                                                                {item.suspended_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.xp}</td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.level}</td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.streak}</td>
                                                <td className="px-6 py-4">
                                                    <div className="w-28 rounded-full bg-gray-100 dark:bg-gray-800">
                                                        <div className="rounded-full bg-brand-600 px-2 py-1 text-[10px] font-black text-white" style={{ width: item.progress }}>{item.progress}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <Link href={route('superadmin.users.show', item.id)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Detail</Link>
                                                        {!isAnonymized ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatusTarget(item)}
                                                                    className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                                >
                                                                    {item.raw_status === 'suspended' ? 'Activate' : 'Suspend'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => resetPassword(item)}
                                                                    className="rounded-lg border border-brand-100 dark:border-brand-900/30 px-3 py-2 text-xs font-black text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                                                >
                                                                    Reset Password
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeUser(item)}
                                                                    disabled={!item.can_permanently_delete && !item.can_anonymize}
                                                                    title={(item.deletion_blockers || []).join(' ') || 'Hapus atau anonimkan akun'}
                                                                    className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800"
                                                                >
                                                                    Hapus
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                                                Akun Dinonaktifkan
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                Menampilkan <span className="font-black text-gray-800 dark:text-gray-200">{users.from || 0}</span> - <span className="font-black text-gray-800 dark:text-gray-200">{users.to || 0}</span> dari <span className="font-black text-gray-800 dark:text-gray-200">{users.total || 0}</span> student
                            </p>
                            {users?.links && users.links.length > 3 && (
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {users.links.map((link, index) => (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold ${link.active ? 'bg-brand-600 text-white shadow-sm' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmActionDialog
                show={Boolean(statusTarget)}
                variant={statusTarget?.raw_status === 'suspended' ? 'success' : 'danger'}
                title={statusTarget?.raw_status === 'suspended' ? 'Aktifkan Student?' : 'Suspend Student?'}
                message="Perubahan status akan langsung memengaruhi akses student ke kelas dan fitur belajar."
                details={[
                    { label: 'Student', value: statusTarget?.name },
                    { label: 'Status baru', value: statusTarget?.raw_status === 'suspended' ? 'Aktif' : 'Suspended' },
                ]}
                confirmLabel={isSubmittingStatus ? 'Memproses...' : 'Konfirmasi'}
                processing={isSubmittingStatus}
                onConfirm={submitStatus}
                onCancel={() => {
                    if (isSubmittingStatus) return;
                    setStatusTarget(null);
                    setReason('');
                }}
            >
                {statusTarget?.raw_status !== 'suspended' && (
                    <div className="mt-3 space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                            Alasan Penangguhan Akun <span className="font-normal text-gray-400">(opsional)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Permintaan pengguna, investigasi pelanggaran, dll. (Boleh dikosongkan)"
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                )}
            </ConfirmActionDialog>

            {resetModalData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Password Baru Berhasil Dibuat</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Kredensial akun telah diperbarui.</p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {resetModalData.username && (
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-gray-500">Student:</span>
                                    <span className="font-black text-gray-800 dark:text-gray-200">{resetModalData.username}</span>
                                </div>
                            )}
                            {resetModalData.email && (
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-gray-500">Email:</span>
                                    <span className="font-black text-gray-800 dark:text-gray-200">{resetModalData.email}</span>
                                </div>
                            )}

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Password Sementara:</p>
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 font-mono text-base font-black text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white">
                                    <span className="select-all tracking-wider">{resetModalData.password}</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(resetModalData.password)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                            copied
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300'
                                        }`}
                                    >
                                        {copied ? 'Tersalin!' : 'Salin'}
                                    </button>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                                    Salin dan berikan kredensial ini kepada student. Pengguna dapat mengubahnya kapan saja melalui menu profil setelah login.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setResetModalData(null);
                                    setCopied(false);
                                }}
                                className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
