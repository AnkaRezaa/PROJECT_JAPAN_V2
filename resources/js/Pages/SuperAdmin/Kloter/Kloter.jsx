import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/UI/Card';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const emptyKloter = {
    program_pembelajaran_id: '',
    admin_id: '',
    nama: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    max_siswa: '',
    is_default: false,
    status: 'active',
    catatan: '',
};

const emptyAccessKey = {
    name: '',
    duration_days: 30,
    max_uses: 2,
    expires_at: '',
    notes: '',
};

export default function Kloter({
    stats = [],
    kloters = { data: [], links: [] },
    selectedKloter = null,
    programs = [],
    admins = [],
    users = [],
    filters = {},
    kloterStatusDistribution = [],
    enrollmentByKloter = [],
}) {
    const [showKloterForm, setShowKloterForm] = useState(false);
    const [editingKloter, setEditingKloter] = useState(null);
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [showAccessKeyForm, setShowAccessKeyForm] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const filterForm = useForm({
        search: filters.search || '',
        status: filters.status || 'active',
        program: filters.program || '',
    });
    const kloterForm = useForm({ ...emptyKloter });
    const assignForm = useForm({ user_id: '', catatan: '' });
    const keyForm = useForm({ ...emptyAccessKey });

    const selectedId = selectedKloter?.id;
    const selectedUserIds = useMemo(() => new Set((selectedKloter?.anggota || [])
        .filter((item) => item.status === 'active')
        .map((item) => item.user_id)), [selectedKloter]);
    const assignableUsers = users.filter((user) => !selectedUserIds.has(user.id));
    const isKloterFull = selectedKloter?.max_siswa
        ? Number(selectedKloter.anggota_aktif_count || 0) >= Number(selectedKloter.max_siswa)
        : false;
    const filteredAssignableUsers = useMemo(() => {
        const keyword = assignSearch.trim().toLowerCase();

        return assignableUsers
            .filter((user) => !keyword || user.label.toLowerCase().includes(keyword))
            .slice(0, 20);
    }, [assignSearch, assignableUsers]);
    const selectedAssignableUser = assignableUsers.find((user) => String(user.id) === String(assignForm.data.user_id));

    const submitFilters = (event) => {
        event.preventDefault();
        router.get(route('superadmin.kloters'), filterForm.data, { preserveState: true, preserveScroll: true });
    };

    const openCreate = () => {
        setEditingKloter(null);
        kloterForm.setData({ ...emptyKloter });
        setShowKloterForm(true);
    };

    const openEdit = () => {
        if (!selectedKloter) return;

        setEditingKloter(selectedKloter);
        kloterForm.setData({
            program_pembelajaran_id: selectedKloter.program_pembelajaran_id || '',
            admin_id: selectedKloter.admin_id || '',
            nama: selectedKloter.nama || '',
            tanggal_mulai: selectedKloter.tanggal_mulai || '',
            tanggal_selesai: selectedKloter.tanggal_selesai || '',
            max_siswa: selectedKloter.max_siswa || '',
            is_default: Boolean(selectedKloter.is_default),
            status: selectedKloter.status || 'active',
            catatan: selectedKloter.catatan || '',
        });
        setShowKloterForm(true);
    };

    const submitKloter = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowKloterForm(false);
                setEditingKloter(null);
                kloterForm.reset();
            },
        };

        if (editingKloter) {
            kloterForm.put(route('superadmin.kloters.update', editingKloter.id), options);
            return;
        }

        kloterForm.post(route('superadmin.kloters.store'), options);
    };

    const submitAssign = (event) => {
        event.preventDefault();
        if (!selectedId) return;

        assignForm.post(route('superadmin.kloters.users.store', selectedId), {
            preserveScroll: true,
            onSuccess: () => {
                setShowAssignForm(false);
                setAssignDropdownOpen(false);
                setAssignSearch('');
                assignForm.reset();
            },
        });
    };

    const submitAccessKey = (event) => {
        event.preventDefault();
        if (!selectedId) return;

        keyForm.post(route('superadmin.kloters.access-keys.store', selectedId), {
            preserveScroll: true,
            onSuccess: () => {
                setShowAccessKeyForm(false);
                keyForm.reset();
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Kloter" />

            <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-6 2xl:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Kloter Belajar</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Atur batch belajar, admin pengampu, anggota, dan access key untuk membuka kelas per kloter.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="min-h-11 w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 sm:w-auto"
                    >
                        Buat Kloter
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    {stats.map((item) => <StatCard key={item.title} {...item} />)}
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <ChartCard className="min-w-0 p-4 sm:p-6" title="Status Kloter" subtitle="Distribusi seluruh kloter">
                        {kloterStatusDistribution.some((item) => item.value > 0) ? (
                            <ChartContainer config={{ active: { color: '#10b981' }, draft: { color: '#f59e0b' }, archived: { color: '#94a3b8' } }}>
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Pie data={kloterStatusDistribution} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3}>
                                        {kloterStatusDistribution.map((item) => <Cell key={item.label} fill={item.fill} />)}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada kloter.</ChartEmpty>}
                    </ChartCard>

                    <ChartCard className="min-w-0 p-4 sm:p-6" title="Anggota per Kloter" subtitle="Delapan kloter dengan anggota aktif terbanyak">
                        {enrollmentByKloter.length > 0 ? (
                            <ChartContainer config={{ members: { label: 'Anggota aktif', color: '#1d4ed8' } }}>
                                <BarChart data={enrollmentByKloter} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                    <YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false} className="fill-gray-500 text-xs" tick={{ fontSize: 11 }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" name="Anggota aktif" fill="var(--color-members)" radius={[0, 5, 5, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : <ChartEmpty>Belum ada anggota kloter aktif.</ChartEmpty>}
                    </ChartCard>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <Card className="min-w-0 p-4 sm:p-6">
                        <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_minmax(0,0.8fr)_110px]">
                            <input
                                value={filterForm.data.search}
                                onChange={(event) => filterForm.setData('search', event.target.value)}
                                placeholder="Cari kloter, kode, kelas, admin..."
                                className="h-11 min-w-0 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                            <select value={filterForm.data.status} onChange={(event) => filterForm.setData('status', event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900">
                                <option value="active">Aktif</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Arsip</option>
                                <option value="all">Semua</option>
                            </select>
                            <SearchableSelect
                                value={filterForm.data.program}
                                onChange={(programId) => filterForm.setData('program', programId)}
                                placeholder="Semua kelas"
                                searchPlaceholder="Cari kelas..."
                                allowClear
                                clearLabel="Semua kelas"
                                options={programs.map((program) => ({ value: program.id, label: program.title }))}
                            />
                            <button className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                        </form>

                        <div className="mt-5 space-y-3">
                            {(kloters.data || []).length === 0 && (
                                <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm font-bold text-gray-400 dark:border-gray-700">
                                    Belum ada kloter.
                                </p>
                            )}

                            {(kloters.data || []).map((item) => (
                                <Link
                                    key={item.id}
                                    href={route('superadmin.kloters', { ...filters, selected: item.id })}
                                    preserveScroll
                                    className={`block min-w-0 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${selectedId === item.id ? 'border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-900/20' : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'}`}
                                >
                                    <div className="flex min-w-0 items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-black text-gray-900 dark:text-white">{item.nama}</p>
                                                {item.is_default && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Default</span>}
                                            </div>
                                            <p className="mt-1 truncate text-xs font-bold text-gray-400">{item.kode} - {item.program_name}</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                {item.admin_name || 'Admin belum dipilih'} - mulai {item.tanggal_mulai_label || '-'}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                                <p className="text-xl font-black text-gray-900 dark:text-white">{item.kapasitas_label || item.anggota_aktif_count}</p>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Kapasitas</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {kloters.links && kloters.links.length > 3 && (
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {kloters.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-xl px-4 py-2 text-sm font-bold ${link.active ? 'bg-brand-600 text-white' : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="min-w-0 p-4 sm:p-6">
                        {!selectedKloter ? (
                            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-center dark:border-gray-700">
                                <div>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">Pilih kloter</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-400">Detail anggota dan access key akan tampil di sini.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{selectedKloter.nama}</h2>
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">{selectedKloter.status}</span>
                                            {selectedKloter.is_default && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Default Payment</span>}
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                            {selectedKloter.program_name} - {selectedKloter.kode}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-gray-400">
                                            Admin: {selectedKloter.admin_name || '-'} - mulai {selectedKloter.tanggal_mulai_label || '-'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                        <button onClick={openEdit} className="min-h-10 w-full rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300 sm:w-auto">Edit</button>
                                        <button
                                            onClick={() => {
                                                setAssignSearch('');
                                                setAssignDropdownOpen(false);
                                                setShowAssignForm(true);
                                            }}
                                            disabled={isKloterFull}
                                            className="min-h-10 w-full rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-900/30 dark:bg-sky-900/20 dark:text-sky-300 sm:w-auto"
                                        >
                                            {isKloterFull ? 'Kloter Penuh' : 'Tambah User'}
                                        </button>
                                        <button onClick={() => setShowAccessKeyForm(true)} className="min-h-10 w-full rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300 sm:w-auto">Generate Key</button>
                                        {selectedKloter.status !== 'archived' && (
                                            <button
                                                onClick={() => openConfirm({
                                                    variant: 'warning',
                                                    title: 'Arsipkan Kloter?',
                                                    message: 'Kloter akan disembunyikan dari operasional aktif dan tidak menjadi default payment.',
                                                    confirmLabel: 'Iya, Arsipkan',
                                                    details: [
                                                        { label: 'Kloter', value: selectedKloter.nama },
                                                        { label: 'Kapasitas', value: selectedKloter.kapasitas_label || '-' },
                                                    ],
                                                    onConfirm: () => router.patch(route('superadmin.kloters.archive', selectedKloter.id), {}, {
                                                        preserveScroll: true,
                                                        onFinish: closeConfirm,
                                                    }),
                                                })}
                                                className="min-h-10 w-full rounded-xl border border-brand-100 px-4 py-2 text-xs font-black text-brand-600 dark:border-brand-900/40 dark:text-brand-400 sm:w-auto"
                                            >
                                                Arsipkan
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <MiniStat label="Anggota aktif" value={selectedKloter.kapasitas_label || selectedKloter.anggota_aktif_count || 0} />
                                    <MiniStat label="Access key" value={(selectedKloter.access_keys || []).length} />
                                    <MiniStat label="Mulai" value={selectedKloter.tanggal_mulai_label || '-'} />
                                </div>

                                <section>
                                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">Anggota</h3>
                                    <div className="mt-3 space-y-3 xl:hidden">
                                        {(selectedKloter.anggota || []).length === 0 && (
                                            <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm font-bold text-gray-400 dark:border-gray-700">Belum ada anggota.</p>
                                        )}
                                        {(selectedKloter.anggota || []).map((item) => (
                                            <article key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{item.user_name}</p>
                                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.user_email}</p>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{item.status}</span>
                                                </div>
                                                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                                    <div><p className="font-bold uppercase tracking-wide text-gray-400">Masuk</p><p className="mt-1 font-semibold text-gray-700 dark:text-gray-300">{item.joined_at || '-'}</p></div>
                                                    <div><p className="font-bold uppercase tracking-wide text-gray-400">Langganan</p><p className="mt-1 font-semibold text-gray-700 dark:text-gray-300">{item.subscription_until || '-'}</p></div>
                                                </div>
                                                <div className="mt-4">
                                                    <div className="mb-1 flex justify-between text-[11px] font-black text-gray-400"><span>Progres</span><span>{item.progress_done}/{item.progress_total} · {item.progress_percent}%</span></div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-600" style={{ width: `${item.progress_percent || 0}%` }} /></div>
                                                </div>
                                                {item.status === 'active' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openConfirm({
                                                            variant: 'warning',
                                                            title: 'Keluarkan User?',
                                                            message: 'User akan keluar dari daftar anggota kloter, tetapi akun dan langganannya tidak dihapus.',
                                                            confirmLabel: 'Iya, Keluarkan',
                                                            details: [{ label: 'User', value: item.user_name }, { label: 'Kloter', value: selectedKloter.nama }],
                                                            onConfirm: () => router.delete(route('superadmin.kloters.users.destroy', [selectedKloter.id, item.user_id]), { preserveScroll: true, onFinish: closeConfirm }),
                                                        })}
                                                        className="mt-4 w-full rounded-xl border border-brand-100 px-3 py-2 text-xs font-black text-brand-600 dark:border-brand-900/40 dark:text-brand-400"
                                                    >
                                                        Keluarkan dari Kloter
                                                    </button>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                    <div className="mt-3 hidden overflow-x-auto xl:block">
                                        <table className="min-w-[640px] w-full text-sm">
                                            <thead className="bg-gray-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 dark:bg-gray-800/50">
                                                <tr>
                                                    <th className="px-4 py-3">User</th>
                                                    <th className="px-4 py-3">Masuk</th>
                                                    <th className="px-4 py-3">Langganan</th>
                                                    <th className="px-4 py-3">Progress</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3 text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedKloter.anggota || []).length === 0 && (
                                                    <tr><td colSpan="6" className="px-4 py-8 text-center font-bold text-gray-400">Belum ada anggota.</td></tr>
                                                )}
                                                {(selectedKloter.anggota || []).map((item) => (
                                                    <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                                                        <td className="px-4 py-4">
                                                            <p className="font-black text-gray-900 dark:text-white">{item.user_name}</p>
                                                            <p className="text-xs text-gray-400">{item.user_email}</p>
                                                        </td>
                                                        <td className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-300">{item.joined_at || '-'}</td>
                                                        <td className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-300">{item.subscription_until || '-'}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="min-w-[110px]">
                                                                <div className="mb-1 flex items-center justify-between text-[11px] font-black text-gray-400">
                                                                    <span>{item.progress_done}/{item.progress_total}</span>
                                                                    <span>{item.progress_percent}%</span>
                                                                </div>
                                                                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                                                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${item.progress_percent || 0}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{item.status}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            {item.status === 'active' && (
                                                                <button
                                                                    onClick={() => openConfirm({
                                                                        variant: 'warning',
                                                                        title: 'Keluarkan User?',
                                                                        message: 'User akan keluar dari daftar anggota kloter, tetapi akun dan langganannya tidak dihapus.',
                                                                        confirmLabel: 'Iya, Keluarkan',
                                                                        details: [
                                                                            { label: 'User', value: item.user_name },
                                                                            { label: 'Email', value: item.user_email },
                                                                            { label: 'Kloter', value: selectedKloter.nama },
                                                                        ],
                                                                        onConfirm: () => router.delete(route('superadmin.kloters.users.destroy', [selectedKloter.id, item.user_id]), {
                                                                            preserveScroll: true,
                                                                            onFinish: closeConfirm,
                                                                        }),
                                                                    })}
                                                                    className="rounded-lg border border-brand-100 px-3 py-2 text-xs font-black text-brand-600 dark:border-brand-900/40 dark:text-brand-400"
                                                                >
                                                                    Keluarkan
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-400">Access Key Kloter</h3>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {(selectedKloter.access_keys || []).length === 0 && (
                                            <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm font-bold text-gray-400 dark:border-gray-700">Belum ada access key.</p>
                                        )}
                                        {(selectedKloter.access_keys || []).map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                                <p className="font-mono text-sm font-black tracking-widest text-gray-900 dark:text-white">{item.code}</p>
                                                <p className="mt-1 text-xs font-semibold text-gray-400">{item.name || 'Access Key'} - {item.duration_days} hari</p>
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">{item.usage}</span>
                                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">{item.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-300">Danger Zone</h3>
                                            <p className="mt-2 text-sm font-semibold leading-6 text-brand-700/80 dark:text-brand-200/80">
                                                Hapus kloter akan menghapus daftar anggota kloter. Data transaksi, langganan, dan access key tidak dihapus, hanya dilepas dari kloter ini.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openConfirm({
                                                variant: 'danger',
                                                title: 'Hapus Kloter?',
                                                message: 'Apakah kamu setuju untuk hapus kloter ini? Aksi ini tidak bisa dibatalkan.',
                                                confirmLabel: 'Iya, Hapus',
                                                details: [
                                                    { label: 'Kloter', value: selectedKloter.nama },
                                                    { label: 'Kode', value: selectedKloter.kode },
                                                    { label: 'Dampak', value: 'Anggota kloter dihapus. Transaksi, langganan, dan access key hanya dilepas dari kloter ini.' },
                                                ],
                                                onConfirm: () => router.delete(route('superadmin.kloters.destroy', selectedKloter.id), {
                                                    preserveScroll: true,
                                                    onFinish: closeConfirm,
                                                }),
                                            })}
                                            className="min-h-11 w-full shrink-0 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 sm:w-auto"
                                        >
                                            Delete Kloter
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {showKloterForm && (
                <Modal title={editingKloter ? 'Edit Kloter' : 'Buat Kloter'} onClose={() => setShowKloterForm(false)}>
                    <form onSubmit={submitKloter} className="space-y-4">
                        <Field label="Nama kloter" help="Nama batch yang terlihat oleh superadmin, contoh: N3 Juli 2026.">
                            <input value={kloterForm.data.nama} onChange={(event) => kloterForm.setData('nama', event.target.value)} placeholder="N3 Juli 2026" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Kelas/program" help="Payment dan roadmap user akan mengikuti kelas ini.">
                                <SearchableSelect value={kloterForm.data.program_pembelajaran_id} onChange={(programId) => kloterForm.setData('program_pembelajaran_id', programId)} placeholder="Pilih kelas" searchPlaceholder="Cari kelas atau program..." options={programs.map((program) => ({ value: program.id, label: program.title }))} />
                            </Field>
                            <Field label="Admin pengampu" help="Admin/sensei yang bertanggung jawab pada batch ini.">
                                <SearchableSelect value={kloterForm.data.admin_id} onChange={(adminId) => kloterForm.setData('admin_id', adminId)} placeholder="Pilih admin pengampu" searchPlaceholder="Cari nama atau email admin..." options={admins.map((admin) => ({ value: admin.id, label: admin.label }))} />
                            </Field>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Tanggal mulai" help="Menentukan Week aktif pada roadmap user.">
                                <input type="date" value={kloterForm.data.tanggal_mulai} onChange={(event) => kloterForm.setData('tanggal_mulai', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </Field>
                            <Field label="Tanggal selesai" help="Opsional. Kosongkan jika belum ada tanggal akhir.">
                                <input type="date" value={kloterForm.data.tanggal_selesai} onChange={(event) => kloterForm.setData('tanggal_selesai', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </Field>
                        </div>
                        <Field label="Kapasitas siswa" help="Batas user yang boleh masuk kloter. Kosongkan jika tidak dibatasi.">
                            <input type="number" min="1" max="500" value={kloterForm.data.max_siswa} onChange={(event) => kloterForm.setData('max_siswa', event.target.value)} placeholder="Contoh: 30" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Status kloter" help="Aktif bisa dipakai auto-assign; draft belum dipakai; arsip disembunyikan dari operasional.">
                                <select value={kloterForm.data.status} onChange={(event) => kloterForm.setData('status', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900">
                                    <option value="active">Aktif</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Arsip</option>
                                </select>
                            </Field>
                            <Field label="Default payment" help="Jika aktif, user yang bayar kelas ini otomatis masuk kloter ini selama belum penuh.">
                                <label className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 px-4 text-sm font-bold dark:border-gray-700">
                                    <input type="checkbox" checked={kloterForm.data.is_default} onChange={(event) => kloterForm.setData('is_default', event.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-focus" />
                                    Jadikan default
                                </label>
                            </Field>
                        </div>
                        <Field label="Catatan internal" help="Tidak tampil ke user. Gunakan untuk info batch, jadwal, atau instruksi admin.">
                            <textarea value={kloterForm.data.catatan} onChange={(event) => kloterForm.setData('catatan', event.target.value)} rows={3} placeholder="Catatan internal" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setShowKloterForm(false)} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                            <button disabled={kloterForm.processing} className="min-h-11 w-full rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60 sm:w-auto">{kloterForm.processing ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showAssignForm && selectedKloter && (
                <Modal title="Tambah User ke Kloter" onClose={() => setShowAssignForm(false)}>
                    <form onSubmit={submitAssign} className="space-y-4">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-200">
                            Kapasitas kloter: {selectedKloter.kapasitas_label || `${selectedKloter.anggota_aktif_count || 0}/-`}. Dropdown dibatasi 20 hasil teratas agar tetap ringan; gunakan search untuk mempersempit pilihan.
                        </div>
                        {isKloterFull && (
                            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm font-bold text-brand-700 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                                Kloter ini sudah penuh. Naikkan kapasitas atau keluarkan anggota sebelum menambah user.
                            </div>
                        )}
                        <Field label="Pilih user" help={`${filteredAssignableUsers.length} hasil ditampilkan dari ${assignableUsers.length} user yang bisa ditambahkan. Ketik nama atau email di dalam dropdown.`}>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => !isKloterFull && setAssignDropdownOpen((open) => !open)}
                                    disabled={isKloterFull}
                                    className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <span className={selectedAssignableUser ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}>
                                        {selectedAssignableUser?.label || 'Pilih user'}
                                    </span>
                                    <span className="text-xs font-black text-gray-400">{assignDropdownOpen ? 'Tutup' : 'Cari'}</span>
                                </button>

                                {assignDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                        <div className="border-b border-gray-100 p-3 dark:border-gray-800">
                                            <input
                                                value={assignSearch}
                                                onChange={(event) => setAssignSearch(event.target.value)}
                                                placeholder="Cari nama atau email..."
                                                autoFocus
                                                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none focus:border-sky-300 focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            />
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            {filteredAssignableUsers.length === 0 && (
                                                <p className="px-3 py-4 text-center text-sm font-bold text-gray-400">User tidak ditemukan.</p>
                                            )}
                                            {filteredAssignableUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => {
                                                        assignForm.setData('user_id', user.id);
                                                        setAssignDropdownOpen(false);
                                                        setAssignSearch('');
                                                    }}
                                                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/20 dark:hover:text-sky-200 ${String(assignForm.data.user_id) === String(user.id) ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-200' : 'text-gray-700 dark:text-gray-200'}`}
                                                >
                                                    {user.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Field>
                        <Field label="Catatan penambahan" help="Opsional, hanya untuk riwayat internal superadmin.">
                            <textarea value={assignForm.data.catatan} onChange={(event) => assignForm.setData('catatan', event.target.value)} rows={3} placeholder="Catatan opsional" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setShowAssignForm(false)} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                            <button disabled={assignForm.processing || isKloterFull} className="min-h-11 w-full rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60 sm:w-auto">{assignForm.processing ? 'Menyimpan...' : 'Tambah User'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showAccessKeyForm && selectedKloter && (
                <Modal title="Generate Access Key Kloter" onClose={() => setShowAccessKeyForm(false)}>
                    <form onSubmit={submitAccessKey} className="space-y-4">
                        <Field label="Nama access key" help="Label internal agar mudah tahu kode ini untuk campaign atau batch apa.">
                            <input value={keyForm.data.name} onChange={(event) => keyForm.setData('name', event.target.value)} placeholder={`Access ${selectedKloter.nama}`} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Durasi akses" help="Berapa hari subscription aktif setelah user redeem.">
                                <input type="number" min="1" max="366" value={keyForm.data.duration_days} onChange={(event) => keyForm.setData('duration_days', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </Field>
                            <Field label="Maks pemakaian" help="Batas jumlah user yang boleh memakai kode ini. Default client: 2 user.">
                                <input type="number" min="1" max="500" value={keyForm.data.max_uses} onChange={(event) => keyForm.setData('max_uses', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                            </Field>
                        </div>
                        <Field label="Tanggal kedaluwarsa key" help="Opsional. Setelah tanggal ini kode tidak bisa dipakai lagi.">
                            <input type="datetime-local" value={keyForm.data.expires_at} onChange={(event) => keyForm.setData('expires_at', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <Field label="Catatan key" help="Tidak tampil ke user. Cocok untuk mencatat siapa penerima kode.">
                            <textarea value={keyForm.data.notes} onChange={(event) => keyForm.setData('notes', event.target.value)} rows={3} placeholder="Catatan internal" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        </Field>
                        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                            Default max pemakaian 2 user sesuai arahan client. Kode ini membuka kelas dan memasukkan user ke kloter.
                        </p>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setShowAccessKeyForm(false)} className="min-h-11 w-full rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold dark:border-gray-700 sm:w-auto">Batal</button>
                            <button disabled={keyForm.processing} className="min-h-11 w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-gray-950 disabled:opacity-60 sm:w-auto">{keyForm.processing ? 'Membuat...' : 'Buat Key'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
            <p className="break-words text-xl font-black text-gray-900 dark:text-white">{value}</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        </div>
    );
}

function Field({ label, help, children }) {
    return (
        <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</span>
            <div className="mt-2">{children}</div>
            {help && <p className="mt-1 text-xs font-semibold leading-5 text-gray-500 dark:text-gray-400">{help}</p>}
        </label>
    );
}

function Modal({ title, onClose, children }) {
    return createPortal(
        <div className="fixed inset-0 z-[120] grid place-items-end overflow-y-auto p-0 sm:place-items-center sm:p-5">
            <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl dark:bg-gray-900 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.5rem]">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
                    <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-500 dark:border-gray-700 dark:text-gray-300">Tutup</button>
                </div>
                <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
