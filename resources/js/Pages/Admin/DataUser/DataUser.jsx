import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import Badge from '@/Components/UI/Badge';
import Avatar from '@/Components/UI/Avatar';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import AdminDialog from '@/Components/UI/AdminDialog';

export default function Users({
    adminScope = 'global',
    students = { data: [], links: [] },
    kloters = [],
    selectedKloter = null,
    candidateStudents = [],
    pendingEnrollments = [],
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [activeTab, setActiveTab] = useState(filters.tab || 'students');
    const [rejectTarget, setRejectTarget] = useState(null);
    const items = students?.data || [];
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const scheduleForm = useForm({
        tanggal_mulai: selectedKloter?.tanggal_mulai || '',
        tanggal_selesai: selectedKloter?.tanggal_selesai || '',
    });
    const assignForm = useForm({ user_id: '', catatan: '' });
    const rejectForm = useForm({ reason: '' });

    useEffect(() => {
        scheduleForm.setData({
            tanggal_mulai: selectedKloter?.tanggal_mulai || '',
            tanggal_selesai: selectedKloter?.tanggal_selesai || '',
        });
        scheduleForm.clearErrors();
        assignForm.reset();
    }, [selectedKloter?.id]);

    const visitFilters = (overrides = {}) => {
        router.get(route('admin.users'), {
            search,
            kloter: filters.kloter || '',
            tab: activeTab === 'students' ? undefined : activeTab,
            ...overrides,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const submitSearch = (event) => {
        event.preventDefault();
        visitFilters();
    };

    const submitSchedule = (event) => {
        event.preventDefault();
        scheduleForm.patch(route('admin.kloters.schedule.update', selectedKloter.id), {
            preserveScroll: true,
        });
    };

    const submitAssignment = (event) => {
        event.preventDefault();
        const selectedStudent = candidateStudents.find((student) => String(student.id) === String(assignForm.data.user_id));

        openConfirm({
            variant: 'warning',
            title: 'Tambahkan Siswa Secara Manual?',
            message: 'Jalur administratif ini langsung mengaktifkan keanggotaan kloter dan tidak masuk antrean persetujuan pembayaran.',
            details: [
                { label: 'Siswa', value: selectedStudent?.label || 'Siswa terpilih' },
                { label: 'Kloter', value: selectedKloter?.name },
                { label: 'Penggunaan', value: 'Access key, pembayaran manual, migrasi, atau koreksi data' },
            ],
            confirmLabel: 'Tambahkan Manual',
            onConfirm: () => assignForm.post(route('admin.kloters.users.store', selectedKloter.id), {
                preserveScroll: true,
                onSuccess: () => assignForm.reset(),
                onFinish: closeConfirm,
            }),
        });
    };

    const detailUrl = (userId) => route('admin.users.show', {
        user: userId,
        ...(filters.kloter ? { kloter: filters.kloter } : {}),
    });

    const confirmRemoval = (user) => {
        openConfirm({
            variant: 'danger',
            title: 'Keluarkan Siswa dari Kloter?',
            message: 'Siswa tidak lagi mengikuti jadwal kloter ini. Subscription, transaksi, progress, dan histori belajar tetap tersimpan.',
            details: [
                { label: 'Siswa', value: user.username },
                { label: 'Kloter', value: selectedKloter?.name },
            ],
            confirmLabel: 'Keluarkan Siswa',
            onConfirm: () => router.delete(route('admin.kloters.users.destroy', [selectedKloter.id, user.id]), {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const confirmApproval = (enrollment) => {
        openConfirm({
            variant: 'success',
            title: 'Setujui Peserta?',
            message: 'Subscription kelas akan aktif dan masa akses mulai dihitung hari ini.',
            details: [
                { label: 'Siswa', value: enrollment.user.username },
                { label: 'Transaksi', value: enrollment.transaction_code },
                { label: 'Nominal', value: enrollment.amount_formatted },
            ],
            confirmLabel: 'Setujui Peserta',
            onConfirm: () => router.patch(
                route('admin.kloters.enrollments.approve', [enrollment.kloter.id, enrollment.id]),
                {},
                { preserveScroll: true, onFinish: closeConfirm },
            ),
        });
    };

    const submitRejection = (event) => {
        event.preventDefault();
        rejectForm.patch(
            route('admin.kloters.enrollments.reject', [rejectTarget.kloter.id, rejectTarget.id]),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectTarget(null);
                    rejectForm.reset();
                },
            },
        );
    };

    const emptyMessage = adminScope === 'kloter' && kloters.length === 0
        ? 'Akun ini belum ditugaskan ke kloter. Hubungi superadmin untuk menentukan kloter pengampu.'
        : 'Belum ada siswa yang cocok dengan filter.';

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Kloter dan Siswa" />

            <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                            {adminScope === 'kloter' ? 'Admin Kloter' : 'Admin Global'}
                        </p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Kloter & Siswa</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pantau progress, nilai, aktivitas, jadwal, dan roster belajar.</p>
                    </div>
                    <span className="w-fit rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {students?.total || 0} siswa tampil
                    </span>
                </div>

                <div className="flex w-full gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                    <button type="button" onClick={() => setActiveTab('students')} className={`border-b-2 px-3 py-3 text-sm font-black transition ${activeTab === 'students' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                        Siswa
                    </button>
                    <button type="button" onClick={() => setActiveTab('pending')} className={`border-b-2 px-3 py-3 text-sm font-black transition ${activeTab === 'pending' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                        Persetujuan {pendingEnrollments.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{pendingEnrollments.length}</span>}
                    </button>
                    <button type="button" onClick={() => setActiveTab('kloter')} className={`border-b-2 px-3 py-3 text-sm font-black transition ${activeTab === 'kloter' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                        Kelola Kloter
                    </button>
                    <Link
                        href={route('admin.analytics', filters.kloter ? { kloter: filters.kloter } : {})}
                        className="border-b-2 border-transparent px-3 py-3 text-sm font-black text-gray-500 transition hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white"
                    >
                        Monitoring
                    </Link>
                </div>

                {activeTab === 'students' && <>
                <Card className="!p-4 sm:!p-5">
                    <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
                        <input
                            type="search"
                            placeholder="Cari nama atau email siswa"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <SearchableSelect
                            value={filters.kloter || ''}
                            onChange={(kloter) => visitFilters({ kloter })}
                            placeholder="Semua kloter dalam cakupan"
                            searchPlaceholder="Cari nama kloter atau kelas..."
                            allowClear
                            clearLabel="Semua kloter dalam cakupan"
                            options={kloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.program_name }))}
                        />
                        <button className="h-11 rounded-xl bg-gray-900 px-5 text-sm font-black text-white dark:bg-white dark:text-gray-900">Cari</button>
                    </form>
                </Card>

                <Card className="!overflow-hidden !p-0">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[820px] text-left">
                            <thead className="bg-gray-50/80 dark:bg-gray-800/60">
                                <tr className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">
                                    <th className="px-5 py-4">Siswa</th>
                                    <th className="px-4 py-4">Progress</th>
                                    <th className="px-4 py-4">Skor</th>
                                    <th className="px-4 py-4">Gamifikasi</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {items.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                        <td className="px-5 py-4"><StudentIdentity user={user} /></td>
                                        <td className="px-4 py-4 text-sm"><strong>{user.lessons_done} modul</strong><p className="text-xs text-gray-500">{user.quizzes_done} percobaan kuis</p></td>
                                        <td className="px-4 py-4 text-sm font-black">{user.average_score || 0}</td>
                                        <td className="px-4 py-4 text-sm"><strong>{user.xp.toLocaleString()} XP</strong><p className="text-xs text-gray-500">{user.streak_count} hari streak</p></td>
                                        <td className="px-4 py-4"><Badge color={user.status === 'active' ? 'green' : 'red'}>{user.status}</Badge></td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <Link href={detailUrl(user.id)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300">Detail</Link>
                                                {selectedKloter && <button onClick={() => confirmRemoval(user)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-black text-red-600 dark:border-red-900/40 dark:text-red-400">Keluarkan</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
                        {items.map((user) => (
                            <article key={user.id} className="space-y-3 p-4">
                                <StudentIdentity user={user} />
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <MobileMetric label="Modul" value={user.lessons_done} />
                                    <MobileMetric label="Skor" value={user.average_score || 0} />
                                    <MobileMetric label="XP" value={user.xp.toLocaleString()} />
                                </div>
                                <div className="flex gap-2">
                                    <Link href={detailUrl(user.id)} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900">Lihat Detail</Link>
                                    {selectedKloter && <button onClick={() => confirmRemoval(user)} className="min-h-11 rounded-xl border border-red-200 px-3 text-xs font-black text-red-600 dark:border-red-900/50 dark:text-red-400">Keluarkan</button>}
                                </div>
                            </article>
                        ))}
                    </div>

                    {items.length === 0 && <p className="px-5 py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{emptyMessage}</p>}

                    {students?.links && students.links.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
                            {students.links.map((link, index) => (
                                <Link key={`${link.label}-${index}`} href={link.url || '#'} dangerouslySetInnerHTML={{ __html: link.label }} className={`rounded-lg px-3 py-2 text-sm font-bold ${link.active ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`} />
                            ))}
                        </div>
                    )}
                </Card>
                </>}

                {activeTab === 'pending' && (
                    <Card className="!p-4 sm:!p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="font-black text-gray-900 dark:text-white">Menunggu Persetujuan</h2>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    Pembayaran kelas mentor sudah berhasil. {adminScope === 'global' ? 'Admin global dapat memproses seluruh kloter sebagai penanggung jawab cadangan.' : 'Setujui peserta pada kloter yang Anda ampu.'}
                                </p>
                            </div>
                            <Badge color={pendingEnrollments.length ? 'yellow' : 'gray'}>{pendingEnrollments.length} pending</Badge>
                        </div>

                        <div className="mt-4 max-w-md">
                            <SearchableSelect
                                value={filters.kloter || ''}
                                onChange={(kloter) => visitFilters({ kloter })}
                                placeholder={adminScope === 'global' ? 'Semua kloter' : 'Semua kloter yang diampu'}
                                searchPlaceholder="Cari kloter atau kelas..."
                                allowClear
                                clearLabel={adminScope === 'global' ? 'Semua kloter' : 'Semua kloter yang diampu'}
                                options={kloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.program_name }))}
                            />
                        </div>

                        <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                            {pendingEnrollments.map((enrollment) => (
                                <article key={enrollment.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{enrollment.user.username}</p>
                                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Sudah dibayar</span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{enrollment.user.email}</p>
                                        <p className="mt-2 text-sm font-bold text-gray-700 dark:text-gray-200">{enrollment.kloter.program_name} · {enrollment.kloter.name}</p>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{enrollment.transaction_code} · {enrollment.amount_formatted}</span>
                                            <span>Pengampu: {enrollment.kloter.mentor?.username || 'Belum ditentukan'}</span>
                                            {enrollment.paid_at && <span>Dibayar {enrollment.paid_at}</span>}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase">
                                            <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">1 · Pembayaran selesai</span>
                                            <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">2 · Menunggu persetujuan</span>
                                            <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400">3 · Akses aktif</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => confirmApproval(enrollment)} className="min-h-10 flex-1 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 lg:flex-none">Setujui</button>
                                        <button onClick={() => { setRejectTarget(enrollment); rejectForm.reset(); }} className="min-h-10 flex-1 rounded-lg border border-red-200 px-4 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30 lg:flex-none">Tolak</button>
                                    </div>
                                </article>
                            ))}
                            {pendingEnrollments.length === 0 && (
                                <div className="py-10 text-center">
                                    <p className="text-sm font-black text-gray-700 dark:text-gray-200">Belum ada pembayaran mentor yang menunggu persetujuan</p>
                                    <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-gray-500 dark:text-gray-400">Hanya transaksi kelas mentor yang sudah sukses dan memiliki reservasi kloter yang tampil. Pembayaran pending, kelas mandiri, access key, dan siswa yang ditambahkan manual tidak masuk antrean ini.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'kloter' && !selectedKloter && <Card className="max-w-xl"><h2 className="font-black text-gray-900 dark:text-white">Pilih Kloter</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pilih kloter yang ingin diatur jadwal dan daftar siswanya.</p><SearchableSelect value="" onChange={(kloter) => visitFilters({ kloter })} placeholder="Pilih kloter untuk dikelola" searchPlaceholder="Cari nama kloter atau kelas..." className="mt-4" options={kloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.program_name }))} /></Card>}
                {activeTab === 'kloter' && selectedKloter && (
                    <Card className="!p-4 sm:!p-5">
                        <div className="mb-4 max-w-md">
                            <SearchableSelect
                                value={filters.kloter || ''}
                                onChange={(kloter) => visitFilters({ kloter })}
                                placeholder="Pilih kloter untuk dikelola"
                                searchPlaceholder="Cari nama kloter atau kelas..."
                                options={kloters.map((kloter) => ({ value: kloter.id, label: kloter.name, description: kloter.program_name }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-black text-gray-900 dark:text-white">{selectedKloter.name}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{selectedKloter.program_name}</p></div><Badge color={selectedKloter.status === 'active' ? 'green' : 'gray'}>{selectedKloter.status}</Badge></div>
                        <div className="mt-4 grid gap-5 xl:grid-cols-2">
                            <form onSubmit={submitSchedule} className="space-y-3"><div><h3 className="text-sm font-black text-gray-900 dark:text-white">Jadwal Kloter</h3><p className="text-xs text-gray-500 dark:text-gray-400">Tanggal mulai menentukan pembukaan roadmap mingguan.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-gray-600 dark:text-gray-300">Tanggal mulai<input type="date" value={scheduleForm.data.tanggal_mulai} onChange={(event) => scheduleForm.setData('tanggal_mulai', event.target.value)} disabled={selectedKloter.is_read_only} className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label><label className="text-xs font-bold text-gray-600 dark:text-gray-300">Tanggal selesai<input type="date" value={scheduleForm.data.tanggal_selesai} onChange={(event) => scheduleForm.setData('tanggal_selesai', event.target.value)} disabled={selectedKloter.is_read_only} className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label></div>{(scheduleForm.errors.tanggal_mulai || scheduleForm.errors.tanggal_selesai) && <p className="text-xs font-bold text-red-500">{scheduleForm.errors.tanggal_mulai || scheduleForm.errors.tanggal_selesai}</p>}<button disabled={scheduleForm.processing || selectedKloter.is_read_only} className="h-10 rounded-xl bg-red-600 px-4 text-xs font-black text-white disabled:opacity-50">{scheduleForm.processing ? 'Menyimpan...' : 'Simpan Jadwal'}</button></form>
                            <form onSubmit={submitAssignment} className="space-y-3">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Tambahkan Siswa Secara Manual</h3>
                                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Khusus access key, pembayaran manual, migrasi, atau koreksi administratif. Siswa langsung aktif dan tidak masuk tab Persetujuan.</p>
                                </div>
                                <SearchableSelect value={assignForm.data.user_id} onChange={(userId) => assignForm.setData('user_id', userId)} disabled={selectedKloter.status !== 'active'} placeholder="Cari siswa dengan akses aktif" searchPlaceholder="Cari nama atau email siswa..." options={candidateStudents.map((student) => ({ value: student.id, label: student.label }))} />
                                {assignForm.errors.user_id && <p className="text-xs font-bold text-red-500">{assignForm.errors.user_id}</p>}
                                <button disabled={assignForm.processing || !assignForm.data.user_id || selectedKloter.status !== 'active'} className="h-10 rounded-xl bg-gray-900 px-4 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-gray-900">{assignForm.processing ? 'Menambahkan...' : 'Tambahkan Manual'}</button>
                            </form>
                        </div>
                    </Card>
                )}
            </div>

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />

            <AdminDialog open={Boolean(rejectTarget)} onClose={() => { setRejectTarget(null); rejectForm.reset(); }} eyebrow="Persetujuan Kloter" title="Tolak Pendaftaran Mentor" description={rejectTarget ? `Transaksi ${rejectTarget.transaction_code} tetap sukses dan superadmin akan menerima tugas refund manual untuk ${rejectTarget.user.username}.` : ''} maxWidth="max-w-md">
                {rejectTarget && (
                    <form onSubmit={submitRejection} className="space-y-4">
                        <textarea
                            value={rejectForm.data.reason}
                            onChange={(event) => rejectForm.setData('reason', event.target.value)}
                            rows={4}
                            placeholder="Tuliskan alasan penolakan"
                            className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                        {rejectForm.errors.reason && <p className="mt-2 text-xs font-bold text-red-600">{rejectForm.errors.reason}</p>}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setRejectTarget(null); rejectForm.reset(); }} className="min-h-10 rounded-lg border border-gray-200 px-4 text-sm font-bold dark:border-gray-700">Batal</button>
                            <button disabled={rejectForm.processing || !rejectForm.data.reason.trim()} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-black text-white disabled:opacity-50">
                                {rejectForm.processing ? 'Memproses...' : 'Tolak dan Tandai Refund'}
                            </button>
                        </div>
                    </form>
                )}
            </AdminDialog>
        </AuthenticatedLayout>
    );
}

function StudentIdentity({ user }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar size="sm" />
            <div className="min-w-0">
                <p className="truncate text-sm font-black text-gray-900 dark:text-white">{user.username}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Aktif: {user.last_activity}</p>
            </div>
        </div>
    );
}

function MobileMetric({ label, value }) {
    return (
        <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-gray-800/70">
            <p className="truncate text-sm font-black text-gray-900 dark:text-white">{value}</p>
            <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
        </div>
    );
}
