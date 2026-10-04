import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import GrammarQuizPreviewDialog from './GrammarQuizPreviewDialog';
import GrammarBulkImportDialog from './GrammarBulkImportDialog';
import Field from '@/Components/UI/QuizField';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';

const clone = (value) => JSON.parse(JSON.stringify(value));
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900/30';
const stageMeta = {
    transformation: { label: 'Transformation', description: 'Perubahan bentuk kata' },
    sentence_builder: { label: 'Sentence Builder', description: 'Susun potongan kalimat' },
    context_choice: { label: 'Context Choice', description: 'Pilih sesuai konteks' },
};



function makeDraft(day, defaultLevel = 'JLPT N5') {
    return {
        id: null,
        category: 'grammar',
        title: '',
        pattern: '',
        level: defaultLevel,
        passingScore: 70,
        xpPerCorrectAnswer: 10,
        intro: {
            meaning: '',
            formula: '',
            explanation: '',
            examples: [
                { japanese: '', reading: '', translation: '' },
            ],
        },
        stages: [
            {
                id: 'transformation',
                label: 'Transformation',
                instruction: 'Ubah ke bentuk yang diperlukan',
                questions: [],
            },
            {
                id: 'sentence_builder',
                label: 'Sentence Builder',
                instruction: 'Susun potongan kalimat',
                questions: [],
            },
            {
                id: 'context_choice',
                label: 'Context Choice',
                instruction: 'Pilih sesuai konteks',
                questions: [],
            },
        ],
    };
}

function makeQuestion(type, index) {
    const base = {
        id: `draft-${type}-${Date.now()}-${index}`,
        type,
        prompt: type === 'transformation'
            ? 'Ubah kata berikut ke bentuk yang diminta.'
            : type === 'sentence_builder'
                ? 'Susun potongan berikut menjadi kalimat yang tepat.'
                : 'Pilih kalimat yang paling sesuai dengan situasi.',
        explanation: '',
    };

    if (type === 'sentence_builder') {
        return {
            ...base,
            context: '',
            tokens: [
                { id: 't1', text: '', reading: '' },
                { id: 't2', text: '', reading: '' },
            ],
            correctOrder: ['t1', 't2'],
        };
    }

    return {
        ...base,
        japanese: type === 'transformation' ? '' : undefined,
        reading: type === 'transformation' ? '' : undefined,
        translation: type === 'transformation' ? '' : undefined,
        context: type === 'context_choice' ? '' : undefined,
        choices: ['', '', '', ''],
        correctAnswer: '',
    };
}


function GrammarBankPickerDialog({ open, onClose, onSelect, initialLevel = 'all' }) {
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState(initialLevel);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (search.trim()) params.append('search', search.trim());
        if (level && level !== 'all') params.append('level', level);

        window.axios.get(`/admin/grammar-banks/picker?${params.toString()}`)
            .then(({ data }) => {
                if (!active) return;
                setItems(data.data || []);
            })
            .catch(() => {
                if (!active) return;
                setError('Gagal memuat bank grammar.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [open, search, level]);

    if (!open) return null;

    const levels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="grammar-bank-picker-title"
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <MenuBookIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <h3 id="grammar-bank-picker-title" className="text-sm font-black text-gray-900 dark:text-white">
                                Pilih dari Bank Grammar
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Muat pola grammar terverifikasi langsung ke materi lesson & generator.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="space-y-2.5 border-b border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pola grammar, arti, atau judul..."
                            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-500 mr-1">Level:</span>
                        {levels.map((lvl) => (
                            <button
                                key={lvl}
                                type="button"
                                onClick={() => setLevel(lvl)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                    level === lvl
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                {lvl === 'all' ? 'Semua' : lvl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {loading && (
                        <div className="py-12 text-center text-xs font-semibold text-gray-400">
                            Memuat daftar Bank Grammar...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-8 text-center text-xs font-bold text-rose-500">
                            {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="py-12 text-center text-xs text-gray-400">
                            Pola grammar tidak ditemukan.
                        </div>
                    )}

                    {!loading && items.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-emerald-300 hover:shadow-xs dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        JLPT {item.jlpt_level}
                                    </span>
                                    <span className="font-japanese text-sm font-black text-gray-900 dark:text-white">
                                        {item.pattern}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {item.title}
                                </p>
                                <p className="text-[11px] text-gray-500 line-clamp-1">
                                    {item.meaning}
                                </p>
                                {item.formula && (
                                    <p className="text-[10px] font-japanese text-emerald-700 dark:text-emerald-400 line-clamp-1">
                                        Rumus: {item.formula}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                                className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-2xs"
                            >
                                Gunakan Pola
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function IntroEditor({ draft, onChange, onOpenBankPicker, fieldErrors = {}, onClearError }) {
    const updateIntro = (field, value) => onChange({ ...draft, intro: { ...draft.intro, [field]: value } });
    const updateExample = (index, field, value) => updateIntro('examples', draft.intro.examples.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
    )));
    const addExample = () => updateIntro('examples', [...draft.intro.examples, { japanese: '', reading: '', translation: '' }]);
    const removeExample = (index) => updateIntro('examples', draft.intro.examples.filter((_, itemIndex) => itemIndex !== index));

    const levels = ['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'JLPT N1'];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-800 dark:text-emerald-300">
                        ⚡ Sumber Materi:
                    </span>
                    {onOpenBankPicker && (
                        <button
                            type="button"
                            onClick={onOpenBankPicker}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white shadow-2xs transition hover:bg-emerald-700"
                        >
                            <MenuBookIcon sx={{ fontSize: 13 }} />
                            Pilih dari Bank Grammar
                        </button>
                    )}
                </div>

            </div>

            <div>
                <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Level JLPT <span className="text-rose-500 font-black">*</span></span>
                <div className="flex flex-wrap gap-1.5">
                    {levels.map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            onClick={() => onChange({ ...draft, level: lvl })}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                draft.level === lvl
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Pola Grammar"
                    required
                    error={fieldErrors['lesson.pattern'] || fieldErrors.pattern}
                    tooltip="Pola tata bahasa utama yang dipelajari, misal: 〜ば〜ほど atau 〜てはいけない."
                >
                    <input
                        className={`${inputClass} font-japanese ${(fieldErrors['lesson.pattern'] || fieldErrors.pattern) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.pattern}
                        onChange={(event) => {
                            onChange({ ...draft, pattern: event.target.value });
                            onClearError?.('pattern', 'lesson.pattern');
                        }}
                        placeholder="Contoh: ～ば～ほど"
                    />
                </Field>
                <Field
                    label="Arti Pola"
                    required
                    error={fieldErrors['lesson.meaning'] || fieldErrors.meaning}
                    tooltip="Makna atau arti umum dari pola ini dalam bahasa Indonesia, misal: Semakin..., semakin..."
                >
                    <input
                        className={`${inputClass} ${(fieldErrors['lesson.meaning'] || fieldErrors.meaning) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.intro.meaning}
                        onChange={(event) => {
                            updateIntro('meaning', event.target.value);
                            onClearError?.('meaning', 'lesson.meaning');
                        }}
                        placeholder="Contoh: Semakin..., semakin..."
                    />
                </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Judul Materi"
                    required
                    error={fieldErrors['lesson.title'] || fieldErrors.title}
                    tooltip="Judul ringkas materi pelajaran yang ditampilkan pada kartu awal lesson siswa."
                >
                    <input
                        className={`${inputClass} ${(fieldErrors['lesson.title'] || fieldErrors.title) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.title}
                        onChange={(event) => {
                            onChange({ ...draft, title: event.target.value });
                            onClearError?.('title', 'lesson.title');
                        }}
                        placeholder="Judul ringkas materi"
                    />
                </Field>
                <Field
                    label="Rumus Pola"
                    required
                    error={fieldErrors['lesson.formula'] || fieldErrors.formula}
                    tooltip="Aturan pembentukan kalimat, misal: V-ば + V-辞書形 + ほど atau V-て + はいけない."
                >
                    <input
                        className={`${inputClass} font-japanese ${(fieldErrors['lesson.formula'] || fieldErrors.formula) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.intro.formula}
                        onChange={(event) => {
                            updateIntro('formula', event.target.value);
                            onClearError?.('formula', 'lesson.formula');
                        }}
                        placeholder="Contoh: V-ば + V-辞書形 + ほど"
                    />
                </Field>
            </div>

            <Field
                label="Penjelasan Singkat"
                tooltip="Penjelasan kontekstual mengenai nuansa dan situasi penggunaan pola ini."
            >
                <textarea className={`${inputClass} min-h-20 resize-y`} value={draft.intro.explanation} onChange={(event) => updateIntro('explanation', event.target.value)} placeholder="Penjelasan nuansa dan cara penggunaan..." />
            </Field>

            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white">Contoh Kalimat (3–5 butir)</p>
                        <p className="text-[11px] font-medium text-gray-400">Gunakan tanda | jika ingin menentukan potongan segmen kalimat secara spesifik.</p>
                    </div>
                    <button type="button" onClick={addExample} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <AddIcon sx={{ fontSize: 14 }} />Tambah contoh
                    </button>
                </div>
                <div className="mt-2.5 space-y-2.5">
                    {draft.intro.examples.map((example, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-gray-400">Contoh {index + 1}</span>
                                <button type="button" title="Hapus contoh" disabled={draft.intro.examples.length <= 1} onClick={() => removeExample(index)} className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30">
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <Field
                                    label="Kalimat Jepang"
                                    required
                                    error={fieldErrors[`lesson.examples.${index}.japanese`]}
                                    tooltip="Kalimat bahasa Jepang lengkap. Beri tanda | untuk memotong kata jika ingin dijadikan bahan soal susun kalimat (Sentence Builder)."
                                >
                                    <input
                                        className={`${inputClass} !py-2 text-xs font-japanese ${fieldErrors[`lesson.examples.${index}.japanese`] ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                        value={example.japanese}
                                        onChange={(event) => {
                                            updateExample(index, 'japanese', event.target.value);
                                            onClearError?.(`lesson.examples.${index}.japanese`);
                                        }}
                                        placeholder="日本語例文"
                                    />
                                </Field>
                                <Field
                                    label="Cara Baca"
                                    tooltip="Cara baca kalimat (hiragana atau romaji) untuk mempermudah siswa."
                                >
                                    <input className={`${inputClass} !py-2 text-xs`} value={example.reading} onChange={(event) => updateExample(index, 'reading', event.target.value)} placeholder="yomikata" />
                                </Field>
                                <Field
                                    label="Arti Indonesia"
                                    required
                                    error={fieldErrors[`lesson.examples.${index}.translation`]}
                                    tooltip="Terjemahan wajar kalimat contoh ke dalam bahasa Indonesia."
                                >
                                    <input
                                        className={`${inputClass} !py-2 text-xs ${fieldErrors[`lesson.examples.${index}.translation`] ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                        value={example.translation}
                                        onChange={(event) => {
                                            updateExample(index, 'translation', event.target.value);
                                            onClearError?.(`lesson.examples.${index}.translation`);
                                        }}
                                        placeholder="Terjemahan..."
                                    />
                                </Field>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GenerationSettings({ settings, onChange, onGenerate, isGenerating = false, onSaveDraft, saving = false }) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
                {Object.entries(stageMeta).map(([key, meta]) => (
                    <div key={key} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                        <span className="block text-xs font-black text-gray-900 dark:text-white">{meta.label}</span>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-gray-500">Soal</span>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={settings.counts[key] || 5}
                                onChange={(event) => onChange({
                                    ...settings,
                                    counts: {
                                        ...settings.counts,
                                        [key]: Math.max(1, Math.min(20, Number(event.target.value) || 1))
                                    }
                                })}
                                className="h-8 w-16 rounded-lg border border-gray-200 bg-white px-1 text-center text-xs font-black dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Tingkat Kesulitan"
                    tooltip="Kombinasi kompleksitas kosakata dan pola pengecoh yang dihasilkan."
                >
                    <select
                        className={inputClass}
                        value={settings.difficulty}
                        onChange={(event) => onChange({ ...settings, difficulty: event.target.value })}
                    >
                        <option value="mixed">Campuran (Mixed)</option>
                        <option value="easy">Mudah (Easy)</option>
                        <option value="medium">Sedang (Medium)</option>
                        <option value="hard">Sulit (Hard)</option>
                    </select>
                </Field>
                <Field
                    label="Target Konjugasi (Stage 1)"
                    tooltip="Pilih bentuk kata kerja target untuk soal transformasi. Pilih 'Otomatis' untuk deteksi dari rumus/pola."
                >
                    <select
                        className={inputClass}
                        value={settings.target_form || 'auto'}
                        onChange={(event) => onChange({ ...settings, target_form: event.target.value })}
                    >
                        <option value="auto">Otomatis (Deteksi dari Pola/Rumus)</option>
                        <option value="te">Bentuk ~て (Te-form)</option>
                        <option value="ta">Bentuk ~た (Ta-form / Lampau)</option>
                        <option value="nai">Bentuk ~ない (Nai-form / Negatif)</option>
                        <option value="ba">Bentuk ~ば (Ba-form / Pengandaian)</option>
                        <option value="stem">Bentuk ~ます / Stem</option>
                        <option value="dict">Bentuk Kamus / Kamus (Jishokei)</option>
                        <option value="potential">Bentuk Kesanggupan (Potential)</option>
                        <option value="passive">Bentuk Pasif (Ukemi)</option>
                        <option value="causative">Bentuk Kausatif (Shieki)</option>
                    </select>
                </Field>
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.useDistractors}
                        onChange={(event) => onChange({ ...settings, useDistractors: event.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Pengecoh Partikel (Distractors)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.autoMeaning}
                        onChange={(event) => onChange({ ...settings, autoMeaning: event.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Auto-arti Indonesia</span>
                </label>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <p className="font-black">✨ Smart Generator Terhubung</p>
                <p className="mt-0.5 text-emerald-800/80 dark:text-emerald-300">
                    Generator membedah kata kerja untuk Stage 1, partikel pengecoh untuk Stage 2, dan situasi kontekstual dari Bank Soal untuk Stage 3.
                </p>
            </div>

            <div className="space-y-2 pt-1">
                <button
                    type="button"
                    disabled={isGenerating}
                    onClick={onGenerate}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-xs font-black text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                >
                    <AutoAwesomeIcon sx={{ fontSize: 18 }} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? 'Meng-generate Soal Otomatis...' : '✨ Generate Lesson / Soal Otomatis'}
                </button>
                <button
                    type="button"
                    disabled={saving}
                    onClick={onSaveDraft}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                    {saving ? 'Menyimpan Draf...' : '💾 Simpan Draf'}
                </button>
            </div>
        </div>
    );
}

function questionReady(question) {
    if (!question.prompt?.trim() || !question.explanation?.trim()) return false;
    if (question.type === 'sentence_builder') return question.tokens?.filter((token) => !token.distractor && token.text?.trim()).length >= 2;
    return Boolean(question.correctAnswer?.trim()) && question.choices?.filter((choice) => choice?.trim()).length >= 2 && question.choices.includes(question.correctAnswer);
}

function ChoiceEditor({ question, onChange }) {
    const updateChoice = (index, value) => {
        const choices = [...question.choices];
        const previous = choices[index];
        choices[index] = value;
        onChange({ ...question, choices, correctAnswer: question.correctAnswer === previous ? value : question.correctAnswer });
    };

    const setCorrectAnswer = (value) => {
        onChange({ ...question, correctAnswer: value });
    };

    return (
        <div className="space-y-4">
            <Field label="Instruksi" required tooltip="Teks panduan atau instruksi pengerjaan yang muncul di atas soal bagi siswa."><input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} /></Field>
            {question.type === 'transformation' ? (
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Kata Jepang" required tooltip="Kata kerja atau kosakata dasar yang perlu diubah bentuknya oleh siswa."><input className={`${inputClass} font-japanese`} value={question.japanese || ''} onChange={(event) => onChange({ ...question, japanese: event.target.value })} /></Field>
                    <Field label="Cara baca" tooltip="Cara baca kanji dalam hiragana."><input className={inputClass} value={question.reading || ''} onChange={(event) => onChange({ ...question, reading: event.target.value })} /></Field>
                    <Field label="Arti" required tooltip="Arti kata dasar dalam bahasa Indonesia."><input className={inputClass} value={question.translation || ''} onChange={(event) => onChange({ ...question, translation: event.target.value })} /></Field>
                </div>
            ) : <Field label="Situasi" required tooltip="Skenario atau kalimat pengantar konteks situasi yang menjadi pokok soal."><textarea className={`${inputClass} min-h-20`} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Pilihan Jawaban <span className="text-rose-500 font-black">*</span> (Klik bulatan untuk memilih kunci jawaban)
                    </span>
                    {question.correctAnswer && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Kunci: {question.correctAnswer}
                        </span>
                    )}
                </div>
                <div className="space-y-2.5">
                    {question.choices.map((choice, index) => {
                        const optLetter = String.fromCharCode(65 + index);
                        const isCorrect = Boolean(question.correctAnswer && question.correctAnswer === choice && choice.trim() !== '');

                        return (
                            <div
                                key={index}
                                className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all ${
                                    isCorrect
                                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500 dark:bg-emerald-950/20'
                                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950'
                                }`}
                            >
                                <button
                                    type="button"
                                    title={`Jadikan Pilihan ${optLetter} sebagai Kunci Jawaban`}
                                    onClick={() => setCorrectAnswer(choice)}
                                    className="shrink-0 flex items-center justify-center p-0.5 rounded-full text-emerald-600 hover:scale-105 transition"
                                >
                                    {isCorrect ? (
                                        <CheckCircleIcon sx={{ fontSize: 24 }} className="text-emerald-600" />
                                    ) : (
                                        <RadioButtonUncheckedIcon sx={{ fontSize: 24 }} className="text-gray-300 hover:text-emerald-500" />
                                    )}
                                </button>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                    isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                    {optLetter}
                                </span>
                                <input
                                    className="flex-1 border-0 bg-transparent text-sm font-japanese font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-white"
                                    value={choice}
                                    onChange={(event) => updateChoice(index, event.target.value)}
                                    placeholder={`Ketik pilihan ${optLetter}...`}
                                />
                                {isCorrect && (
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                        Kunci Benar
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Field label="Feedback jawaban" required tooltip="Penjelasan materi yang muncul setelah siswa menjawab (alasan kenapa jawaban tersebut benar/salah)."><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
        </div>
    );
}

function SentenceBuilderEditor({ question, onChange }) {
    const [rawSentence, setRawSentence] = useState('');
    const quickDistractors = ['まで', 'のに', 'から', 'より', 'だけ', 'しか', 'には', 'でも', 'ほど', 'ばかり'];

    const syncTokens = (tokens) => onChange({
        ...question,
        tokens,
        correctOrder: tokens.filter((token) => !token.distractor).map((token) => token.id),
    });
    const updateToken = (index, field, value) => syncTokens(question.tokens.map((token, tokenIndex) => tokenIndex === index ? { ...token, [field]: value } : token));
    const addToken = () => syncTokens([...question.tokens, { id: `t${Date.now()}`, text: '', reading: '', distractor: false }]);
    const removeToken = (index) => syncTokens(question.tokens.filter((_, tokenIndex) => tokenIndex !== index));

    const handleAutoSplit = () => {
        if (!rawSentence.trim()) return;
        const parts = rawSentence.includes('|')
            ? rawSentence.split('|').map((s) => s.trim()).filter(Boolean)
            : rawSentence.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) return;
        const newTokens = parts.map((text, idx) => ({
            id: `t_${Date.now()}_${idx + 1}`,
            text,
            reading: '',
            distractor: false,
        }));
        syncTokens(newTokens);
        setRawSentence('');
    };

    const handleAddDistractor = (word) => {
        const id = `dist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        syncTokens([...question.tokens, { id, text: word, reading: '', distractor: true }]);
    };

    return (
        <div className="space-y-4">
            {/* Auto-Split Helper Box */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="block text-xs font-black text-emerald-900 dark:text-emerald-300">
                    ⚡ Auto-Split Kalimat Cepat (Pemisah |)
                </span>
                <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Ketik atau tempel kalimat utuh dengan tanda pipa | untuk otomatis dipecah menjadi potongan kata berurutan.
                </p>
                <div className="mt-2 flex gap-2">
                    <input
                        className={`${inputClass} !py-2 text-xs font-japanese`}
                        value={rawSentence}
                        onChange={(e) => setRawSentence(e.target.value)}
                        placeholder="Contoh: 勉強すれば | するほど | 上手になります"
                    />
                    <button
                        type="button"
                        onClick={handleAutoSplit}
                        disabled={!rawSentence.trim()}
                        className="shrink-0 flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition disabled:opacity-40"
                    >
                        <BoltIcon sx={{ fontSize: 16 }} />
                        Pecah Token
                    </button>
                </div>

                {/* Quick distractor pills */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-gray-500 font-bold">Tambah Pengecoh:</span>
                    {quickDistractors.map((word) => (
                        <button
                            key={word}
                            type="button"
                            onClick={() => handleAddDistractor(word)}
                            className="px-2 py-0.5 rounded-md border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-japanese font-bold text-xs hover:bg-emerald-100 transition"
                        >
                            + {word}
                        </button>
                    ))}
                </div>
            </div>

            <Field label="Instruksi" required tooltip="Teks panduan pengerjaan yang muncul di atas soal susun kalimat untuk siswa."><input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} /></Field>
            <Field label="Arti atau konteks" required tooltip="Arti kalimat utuh atau petunjuk situasi dalam bahasa Indonesia."><input className={inputClass} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>
            <div>
                <div className="flex items-center justify-between"><span className="text-xs font-black text-gray-600 dark:text-gray-300">Potongan kalimat (Token) <span className="text-rose-500 font-black">*</span></span><button type="button" onClick={addToken} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 px-2 text-[11px] font-black text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"><AddIcon sx={{ fontSize: 14 }} />Tambah Manual</button></div>
                <div className="mt-2 space-y-2">
                    {question.tokens.map((token, index) => (
                        <div key={token.id} className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-[1fr_1fr_auto_auto] dark:border-gray-800 dark:bg-gray-950/40">
                            <input className={`${inputClass} font-japanese`} value={token.text} onChange={(event) => updateToken(index, 'text', event.target.value)} placeholder={`Potongan ${index + 1}`} />
                            <input className={inputClass} value={token.reading || ''} onChange={(event) => updateToken(index, 'reading', event.target.value)} placeholder="Cara baca" />
                            <label className="flex items-center gap-2 px-2 text-xs font-bold text-gray-500"><input type="checkbox" checked={Boolean(token.distractor)} onChange={(event) => updateToken(index, 'distractor', event.target.checked)} className="rounded text-emerald-600" />Pengecoh</label>
                            <button type="button" title="Hapus potongan" disabled={question.tokens.length <= 2} onClick={() => removeToken(index)} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-500 disabled:opacity-30"><DeleteOutlineIcon sx={{ fontSize: 17 }} /></button>
                        </div>
                    ))}
                </div>
            </div>
            <Field label="Feedback jawaban" required tooltip="Penjelasan materi yang muncul setelah siswa menjawab."><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
        </div>
    );
}

function ReviewQuestions({
    draft,
    onChange,
    activeStageId = 'transformation',
    onStageChange,
    onRegenerateSingle,
    regeneratingKey,
    onRegenerateAll,
    isGenerating = false,
    onPreview,
    onTogglePublish,
    saving = false,
}) {
    const [internalStageId, setInternalStageId] = useState(activeStageId);
    const [activeIndex, setActiveIndex] = useState(0);

    const currentStageId = onStageChange ? activeStageId : internalStageId;
    const handleSetStageId = (newStageId) => {
        if (onStageChange) onStageChange(newStageId);
        setInternalStageId(newStageId);
        setActiveIndex(0);
    };

    const stageIndex = draft.stages.findIndex((stage) => stage.id === currentStageId);
    const stage = draft.stages[stageIndex] || draft.stages[0];
    const updateQuestions = (questions) => onChange({
        ...draft,
        stages: draft.stages.map((item, index) => (index === stageIndex ? { ...item, questions } : item)),
    });
    const activeQuestion = stage.questions[activeIndex] || stage.questions[0] || null;

    useEffect(() => {
        if (activeIndex > stage.questions.length - 1) {
            setActiveIndex(Math.max(0, stage.questions.length - 1));
        }
    }, [activeIndex, stage.questions.length]);
    const updateActiveQuestion = (updatedQ) => {
        const nextQuestions = stage.questions.map((q, idx) => (idx === activeIndex ? updatedQ : q));
        updateQuestions(nextQuestions);
    };
    const duplicate = (index) => {
        const questions = [...stage.questions];
        questions.splice(index + 1, 0, { ...clone(stage.questions[index]), id: `draft-${currentStageId}-${Date.now()}` });
        updateQuestions(questions);
        setActiveIndex(index + 1);
    };
    const remove = (index) => {
        if (stage.questions.length <= 1) return;
        updateQuestions(stage.questions.filter((_, itemIndex) => itemIndex !== index));
        setActiveIndex((prev) => Math.max(0, Math.min(prev, stage.questions.length - 2)));
    };

    const addManualQuestion = () => {
        const newQ = makeQuestion(currentStageId, stage.questions.length);
        updateQuestions([...stage.questions, newQ]);
        setActiveIndex(stage.questions.length);
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                {/* Stage Tabs */}
                <div className="flex gap-2 overflow-x-auto">
                    {draft.stages.map((item) => {
                        const isActive = currentStageId === item.id;
                        const readyCount = item.questions.filter(questionReady).length;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSetStageId(item.id)}
                                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}
                            >
                                <span>{stageMeta[item.id]?.label || item.id}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isActive
                                        ? 'bg-emerald-800 text-emerald-100'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {readyCount}/{item.questions.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={addManualQuestion}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-sm"
                    >
                        <AddIcon sx={{ fontSize: 16 }} />
                        Tambah Soal Manual
                    </button>
                    <button
                        type="button"
                        disabled={isGenerating}
                        onClick={onRegenerateAll}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                        <RefreshIcon sx={{ fontSize: 15 }} className={isGenerating ? 'animate-spin' : ''} />
                        Regenerate Semua
                    </button>
                    <button
                        type="button"
                        onClick={onPreview}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                    >
                        <VisibilityIcon sx={{ fontSize: 15 }} />
                        Preview Siswa
                    </button>
                    {Number.isInteger(Number(draft.id)) && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onTogglePublish}
                            className={`flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-black transition disabled:opacity-50 ${
                                draft.status === 'published'
                                    ? 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                                    : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900'
                            }`}
                        >
                            {draft.status === 'published' ? 'Jadikan Draf' : '🚀 Publish Lesson'}
                        </button>
                    )}
                </div>
            </div>

            {/* Workspace 2-Kolom Bergaya Builder Kosakata */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                {/* Kolom Kiri: Sidebar Daftar Soal (4 cols) */}
                <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Daftar Soal ({stageMeta[currentStageId]?.label})
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                {stage.questions.length} butir · {stage.questions.filter(questionReady).length} siap
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={addManualQuestion}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                            <AddIcon sx={{ fontSize: 15 }} />
                            Tambah
                        </button>
                    </div>

                    {/* List Items */}
                    <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                        {stage.questions.map((question, index) => {
                            const isSelected = index === activeIndex;
                            const ready = questionReady(question);

                            return (
                                <div
                                    key={question.id || index}
                                    onClick={() => setActiveIndex(index)}
                                    className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
                                        isSelected
                                            ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:bg-gray-950/40 dark:hover:bg-gray-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                                isSelected
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                Q{index + 1}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                            ready
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        }`}>
                                            {ready ? <CheckCircleOutlinedIcon sx={{ fontSize: 11 }} /> : <ErrorOutlineRoundedIcon sx={{ fontSize: 11 }} />}
                                            {ready ? 'Siap' : 'Belum'}
                                        </span>
                                    </div>

                                    <p className="mt-2 line-clamp-2 text-xs font-bold text-gray-900 dark:text-white">
                                        {question.prompt || <span className="italic text-gray-400">Prompt belum diisi</span>}
                                    </p>

                                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                                        <span className="truncate max-w-[130px] font-japanese font-semibold">
                                            {question.type === 'sentence_builder'
                                                ? `${question.tokens?.length || 0} potongan token`
                                                : (question.correctAnswer ? `Kunci: ${question.correctAnswer}` : 'Kunci belum dipilih')}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                type="button"
                                                title="Duplikat Soal"
                                                onClick={(e) => { e.stopPropagation(); duplicate(index); }}
                                                className="p-1 text-gray-400 hover:text-emerald-600 rounded transition"
                                            >
                                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Hapus Soal"
                                                disabled={stage.questions.length <= 1}
                                                onClick={(e) => { e.stopPropagation(); remove(index); }}
                                                className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-20 rounded transition"
                                            >
                                                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Kolom Kanan: Form Editor In-Place Soal Aktif (8 cols) */}
                <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    {activeQuestion ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-sm">
                                        {activeIndex + 1}
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                            Editor Soal #{activeIndex + 1}
                                        </h3>
                                        <p className="text-[11px] text-gray-400">
                                            {stageMeta[currentStageId]?.label} · {stageMeta[currentStageId]?.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        title="Regenerasi variasi soal ini dengan AI"
                                        disabled={Boolean(regeneratingKey)}
                                        onClick={() => onRegenerateSingle(currentStageId, activeIndex)}
                                        className="flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    >
                                        <RefreshIcon sx={{ fontSize: 14 }} className={regeneratingKey === `${currentStageId}-${activeIndex}` ? 'animate-spin' : ''} />
                                        Variasi AI
                                    </button>
                                    <button
                                        type="button"
                                        title="Duplikat soal ini"
                                        onClick={() => duplicate(activeIndex)}
                                        className="flex h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        Duplikat
                                    </button>
                                    <button
                                        type="button"
                                        title="Hapus soal ini"
                                        disabled={stage.questions.length <= 1}
                                        onClick={() => remove(activeIndex)}
                                        className="flex h-8 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-30 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                        Hapus
                                    </button>
                                </div>
                            </div>

                            {/* Form Input Komponen */}
                            {currentStageId === 'sentence_builder' ? (
                                <SentenceBuilderEditor question={activeQuestion} onChange={updateActiveQuestion} />
                            ) : (
                                <ChoiceEditor question={activeQuestion} onChange={updateActiveQuestion} />
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
                                <FormatListBulletedIcon sx={{ fontSize: 28 }} />
                            </div>
                            <h4 className="mt-3 text-sm font-black text-gray-900 dark:text-white">
                                Belum ada soal pada stage ini
                            </h4>
                            <p className="mt-1 text-xs text-gray-500 max-w-sm">
                                Tambahkan butir soal baru secara manual atau generate paket soal lengkap menggunakan Smart Generator.
                            </p>
                            <button
                                type="button"
                                onClick={addManualQuestion}
                                className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-sm"
                            >
                                <AddIcon sx={{ fontSize: 16 }} />
                                Tambah Soal Manual Sekarang
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BuilderKuisGrammar({ open, day, module, onClose }) {
    const defaultLevel = module?.program?.level?.name || 'JLPT N5';
    const [draft, setDraft] = useState(() => makeDraft(day, defaultLevel));
    const [activeMainTab, setActiveMainTab] = useState('questions');
    const [activeStageId, setActiveStageId] = useState('transformation');
    const [settings, setSettings] = useState({
        counts: { transformation: 5, sentence_builder: 5, context_choice: 5 },
        difficulty: 'mixed',
        target_form: 'auto',
        useDistractors: true,
        autoMeaning: true,
    });
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [regeneratingKey, setRegeneratingKey] = useState(null);
    const [generatorSuccess, setGeneratorSuccess] = useState('');
    const [savedAt, setSavedAt] = useState('');
    const [lessons, setLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const clearFieldError = (...keys) => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            keys.forEach((k) => delete next[k]);
            return next;
        });
    };

    useEffect(() => {
        if (!open) return undefined;
        let active = true;
        setDraft(makeDraft(day, defaultLevel));
        setLessons([]);
        setError('');
        setFieldErrors({});
        setGeneratorSuccess('');
        window.axios.get(`/admin/module-days/${day.id}/grammar-quizzes`)
            .then(({ data }) => {
                if (!active) return;
                const available = data.lessons || [];
                setLessons(available);
                if (available[0]) setDraft(available[0]);
            })
            .catch(() => active && setError('Data Grammar belum dapat dimuat.'));
        setSavedAt('');
        return () => { active = false; };
    }, [day?.id, open, defaultLevel]);

    useScrollLock(open);

    const totals = useMemo(() => {
        const questions = draft.stages.flatMap((stage) => stage.questions);
        return { total: questions.length, ready: questions.filter(questionReady).length };
    }, [draft]);

    const requestPayload = () => ({
        passing_score: draft.passingScore || 70,
        time_limit: draft.timeLimit || null,
        settings,
        lesson: {
            lesson_key: draft.lessonKey || undefined,
            level: draft.level,
            pattern: draft.pattern,
            title: draft.title,
            meaning: draft.intro.meaning,
            formula: draft.intro.formula,
            explanation: draft.intro.explanation,
            examples: draft.intro.examples,
        },
        stages: draft.stages.map((stage) => ({
            ...stage,
            questions: stage.questions.map((question) => ({
                ...question,
                id: Number.isInteger(Number(question.id)) ? Number(question.id) : undefined,
            })),
        })),
    });

    const saveDraft = async () => {
        setError('');
        setFieldErrors({});
        setGeneratorSuccess('');

        const errs = {};
        if (!draft.pattern?.trim()) {
            errs['lesson.pattern'] = 'Pola Grammar wajib diisi.';
        }
        if (!draft.title?.trim()) {
            errs['lesson.title'] = 'Judul materi grammar wajib diisi.';
        }
        if (!draft.intro?.meaning?.trim()) {
            errs['lesson.meaning'] = 'Arti pola grammar wajib diisi.';
        }
        if (!draft.intro?.formula?.trim()) {
            errs['lesson.formula'] = 'Rumus pola grammar wajib diisi.';
        }
        (draft.intro?.examples || []).forEach((ex, idx) => {
            if (!ex.japanese?.trim()) {
                errs[`lesson.examples.${idx}.japanese`] = 'Kalimat Jepang wajib diisi.';
            }
            if (!ex.translation?.trim()) {
                errs[`lesson.examples.${idx}.translation`] = 'Arti kalimat wajib diisi.';
            }
        });

        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            setError('Harap lengkapi semua field materi yang bertanda bintang (*).');
            setActiveMainTab('intro');
            return;
        }

        const totalQuestions = draft.stages.reduce((acc, stg) => acc + (stg.questions?.length || 0), 0);
        if (totalQuestions === 0) {
            setError('Belum ada soal pada draf kuis. Klik "✨ Generate Lesson / Soal Otomatis" atau tambahkan soal manual terlebih dahulu.');
            return;
        }

        setSaving(true);
        try {
            const response = draft.id && Number.isInteger(Number(draft.id))
                ? await window.axios.put(`/admin/grammar-quizzes/${draft.id}`, requestPayload())
                : await window.axios.post(`/admin/module-days/${day.id}/grammar-quizzes`, requestPayload());
            const saved = response.data.lesson;
            setDraft(saved);
            setFieldErrors({});
            setLessons((current) => [...current.filter((lesson) => lesson.id !== saved.id), saved]);
            setSavedAt(new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
            setGeneratorSuccess('Draf Grammar berhasil disimpan.');
        } catch (requestError) {
            setGeneratorSuccess('');
            const errors = requestError.response?.data?.errors;
            const message = requestError.response?.data?.message;
            if (errors) {
                const formatted = {};
                for (const [key, msgs] of Object.entries(errors)) {
                    formatted[key] = Array.isArray(msgs) ? msgs[0] : msgs;
                }
                setFieldErrors(formatted);
                const firstErr = Object.values(errors).flat()[0];
                const cleanErr = firstErr
                    .replace(/lesson\.pattern/gi, 'Pola Grammar')
                    .replace(/lesson\.title/gi, 'Judul Materi')
                    .replace(/lesson\.meaning/gi, 'Arti Pola')
                    .replace(/lesson\.formula/gi, 'Rumus Pola')
                    .replace(/lesson\.explanation/gi, 'Penjelasan Singkat')
                    .replace(/lesson\.examples\.\d+\.japanese/gi, 'Kalimat Jepang pada contoh')
                    .replace(/lesson\.examples\.\d+\.translation/gi, 'Arti pada contoh')
                    .replace(/stages\.\d+\.questions/gi, 'Daftar soal stage');
                setError(cleanErr);
                if (Object.keys(formatted).some((k) => k.startsWith('lesson.'))) {
                    setActiveMainTab('intro');
                }
            } else {
                setError(message || 'Draf Grammar gagal disimpan.');
            }
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (status) => {
        if (!Number.isInteger(Number(draft.id))) return;
        setSaving(true);
        setError('');
        setGeneratorSuccess('');
        try {
            const response = await window.axios.patch(`/admin/grammar-quizzes/${draft.id}/status`, { status });
            const updated = { ...draft, status };
            setDraft(updated);
            setLessons((current) => current.map((lesson) => lesson.id === updated.id ? updated : lesson));
            setGeneratorSuccess(response.data?.message || (status === 'published' ? 'Lesson Grammar berhasil diterbitkan.' : 'Lesson Grammar dikembalikan menjadi draf.'));
        } catch (requestError) {
            setGeneratorSuccess('');
            const errors = requestError.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : 'Status Grammar gagal diubah.');
        } finally {
            setSaving(false);
        }
    };

    const generateDraft = async () => {
        setError('');
        setGeneratorSuccess('');

        if (!draft.pattern?.trim()) {
            setError('Pola Grammar wajib diisi terlebih dahulu sebelum membuat soal.');
            return;
        }

        setIsGenerating(true);
        try {
            const payload = {
                lesson: {
                    level: draft.level || 'JLPT N3',
                    pattern: draft.pattern || '',
                    title: draft.title || '',
                    meaning: draft.intro?.meaning || '',
                    formula: draft.intro?.formula || '',
                    explanation: draft.intro?.explanation || '',
                    examples: draft.intro?.examples || [],
                },
                settings: {
                    counts: settings.counts,
                    difficulty: settings.difficulty,
                    target_form: settings.target_form || 'auto',
                    useDistractors: settings.useDistractors,
                    autoMeaning: settings.autoMeaning,
                },
            };

            const response = await window.axios.post('/admin/grammar-quizzes/generate-draft', payload);
            const { stages, message: apiMessage } = response.data;

            setDraft((current) => ({
                ...current,
                stages: stages.map((stg) => ({
                    ...stg,
                    questions: (stg.questions || []).map((q, idx) => ({
                        ...q,
                        id: `gen-${stg.id}-${Date.now()}-${idx}`,
                    })),
                })),
            }));

            setError('');
            setGeneratorSuccess(apiMessage || 'Draf kuis 3 stage berhasil dibuat secara otomatis!');
        } catch (genError) {
            setGeneratorSuccess('');
            const apiErr = genError.response?.data?.message || 'Gagal meng-generate draf kuis.';
            setError(apiErr);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateSingle = async (stageId, index) => {
        setError('');
        setGeneratorSuccess('');

        if (!draft.pattern?.trim()) {
            setError('Pola Grammar wajib diisi terlebih dahulu sebelum meregenerasi variasi soal.');
            return;
        }

        const key = `${stageId}-${index}`;
        setRegeneratingKey(key);
        try {
            const payload = {
                stage: stageId,
                index,
                lesson: {
                    level: draft.level || 'JLPT N3',
                    pattern: draft.pattern || '',
                    title: draft.title || '',
                    meaning: draft.intro?.meaning || '',
                    formula: draft.intro?.formula || '',
                    explanation: draft.intro?.explanation || '',
                    examples: draft.intro?.examples || [],
                },
                settings: {
                    counts: settings.counts,
                    difficulty: settings.difficulty,
                    target_form: settings.target_form || 'auto',
                    useDistractors: settings.useDistractors,
                    autoMeaning: settings.autoMeaning,
                },
            };
            const response = await window.axios.post('/admin/grammar-quizzes/regenerate-question', payload);
            const { question: newQuestion, message } = response.data;
            if (newQuestion) {
                setDraft((current) => {
                    const stageIndex = current.stages.findIndex((s) => s.id === stageId);
                    if (stageIndex === -1) return current;
                    const newQuestions = [...current.stages[stageIndex].questions];
                    newQuestions[index] = {
                        ...newQuestion,
                        id: `gen-${stageId}-${Date.now()}-${index}`,
                    };
                    const newStages = [...current.stages];
                    newStages[stageIndex] = {
                        ...newStages[stageIndex],
                        questions: newQuestions,
                    };
                    return { ...current, stages: newStages };
                });
                setError('');
                setGeneratorSuccess(message || 'Soal berhasil diperbarui dengan variasi baru.');
            }
        } catch (err) {
            setGeneratorSuccess('');
            const msg = err.response?.data?.message || 'Gagal meregenerasi variasi soal.';
            setError(msg);
        } finally {
            setRegeneratingKey(null);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Builder Kuis Grammar" className="fixed inset-0 z-[140] flex flex-col bg-[#f5f7f6] dark:bg-gray-950">
            <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
                    <button type="button" onClick={onClose} className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-black text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"><ArrowBackIcon sx={{ fontSize: 19 }} />Kembali</button>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">{module?.title || 'Minggu'} · Hari {day?.day_number}</p><h1 className="truncate text-base font-black text-gray-900 dark:text-white">Builder Kuis Grammar</h1></div>
                    {lessons.length > 0 && <select value={Number.isInteger(Number(draft.id)) ? draft.id : ''} onChange={(event) => setDraft(lessons.find((lesson) => String(lesson.id) === event.target.value) || makeDraft(day, defaultLevel))} className="h-10 max-w-52 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-900"><option value="">Lesson baru</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.pattern} / {lesson.title}</option>)}</select>}
                    <button type="button" onClick={() => setDraft(makeDraft(day, defaultLevel))} className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-black dark:border-gray-700">Lesson Baru</button>
                    {savedAt && <span className="text-xs font-bold text-emerald-600">Draf tersimpan {savedAt}</span>}

                    <button type="button" onClick={() => setShowBulkImport(true)} className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><UploadFileIcon sx={{ fontSize: 17 }} />Import XLSX / CSV</button>
                    <button type="button" onClick={() => setShowPreview(true)} className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><VisibilityIcon sx={{ fontSize: 17 }} />Preview Siswa</button>
                    {Number.isInteger(Number(draft.id)) && <button type="button" disabled={saving} onClick={() => setStatus(draft.status === 'published' ? 'draft' : 'published')} className="h-10 rounded-xl border border-emerald-300 px-3 text-xs font-black text-emerald-700 disabled:opacity-50">{draft.status === 'published' ? 'Jadikan Draf' : 'Terbitkan'}</button>}
                    <button type="button" disabled={saving} onClick={saveDraft} className="flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"><SaveOutlinedIcon sx={{ fontSize: 17 }} />{saving ? 'Menyimpan...' : 'Simpan Draf'}</button>
                </div>
            </header>

            {/* Top Navigation Tabs */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
                <div className="mx-auto flex max-w-7xl gap-3 sm:gap-6 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveMainTab('questions')}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-black transition ${
                            activeMainTab === 'questions'
                                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <FormatListBulletedIcon sx={{ fontSize: 18 }} />
                        <span>Editor Soal Manual</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {totals.ready}/{totals.total} Siap
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMainTab('intro')}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-black transition ${
                            activeMainTab === 'intro'
                                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <MenuBookIcon sx={{ fontSize: 18 }} />
                        <span>Materi & Pola Grammar</span>
                        {draft.pattern && (
                            <span className="truncate max-w-[140px] rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-japanese font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {draft.pattern}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMainTab('generator')}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-black transition ${
                            activeMainTab === 'generator'
                                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                        <span>Smart Generator (AI)</span>
                    </button>
                </div>
            </div>

            {/* Workspace Content */}
            <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    {error && (
                        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-800">
                                <CloseIcon sx={{ fontSize: 16 }} />
                            </button>
                        </div>
                    )}

                    {!error && generatorSuccess && (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <span>{generatorSuccess}</span>
                            <button type="button" onClick={() => setGeneratorSuccess('')} className="text-emerald-600 hover:text-emerald-900">
                                <CloseIcon sx={{ fontSize: 16 }} />
                            </button>
                        </div>
                    )}

                    {/* Tab 1: Editor Soal Manual (Workspace 2 Kolom) */}
                    {activeMainTab === 'questions' && (
                        <div className="space-y-4">
                            {!draft.pattern && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                    <span>
                                        💡 Pola grammar belum diisi. Anda dapat mengedit butir soal langsung di bawah, atau melengkapi materi di tab <strong>Materi & Pola Grammar</strong>.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveMainTab('intro')}
                                        className="shrink-0 font-bold underline hover:text-amber-950 dark:text-amber-300"
                                    >
                                        Lengkapi Materi →
                                    </button>
                                </div>
                            )}

                            <ReviewQuestions
                                draft={draft}
                                onChange={setDraft}
                                activeStageId={activeStageId}
                                onStageChange={setActiveStageId}
                                onRegenerateSingle={handleRegenerateSingle}
                                regeneratingKey={regeneratingKey}
                                onRegenerateAll={generateDraft}
                                isGenerating={isGenerating}
                                onPreview={() => setShowPreview(true)}
                                onTogglePublish={() => setStatus(draft.status === 'published' ? 'draft' : 'published')}
                                saving={saving}
                            />
                        </div>
                    )}

                    {/* Tab 2: Materi & Pola Grammar */}
                    {activeMainTab === 'intro' && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">1</span>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">Materi & Pola Grammar</h2>
                                </div>
                                <span className="text-xs font-medium text-gray-400">Pola, rumus & contoh kalimat</span>
                            </div>
                            <IntroEditor
                                draft={draft}
                                onChange={setDraft}
                                onOpenBankPicker={() => setShowBankPicker(true)}
                                fieldErrors={fieldErrors}
                                onClearError={clearFieldError}
                            />
                            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                                <span className="text-xs text-gray-500">Materi ini menjadi panduan pembuatan soal & ringkasan untuk siswa.</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveMainTab('questions')}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition"
                                >
                                    Lanjut ke Editor Soal →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Smart Generator AI */}
                    {activeMainTab === 'generator' && (
                        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">⚡</span>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">Pengaturan Smart Generator AI</h2>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Smart Engine</span>
                            </div>
                            <GenerationSettings
                                settings={settings}
                                onChange={setSettings}
                                onGenerate={async () => {
                                    await generateDraft();
                                    setActiveMainTab('questions');
                                }}
                                isGenerating={isGenerating}
                                onSaveDraft={saveDraft}
                                saving={saving}
                            />
                        </div>
                    )}
                </div>
            </main>

            <GrammarQuizPreviewDialog open={showPreview} quiz={draft} onClose={() => setShowPreview(false)} />
            <GrammarBulkImportDialog open={showBulkImport} program={module?.program} onClose={() => setShowBulkImport(false)} />
            <GrammarBankPickerDialog
                open={showBankPicker}
                initialLevel={draft.level ? draft.level.replace('JLPT ', '').trim() : 'all'}
                onClose={() => setShowBankPicker(false)}
                onSelect={(item) => {
                    setDraft((curr) => ({
                        ...curr,
                        level: item.jlpt_level ? `JLPT ${item.jlpt_level}` : curr.level,
                        pattern: item.pattern || curr.pattern,
                        title: item.title || curr.title,
                        intro: {
                            ...curr.intro,
                            meaning: item.meaning || curr.intro.meaning,
                            formula: item.formula || curr.intro.formula,
                            explanation: item.explanation || curr.intro.explanation,
                            examples: Array.isArray(item.examples) && item.examples.length > 0
                                ? item.examples.map((ex) => ({
                                    japanese: ex.japanese || '',
                                    reading: ex.reading || '',
                                    translation: ex.translation || '',
                                }))
                                : curr.intro.examples,
                        },
                    }));
                    setGeneratorSuccess(`Pola "${item.pattern}" berhasil dimuat dari Bank Grammar.`);
                }}
            />
        </div>,
        document.body,
    );
}
