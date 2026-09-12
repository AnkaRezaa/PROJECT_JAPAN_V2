import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CampaignIcon from '@mui/icons-material/Campaign';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const emptyPopup = {
    title: '',
    description: '',
    type: 'promo',
    badge: '',
    cta_label: '',
    cta_url: '',
    target_page: 'all',
    target_audience: 'all',
    is_active: true,
    starts_at: '',
    ends_at: '',
    image: null,
    remove_image: false,
};

export default function PopupManager({ popups = [] }) {
    const [showForm, setShowForm] = useState(false);
    const [editingPopup, setEditingPopup] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({ ...emptyPopup });

    const openCreate = () => {
        setEditingPopup(null);
        reset();
        setImagePreview(null);
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditingPopup(item);
        setData({
            title: item.title || '',
            description: item.description || '',
            type: item.type || 'promo',
            badge: item.badge || '',
            cta_label: item.cta_label || '',
            cta_url: item.cta_url || '',
            target_page: item.target_page || 'all',
            target_audience: item.target_audience || 'all',
            is_active: Boolean(item.is_active),
            starts_at: item.starts_at || '',
            ends_at: item.ends_at || '',
            image: null,
            remove_image: false,
        });
        setImagePreview(item.image_url || null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingPopup(null);
        reset();
        setImagePreview(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setData('remove_image', false);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setData('image', null);
        setData('remove_image', true);
        setImagePreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingPopup) {
            post(route('superadmin.content.popups.update', editingPopup.id), {
                preserveScroll: true,
                onSuccess: () => closeForm(),
            });
        } else {
            post(route('superadmin.content.popups.store'), {
                preserveScroll: true,
                onSuccess: () => closeForm(),
            });
        }
    };

    const handleToggle = (item) => {
        router.patch(route('superadmin.content.popups.toggle', item.id), {}, {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('superadmin.content.popups.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const typeBadge = (type) => {
        const styles = {
            promo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            announcement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            event: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            maintenance: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        };
        const labels = {
            promo: 'Promo / Iklan',
            announcement: 'Pengumuman',
            event: 'Event Spesial',
            maintenance: 'Maintenance',
        };
        return (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-black uppercase tracking-wider ${styles[type] || styles.promo}`}>
                {labels[type] || type}
            </span>
        );
    };

    const targetPageLabel = (page) => {
        const labels = {
            all: 'Semua Halaman',
            landing_page: 'Landing Page',
            dashboard: 'Dashboard User',
        };
        return labels[page] || page;
    };

    const targetAudienceLabel = (aud) => {
        const labels = {
            all: 'Semua Orang',
            guest: 'Tamu (Belum Login)',
            user: 'Semua User Login',
            free_user: 'User Free (Belum Berlangganan)',
        };
        return labels[aud] || aud;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Broadcast & Pop-up Iklan</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Atur pop-up promosi, info event, dan pengumuman yang muncul otomatis di Landing Page atau Dashboard.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-700"
                >
                    <AddIcon sx={{ fontSize: 18 }} />
                    Buat Pop-up Baru
                </button>
            </div>

            {/* List Popups */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {popups.map((popup) => (
                    <Card key={popup.id} className="relative overflow-hidden transition-all hover:shadow-md">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            {popup.image_url ? (
                                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:w-44">
                                    <img src={popup.image_url} alt={popup.title} className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 dark:from-gray-800 dark:to-gray-750 dark:text-gray-500 sm:w-44">
                                    <CampaignIcon sx={{ fontSize: 32 }} />
                                </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {typeBadge(popup.type)}
                                    {popup.badge && (
                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {popup.badge}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-base font-black text-gray-900 dark:text-white line-clamp-1">{popup.title}</h3>
                                {popup.description && (
                                    <p className="text-xs leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
                                        {popup.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                                    <span>📍 {targetPageLabel(popup.target_page)}</span>
                                    <span>👥 {targetAudienceLabel(popup.target_audience)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card Footer / Actions */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => handleToggle(popup)}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                    popup.is_active
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}
                                title={popup.is_active ? 'Klik untuk menonaktifkan (Disable)' : 'Klik untuk mengaktifkan (Enable)'}
                            >
                                {popup.is_active ? <ToggleOnIcon sx={{ fontSize: 22 }} /> : <ToggleOffIcon sx={{ fontSize: 22 }} />}
                                <span>{popup.is_active ? 'Aktif (Enabled)' : 'Nonaktif (Disabled)'}</span>
                            </button>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => openEdit(popup)}
                                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                                    title="Edit Pop-up"
                                >
                                    <EditIcon sx={{ fontSize: 18 }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(popup)}
                                    className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/20"
                                    title="Hapus Pop-up"
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}

                {popups.length === 0 && (
                    <div className="col-span-full rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
                        <CampaignIcon sx={{ fontSize: 40 }} className="mx-auto text-gray-300 dark:text-gray-600" />
                        <h4 className="mt-2 text-sm font-black text-gray-700 dark:text-gray-300">Belum ada pop-up broadcast</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Buat pop-up pertama untuk promosi paket belajar, event live, atau pengumuman penting.
                        </p>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white hover:bg-brand-700"
                        >
                            <AddIcon sx={{ fontSize: 16 }} />
                            Tambah Pop-up
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Form Tambah / Edit */}
            {showForm && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
                    <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                {editingPopup ? 'Edit Pop-up Broadcast' : 'Buat Pop-up Broadcast Baru'}
                            </h3>
                            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Judul Pop-up <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Contoh: Diskon Spesial N5 & N4 Pekan Ini!"
                                        required
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                    {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Tipe Pop-up
                                    </label>
                                    <select
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="promo">Promo / Diskon</option>
                                        <option value="announcement">Pengumuman</option>
                                        <option value="event">Event Spesial / Live Class</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Badge Label (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.badge}
                                        onChange={(e) => setData('badge', e.target.value)}
                                        placeholder="Contoh: Promo Terbatas, Event Sensei"
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Deskripsi Singkat
                                    </label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                        placeholder="Tuliskan pesan promo atau pengumuman yang menarik..."
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                    {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Teks Tombol CTA
                                    </label>
                                    <input
                                        type="text"
                                        value={data.cta_label}
                                        onChange={(e) => setData('cta_label', e.target.value)}
                                        placeholder="Contoh: Lihat Paket Kelas"
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Link Tujuan CTA
                                    </label>
                                    <input
                                        type="text"
                                        value={data.cta_url}
                                        onChange={(e) => setData('cta_url', e.target.value)}
                                        placeholder="Contoh: /pricing atau https://..."
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Target Halaman
                                    </label>
                                    <select
                                        value={data.target_page}
                                        onChange={(e) => setData('target_page', e.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="all">Semua Halaman</option>
                                        <option value="landing_page">Landing Page</option>
                                        <option value="dashboard">Dashboard Pengguna</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Target Audiens
                                    </label>
                                    <select
                                        value={data.target_audience}
                                        onChange={(e) => setData('target_audience', e.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="all">Semua Pengunjung</option>
                                        <option value="guest">Hanya Pengunjung Belum Login</option>
                                        <option value="user">Semua Pengguna Login</option>
                                        <option value="free_user">Hanya Pengguna Free (Belum Berlangganan)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Tanggal Mulai (Opsional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={data.starts_at}
                                        onChange={(e) => setData('starts_at', e.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Tanggal Berakhir (Opsional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={data.ends_at}
                                        onChange={(e) => setData('ends_at', e.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>

                                {/* Banner Image Upload */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        Gambar Banner (Opsional, Rasio 16:9 disarankan)
                                    </label>
                                    {imagePreview ? (
                                        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                                            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                                            >
                                                <CloseIcon sx={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleImageChange}
                                            className="block w-full text-xs text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-xs file:font-black file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
                                        />
                                    )}
                                    {errors.image && <p className="mt-1 text-xs text-rose-500">{errors.image}</p>}
                                </div>

                                {/* Status Toggle */}
                                <div className="sm:col-span-2">
                                    <label className="inline-flex cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                            Aktifkan Pop-up sekarang
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : (editingPopup ? 'Perbarui Pop-up' : 'Simpan Pop-up')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmActionDialog
                show={Boolean(deleteTarget)}
                title="Hapus Pop-up Broadcast?"
                message={`Apakah Anda yakin ingin menghapus pop-up "${deleteTarget?.title}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Ya, Hapus"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
