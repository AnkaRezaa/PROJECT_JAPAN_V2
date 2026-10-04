import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import AdminDialog from '@/Components/UI/AdminDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import FormField, { formInputClass } from '@/Components/UI/FormField';

const RESOURCE_CONFIG = {
    flashcard: {
        label: 'Flashcard',
        routeName: 'admin.flashcards.store',
        accent: 'bg-teal-600 hover:bg-teal-700',
    },
    quiz: {
        label: 'Kuis',
        routeName: 'admin.quizzes.store',
        accent: 'bg-brand-600 hover:bg-brand-700',
    },
    presentation: {
        label: 'Presentasi',
        routeName: 'admin.presentations.store',
        accent: 'bg-learning-700 hover:bg-learning-600',
    },
};

const initialData = (resourceType, module, day, weekSlot = null) => ({
    title: resourceType === 'presentation'
        ? `Presentasi ${weekSlot === 'closing' ? 'Penutup' : weekSlot === 'after_day' ? 'Setelah Hari' : 'Pembuka'} ${module?.title || ''}`.trim()
        : `Flashcard ${day?.title || ''}`.trim(),
    description: '',
    level_id: module?.level?.id || '',
    module_id: module?.id || '',
    module_day_id: day?.id || '',
    week_slot: resourceType === 'presentation' ? weekSlot || 'opening' : null,
    sort_order: 0,
    type: 'multiple_choice',
    time_limit: '',
    passing_score: 70,
    available_at: '',
    status: 'draft',
});

export default function LearningResourceCreateDialog({
    open,
    onClose,
    resourceType,
    module = null,
    day = null,
    modules = [],
    levels = [],
    lockContext = false,
    weekSlot = null,
}) {
    const config = RESOURCE_CONFIG[resourceType] || RESOURCE_CONFIG.flashcard;
    const form = useForm(initialData(resourceType, module, day, weekSlot));

    useEffect(() => {
        if (!open) return;

        form.setData(initialData(resourceType, module, day, weekSlot));
        form.clearErrors();
        // The form instance is stable; reopening is intentionally keyed by context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, resourceType, module?.id, day?.id, weekSlot]);

    if (!open) return null;

    const selectedModule = lockContext
        ? module
        : modules.find((item) => String(item.id) === String(form.data.module_id));
    const selectedDay = lockContext
        ? day
        : (selectedModule?.days || []).find((item) => String(item.id) === String(form.data.module_day_id));
    const displayLabel = config.label;

    const submit = (event) => {
        event.preventDefault();

        const payload = resourceType === 'quiz'
            ? {
                module_id: form.data.module_id,
                module_day_id: form.data.module_day_id,
                type: form.data.type,
                time_limit: form.data.time_limit || null,
                passing_score: form.data.passing_score,
                status: form.data.status,
            }
            : {
                title: form.data.title,
                description: form.data.description,
                level_id: form.data.level_id || null,
                module_id: form.data.module_id,
                module_day_id: resourceType === 'presentation'
                    ? (form.data.week_slot === 'after_day' ? form.data.module_day_id || null : null)
                    : form.data.module_day_id || null,
                week_slot: resourceType === 'presentation' ? form.data.week_slot : undefined,
                sort_order: resourceType === 'presentation' ? Number(form.data.sort_order || 0) : undefined,
                status: form.data.status,
            };

        form.transform(() => payload);
        form.post(route(config.routeName), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <AdminDialog
            open={open}
            onClose={onClose}
            eyebrow={`${selectedModule ? `Week ${selectedModule.week_number}` : 'Resource kelas'}${selectedDay ? ` / Day ${selectedDay.day_number}` : ''}`}
            title={`Buat ${displayLabel}`}
            description={`Setelah dibuat, lanjutkan isinya melalui editor ${displayLabel.toLowerCase()}.`}
            maxWidth="max-w-xl"
        >
                <form onSubmit={submit} className="space-y-4">
                    {lockContext ? (
                        <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 dark:border-orange-900/30 dark:bg-orange-900/10">
                            <p className="text-xs font-black text-orange-700 dark:text-orange-300">{module?.program?.title || 'Kelas'}</p>
                            <p className="mt-1 text-sm font-bold text-gray-800 dark:text-gray-100">
                                Minggu {module?.week_number || '-'}
                                {day ? ` / Hari ${day.day_number} / ${day.title}` : ''}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                label="Minggu"
                                required
                                tooltip="Modul mingguan tujuan penempatan resource belajar."
                                error={form.errors.module_id}
                            >
                                <SearchableSelect
                                    value={form.data.module_id}
                                    onChange={(moduleId) => {
                                        form.setData((data) => ({ ...data, module_id: moduleId, module_day_id: '' }));
                                        form.clearErrors('module_id');
                                    }}
                                    placeholder="Pilih Week"
                                    searchPlaceholder="Cari week atau judul modul..."
                                    options={modules.map((item) => ({ value: item.id, label: `Week ${item.week_number} - ${item.title}`, description: item.program?.title }))}
                                />
                                <select
                                    value={form.data.module_id}
                                    onChange={(event) => {
                                        form.setData((data) => ({
                                            ...data,
                                            module_id: event.target.value,
                                            module_day_id: '',
                                        }));
                                        form.clearErrors('module_id');
                                    }}
                                    className="hidden"
                                    required
                                >
                                    <option value="">Pilih Minggu</option>
                                    {modules.map((item) => (
                                        <option key={item.id} value={item.id}>Minggu {item.week_number} · {item.title}</option>
                                    ))}
                                </select>
                            </FormField>
                            {(resourceType !== 'presentation' || form.data.week_slot === 'after_day') && (
                                <FormField
                                    label="Hari"
                                    required={resourceType === 'flashcard' || resourceType === 'quiz' || (resourceType === 'presentation' && form.data.week_slot === 'after_day')}
                                    tooltip="Sesi harian spesifik tempat resource ini dipelajari siswa."
                                    error={form.errors.module_day_id}
                                >
                                    <SearchableSelect
                                        value={form.data.module_day_id}
                                        onChange={(moduleDayId) => {
                                            form.setData('module_day_id', moduleDayId);
                                            form.clearErrors('module_day_id');
                                        }}
                                        placeholder={resourceType === 'presentation' ? 'Presentasi Mingguan' : 'Pilih Day'}
                                        searchPlaceholder="Cari day..."
                                        allowClear={resourceType === 'presentation'}
                                        clearLabel="Presentasi Mingguan"
                                        options={(selectedModule?.days || []).map((item) => ({ value: item.id, label: `Day ${item.day_number} - ${item.title}`, description: `Week ${selectedModule?.week_number || '-'}` }))}
                                    />
                                    <select
                                        value={form.data.module_day_id}
                                        onChange={(event) => {
                                            form.setData('module_day_id', event.target.value);
                                            form.clearErrors('module_day_id');
                                        }}
                                        className="hidden"
                                        required={resourceType === 'flashcard' || resourceType === 'quiz' || (resourceType === 'presentation' && form.data.week_slot === 'after_day')}
                                    >
                                        <option value="">
                                            {resourceType === 'presentation'
                                                ? 'Presentasi Mingguan'
                                                : 'Pilih Hari'}
                                        </option>
                                        {(selectedModule?.days || []).map((item) => (
                                            <option key={item.id} value={item.id}>Hari {item.day_number} · {item.title}</option>
                                        ))}
                                    </select>
                                </FormField>
                            )}
                        </div>
                    )}

                    {resourceType !== 'quiz' && (
                        <>
                            {resourceType === 'presentation' && !weekSlot && (
                                <FormField
                                    label="Posisi"
                                    tooltip="Penempatan slide presentasi: pembuka minggu, sela hari, atau penutup minggu."
                                    error={form.errors.week_slot}
                                >
                                    <select
                                        value={form.data.week_slot}
                                        onChange={(event) => {
                                            form.setData((data) => ({ ...data, week_slot: event.target.value, module_day_id: event.target.value === 'after_day' ? data.module_day_id : '' }));
                                            form.clearErrors('week_slot');
                                        }}
                                        className={formInputClass(form.errors.week_slot)}
                                    >
                                        <option value="opening">Pembuka Minggu</option>
                                        <option value="after_day">Setelah Hari</option>
                                        <option value="closing">Penutup Minggu</option>
                                    </select>
                                </FormField>
                            )}
                            {resourceType === 'presentation' && (
                                <FormField
                                    label="Urutan"
                                    tooltip="Angka urutan tampil materi dalam modul."
                                    error={form.errors.sort_order}
                                >
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.data.sort_order}
                                        onChange={(event) => {
                                            form.setData('sort_order', event.target.value);
                                            form.clearErrors('sort_order');
                                        }}
                                        className={formInputClass(form.errors.sort_order)}
                                    />
                                </FormField>
                            )}
                            <FormField
                                label="Judul"
                                required
                                tooltip="Judul materi atau deck yang muncul pada daftar belajar siswa."
                                error={form.errors.title}
                            >
                                <input
                                    value={form.data.title}
                                    onChange={(event) => {
                                        form.setData('title', event.target.value);
                                        form.clearErrors('title');
                                    }}
                                    className={formInputClass(form.errors.title)}
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Deskripsi"
                                tooltip="Ringkasan isi materi untuk panduan siswa atau catatan pengajar."
                                error={form.errors.description}
                            >
                                <textarea
                                    value={form.data.description}
                                    onChange={(event) => {
                                        form.setData('description', event.target.value);
                                        form.clearErrors('description');
                                    }}
                                    className={`${formInputClass(form.errors.description)} min-h-24`}
                                    placeholder="Ringkasan singkat untuk admin dan siswa"
                                />
                            </FormField>
                            <FormField
                                label="Level"
                                tooltip="Tingkat kemahiran JLPT sasaran (N5-N1)."
                                error={form.errors.level_id}
                            >
                                <select
                                    value={form.data.level_id}
                                    onChange={(event) => {
                                        form.setData('level_id', event.target.value);
                                        form.clearErrors('level_id');
                                    }}
                                    className={formInputClass(form.errors.level_id)}
                                >
                                    <option value="">Tanpa level khusus</option>
                                    {levels.map((level) => <option key={level.id} value={level.id}>{level.level_name}</option>)}
                                </select>
                            </FormField>
                        </>
                    )}

                    {resourceType === 'quiz' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                label="Tipe Soal Awal"
                                required
                                tooltip="Format dasar pertanyaan default (tiap butir soal nantinya bisa diatur bebas di builder kuis)."
                                error={form.errors.type}
                                hint="Setiap soal dapat memakai tipe berbeda di editor, termasuk listening."
                                className="sm:col-span-2"
                            >
                                <select
                                    value={form.data.type}
                                    onChange={(event) => {
                                        form.setData('type', event.target.value);
                                        form.clearErrors('type');
                                    }}
                                    className={formInputClass(form.errors.type)}
                                    required
                                >
                                    <option value="multiple_choice">Pilihan Ganda</option>
                                    <option value="fill_blank">Mengetik / Isian</option>
                                    <option value="listening">Mendengarkan</option>
                                </select>
                            </FormField>
                            <FormField
                                label="Batas Waktu (detik)"
                                tooltip="Durasi pengerjaan kuis dalam hitungan detik (kosongkan jika tanpa batas waktu)."
                                error={form.errors.time_limit}
                            >
                                <input
                                    type="number"
                                    min="0"
                                    value={form.data.time_limit}
                                    onChange={(event) => {
                                        form.setData('time_limit', event.target.value);
                                        form.clearErrors('time_limit');
                                    }}
                                    className={formInputClass(form.errors.time_limit)}
                                    placeholder="Kosong = tanpa batas"
                                />
                            </FormField>
                            <FormField
                                label="Nilai Lulus"
                                required
                                tooltip="Skor minimum (persentase 1-100) agar siswa dinyatakan lulus kuis ini."
                                error={form.errors.passing_score}
                            >
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={form.data.passing_score}
                                    onChange={(event) => {
                                        form.setData('passing_score', event.target.value);
                                        form.clearErrors('passing_score');
                                    }}
                                    className={formInputClass(form.errors.passing_score)}
                                    required
                                />
                            </FormField>
                        </div>
                    )}

                    <FormField
                        label="Status Awal"
                        tooltip="Draf (belum dapat diakses siswa) atau Terbit (langsung aktif di roadmap)."
                        error={form.errors.status}
                        hint={resourceType === 'quiz' ? 'Tambahkan soal terlebih dahulu sebelum menerbitkan kuis.' : undefined}
                    >
                        <select
                            value={form.data.status}
                            onChange={(event) => {
                                form.setData('status', event.target.value);
                                form.clearErrors('status');
                            }}
                            className={formInputClass(form.errors.status)}
                        >
                            <option value="draft">Draft</option>
                            {resourceType !== 'quiz' && <option value="published">Published</option>}
                        </select>
                    </FormField>

                    {Object.values(form.errors).length > 0 && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            {Object.values(form.errors)[0]}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                        <button type="submit" disabled={form.processing} className={`h-11 rounded-xl text-sm font-black text-white disabled:opacity-50 ${config.accent}`}>
                            {form.processing ? 'Menyimpan...' : `Buat ${displayLabel}`}
                        </button>
                    </div>
                </form>
        </AdminDialog>
    );
}
