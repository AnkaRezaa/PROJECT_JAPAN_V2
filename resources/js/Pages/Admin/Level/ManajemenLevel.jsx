import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';

export default function ManajemenLevel({ levels = [], tracks = [] }) {
    const [showLevelModal, setShowLevelModal] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [editingTrack, setEditingTrack] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteTrackConfirm, setDeleteTrackConfirm] = useState(null);

    const { data, setData, processing, errors, reset } = useForm({
        curriculum_track_id: '',
        level_name: '',
        stage: '',
    });
    const trackForm = useForm({ code: '', name: '', status: 'active', sort_order: 1 });

    const openCreateModal = () => {
        reset();
        setEditingLevel(null);
        setShowLevelModal(true);
    };

    const openEditModal = (level) => {
        setEditingLevel(level);
        setData({
            curriculum_track_id: level.curriculum_track_id || '',
            level_name: level.level_name || '',
            stage: level.stage || '',
        });
        setShowLevelModal(true);
    };

    const openTrackModal = (track = null) => {
        setEditingTrack(track);
        trackForm.setData(track ? {
            code: track.code || '',
            name: track.name || '',
            status: track.status || 'active',
            sort_order: track.sort_order || 1,
        } : { code: '', name: '', status: 'active', sort_order: tracks.length + 1 });
        setShowTrackModal(true);
    };

    const handleTrackSubmit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowTrackModal(false);
                setEditingTrack(null);
                trackForm.reset();
            },
        };

        editingTrack
            ? trackForm.put(route('admin.curriculum-tracks.update', editingTrack.id), options)
            : trackForm.post(route('admin.curriculum-tracks.store'), options);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingLevel) {
            router.put(route('admin.levels.update', editingLevel.id), data, {
                onSuccess: () => {
                    setShowLevelModal(false);
                    setEditingLevel(null);
                    reset();
                },
            });
            return;
        }

        router.post(route('admin.levels.store'), data, {
            onSuccess: () => {
                setShowLevelModal(false);
                reset();
            },
        });
    };

    const confirmDelete = () => {
        router.delete(route('admin.levels.destroy', deleteConfirm.id), {
            onSuccess: () => setDeleteConfirm(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Level - TOKU-UP" />

            <div className="min-h-screen bg-surface-muted font-sans">
                <header className="sticky top-16 z-40 flex flex-col gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:top-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                            <LayersOutlinedIcon sx={{ fontSize: 20 }} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-gray-900">Manajemen Level</h1>
                            <p className="text-[11px] font-medium text-gray-400">{levels.length} level tersedia</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => openTrackModal()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50">
                            <AddIcon sx={{ fontSize: 18 }} /> Jalur
                        </button>
                        <button onClick={openCreateModal} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700">
                            <AddIcon sx={{ fontSize: 18 }} /> Level
                        </button>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl p-4 sm:p-6">
                    <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {tracks.map((track) => (
                            <article key={track.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">{track.code}</p>
                                        <h2 className="mt-1 text-base font-black text-gray-900">{track.name}</h2>
                                        <p className="mt-1 text-xs font-medium text-gray-500">{track.levels_count} level · {track.programs_count} kelas</p>
                                    </div>
                                    <button onClick={() => openTrackModal(track)} aria-label={`Edit ${track.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                        <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </section>
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500 sm:px-6">Jalur</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500 sm:px-6">Level</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-500 sm:px-6">Stage</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-gray-500 sm:px-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {levels.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-10 text-center text-sm font-medium text-gray-400">
                                                Belum ada data level.
                                            </td>
                                        </tr>
                                    )}

                                    {levels.map((level) => (
                                        <tr key={level.id} className="transition-colors hover:bg-gray-50/80">
                                            <td className="px-4 py-4 text-sm font-bold text-gray-600 sm:px-6">{level.curriculum_track?.name || '-'}</td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <div className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-brand-700">
                                                    {level.level_name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-gray-700 sm:px-6">
                                                {level.stage}
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(level)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                                                    >
                                                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(level)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                                                    >
                                                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {showLevelModal && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-gray-100 p-6">
                            <h3 className="text-lg font-black text-gray-900">
                                {editingLevel ? 'Edit Level' : 'Tambah Level Baru'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">Jalur Kurikulum <span className="text-brand-500">*</span></label>
                                <select value={data.curriculum_track_id} onChange={(e) => setData('curriculum_track_id', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none focus:border-orange-200 focus:ring-4 focus:ring-orange-500/10">
                                    <option value="">Pilih jalur</option>
                                    {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
                                </select>
                                {errors.curriculum_track_id && <p className="mt-1 text-xs font-medium text-red-500">{errors.curriculum_track_id}</p>}
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">
                                    Nama Level <span className="text-brand-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.level_name}
                                    onChange={(e) => setData('level_name', e.target.value)}
                                    placeholder="Contoh: N3"
                                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-orange-200 focus:ring-4 focus:ring-orange-500/10"
                                />
                                {errors.level_name && <p className="mt-1 text-xs font-medium text-red-500">{errors.level_name}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">
                                    Stage <span className="text-brand-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={data.stage}
                                    onChange={(e) => setData('stage', e.target.value)}
                                    placeholder="Contoh: 3"
                                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-orange-200 focus:ring-4 focus:ring-orange-500/10"
                                />
                                {errors.stage && <p className="mt-1 text-xs font-medium text-red-500">{errors.stage}</p>}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLevelModal(false);
                                        setEditingLevel(null);
                                        reset();
                                    }}
                                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? 'Menyimpan...' : editingLevel ? 'Simpan Perubahan' : 'Tambah Level'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTrackModal && (
                <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-gray-100 p-6">
                            <h3 className="text-lg font-black text-gray-900">{editingTrack ? 'Edit Jalur' : 'Tambah Jalur Kurikulum'}</h3>
                        </div>
                        <form onSubmit={handleTrackSubmit} className="space-y-4 p-6">
                            <label className="block text-sm font-bold text-gray-700">Kode
                                <input value={trackForm.data.code} onChange={(e) => trackForm.setData('code', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="contoh: jlpt" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm" />
                                {trackForm.errors.code && <span className="mt-1 block text-xs text-red-500">{trackForm.errors.code}</span>}
                            </label>
                            <label className="block text-sm font-bold text-gray-700">Nama
                                <input value={trackForm.data.name} onChange={(e) => trackForm.setData('name', e.target.value)} placeholder="Contoh: JLPT" className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm" />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block text-sm font-bold text-gray-700">Status
                                    <select value={trackForm.data.status} onChange={(e) => trackForm.setData('status', e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
                                </label>
                                <label className="block text-sm font-bold text-gray-700">Urutan
                                    <input type="number" min="1" value={trackForm.data.sort_order} onChange={(e) => trackForm.setData('sort_order', e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm" />
                                </label>
                            </div>
                            {editingTrack && <button type="button" onClick={() => { setShowTrackModal(false); setDeleteTrackConfirm(editingTrack); }} className="text-sm font-bold text-red-600">Hapus jalur</button>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowTrackModal(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600">Batal</button>
                                <button disabled={trackForm.processing} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <ConfirmActionDialog
                    show
                    variant="danger"
                    title="Hapus Level?"
                    message="Pastikan level ini tidak lagi dipakai oleh konten lain."
                    confirmLabel="Iya, Hapus"
                    details={[
                        { label: 'Level', value: deleteConfirm.level_name },
                        { label: 'Stage', value: deleteConfirm.stage },
                    ]}
                    onCancel={() => setDeleteConfirm(null)}
                    onConfirm={confirmDelete}
                />
            )}
            {deleteTrackConfirm && (
                <ConfirmActionDialog
                    show
                    variant="danger"
                    title="Hapus Jalur?"
                    message="Jalur hanya dapat dihapus jika tidak memiliki level dan kelas."
                    confirmLabel="Hapus"
                    details={[{ label: 'Jalur', value: deleteTrackConfirm.name }]}
                    onCancel={() => setDeleteTrackConfirm(null)}
                    onConfirm={() => router.delete(route('admin.curriculum-tracks.destroy', deleteTrackConfirm.id), { onSuccess: () => setDeleteTrackConfirm(null) })}
                />
            )}
        </AuthenticatedLayout>
    );
}
