import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import AdminDialog from '@/Components/UI/AdminDialog';
import FormField from '@/Components/UI/FormField';

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
        <AdminDialog
            open={open}
            onClose={onClose}
            eyebrow={`Minggu ${module.week_number} · ${module.title}`}
            title={day ? `Edit Hari ${day.day_number}` : 'Tambah Hari'}
            maxWidth="max-w-xl"
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <FormField
                        label="Urutan Hari"
                        required
                        error={form.errors.day_number}
                        tooltip="Nomor urut sesi belajar dalam modul mingguan."
                    >
                        <input
                            type="number"
                            min="1"
                            value={form.data.day_number}
                            onChange={(event) => {
                                form.setData('day_number', event.target.value);
                                form.clearErrors('day_number');
                            }}
                            className={`${inputClass} ${form.errors.day_number ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                            required
                        />
                    </FormField>
                    <FormField
                        label="Judul Hari"
                        required
                        error={form.errors.title}
                        tooltip="Topik atau tema materi yang dipelajari pada pertemuan ini."
                    >
                        <input
                            value={form.data.title}
                            onChange={(event) => {
                                form.setData('title', event.target.value);
                                form.clearErrors('title');
                            }}
                            className={`${inputClass} ${form.errors.title ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                            placeholder="Contoh: Pola Kalimat Dasar"
                            required
                        />
                    </FormField>
                </div>

                <FormField
                    label="Deskripsi"
                    error={form.errors.description}
                    tooltip="Target belajar dan ringkasan kemampuan yang diharapkan dikuasai siswa pada hari ini."
                >
                    <textarea
                        value={form.data.description}
                        onChange={(event) => {
                            form.setData('description', event.target.value);
                            form.clearErrors('description');
                        }}
                        className={`${inputClass} min-h-24 ${form.errors.description ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                        placeholder="Target belajar pada hari ini"
                    />
                </FormField>

                <FormField
                    label="Status"
                    required
                    error={form.errors.status}
                    tooltip="Draf untuk persiapan atau Published agar sesi hari ini dapat dikerjakan siswa."
                >
                    <select
                        value={form.data.status}
                        onChange={(event) => {
                            form.setData('status', event.target.value);
                            form.clearErrors('status');
                        }}
                        className={`${inputClass} ${form.errors.status ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>
                </FormField>

                {!day && (
                    <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 dark:border-teal-900/40 dark:bg-teal-900/15 dark:text-teal-200">
                        Flashcard dan kuis checkpoint draft akan disiapkan otomatis untuk Day ini.
                    </p>
                )}

                {Object.values(form.errors).length > 0 && !form.errors.day_number && !form.errors.title && !form.errors.description && !form.errors.status && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        {Object.values(form.errors)[0]}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        Batal
                    </button>
                    <button type="submit" disabled={form.processing} className="h-11 rounded-xl bg-orange-600 text-sm font-black text-white hover:bg-orange-700 transition disabled:opacity-50">
                        {form.processing ? 'Menyimpan...' : day ? 'Simpan Hari' : 'Tambah Hari'}
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}
