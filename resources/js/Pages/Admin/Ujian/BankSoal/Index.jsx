import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminDialog from '@/Components/UI/AdminDialog';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { AdminExamHeader, AdminExamTabs, AdminPagination, Metric, StatusBadge, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

export default function Index({ banks = { data: [] }, levels = [], filters = {} }) {
    const [term, setTerm] = useState(filters.search || '');
    const [levelFilter, setLevelFilter] = useState(filters.level || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [bankModal, setBankModal] = useState(null); // null, { mode: 'create' }, { mode: 'edit', bank }

    const { confirmState, requestConfirm, closeConfirm } = useConfirmAction();

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        title: '',
        level_id: levels[0]?.id || '',
        source: '',
        description: '',
        status: 'published',
    });

    const handleFilter = (newLevel = levelFilter, newStatus = statusFilter, newTerm = term) => {
        router.get(route('admin.exams.question-banks.index'), {
            search: newTerm,
            level: newLevel,
            status: newStatus,
        }, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        reset();
        setData({
            title: '',
            level_id: levels[0]?.id || '',
            source: '',
            description: '',
            status: 'published',
        });
        setBankModal({ mode: 'create' });
    };

    const openEditModal = (bank) => {
        setData({
            title: bank.title,
            level_id: bank.level_id,
            source: bank.source || '',
            description: bank.description || '',
            status: bank.status || 'published',
        });
        setBankModal({ mode: 'edit', bank });
    };

    const handleSubmitBank = (event) => {
        event.preventDefault();
        if (bankModal?.mode === 'create') {
            post(route('admin.exams.question-banks.store'), {
                onSuccess: () => setBankModal(null),
            });
        } else if (bankModal?.mode === 'edit') {
            patch(route('admin.exams.question-banks.update', bankModal.bank.slug), {
                onSuccess: () => setBankModal(null),
            });
        }
    };

    const handleDeleteBank = (bank) => {
        requestConfirm({
            title: 'Hapus Bank Soal',
            message: `Apakah Anda yakin ingin menghapus bank soal "${bank.title}"? Seluruh wacana dan butir soal di dalamnya akan terhapus permanen.`,
            confirmLabel: 'Ya, Hapus',
            isDestructive: true,
            onConfirm: () => router.delete(route('admin.exams.question-banks.destroy', bank.slug)),
        });
    };

    const totalQuestions = useMemo(() => {
        return banks.data.reduce((total, item) => total + Number(item.questions_count || 0), 0);
    }, [banks.data]);

    const totalWrappers = useMemo(() => {
        return banks.data.reduce((total, item) => total + Number(item.wrappers_count || 0), 0);
    }, [banks.data]);

    return (
        <AuthenticatedLayout>
            <Head title="Bank Soal Ujian" />
            <div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <AdminExamHeader
                        eyebrow="Repositori & Bank Ujian"
                        title="Bank Soal Ujian"
                        description="Kelola kumpulan bank soal JLPT (N5–N1) dari aneka sumber buku dan simulasi dengan struktur Wrapper wacana/audio."
                        action={
                            <div className="flex flex-wrap items-center gap-2">
                                <a
                                    href={route('admin.exams.question-banks.template', 'xlsx')}
                                    className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    title="Unduh Template Excel"
                                >
                                    <DownloadRoundedIcon fontSize="small" /> Template XLSX
                                </a>
                                <a
                                    href={route('admin.exams.question-banks.template', 'csv')}
                                    className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    title="Unduh Template CSV"
                                >
                                    <DownloadRoundedIcon fontSize="small" /> Template CSV
                                </a>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700"
                                >
                                    <AddRoundedIcon fontSize="small" /> Buat Bank Soal
                                </button>
                            </div>
                        }
                    />

                    <AdminExamTabs />

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Metric label="Total Bank Soal" value={banks.total || banks.data.length} detail="Semua koleksi" />
                        <Metric label="Total Wacana / Wrapper" value={totalWrappers} detail="Wacana bacaan & audio" />
                        <Metric label="Total Butir Soal" value={totalQuestions} detail="Pertanyaan tersimpan" />
                        <Metric label="Level Terlayani" value={levels.length} detail="N5 s.d. N1" />
                    </div>

                    <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="grid gap-3 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-[1fr_180px_160px]">
                            <label className="relative">
                                <SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
                                <input
                                    value={term}
                                    onChange={(event) => {
                                        setTerm(event.target.value);
                                        handleFilter(levelFilter, statusFilter, event.target.value);
                                    }}
                                    className={`${fieldClassName} mt-0 pl-10`}
                                    placeholder="Cari judul bank, sumber buku, atau deskripsi"
                                />
                            </label>
                            <select
                                value={levelFilter}
                                onChange={(event) => {
                                    setLevelFilter(event.target.value);
                                    handleFilter(event.target.value, statusFilter, term);
                                }}
                                className={`${fieldClassName} mt-0`}
                            >
                                <option value="all">Semua level</option>
                                {levels.map((item) => (
                                    <option key={item.id} value={item.level_name}>{item.level_name}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    handleFilter(levelFilter, event.target.value, term);
                                }}
                                className={`${fieldClassName} mt-0`}
                            >
                                <option value="all">Semua status</option>
                                <option value="published">Terbit</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Arsip</option>
                            </select>
                        </div>

                        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            {banks.data.map((bank) => (
                                <article
                                    key={bank.id}
                                    className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-brand-800"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                                                {bank.level}
                                            </span>
                                            <StatusBadge status={bank.status} />
                                        </div>

                                        <h3 className="mt-3 text-base font-black text-gray-950 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                                            <Link href={route('admin.exams.question-banks.show', bank.slug)}>
                                                {bank.title}
                                            </Link>
                                        </h3>

                                        {bank.source && (
                                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                Sumber: {bank.source}
                                            </p>
                                        )}

                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                            {bank.description || 'Tidak ada deskripsi tambahan.'}
                                        </p>
                                    </div>

                                    <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                                            <span><strong>{bank.wrappers_count}</strong> wacana</span>
                                            <span><strong>{bank.questions_count}</strong> butir soal</span>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between gap-2">
                                            <Link
                                                href={route('admin.exams.question-banks.show', bank.slug)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-50 px-3 text-xs font-black text-brand-700 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 dark:hover:bg-brand-900/50"
                                            >
                                                <FolderOpenOutlinedIcon sx={{ fontSize: 16 }} /> Kelola Soal
                                            </Link>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(bank)}
                                                    className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                                    title="Edit informasi bank"
                                                >
                                                    <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBank(bank)}
                                                    className="grid h-8 w-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    title="Hapus bank soal"
                                                >
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {banks.data.length === 0 && (
                            <div className="px-4 py-16 text-center">
                                <p className="font-bold text-gray-950 dark:text-white">Belum ada bank soal</p>
                                <p className="mt-1 text-xs text-gray-500">Mulai dengan membuat bank soal baru atau mengimpor file template XLSX/CSV.</p>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-xs font-black text-white hover:bg-brand-700"
                                >
                                    <AddRoundedIcon fontSize="small" /> Buat Bank Soal Pertama
                                </button>
                            </div>
                        )}

                        <AdminPagination links={banks.links} />
                    </section>
                </div>
            </div>

            {/* Modal Tambah/Edit Bank Soal */}
            <AdminDialog
                isOpen={Boolean(bankModal)}
                onClose={() => setBankModal(null)}
                title={bankModal?.mode === 'create' ? 'Buat Bank Soal Baru' : 'Edit Informasi Bank Soal'}
                subtitle="Bank soal berfungsi sebagai wadah penampung materi ujian dari sumber tertentu."
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmitBank} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Nama Bank Soal</label>
                        <input
                            type="text"
                            required
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className={fieldClassName}
                            placeholder="Contoh: Shin Kanzen Master N3 - Dokkai"
                        />
                        {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Level JLPT</label>
                            <select
                                required
                                value={data.level_id}
                                onChange={(e) => setData('level_id', e.target.value)}
                                className={fieldClassName}
                            >
                                {levels.map((item) => (
                                    <option key={item.id} value={item.id}>{item.level_name}</option>
                                ))}
                            </select>
                            {errors.level_id && <p className="mt-1 text-xs text-rose-600">{errors.level_id}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Status</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className={fieldClassName}
                            >
                                <option value="published">Terbit</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Arsip</option>
                            </select>
                            {errors.status && <p className="mt-1 text-xs text-rose-600">{errors.status}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Sumber / Penerbit (Opsional)</label>
                        <input
                            type="text"
                            value={data.source}
                            onChange={(e) => setData('source', e.target.value)}
                            className={fieldClassName}
                            placeholder="Contoh: 3A Corporation / Soal Resmi 2023"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Deskripsi (Opsional)</label>
                        <textarea
                            rows="3"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className={`${fieldClassName} h-auto py-2.5`}
                            placeholder="Keterangan mengenai cakupan materi bank soal..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setBankModal(null)}
                            className="h-10 rounded-md border border-gray-300 px-4 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-10 rounded-md bg-brand-600 px-5 text-xs font-black text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {processing ? 'Menyimpan...' : (bankModal?.mode === 'create' ? 'Buat Bank' : 'Simpan Perubahan')}
                        </button>
                    </div>
                </form>
            </AdminDialog>

            <ConfirmActionDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                isDestructive={confirmState.isDestructive}
                onConfirm={confirmState.onConfirm}
                onClose={closeConfirm}
            />
        </AuthenticatedLayout>
    );
}
