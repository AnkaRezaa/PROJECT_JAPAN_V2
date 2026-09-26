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

    const { data, setData, post, processing, errors, reset, transform } = useForm({ ...emptyPopup });

    const openCreate = () => {
        setEditingPopup(null);
        transform((values) => values);
        reset();
        setImagePreview(null);
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditingPopup(item);
        transform((values) => values);
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
        transform((values) => values);
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

        transform((values) => ({
            ...values,
            starts_at: values.starts_at || null,
            ends_at: values.ends_at || null,
            badge: values.badge ? values.badge.trim() : null,
            cta_label: values.cta_label ? values.cta_label.trim() : null,
            cta_url: values.cta_url ? values.cta_url.trim() : null,
            description: values.description ? values.description.trim() : null,
        }));

        if (editingPopup) {
            post(route('superadmin.content.popups.update', editingPopup.id), {
                preserveScroll: true,
                onSuccess: () => {
                    transform((values) => values);
                    closeForm();
                },
            });
        } else {
            post(route('superadmin.content.popups.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    transform((values) => values);
                    closeForm();
                },
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
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
                    <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                    {editingPopup ? 'Edit Pop-up Broadcast' : 'Buat Pop-up Broadcast Baru'}
                                </h3>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Siarkan banner promosi, diskon, event, atau info pemeliharaan secara terarah.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeForm}
                                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>

                        {/* Form Content dengan Grid Responsif */}
                        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto p-4 sm:p-6 lg:grid-cols-12 lg:gap-6">
                                {/* Kolom Input (7 cols di desktop) */}
                                <div className="space-y-5 lg:col-span-7">
                                    {/* Section 1: Konten Promosi */}
                                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-850/50">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                            1. Informasi Pesan & Konten
                                        </h4>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                Judul Pop-up <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                placeholder="Contoh: Diskon Spesial Paket N5 & N4!"
                                                required
                                                className={`h-10 w-full rounded-xl border px-3 text-sm font-semibold text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                    errors.title ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.title && <p className="mt-1 text-xs text-rose-500">{errors.title}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Tipe Konten
                                                </label>
                                                <select
                                                    value={data.type}
                                                    onChange={(e) => setData('type', e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                >
                                                    <option value="promo">Promo / Diskon</option>
                                                    <option value="announcement">Pengumuman</option>
                                                    <option value="event">Event Spesial / Live</option>
                                                    <option value="maintenance">Maintenance</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Badge Tag (Opsional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.badge}
                                                    onChange={(e) => setData('badge', e.target.value)}
                                                    placeholder="Contoh: Terbatas, Spesial"
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                Deskripsi Singkat
                                            </label>
                                            <textarea
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                rows={2}
                                                placeholder="Tuliskan keterangan singkat promo atau pengumuman..."
                                                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                            />
                                            {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
                                        </div>
                                    </div>

                                    {/* Section 2: Tombol CTA & Media */}
                                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-850/50">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                            2. Tombol Aksi (CTA) & Banner Gambar
                                        </h4>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Label Tombol CTA
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.cta_label}
                                                    onChange={(e) => setData('cta_label', e.target.value)}
                                                    placeholder="Contoh: Lihat Paket Kelas"
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    URL Tujuan CTA
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.cta_url}
                                                    onChange={(e) => setData('cta_url', e.target.value)}
                                                    placeholder="Contoh: /pricing atau https://..."
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="mb-1 flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Gambar Banner (Opsional, Rekomendasi 16:9)
                                                </label>
                                                {imagePreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="text-[11px] font-bold text-rose-500 hover:underline"
                                                    >
                                                        Hapus Gambar
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleImageChange}
                                                className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-700 dark:file:bg-brand-900/30 dark:file:text-brand-300"
                                            />
                                            {errors.image && <p className="mt-1 text-xs text-rose-500">{errors.image}</p>}
                                        </div>
                                    </div>

                                    {/* Section 3: Target & Penjadwalan */}
                                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-850/50">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                            3. Target Penayangan & Jadwal
                                        </h4>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Target Halaman
                                                </label>
                                                <select
                                                    value={data.target_page}
                                                    onChange={(e) => setData('target_page', e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                >
                                                    <option value="all">Semua Halaman</option>
                                                    <option value="landing_page">Landing Page (Khusus Depan)</option>
                                                    <option value="dashboard">Dashboard Pengguna (Khusus Member)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Target Audiens
                                                </label>
                                                <select
                                                    value={data.target_audience}
                                                    onChange={(e) => setData('target_audience', e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                >
                                                    <option value="all">Semua Pengunjung</option>
                                                    <option value="guest">Pengunjung Belum Login</option>
                                                    <option value="user">Semua Pengguna Login</option>
                                                    <option value="free_user">Pengguna Free (Belum Berlangganan)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Mulai Tayang (Opsional)
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={data.starts_at}
                                                    onChange={(e) => setData('starts_at', e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                />
                                                {errors.starts_at && <p className="mt-1 text-xs text-rose-500">{errors.starts_at}</p>}
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    Selesai Tayang (Opsional)
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={data.ends_at}
                                                    onChange={(e) => setData('ends_at', e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                />
                                                {errors.ends_at && <p className="mt-1 text-xs text-rose-500">{errors.ends_at}</p>}
                                            </div>
                                        </div>

                                        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                                            <input
                                                type="checkbox"
                                                checked={data.is_active}
                                                onChange={(e) => setData('is_active', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                Aktifkan langsung pop-up ini setelah disimpan
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Kolom Live Preview (5 cols di desktop) */}
                                <div className="mt-4 lg:col-span-5 lg:mt-0">
                                    <div className="sticky top-0 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                                                Live Pratinjau Tampilan Pop-up
                                            </span>
                                            <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                                                Visual Siswa
                                            </span>
                                        </div>

                                        {/* Mockup Modal Preview */}
                                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                                            {imagePreview ? (
                                                <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                                                    <img src={imagePreview} alt="Preview banner" className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-brand-300 dark:from-gray-800 dark:to-gray-900 dark:text-gray-600">
                                                    <CampaignIcon sx={{ fontSize: 44 }} />
                                                </div>
                                            )}

                                            <div className="p-4 space-y-2.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {typeBadge(data.type)}
                                                    {data.badge && (
                                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                            {data.badge}
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-sm font-black text-gray-900 dark:text-white line-clamp-2">
                                                    {data.title || 'Judul pop-up akan tampil di sini'}
                                                </h4>

                                                <p className="text-xs text-gray-500 line-clamp-3 dark:text-gray-400">
                                                    {data.description || 'Deskripsi pesan promosi atau pengumuman pop-up akan terlihat oleh pengguna sesuai isi form.'}
                                                </p>

                                                {data.cta_label && (
                                                    <div className="pt-2">
                                                        <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white shadow-sm shadow-brand-500/20">
                                                            {data.cta_label}
                                                            <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-gray-700">
                                                    Target: <strong>{targetPageLabel(data.target_page)}</strong> • Audiens: <strong>{targetAudienceLabel(data.target_audience)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 disabled:opacity-50"
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
