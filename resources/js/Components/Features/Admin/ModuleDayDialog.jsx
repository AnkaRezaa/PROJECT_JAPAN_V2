import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';

import CloseIcon from '@mui/icons-material/Close';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-orange-900/30';

export default function ModuleDayDialog({ open, onClose, module, day = null, nextDayNumber = 1 }) {
    const form = useForm({
        day_number: nextDayNumber,
        title: '',
        description: '',
        status: 'draft',
    });

    useEffect(() => {
        if (!open) return;

        form.setData({
            day_number: day?.day_number || nextDayNumber,
            title: day?.title || `Hari ${nextDayNumber}`,
            description: day?.description || '',
            status: day?.status || 'draft',
        });
        form.clearErrors();
        // The form instance is stable; reopening is intentionally keyed by context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, day?.id, module?.id, nextDayNumber]);

    if (!open || !module) return null;

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (day) {
            form.put(route('admin.module-days.update', day.id), options);
            return;
        }

        form.post(route('admin.module-days.store', module.id), options);
    };

    return (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-gray-950/60 p-3 backdrop-blur-sm sm:p-5">
            <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 sm:my-8">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-gray-800">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                            Minggu {module.week_number} · {module.title}
                        </p>
                        <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                            {day ? `Edit Hari ${day.day_number}` : 'Tambah Hari'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} title="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                        <CloseIcon sx={{ fontSize: 19 }} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 p-5">
                    <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <label>
                            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Urutan Hari</span>
                            <input type="number" min="1" value={form.data.day_number} onChange={(event) => form.setData('day_number', event.target.value)} className={inputClass} required />
                        </label>
                        <label>
                            <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Judul Hari</span>
                            <input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} className={inputClass} placeholder="Contoh: Pola Kalimat Dasar" required />
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Deskripsi</span>
                        <textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} className={`${inputClass} min-h-24`} placeholder="Target belajar pada hari ini" />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Status</span>
                        <select value={form.data.status} onChange={(event) => form.setData('status', event.target.value)} className={inputClass}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </label>

                    {!day && (
                        <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 dark:border-teal-900/40 dark:bg-teal-900/15 dark:text-teal-200">
                            Flashcard dan kuis checkpoint draft akan disiapkan otomatis untuk Day ini.
                        </p>
                    )}

                    {Object.values(form.errors).length > 0 && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            {Object.values(form.errors)[0]}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                        <button type="submit" disabled={form.processing} className="h-11 rounded-xl bg-orange-600 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50">
                            {form.processing ? 'Menyimpan...' : day ? 'Simpan Hari' : 'Tambah Hari'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
