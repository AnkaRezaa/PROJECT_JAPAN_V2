import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Card from '@/Components/UI/Card';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const emptyCard = {
    id: null,
    vocabulary_id: null,
    front_text: '',
    reading: '',
    back_text: '',
    meaning_en: '',
    hint: '',
    content_type: 'kosakata',
    jlpt_level: '',
    example_sentence: '',
    example_reading: '',
    example_meaning: '',
    audio_url: '',
    onyomi: '',
    kunyomi: '',
    radicals: [],
    stroke_count: '',
    notes: '',
};

const normalizeCard = (item, keepCardId = true) => {
    const source = item.vocabulary || item;
    const metadata = source.metadata || {};
    const radicals = Array.isArray(metadata.radicals)
        ? metadata.radicals
        : String(metadata.radicals || '').split('|').map((value) => value.trim()).filter(Boolean);

    return {
        ...emptyCard,
        id: keepCardId ? (item.id || null) : null,
        vocabulary_id: source.id || item.vocabulary_id || null,
        front_text: source.word || item.front_text || '',
        reading: source.reading || item.reading || '',
        back_text: source.meaning_id || item.back_text || '',
        meaning_en: source.meaning_en || '',
        hint: source.category || item.hint || '',
        content_type: source.content_type || metadata.content_type || 'kosakata',
        jlpt_level: source.jlpt_level || '',
        example_sentence: source.example_sentence || item.example_sentence || '',
        example_reading: source.example_reading || '',
        example_meaning: source.example_meaning || item.example_meaning || '',
        audio_url: source.audio_url || item.audio_url || '',
        onyomi: metadata.onyomi || '',
        kunyomi: metadata.kunyomi || '',
        radicals,
        stroke_count: metadata.stroke_count || '',
        notes: metadata.notes || '',
    };
};

const fromVocabulary = (item) => normalizeCard(item, false);

export function FlashcardEditorWorkspace({
    set,
    vocabulary = {},
    filters = {},
    quizzes = [],
    embedded = false,
    hostRoute = null,
}) {
    const builderReturnUrl = set.module?.program_pembelajaran_id
        ? route('admin.modules.index', {
            program_id: set.module.program_pembelajaran_id,
            week_id: set.module.id,
            day_id: set.day?.id,
            focus: 'flashcard',
        })
        : route('admin.programs.index');
    const rows = vocabulary.data || [];
    const importInputRef = useRef(null);
    const [cards, setCards] = useState(() => (set.flashcards || []).map((card) => normalizeCard(card)));
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [contentType, setContentType] = useState(filters.content_type || 'all');
    const [setRecordStatus, setSetRecordStatus] = useState(set.status || 'draft');
    const [activeIndex, setActiveIndex] = useState(0);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [showSetSettings, setShowSetSettings] = useState(false);
    const generateForm = useForm({ quiz_id: '', mode: 'word_to_meaning', count: 10 });
    const settingsForm = useForm({
        title: set.title || '',
        description: set.description || '',
        level_id: set.level_id || null,
        module_id: set.module_id,
        module_day_id: set.module_day_id,
        status: set.status || 'draft',
    });
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const activeCard = cards[activeIndex] || null;

    useEffect(() => {
        if (activeIndex > cards.length - 1) {
            setActiveIndex(Math.max(0, cards.length - 1));
        }
    }, [activeIndex, cards.length]);

    const updateCard = (index, field, value) => {
        setCards((current) => current.map((card, cardIndex) => (
            cardIndex === index ? { ...card, [field]: value } : card
        )));
    };

    const addBlankCard = () => {
        setActiveIndex(cards.length);
        setCards((current) => [...current, { ...emptyCard }]);
    };
    const addVocabulary = (item) => {
        setActiveIndex(cards.length);
        setShowLibrary(false);
        setCards((current) => [...current, fromVocabulary(item)]);
    };
    const removeCard = (index) => {
        setCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
        setActiveIndex((current) => Math.max(0, Math.min(current, cards.length - 2)));
    };
    const duplicateCard = (index) => {
        setActiveIndex(index + 1);
        setCards((current) => {
            const card = current[index];
            if (!card) return current;

            const duplicate = { ...card, id: null, vocabulary_id: card.vocabulary_id || null };
            const next = [...current];
            next.splice(index + 1, 0, duplicate);

            return next;
        });
    };

    const moveCard = (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= cards.length) return;

        setActiveIndex(nextIndex);
        setCards((current) => {
            const next = [...current];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            return next;
        });
    };

    const submitFilters = (event) => {
        event.preventDefault();
        const target = embedded && hostRoute
            ? hostRoute
            : route('admin.flashcards.builder', set.id);
        router.get(target, { search, status, content_type: contentType }, { preserveState: true, replace: true });
    };

    const saveCards = () => {
        router.post(route('admin.flashcards.builder.update', set.id), {
            status: setRecordStatus,
            cards: cards.map((card) => ({
                id: card.id,
                vocabulary_id: card.vocabulary_id,
                front_text: card.front_text || '',
                reading: card.reading || '',
                back_text: card.back_text || '',
                meaning_en: card.meaning_en || '',
                hint: card.hint || '',
                content_type: card.content_type || 'kosakata',
        jlpt_level: card.jlpt_level || '',
                example_sentence: card.example_sentence || '',
                example_reading: card.example_reading || '',
                example_meaning: card.example_meaning || '',
                audio_url: card.audio_url || '',
                onyomi: card.onyomi || '',
                kunyomi: card.kunyomi || '',
                radicals: Array.isArray(card.radicals) ? card.radicals : [],
                stroke_count: card.stroke_count || null,
                notes: card.notes || '',
            })),
        }, { preserveScroll: true });
    };

    const generateQuiz = (event) => {
        event.preventDefault();
        generateForm.post(route('admin.flashcards.generate-quiz', set.id), { preserveScroll: true });
    };

    const importCards = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const payload = new FormData();
        payload.append('import_file', file);

        router.post(route('admin.flashcards.import', set.id), payload, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: false,
            onFinish: () => {
                event.target.value = '';
            },
        });
    };

    const updateSet = (event) => {
        event.preventDefault();
        settingsForm.put(route('admin.flashcards.update', set.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSetRecordStatus(settingsForm.data.status);
                setShowSetSettings(false);
            },
        });
    };

    const deleteSet = () => {
        openConfirm({
            variant: 'danger',
            title: 'Hapus Flashcard Day?',
            message: 'Set dan seluruh kartu di dalamnya akan dihapus. Aksi ini tidak dapat dibatalkan.',
            confirmLabel: 'Hapus Flashcard',
            details: [
                { label: 'Set', value: set.title },
                { label: 'Kartu', value: `${cards.length} kartu` },
            ],
            onConfirm: () => router.delete(route('admin.flashcards.destroy', set.id), {
                onFinish: closeConfirm,
            }),
        });
    };

    const workspace = (
            <div className={`space-y-6 ${embedded ? 'py-5' : 'px-4 py-6 sm:px-6 lg:px-8'}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        {!embedded && (
                            <Link href={builderReturnUrl} className="text-xs font-black uppercase tracking-[0.25em] text-teal-600">
                                Kembali ke Hari
                            </Link>
                        )}
                        {embedded && (
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">
                                Flashcard Day
                            </p>
                        )}
                        <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{set.title}</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Week {set.module?.week_number || '-'} → Day {set.day?.day_number || '-'} · Susun satu kartu untuk satu kosakata.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSetSettings(true)}
                            className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
                            Pengaturan
                        </button>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowImportMenu(value => !value)}
                                className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:border-teal-300 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <UploadFileIcon sx={{ fontSize: 18 }} />
                                Import
                            </button>
                            {showImportMenu && (
                                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowImportMenu(false);
                                            importInputRef.current?.click();
                                        }}
                                        className="block w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700 dark:text-gray-200 dark:hover:bg-teal-900/20 dark:hover:text-teal-300"
                                    >
                                        Import CSV / Excel
                                    </button>
                                    <a
                                        href={route('admin.flashcards.template', { flashcardSet: set.id, format: 'xlsx' })}
                                        onClick={() => setShowImportMenu(false)}
                                        className="block border-t border-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                        Unduh Template Excel
                                    </a>
                                    <a
                                        href={route('admin.flashcards.template', { flashcardSet: set.id, format: 'csv' })}
                                        onClick={() => setShowImportMenu(false)}
                                        className="block border-t border-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                        Unduh Template CSV
                                    </a>
                                </div>
                            )}
                        </div>
                        <input ref={importInputRef} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={importCards} />
                        <select value={setRecordStatus} onChange={(event) => setSetRecordStatus(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                        <button onClick={addBlankCard} className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            <AddIcon sx={{ fontSize: 18 }} />
                            Kartu Baru
                        </button>
                        <button onClick={saveCards} className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-black text-white transition-colors hover:bg-brand-700">
                            <SaveOutlinedIcon sx={{ fontSize: 18 }} />
                            Simpan Flashcard
                        </button>
                    </div>
                </div>

                <button type="button" onClick={() => setShowLibrary(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 text-sm font-black text-teal-700 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-300 xl:hidden">
                    <LibraryBooksIcon sx={{ fontSize: 18 }} />
                    Buka Bank Kosakata
                </button>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_360px] xl:gap-6">
                    <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-6 xl:self-start">
                        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Daftar Kartu ({cards.length})</p>
                        </div>
                        <div className="flex max-w-full gap-2 overflow-x-auto p-3 xl:max-h-[70vh] xl:flex-col xl:overflow-y-auto">
                            {cards.map((card, index) => (
                                <button
                                    type="button"
                                    key={`${card.id || 'new'}-${card.vocabulary_id || 'manual'}-${index}`}
                                    onClick={() => setActiveIndex(index)}
                                    className={`w-48 shrink-0 rounded-xl border p-3 text-left transition xl:w-full ${
                                        activeIndex === index
                                            ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500 dark:bg-teal-900/20'
                                            : 'border-gray-100 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Kartu {index + 1}</p>
                                    <p className="mt-1 truncate text-sm font-black text-gray-900 dark:text-white">{card.front_text || 'Kartu baru'}</p>
                                    <p className="mt-0.5 truncate text-xs font-medium text-gray-400">{card.back_text || 'Belum ada arti'}</p>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="space-y-4">
                        {cards.length === 0 && (
                            <Card>
                                <p className="text-center text-sm font-bold text-gray-500">
                                    Belum ada kartu. Ambil dari Vocabulary Bank atau buat kartu manual.
                                </p>
                            </Card>
                        )}

                        {activeCard && (() => {
                            const card = activeCard;
                            const index = activeIndex;

                            return (
                            <Card key={`${card.id || 'new'}-${card.vocabulary_id || 'manual'}-${index}`} className="overflow-hidden border-l-4 border-l-brand-600">
                                <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Kartu #{index + 1}</p>
                                        <h2 className="mt-1 text-lg font-black text-gray-900 dark:text-white">{card.front_text || 'Kartu baru'}</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" title="Pindahkan ke atas" disabled={index === 0} onClick={() => moveCard(index, -1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-300"><ArrowUpwardIcon sx={{ fontSize: 17 }} /></button>
                                        <button type="button" title="Pindahkan ke bawah" disabled={index === cards.length - 1} onClick={() => moveCard(index, 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 dark:border-gray-700 dark:text-gray-300"><ArrowDownwardIcon sx={{ fontSize: 17 }} /></button>
                                        <button type="button" title="Duplikat kartu" onClick={() => duplicateCard(index)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"><ContentCopyIcon sx={{ fontSize: 17 }} /></button>
                                        <button type="button" title="Hapus kartu" onClick={() => removeCard(index)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-600 dark:border-red-900/40"><DeleteOutlineIcon sx={{ fontSize: 17 }} /></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jenis Materi</span>
                                        <select value={card.content_type || 'kosakata'} onChange={(event) => updateCard(index, 'content_type', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                            <option value="kosakata">Kosakata</option>
                                            <option value="kanji">Kanji</option>
                                            <option value="bunpo">Bunpo</option>
                                        </select>
                                    </label>
                                    <label className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Level</span>
                                    <input value={card.jlpt_level || ''} onChange={(event) => updateCard(index, 'jlpt_level', event.target.value)} placeholder="Opsional" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Depan Kartu</span>
                                        <input value={card.front_text || ''} onChange={(event) => updateCard(index, 'front_text', event.target.value)} placeholder="Kata Jepang" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reading</span>
                                        <input value={card.reading || ''} onChange={(event) => updateCard(index, 'reading', event.target.value)} placeholder="Reading / kana" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Belakang Kartu</span>
                                        <input value={card.back_text || ''} onChange={(event) => updateCard(index, 'back_text', event.target.value)} placeholder="Arti bahasa Indonesia" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Arti Inggris</span>
                                        <input value={card.meaning_en || ''} onChange={(event) => updateCard(index, 'meaning_en', event.target.value)} placeholder="English meaning (opsional)" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hint / Kategori</span>
                                        <input value={card.hint || ''} onChange={(event) => updateCard(index, 'hint', event.target.value)} placeholder="Kategori / hint" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contoh Kalimat</span>
                                        <textarea value={card.example_sentence || ''} onChange={(event) => updateCard(index, 'example_sentence', event.target.value)} placeholder="Contoh kalimat" className="min-h-20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Arti Contoh</span>
                                        <textarea value={card.example_meaning || ''} onChange={(event) => updateCard(index, 'example_meaning', event.target.value)} placeholder="Arti contoh kalimat" className="min-h-20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <label className="space-y-1 md:col-span-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reading Contoh</span>
                                        <input value={card.example_reading || ''} onChange={(event) => updateCard(index, 'example_reading', event.target.value)} placeholder="Cara baca contoh kalimat" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    </label>
                                    <input value={card.audio_url || ''} onChange={(event) => updateCard(index, 'audio_url', event.target.value)} placeholder="Audio URL opsional" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white md:col-span-2" />
                                </div>

                                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                                        <div className="mb-3">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">Detail Kanji (Opsional)</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Isi untuk kartu yang memuat kanji. Data yang sama akan tersimpan di bank konten.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <label className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Onyomi</span>
                                                <input value={card.onyomi || ''} onChange={(event) => updateCard(index, 'onyomi', event.target.value)} placeholder="Contoh: カツ" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kunyomi</span>
                                                <input value={card.kunyomi || ''} onChange={(event) => updateCard(index, 'kunyomi', event.target.value)} placeholder="Contoh: わ.る" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Radikal</span>
                                                <input
                                                    value={(card.radicals || []).join(' | ')}
                                                    onChange={(event) => updateCard(index, 'radicals', event.target.value.split('|').map((value) => value.trim()).filter(Boolean))}
                                                    placeholder="Pisahkan dengan |"
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                                />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jumlah Guratan</span>
                                                <input type="number" min="1" max="64" value={card.stroke_count || ''} onChange={(event) => updateCard(index, 'stroke_count', event.target.value)} placeholder="12" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                            </label>
                                            <label className="space-y-1 md:col-span-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Catatan Kanji</span>
                                                <textarea value={card.notes || ''} onChange={(event) => updateCard(index, 'notes', event.target.value)} placeholder="Catatan atau contoh kata turunan" className="min-h-20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                            </label>
                                        </div>
                                </div>
                            </Card>
                            );
                        })()}
                    </div>

                    <aside className={`${showLibrary ? 'fixed inset-0 z-[110] flex justify-end bg-gray-950/60' : 'hidden'} xl:sticky xl:top-6 xl:block xl:self-start xl:bg-transparent`}>
                        <div className={`${showLibrary ? 'h-full w-full max-w-md space-y-4 overflow-y-auto bg-surface-muted p-4 dark:bg-gray-950' : 'space-y-4'}`}>
                            <div className="flex items-center justify-between xl:hidden">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Sumber Kartu</p>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Bank Kosakata</h2>
                                </div>
                                <button type="button" onClick={() => setShowLibrary(false)} title="Tutup bank kosakata" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                    <CloseIcon sx={{ fontSize: 19 }} />
                                </button>
                            </div>
                        <Card>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Bank Konten</h2>
                            <form onSubmit={submitFilters} className="mt-4 space-y-3">
                                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kosakata, kanji, bunpo..." className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                <select value={contentType} onChange={(event) => setContentType(event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="all">Semua Tipe</option>
                                    <option value="kosakata">Kosakata</option>
                                    <option value="kanji">Kanji</option>
                                    <option value="bunpo">Bunpo</option>
                                </select>
                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                        <option value="all">Semua</option>
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                    <button className="h-11 rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">Cari</button>
                                </div>
                            </form>

                            <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                {rows.map((item) => (
                                    <button key={item.id} type="button" onClick={() => addVocabulary(item)} className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-teal-700 dark:hover:bg-teal-950/40">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-lg font-black text-gray-900 dark:text-white">{item.word}</p>
                                                <p className="text-xs font-bold text-gray-500">{item.reading || '-'}</p>
                                            </div>
                                            <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-black text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">Tambah</span>
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{item.meaning_id || item.meaning_en || 'Belum ada arti'}</p>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Generate Quiz</h2>
                            <form onSubmit={generateQuiz} className="mt-4 space-y-3">
                                <select value={generateForm.data.quiz_id} onChange={(event) => generateForm.setData('quiz_id', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="">Pilih kuis tujuan</option>
                                    {quizzes.map((quiz) => (
                                        <option key={quiz.id} value={quiz.id}>#{quiz.id} {quiz.module ? `Week ${quiz.module.week_number || '-'} - ${quiz.module.title}` : (quiz.type || 'Quiz')}</option>
                                    ))}
                                </select>
                                <select value={generateForm.data.mode} onChange={(event) => generateForm.setData('mode', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="word_to_meaning">Kata ke arti</option>
                                    <option value="meaning_to_word">Arti ke kata</option>
                                    <option value="reading_to_word">Reading ke kata</option>
                                </select>
                                <input type="number" min="1" max="50" value={generateForm.data.count} onChange={(event) => generateForm.setData('count', event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                {generateForm.errors.generate && <p className="text-xs font-bold text-red-600">{generateForm.errors.generate}</p>}
                                <button disabled={generateForm.processing} className="h-11 w-full rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-50">
                                    {generateForm.processing ? 'Membuat...' : 'Generate Soal'}
                                </button>
                            </form>
                        </Card>
                        </div>
                    </aside>
                </div>
                {showSetSettings && (
                    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                        <form onSubmit={updateSet} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:rounded-3xl sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600">Pengaturan Flashcard</p>
                                    <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">Informasi set</h2>
                                </div>
                                <button type="button" onClick={() => setShowSetSettings(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" title="Tutup">
                                    <CloseIcon sx={{ fontSize: 19 }} />
                                </button>
                            </div>
                            <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lokasi materi</p>
                                <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">Week {set.module?.week_number || '-'} - {set.module?.title || 'Modul'}</p>
                                <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">Hari {set.day?.day_number || '-'} - {set.day?.title || 'Day'}</p>
                            </div>
                            <div className="mt-5 space-y-4">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Judul set</span>
                                    <input value={settingsForm.data.title} onChange={(event) => settingsForm.setData('title', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" required />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Deskripsi</span>
                                    <textarea value={settingsForm.data.description || ''} onChange={(event) => settingsForm.setData('description', event.target.value)} className="min-h-24 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Status</span>
                                    <select value={settingsForm.data.status} onChange={(event) => settingsForm.setData('status', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </label>
                                {Object.keys(settingsForm.errors).length > 0 && <p className="text-sm font-bold text-brand-600">{Object.values(settingsForm.errors)[0]}</p>}
                            </div>
                            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-between">
                                <button type="button" onClick={deleteSet} className="h-11 rounded-xl border border-red-200 px-4 text-sm font-black text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20">Hapus set</button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowSetSettings(false)} className="h-11 flex-1 rounded-xl border border-gray-200 px-4 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:flex-none">Batal</button>
                                    <button disabled={settingsForm.processing} className="h-11 flex-1 rounded-xl bg-brand-600 px-5 text-sm font-black text-white transition-colors hover:bg-brand-700 disabled:opacity-50 sm:flex-none">{settingsForm.processing ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
                <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
            </div>
    );

    if (embedded) {
        return workspace;
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Builder Flashcard - ${set.title}`} />
            {workspace}
        </AuthenticatedLayout>
    );
}

export default function BuilderFlashcard(props) {
    return <FlashcardEditorWorkspace {...props} />;
}
