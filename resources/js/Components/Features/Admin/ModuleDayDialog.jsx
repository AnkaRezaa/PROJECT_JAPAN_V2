import React, { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import AdminDialog from '@/Components/UI/AdminDialog';
import FormField from '@/Components/UI/FormField';
import { examCategoryLabel } from '@/Components/Features/ExamPortal/ExamPortalUI';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-orange-900/30';

export default function ModuleDayDialog({ open, onClose, onCreated = null, module, day = null, nextDayNumber = 1, examOptions = [] }) {
    const [continueToGenerator, setContinueToGenerator] = useState(true);
    const form = useForm({
        day_number: nextDayNumber,
        title: '',
        description: '',
        kotoba_intro_title: '',
        kotoba_intro_body: '',
        status: 'draft',
        handwriting_enabled: true,
        handwriting_mode: 'guided_then_blank',
        exam_id: '',
    });

    useEffect(() => {
        if (!open) return;

        form.setData({
            day_number: day?.day_number || nextDayNumber,
            title: day?.title || `Hari ${nextDayNumber}`,
            description: day?.description || '',
            kotoba_intro_title: day?.kotoba_intro_title || '',
            kotoba_intro_body: day?.kotoba_intro_body || '',
            status: day?.status || 'draft',
            handwriting_enabled: day?.handwriting_enabled ?? true,
            handwriting_mode: day?.handwriting_mode || 'guided_then_blank',
            exam_id: day?.exam_id ? String(day.exam_id) : '',
        });
        form.clearErrors();
        setContinueToGenerator(true);
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
            form.transform((data) => ({ ...data, exam_id: data.exam_id === '' ? null : Number(data.exam_id) }));
            form.put(route('admin.module-days.update', day.id), options);
            return;
        }

        const submittedDayNumber = Number(form.data.day_number);
        const openGenerator = continueToGenerator;
        form.transform(({ exam_id, ...data }) => data);
        form.post(route('admin.module-days.store', module.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                const modules = page?.props?.modules;
                const moduleList = Array.isArray(modules?.data) ? modules.data : (Array.isArray(modules) ? modules : []);
                const updatedModule = moduleList.find(item => Number(item.id) === Number(module.id));
                const createdDay = (updatedModule?.days || []).find(item => Number(item.day_number) === submittedDayNumber);
                onClose();
                if (updatedModule && createdDay) {
                    onCreated?.({ module: updatedModule, day: createdDay, openGenerator });
                }
            },
        });
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

                <div className="space-y-3 rounded-2xl border border-pink-100 bg-pink-50/40 p-3.5 dark:border-pink-900/40 dark:bg-pink-950/15">
                    <p className="text-[11px] font-black uppercase tracking-wider text-pink-700 dark:text-pink-300">
                        Penjelasan Pembuka Sesi Kotoba (Opsional)
                    </p>
                    <FormField
                        label="Judul Pembuka Kotoba"
                        error={form.errors.kotoba_intro_title}
                        tooltip="Judul pengantar tema kosakata yang tampil sebelum murid masuk ke kartu Kotoba hari ini."
                    >
                        <input
                            value={form.data.kotoba_intro_title}
                            onChange={(event) => {
                                form.setData('kotoba_intro_title', event.target.value);
                                form.clearErrors('kotoba_intro_title');
                            }}
                            className={`${inputClass} ${form.errors.kotoba_intro_title ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                            placeholder="Contoh: Kosakata Rumah & Dapur"
                        />
                    </FormField>
                    <FormField
                        label="Ringkasan / Penjelasan Kotoba"
                        error={form.errors.kotoba_intro_body}
                        tooltip="Penjelasan singkat konteks dan gambaran kata-kata yang akan dipelajari pada sesi Kotoba hari ini."
                    >
                        <textarea
                            value={form.data.kotoba_intro_body}
                            onChange={(event) => {
                                form.setData('kotoba_intro_body', event.target.value);
                                form.clearErrors('kotoba_intro_body');
                            }}
                            className={`${inputClass} min-h-20 ${form.errors.kotoba_intro_body ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                            placeholder="Gambaran tema dan tips menghafal kosakata hari ini..."
                        />
                    </FormField>
                </div>

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

                {day && (
                    <FormField label="Ujian" tooltip="Opsional. Maks. 1 ujian per hari." error={form.errors.exam_id}>
                        <select
                            aria-label="Ujian"
                            value={form.data.exam_id}
                            disabled={form.processing}
                            onChange={(event) => {
                                form.setData('exam_id', event.target.value);
                                form.clearErrors('exam_id');
                            }}
                            className={inputClass}
                        >
                            <option value="">Tanpa ujian</option>
                            {day.exam_id && !examOptions.some((exam) => String(exam.id) === String(day.exam_id)) && (
                                <option value={String(day.exam_id)} disabled>
                                    {day.exam?.title || `Ujian #${day.exam_id}`} (Tidak tersedia)
                                </option>
                            )}
                            {examOptions.map((exam) => (
                                <option key={exam.id} value={String(exam.id)}>{exam.title} · {examCategoryLabel(exam)}</option>
                            ))}
                        </select>
                    </FormField>
                )}

                <FormField label="Latihan menulis kanji" error={form.errors.handwriting_enabled}>
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        <input
                            type="checkbox"
                            role="switch"
                            aria-label="Latihan menulis kanji"
                            checked={form.data.handwriting_enabled}
                            disabled={form.processing}
                            onChange={(event) => {
                                form.setData('handwriting_enabled', event.target.checked);
                                form.clearErrors('handwriting_enabled');
                            }}
                            className="peer sr-only"
                        />
                        <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-orange-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 dark:bg-gray-600 dark:peer-focus-visible:ring-offset-gray-900" />
                        {form.data.handwriting_enabled ? 'Aktif' : 'Nonaktif'}
                    </label>
                </FormField>

                {form.data.handwriting_enabled && (
                    <FormField
                        label="Mode Menulis Kanji"
                        error={form.errors.handwriting_mode}
                        tooltip="Default Panduan → Kosongan melatih goresan terlebih dahulu lalu otomatis menguji menulis dari ingatan."
                    >
                        <select
                            aria-label="Mode Menulis Kanji"
                            value={form.data.handwriting_mode}
                            disabled={form.processing}
                            onChange={(event) => {
                                form.setData('handwriting_mode', event.target.value);
                                form.clearErrors('handwriting_mode');
                            }}
                            className={inputClass}
                        >
                            <option value="guided_then_blank">Panduan → Kosongan (Default)</option>
                            <option value="guided_only">Panduan Saja</option>
                            <option value="blank_only">Kosongan Saja (Uji Ingatan)</option>
                        </select>
                    </FormField>
                )}

                {!day && (
                    <FormField label="Lanjut generate soal">
                        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                            <input type="checkbox" role="switch" aria-label="Lanjut generate soal" checked={continueToGenerator}
                                disabled={form.processing} onChange={event => setContinueToGenerator(event.target.checked)} className="peer sr-only" />
                            <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-orange-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 dark:bg-gray-600 dark:peer-focus-visible:ring-offset-gray-900" />
                            {continueToGenerator ? 'Aktif' : 'Nonaktif'}
                        </label>
                    </FormField>
                )}

                {Object.values(form.errors).length > 0 && !form.errors.day_number && !form.errors.title && !form.errors.description && !form.errors.status && !form.errors.handwriting_enabled && !form.errors.exam_id && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        {Object.values(form.errors)[0]}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        Batal
                    </button>
                    <button type="submit" disabled={form.processing} className="h-11 rounded-xl bg-orange-600 text-sm font-black text-white hover:bg-orange-700 transition disabled:opacity-50">
                        {form.processing ? 'Menyimpan...' : day ? 'Simpan Hari' : continueToGenerator ? 'Tambah & Generate' : 'Tambah Hari'}
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}
