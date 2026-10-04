import React, { useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/UI/Card';
import AdminDialog from '@/Components/UI/AdminDialog';
import FormField from '@/Components/UI/FormField';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import SearchableMultiSelect from '@/Components/UI/SearchableMultiSelect';
import StrokeCharacterPreview from '@/Components/Features/Handwriting/StrokeCharacterPreview';
import { resolveAvailableCharacters, writingCharacters } from '@/Components/Features/Handwriting/strokeData';
import BankSoalNavbar from '@/Components/Features/BankSoal/BankSoalNavbar';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SearchIcon from '@mui/icons-material/Search';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import { TooltipHelp } from '@/Components/UI/QuizField';

const emptyForm = {
    content_type: 'kosakata',
    module_id: '',
    module_day_ids: [],
    word: '',
    reading: '',
    meaning_id: '',
    meaning_en: '',
    jlpt_level: '',
    category: '',
    tags_text: '',
    example_sentence: '',
    example_reading: '',
    example_meaning: '',
    audio_url: '',
    onyomi: '',
    kunyomi: '',
    radicals_text: '',
    stroke_count: '',
    notes: '',
    source_type: 'manual',
    source_title: '',
    status: 'draft',
};

const typeLabels = {
    kosakata: 'Kosakata',
    kanji: 'Kanji',
    bunpo: 'Bunpo',
};

const typeBadge = {
    kosakata: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    kanji: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    bunpo: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
};

const inputClass = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30';

const parseTags = (value) => value.split(',').map((tag) => tag.trim()).filter(Boolean);

const toForm = (item) => ({
    content_type: item.content_type || 'kosakata',
    module_id: item.module_id || '',
    module_day_ids: (item.days || []).map((day) => day.id),
    word: item.word || '',
    reading: item.reading || '',
    meaning_id: item.meaning_id || '',
    meaning_en: item.meaning_en || '',
    jlpt_level: item.jlpt_level || '',
    category: item.category || '',
    tags_text: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    example_sentence: item.example_sentence || '',
    example_reading: item.example_reading || '',
    example_meaning: item.example_meaning || '',
    audio_url: item.audio_url || '',
    onyomi: item.metadata?.onyomi || '',
    kunyomi: item.metadata?.kunyomi || '',
    radicals_text: Array.isArray(item.metadata?.radicals) ? item.metadata.radicals.join(' | ') : '',
    stroke_count: item.metadata?.stroke_count || '',
    notes: item.metadata?.notes || '',
    source_type: item.source_type || 'manual',
    source_title: item.source_title || '',
    status: item.status || 'draft',
});

function Field({ label, tooltip, hint, error, required = false, children, wide = false }) {
    return (
        <FormField label={label} tooltip={tooltip} hint={hint} error={error} required={required} wide={wide}>
            {children}
        </FormField>
    );
}

export default function Kosakata({ vocabulary = {}, filters = {}, programs = [], modules = [], importModules = [], availableLevels = [], program = null }) {
    const rows = vocabulary.data || [];
    const importInputRef = useRef(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [jlptLevel, setJlptLevel] = useState(filters.jlpt_level || 'all');
    const [contentType, setContentType] = useState(filters.content_type || 'all');
    const [moduleId, setModuleId] = useState(filters.module_id || 'all');
    const [moduleDayId, setModuleDayId] = useState(filters.module_day_id || 'all');
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [strokePreview, setStrokePreview] = useState(null);
    const form = useForm(emptyForm);
    const importForm = useForm({
        program_id: '',
        module_id: '',
        module_day_id: '',
        content_type: '',
        source_type: 'import',
        import_file: null,
    });
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const contextualModule = modules.find((module) => String(module.id) === String(filters.module_id));
    const programJlptLevel = program?.curriculum_track?.code === 'jlpt'
        ? (program?.level?.level_name?.match(/N[1-5]/i)?.[0]?.toUpperCase() || '')
        : '';

    const openStrokePreview = async (item) => {
        const available = await resolveAvailableCharacters(item.word, item.reading);
        setStrokePreview({
            character: available[0]?.character || writingCharacters(`${item.word || ''}${item.reading || ''}`)[0],
            title: `${item.word} - ${item.meaning_id || item.meaning_en || ''}`,
        });
    };

    const openCreate = () => {
        setEditing(null);
        form.setData({
            ...emptyForm,
            content_type: contentType !== 'all' ? contentType : 'kosakata',
            module_id: moduleId !== 'all' ? moduleId : '',
            module_day_ids: moduleDayId !== 'all' ? [Number(moduleDayId)] : [],
            jlpt_level: programJlptLevel,
        });
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        form.setData(toForm(item));
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        form.reset();
    };

    const submitFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.vocabulary.index'), {
            search,
            status,
            jlpt_level: jlptLevel,
            content_type: contentType,
            module_id: moduleId,
            program_id: filters.program_id,
            module_day_id: moduleDayId,
        }, { preserveState: true, replace: true });
    };

    const submitForm = (event) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            module_id: data.module_id || null,
            module_day_ids: data.module_day_ids || [],
            tags: parseTags(data.tags_text),
            metadata: {
                ...(editing?.metadata || {}),
                content_type: data.content_type,
                onyomi: data.onyomi || null,
                kunyomi: data.kunyomi || null,
                radicals: data.radicals_text.split('|').map((value) => value.trim()).filter(Boolean),
                stroke_count: data.stroke_count ? Number(data.stroke_count) : null,
                notes: data.notes || null,
            },
        }));

        return editing
            ? form.put(route('admin.vocabulary.update', editing.id), { preserveScroll: true, onSuccess: closeForm })
            : form.post(route('admin.vocabulary.store'), { preserveScroll: true, onSuccess: closeForm });
    };

    const resetImportDialog = () => {
        setShowImportDialog(false);
        importForm.clearErrors();
        importForm.reset();
        if (importInputRef.current) importInputRef.current.value = '';
    };

    const openImport = () => {
        const selectedModule = importModules.find((module) => String(module.id) === String(moduleId));
        const selectedDay = selectedModule?.days?.find((day) => String(day.id) === String(moduleDayId));

        importForm.clearErrors();
        importForm.setData({
            program_id: filters.program_id || selectedModule?.program_pembelajaran_id || '',
            module_id: selectedModule?.id || '',
            module_day_id: selectedDay?.id || '',
            content_type: contentType !== 'all' ? contentType : '',
            source_type: 'import',
            import_file: null,
        });
        if (importInputRef.current) importInputRef.current.value = '';
        setShowImportDialog(true);
    };

    const closeImport = () => {
        if (importForm.processing) return;
        resetImportDialog();
    };

    const importVocabulary = () => {
        if (!importForm.data.program_id || !importForm.data.module_id || !importForm.data.import_file) return;

        importForm.post(route('admin.vocabulary.import'), {
            forceFormData: true,
            preserveScroll: true,
            preserveState: false,
            onSuccess: resetImportDialog,
            onError: () => importForm.setData('import_file', null),
            onFinish: () => {
                if (importInputRef.current) importInputRef.current.value = '';
            },
        });
    };

    const importModuleOptions = importModules.filter((module) => String(module.program_pembelajaran_id) === String(importForm.data.program_id));
    const importModule = importModuleOptions.find((module) => String(module.id) === String(importForm.data.module_id));
    const importDays = importModule?.days || [];
    const importDay = importDays.find((day) => String(day.id) === String(importForm.data.module_day_id));
    const importReady = Boolean(importForm.data.program_id && importForm.data.module_id && importForm.data.import_file);
    const importTarget = [
        programs.find((item) => String(item.id) === String(importForm.data.program_id))?.title,
        importModule ? `Week ${importModule.week_number ?? '-'} - ${importModule.title}` : null,
        importDay ? `Hari ${importDay.day_number}` : null,
    ].filter(Boolean).join(' > ');

    const deleteVocabulary = (item) => {
        openConfirm({
            variant: 'danger',
            title: 'Hapus Konten?',
            message: 'Konten ini akan dihapus dari bank dan tidak bisa dipakai lagi untuk flashcard/kuis baru.',
            confirmLabel: 'Iya, Hapus',
            details: [
                { label: 'Tipe', value: typeLabels[item.content_type || 'kosakata'] || 'Konten' },
                { label: 'Konten', value: item.word },
                { label: 'Arti', value: item.meaning_id || item.meaning_en || '-' },
            ],
            onConfirm: () => router.delete(route('admin.vocabulary.destroy', item.id), {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Bank Konten" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <BankSoalNavbar activeTab="vocabulary" stats={{ total_vocabulary: vocabulary?.total || rows?.length }} />
                <section className="relative z-20 rounded-[1.5rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm dark:border-orange-900/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            {contextualModule && (
                                <Link href={route('admin.modules.index', {
                                    program_id: contextualModule.program_pembelajaran_id,
                                    week_id: contextualModule.id,
                                    day_id: filters.module_day_id,
                                    focus: 'roadmap',
                                })} className="mb-2 inline-flex text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                                    Kembali ke Hari
                                </Link>
                            )}
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">Bank Konten</p>
                            <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{program?.title || 'Konten Pembelajaran'}</h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold text-gray-500 dark:text-gray-400">
                                Satu tempat untuk input kosakata, kanji, dan bunpo. Konten bisa dikunci ke modul mingguan lalu dipakai flashcard dan kuis.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={openImport} className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                <FileUploadIcon sx={{ fontSize: 18 }} />
                                Import CSV/Excel
                            </button>
                            <button onClick={openCreate} className="flex h-11 items-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-black text-white shadow-sm">
                                <AddIcon sx={{ fontSize: 18 }} />
                                Tambah
                            </button>
                        </div>
                    </div>
                </section>

                <Card className="shadow-sm">
                    <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_140px_140px_180px_180px_140px_auto]">
                        <label className="flex h-11 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-950">
                            <SearchIcon sx={{ fontSize: 18 }} className="text-gray-400" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari konten, reading, arti, sumber..." className="w-full border-0 bg-transparent text-sm font-semibold outline-none focus:ring-0 dark:text-white" />
                        </label>
                        <select value={contentType} onChange={(event) => setContentType(event.target.value)} className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                            <option value="all">Semua Tipe</option>
                            <option value="kosakata">Kosakata</option>
                            <option value="kanji">Kanji</option>
                            <option value="bunpo">Bunpo</option>
                        </select>
                        <select value={jlptLevel} onChange={(event) => setJlptLevel(event.target.value)} className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                            <option value="all">Semua Level</option>
                            {availableLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                        <SearchableSelect value={moduleId === 'all' ? '' : moduleId} onChange={(value) => { setModuleId(value || 'all'); setModuleDayId('all'); }} placeholder="Semua Modul" searchPlaceholder="Cari week atau judul modul..." allowClear clearLabel="Semua modul" options={modules.map((module) => ({ value: module.id, label: `Week ${module.week_number ?? '-'} - ${module.title}` }))} />
                        <SearchableSelect value={moduleDayId === 'all' ? '' : moduleDayId} onChange={(value) => setModuleDayId(value || 'all')} placeholder="Semua Hari" searchPlaceholder="Cari hari modul..." allowClear clearLabel="Semua hari" options={(modules.find((module) => String(module.id) === String(moduleId))?.days || []).map((day) => ({ value: day.id, label: `Hari ${day.day_number} - ${day.title}` }))} />
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                            <option value="all">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                        <button className="h-11 rounded-2xl bg-gray-950 px-5 text-sm font-black text-white dark:bg-white dark:text-gray-950">Filter</button>
                    </form>
                </Card>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {rows.map((item) => (
                        <article key={item.id} className="overflow-hidden rounded-[1.35rem] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
                            <div className="relative p-5">
                                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-100 dark:bg-orange-950/30" />
                                <div className="relative">
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${typeBadge[item.content_type || 'kosakata'] || typeBadge.kosakata}`}>{typeLabels[item.content_type || 'kosakata'] || 'Konten'}</span>
                                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 dark:bg-orange-900/20">{item.jlpt_level}</span>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.status === 'published' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20'}`}>{item.status}</span>
                                        {item.module && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600 dark:bg-blue-900/20">Week {item.module.week_number ?? '-'}</span>}
                                        {(item.days || []).map((day) => <span key={day.id} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300">Day {day.day_number}</span>)}
                                        {item.category && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{item.category}</span>}
                                    </div>
                                    <h2 className="mt-4 break-words text-4xl font-black text-gray-900 dark:text-white">{item.word}</h2>
                                    <p className="mt-1 break-words text-lg font-bold text-gray-500 dark:text-gray-400">{item.reading || '-'}</p>
                                    <p className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm font-black text-gray-900 dark:bg-gray-950 dark:text-white">{item.meaning_id || item.meaning_en || 'Belum ada arti'}</p>
                                    <p className="mt-3 line-clamp-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{item.example_sentence || item.source_title || 'Contoh/sumber belum diisi.'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
                                <button onClick={() => openStrokePreview(item)} className="flex items-center justify-center gap-1.5 rounded-2xl border border-orange-200 bg-orange-50 px-2 py-2 text-xs font-black text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                                    <DrawOutlinedIcon sx={{ fontSize: 16 }} />
                                    Stroke
                                </button>
                                <button onClick={() => openEdit(item)} className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-200">
                                    <EditIcon sx={{ fontSize: 16 }} />
                                    Edit
                                </button>
                                <button onClick={() => deleteVocabulary(item)} className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 px-4 py-2 text-xs font-black text-red-600 dark:border-red-900/40">
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                    Hapus
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                {rows.length === 0 && (
                    <Card>
                        <p className="text-center text-sm font-bold text-gray-500">Belum ada konten. Tambahkan manual atau import CSV/XLSX.</p>
                    </Card>
                )}

                {vocabulary.links && (
                    <div className="flex flex-wrap justify-center gap-2">
                        {vocabulary.links.map((link, index) => (
                            <Link key={`${link.label}-${index}`} href={link.url || '#'} preserveScroll className={`rounded-xl px-3 py-2 text-xs font-black ${link.active ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                )}

                <AdminDialog
                    open={showImportDialog}
                    onClose={closeImport}
                    eyebrow="Bank Konten"
                    title="Import CSV atau Excel"
                    description="Pilih tujuan konten sebelum mengunggah file. Kelas dan Week wajib dipilih; Hari bersifat opsional."
                    maxWidth="max-w-3xl"
                    footer={(
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {importReady ? `Tujuan: ${importTarget}` : 'Pilih kelas, Week, dan file untuk melanjutkan.'}
                            </p>
                            <div className="flex gap-2 sm:shrink-0">
                                <button type="button" onClick={closeImport} disabled={importForm.processing} className="h-10 flex-1 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 sm:flex-none">
                                    Batal
                                </button>
                                <button type="button" onClick={importVocabulary} disabled={!importReady || importForm.processing} className="h-10 flex-1 rounded-xl bg-brand-600 px-5 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">
                                    {importForm.processing ? 'Mengimpor...' : 'Import Konten'}
                                </button>
                            </div>
                        </div>
                    )}
                >
                    <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Kelas tujuan" tooltip="Pilih program/kelas tempat materi akan diimpor." wide>
                                <SearchableSelect
                                    value={importForm.data.program_id}
                                    onChange={(value) => importForm.setData({
                                        ...importForm.data,
                                        program_id: value || '',
                                        module_id: '',
                                        module_day_id: '',
                                    })}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari nama kelas..."
                                    options={programs.map((item) => ({
                                        value: item.id,
                                        label: item.title,
                                        description: [item.curriculum_track, item.level].filter(Boolean).join(' - '),
                                    }))}
                                />
                            </Field>
                            <Field label="Week tujuan" tooltip="Pilih modul mingguan spesifik sasaran materi.">
                                <SearchableSelect
                                    value={importForm.data.module_id}
                                    onChange={(value) => importForm.setData({
                                        ...importForm.data,
                                        module_id: value || '',
                                        module_day_id: '',
                                    })}
                                    disabled={!importForm.data.program_id}
                                    placeholder={importForm.data.program_id ? 'Pilih Week' : 'Pilih kelas dahulu'}
                                    searchPlaceholder="Cari Week..."
                                    options={importModuleOptions.map((module) => ({
                                        value: module.id,
                                        label: `Week ${module.week_number ?? '-'} - ${module.title}`,
                                    }))}
                                />
                            </Field>
                            <Field label="Hari (opsional)" tooltip="Pilih hari tertentu jika materi hanya untuk sesi belajar harian tersebut.">
                                <SearchableSelect
                                    value={importForm.data.module_day_id}
                                    onChange={(value) => importForm.setData('module_day_id', value || '')}
                                    disabled={!importForm.data.module_id}
                                    placeholder={importForm.data.module_id ? 'Semua Hari dalam Week' : 'Pilih Week dahulu'}
                                    searchPlaceholder="Cari Hari..."
                                    allowClear
                                    clearLabel="Tanpa Hari khusus"
                                    options={importDays.map((day) => ({
                                        value: day.id,
                                        label: `Hari ${day.day_number} - ${day.title}`,
                                    }))}
                                />
                            </Field>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">Gunakan template sesuai kelas</p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Template membawa kolom kosakata, kanji, bunpo, contoh, audio, dan detail stroke.</p>
                                </div>
                                <div className="flex gap-2">
                                    {importForm.data.program_id ? (
                                        <>
                                            <a href={route('admin.vocabulary.template', { format: 'xlsx', program_id: importForm.data.program_id })} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-gray-900 dark:text-emerald-300">Excel</a>
                                            <a href={route('admin.vocabulary.template', { format: 'csv', program_id: importForm.data.program_id })} className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-black text-brand-700 hover:bg-brand-50 dark:border-brand-900/50 dark:bg-gray-900 dark:text-brand-300">CSV</a>
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold text-gray-400">Pilih kelas dahulu</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-900/60 dark:hover:bg-brand-950/20">
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".csv,.txt,.xlsx"
                                className="hidden"
                                onChange={(event) => importForm.setData('import_file', event.target.files?.[0] || null)}
                            />
                            <FileUploadIcon className="text-brand-600 dark:text-brand-400" sx={{ fontSize: 30 }} />
                            <p className="mt-2 text-sm font-black text-gray-900 dark:text-white">
                                {importForm.data.import_file?.name || 'Pilih file CSV atau Excel'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                CSV, TXT, atau XLSX dengan ukuran maksimum 4 MB.
                            </p>
                        </label>

                        {Object.keys(importForm.errors).length > 0 && (
                            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
                                <p className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">Import belum dapat diproses</p>
                                <ul className="mt-2 space-y-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                                    {Object.values(importForm.errors).map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </AdminDialog>

                {showForm && (
                    <AdminDialog
                        open={showForm}
                        onClose={closeForm}
                        eyebrow="Bank Konten"
                        title={editing ? 'Edit Konten' : 'Tambah Konten'}
                        maxWidth="max-w-6xl"
                        contentClassName="p-0"
                    >
                        <form onSubmit={submitForm} className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
                            <aside className="bg-gradient-to-br from-orange-500 to-rose-600 p-6 text-white shrink-0">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">Live Preview</p>
                                <div className="mt-6 rounded-[1.4rem] bg-white/15 p-5 shadow-xl backdrop-blur">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{typeLabels[form.data.content_type] || 'Konten'}</span>
                                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{form.data.status}</span>
                                    </div>
                                    <h3 className="mt-6 break-words text-5xl font-black">{form.data.word || 'Konten'}</h3>
                                    <p className="mt-2 break-words text-lg font-bold text-white/75">{form.data.reading || 'reading / struktur'}</p>
                                    <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-700">{form.data.meaning_id || form.data.meaning_en || 'Arti akan tampil di sini'}</p>
                                </div>
                                <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">
                                    Pilih tipe konten, hubungkan ke modul bila perlu, lalu publish jika siap dipakai user.
                                </p>
                            </aside>

                            <div className="max-h-[78vh] overflow-y-auto p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Tipe Konten" required error={form.errors.content_type} tooltip="Pilih Kosakata umum, Kanji khusus, atau Tata Bahasa (Bunpo).">
                                        <select
                                            value={form.data.content_type}
                                            onChange={(event) => {
                                                form.setData('content_type', event.target.value);
                                                form.clearErrors('content_type');
                                            }}
                                            className={`${inputClass} ${form.errors.content_type ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        >
                                            <option value="kosakata">Kosakata</option>
                                            <option value="kanji">Kanji</option>
                                            <option value="bunpo">Bunpo</option>
                                        </select>
                                    </Field>
                                    <Field label="Modul Mingguan" error={form.errors.module_id} tooltip="Kaitkan materi dengan modul pembelajaran tertentu atau biarkan kosong untuk bank global.">
                                        <SearchableSelect
                                            value={form.data.module_id}
                                            onChange={(moduleId) => {
                                                form.setData((data) => ({ ...data, module_id: moduleId, module_day_ids: [] }));
                                                form.clearErrors('module_id');
                                            }}
                                            options={modules.map((module) => ({
                                                value: module.id,
                                                label: `Week ${module.week_number ?? '-'} - ${module.title}`,
                                            }))}
                                            placeholder="Global / belum dikunci modul"
                                            searchPlaceholder="Cari week atau modul..."
                                            allowClear
                                            clearLabel="Global / belum dikunci modul"
                                        />
                                    </Field>
                                    <Field label="Dipakai pada Day" tooltip="Pilih satu atau beberapa hari sesi belajar tempat materi ini akan muncul." wide>
                                        <SearchableMultiSelect
                                            value={form.data.module_day_ids || []}
                                            onChange={(moduleDayIds) => form.setData('module_day_ids', moduleDayIds)}
                                            placeholder="Pilih satu atau beberapa Day"
                                            searchPlaceholder="Cari Day..."
                                            options={(modules.find((module) => String(module.id) === String(form.data.module_id))?.days || []).map((day) => ({
                                                value: day.id,
                                                label: `Day ${day.day_number} - ${day.title}`,
                                                description: `Week ${modules.find((module) => String(module.id) === String(form.data.module_id))?.week_number || '-'}`,
                                            }))}
                                        />
                                        <span className="mt-1.5 block text-xs font-medium text-gray-500">Pilih lebih dari satu Day bila kosakata dipakai pada beberapa sesi.</span>
                                    </Field>
                                    <Field label="Konten Utama" required error={form.errors.word} tooltip="Teks utama, kanji tunggal, atau frasa grammar (contoh: 会議, 割, 〜ように).">
                                        <input
                                            value={form.data.word}
                                            onChange={(event) => {
                                                form.setData('word', event.target.value);
                                                form.clearErrors('word');
                                            }}
                                            placeholder="会議 / 割 / 〜ように"
                                            className={`${inputClass} ${form.errors.word ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Reading / Struktur" required error={form.errors.reading} tooltip="Cara baca kana (furigana) atau struktur rumus pembentuk tata bahasa.">
                                        <input
                                            value={form.data.reading}
                                            onChange={(event) => {
                                                form.setData('reading', event.target.value);
                                                form.clearErrors('reading');
                                            }}
                                            placeholder="かいぎ / カツ / Vる + ように"
                                            className={`${inputClass} ${form.errors.reading ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Arti Indonesia" required error={form.errors.meaning_id} tooltip="Makna atau terjemahan utama dalam bahasa Indonesia.">
                                        <input
                                            value={form.data.meaning_id}
                                            onChange={(event) => {
                                                form.setData('meaning_id', event.target.value);
                                                form.clearErrors('meaning_id');
                                            }}
                                            placeholder="rapat / diskon / agar"
                                            className={`${inputClass} ${form.errors.meaning_id ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="English Meaning" error={form.errors.meaning_en} tooltip="Makna padanan dalam bahasa Inggris (opsional).">
                                        <input
                                            value={form.data.meaning_en}
                                            onChange={(event) => {
                                                form.setData('meaning_en', event.target.value);
                                                form.clearErrors('meaning_en');
                                            }}
                                            placeholder="meeting"
                                            className={`${inputClass} ${form.errors.meaning_en ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Level Program" tooltip="Level JLPT yang terhubung dari modul/program terkait.">
                                        <input value={form.data.jlpt_level} readOnly placeholder={program?.curriculum_track?.code === 'jlpt' ? 'Pilih kelas JLPT' : 'Tidak digunakan'} className={`${inputClass} bg-gray-50 text-gray-500 dark:bg-gray-900`} />
                                    </Field>
                                    <Field label="Status" required error={form.errors.status} tooltip="Draf (hanya admin yang dapat melihat) atau Published (dapat diakses siswa).">
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
                                    </Field>
                                    <Field label="Kategori" error={form.errors.category} tooltip="Pengelompokan jenis kata (misal: kata benda, verba, kanji N3, ekspresi).">
                                        <input
                                            value={form.data.category}
                                            onChange={(event) => {
                                                form.setData('category', event.target.value);
                                                form.clearErrors('category');
                                            }}
                                            placeholder="noun, kanji, grammar"
                                            className={`${inputClass} ${form.errors.category ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Tags" error={form.errors.tags_text} tooltip="Label kata kunci untuk pencarian mudah, pisahkan dengan koma.">
                                        <input
                                            value={form.data.tags_text}
                                            onChange={(event) => {
                                                form.setData('tags_text', event.target.value);
                                                form.clearErrors('tags_text');
                                            }}
                                            placeholder="daily, week1"
                                            className={`${inputClass} ${form.errors.tags_text ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Contoh Kalimat" error={form.errors.example_sentence} tooltip="Contoh penggunaan kata/kanji dalam kalimat bahasa Jepang yang natural." wide>
                                        <textarea
                                            value={form.data.example_sentence}
                                            onChange={(event) => {
                                                form.setData('example_sentence', event.target.value);
                                                form.clearErrors('example_sentence');
                                            }}
                                            placeholder="Kalimat contoh dalam bahasa Jepang"
                                            className={`${inputClass} min-h-24 ${form.errors.example_sentence ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Reading Contoh" error={form.errors.example_reading} tooltip="Cara baca kana lengkap untuk kalimat contoh di atas.">
                                        <textarea
                                            value={form.data.example_reading}
                                            onChange={(event) => {
                                                form.setData('example_reading', event.target.value);
                                                form.clearErrors('example_reading');
                                            }}
                                            placeholder="Reading contoh"
                                            className={`${inputClass} min-h-24 ${form.errors.example_reading ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Arti Contoh" error={form.errors.example_meaning} tooltip="Terjemahan bahasa Indonesia dari kalimat contoh.">
                                        <textarea
                                            value={form.data.example_meaning}
                                            onChange={(event) => {
                                                form.setData('example_meaning', event.target.value);
                                                form.clearErrors('example_meaning');
                                            }}
                                            placeholder="Arti contoh"
                                            className={`${inputClass} min-h-24 ${form.errors.example_meaning ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Onyomi (opsional)" error={form.errors.onyomi} tooltip="Cara baca China kanji, umumnya ditulis dalam huruf Katakana (contoh: カツ).">
                                        <input
                                            value={form.data.onyomi}
                                            onChange={(event) => {
                                                form.setData('onyomi', event.target.value);
                                                form.clearErrors('onyomi');
                                            }}
                                            placeholder="Contoh: カツ"
                                            className={`${inputClass} ${form.errors.onyomi ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Kunyomi (opsional)" error={form.errors.kunyomi} tooltip="Cara baca asli Jepang kanji, gunakan titik untuk pemisah okurigana (contoh: わ.る).">
                                        <input
                                            value={form.data.kunyomi}
                                            onChange={(event) => {
                                                form.setData('kunyomi', event.target.value);
                                                form.clearErrors('kunyomi');
                                            }}
                                            placeholder="Contoh: わ.る"
                                            className={`${inputClass} ${form.errors.kunyomi ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Radikal (opsional)" error={form.errors.radicals_text} tooltip="Bagian radikal pembentuk kanji, pisahkan dengan tanda pipa | jika lebih dari satu.">
                                        <input
                                            value={form.data.radicals_text}
                                            onChange={(event) => {
                                                form.setData('radicals_text', event.target.value);
                                                form.clearErrors('radicals_text');
                                            }}
                                            placeholder="Pisahkan dengan |"
                                            className={`${inputClass} ${form.errors.radicals_text ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Jumlah Guratan (opsional)" error={form.errors.stroke_count} tooltip="Total goresan guratan kanji (1-64) untuk panduan urutan tulis.">
                                        <input
                                            type="number"
                                            min="1"
                                            max="64"
                                            value={form.data.stroke_count}
                                            onChange={(event) => {
                                                form.setData('stroke_count', event.target.value);
                                                form.clearErrors('stroke_count');
                                            }}
                                            placeholder="12"
                                            className={`${inputClass} ${form.errors.stroke_count ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Catatan Kanji" error={form.errors.notes} tooltip="Penjelasan mnemonic, arti simbolik radikal, atau tips menghafal kanji." wide>
                                        <textarea
                                            value={form.data.notes}
                                            onChange={(event) => {
                                                form.setData('notes', event.target.value);
                                                form.clearErrors('notes');
                                            }}
                                            placeholder="Catatan atau contoh kata turunan"
                                            className={`${inputClass} min-h-20 ${form.errors.notes ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Audio URL" error={form.errors.audio_url} tooltip="Tautan langsung ke file audio pengucapan (MP3/WAV/AAC)." wide>
                                        <input
                                            value={form.data.audio_url}
                                            onChange={(event) => {
                                                form.setData('audio_url', event.target.value);
                                                form.clearErrors('audio_url');
                                            }}
                                            placeholder="Opsional"
                                            className={`${inputClass} ${form.errors.audio_url ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Sumber" error={form.errors.source_type} tooltip="Asal sumber materi (manual, pdf, xlsx, dll).">
                                        <input
                                            value={form.data.source_type}
                                            onChange={(event) => {
                                                form.setData('source_type', event.target.value);
                                                form.clearErrors('source_type');
                                            }}
                                            placeholder="manual, pdf, xlsx, csv"
                                            className={`${inputClass} ${form.errors.source_type ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                    <Field label="Judul Sumber" error={form.errors.source_title} tooltip="Keterangan referensi buku atau modul asal materi.">
                                        <input
                                            value={form.data.source_title}
                                            onChange={(event) => {
                                                form.setData('source_title', event.target.value);
                                                form.clearErrors('source_title');
                                            }}
                                            placeholder="Contoh: Modul Bunpo Minggu 1"
                                            className={`${inputClass} ${form.errors.source_title ? '!border-rose-400 focus:!border-rose-500' : ''}`}
                                        />
                                    </Field>
                                </div>

                                {Object.values(form.errors).length > 0 && !form.errors.word && !form.errors.reading && !form.errors.meaning_id && (
                                    <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-600 dark:bg-brand-950/30">
                                        {Object.values(form.errors)[0]}
                                    </p>
                                )}

                                <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-gray-100 bg-white/95 pt-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                                    <button type="button" onClick={closeForm} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
                                    <button disabled={form.processing} className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white hover:bg-brand-700 transition disabled:opacity-50">
                                        {form.processing ? 'Menyimpan...' : 'Simpan Konten'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </AdminDialog>
                )}
            </div>
            <StrokeCharacterPreview
                character={strokePreview?.character}
                title={strokePreview?.title}
                open={Boolean(strokePreview)}
                onClose={() => setStrokePreview(null)}
            />
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
