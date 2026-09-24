import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import GrammarQuizPreviewDialog from './GrammarQuizPreviewDialog';
import GrammarBulkImportDialog from './GrammarBulkImportDialog';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';

const clone = (value) => JSON.parse(JSON.stringify(value));
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900/30';
const stageMeta = {
    transformation: { label: 'Transformation', description: 'Perubahan bentuk kata' },
    sentence_builder: { label: 'Sentence Builder', description: 'Susun potongan kalimat' },
    context_choice: { label: 'Context Choice', description: 'Pilih sesuai konteks' },
};

const samplePresets = [
    {
        key: 'n3-ba-hodo',
        label: '〜ば〜ほど (N3)',
        level: 'JLPT N3',
        pattern: '〜ば〜ほど',
        title: 'Semakin..., semakin...',
        intro: {
            meaning: 'Semakin kondisi A terjadi, semakin meningkat kondisi B',
            formula: 'V-ば + V-辞書形 + ほど',
            explanation: 'Menunjukkan hubungan dua hal yang berbanding lurus dan berubah seimbang.',
            examples: [
                {
                    japanese: '勉強すれば | するほど | 日本語が | 上手になります',
                    reading: 'べんきょうすればするほど、にほんごがじょうずになります',
                    translation: 'Semakin banyak belajar, semakin mahir bahasa Jepang.',
                },
                {
                    japanese: '練習すれば | するほど | 慣れてきます',
                    reading: 'れんしゅうすればするほど、なれてきます',
                    translation: 'Semakin sering latihan, semakin terbiasa.',
                },
                {
                    japanese: '考えれば | 考えるほど | 分からなくなります',
                    reading: 'かんがえればかんがえるほど、わからなくなります',
                    translation: 'Semakin dipikirkan, semakin tidak mengerti.',
                },
            ],
        },
    },
    {
        key: 'n5-te-wa-ikenai',
        label: '〜てはいけない (N5)',
        level: 'JLPT N5',
        pattern: '〜てはいけない',
        title: 'Tidak boleh...',
        intro: {
            meaning: 'Larangan melakukan suatu perbuatan',
            formula: 'V-て + はいけない',
            explanation: 'Pola dasar untuk menyatakan larangan atau aturan formal.',
            examples: [
                {
                    japanese: 'ここで | タバコを | 吸って | はいけません',
                    reading: 'ここでたばこをすってはいけません',
                    translation: 'Tidak boleh merokok di sini.',
                },
                {
                    japanese: '教室で | 大声を | 出して | はいけません',
                    reading: 'きょうしつでおおごえをだしてはいけません',
                    translation: 'Tidak boleh bersuara keras di ruang kelas.',
                },
                {
                    japanese: 'テスト中 | 辞書を | 見て | はいけません',
                    reading: 'てすとちゅうじしょをみてはいけません',
                    translation: 'Tidak boleh melihat kamus saat ujian.',
                },
            ],
        },
    },
    {
        key: 'n3-you-ni',
        label: '〜ように (N3)',
        level: 'JLPT N3',
        pattern: '〜ように',
        title: 'Supaya / Agar...',
        intro: {
            meaning: 'Melakukan usaha agar tujuan atau keadaan tertentu tercapai',
            formula: 'V-辞書形 / V-ない形 + ように',
            explanation: 'Digunakan dengan kata kerja non-volisional untuk menyatakan tujuan.',
            examples: [
                {
                    japanese: '忘れない | ように | メモを | 取ります',
                    reading: 'わすれないようにめもをとります',
                    translation: 'Mencatat agar tidak lupa.',
                },
                {
                    japanese: '聞こえる | ように | 大きい声で | 話してください',
                    reading: 'きこえるようにおおきいこえではなしてください',
                    translation: 'Tolong bicara dengan suara keras agar terdengar.',
                },
                {
                    japanese: '試験に | 合格できる | ように | 毎日勉強します',
                    reading: 'しけんにごうかくできるようにまいにちべんきょうします',
                    translation: 'Belajar setiap hari agar bisa lulus ujian.',
                },
            ],
        },
    },
];

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

function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">{label}</span>
            {children}
            {hint && <span className="mt-1.5 block text-[11px] font-medium leading-4 text-gray-400">{hint}</span>}
        </label>
    );
}

function IntroEditor({ draft, onChange }) {
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
                <span className="font-black text-emerald-800 dark:text-emerald-300">
                    ⚡ Muat Contoh Siap Pakai:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                    {samplePresets.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => onChange({
                                ...draft,
                                level: preset.level,
                                pattern: preset.pattern,
                                title: preset.title,
                                intro: clone(preset.intro),
                            })}
                            className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Level JLPT</span>
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
                <Field label="Pola Grammar">
                    <input className={`${inputClass} font-japanese`} value={draft.pattern} onChange={(event) => onChange({ ...draft, pattern: event.target.value })} placeholder="Contoh: ～ば～ほど" />
                </Field>
                <Field label="Arti Pola">
                    <input className={inputClass} value={draft.intro.meaning} onChange={(event) => updateIntro('meaning', event.target.value)} placeholder="Contoh: Semakin..., semakin..." />
                </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Judul Materi">
                    <input className={inputClass} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Judul ringkas materi" />
                </Field>
                <Field label="Rumus Pola">
                    <input className={`${inputClass} font-japanese`} value={draft.intro.formula} onChange={(event) => updateIntro('formula', event.target.value)} placeholder="Contoh: V-ば + V-辞書形 + ほど" />
                </Field>
            </div>

            <Field label="Penjelasan Singkat">
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
                                <Field label="Kalimat Jepang">
                                    <input className={`${inputClass} !py-2 text-xs font-japanese`} value={example.japanese} onChange={(event) => updateExample(index, 'japanese', event.target.value)} placeholder="日本語例文" />
                                </Field>
                                <Field label="Cara Baca">
                                    <input className={`${inputClass} !py-2 text-xs`} value={example.reading} onChange={(event) => updateExample(index, 'reading', event.target.value)} placeholder="yomikata" />
                                </Field>
                                <Field label="Arti Indonesia">
                                    <input className={`${inputClass} !py-2 text-xs`} value={example.translation} onChange={(event) => updateExample(index, 'translation', event.target.value)} placeholder="Terjemahan..." />
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
                <Field label="Tingkat Kesulitan">
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
                <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.useDistractors}
                            onChange={(event) => onChange({ ...settings, useDistractors: event.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Pengecoh (Distractors)</span>
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

    return (
        <div className="space-y-4">
            <Field label="Instruksi"><input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} /></Field>
            {question.type === 'transformation' ? (
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Kata Jepang"><input className={`${inputClass} font-japanese`} value={question.japanese || ''} onChange={(event) => onChange({ ...question, japanese: event.target.value })} /></Field>
                    <Field label="Cara baca"><input className={inputClass} value={question.reading || ''} onChange={(event) => onChange({ ...question, reading: event.target.value })} /></Field>
                    <Field label="Arti"><input className={inputClass} value={question.translation || ''} onChange={(event) => onChange({ ...question, translation: event.target.value })} /></Field>
                </div>
            ) : <Field label="Situasi"><textarea className={`${inputClass} min-h-20`} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>}
            <div className="grid gap-3 sm:grid-cols-2">
                {question.choices.map((choice, index) => <Field key={index} label={`Pilihan ${String.fromCharCode(65 + index)}`}><input className={`${inputClass} font-japanese`} value={choice} onChange={(event) => updateChoice(index, event.target.value)} /></Field>)}
            </div>
            <Field label="Jawaban benar"><select className={`${inputClass} font-japanese`} value={question.correctAnswer} onChange={(event) => onChange({ ...question, correctAnswer: event.target.value })}><option value="">Pilih jawaban</option>{question.choices.filter(Boolean).map((choice, index) => <option key={`${choice}-${index}`} value={choice}>{choice}</option>)}</select></Field>
            <Field label="Feedback jawaban"><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
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

            <Field label="Instruksi"><input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} /></Field>
            <Field label="Arti atau konteks"><input className={inputClass} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>
            <div>
                <div className="flex items-center justify-between"><span className="text-xs font-black text-gray-600 dark:text-gray-300">Potongan kalimat (Token)</span><button type="button" onClick={addToken} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 px-2 text-[11px] font-black text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"><AddIcon sx={{ fontSize: 14 }} />Tambah Manual</button></div>
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
            <Field label="Feedback jawaban"><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
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
    const [editingIndex, setEditingIndex] = useState(null);

    const currentStageId = onStageChange ? activeStageId : internalStageId;
    const handleSetStageId = (newStageId) => {
        if (onStageChange) onStageChange(newStageId);
        setInternalStageId(newStageId);
        setEditingIndex(null);
    };

    const stageIndex = draft.stages.findIndex((stage) => stage.id === currentStageId);
    const stage = draft.stages[stageIndex] || draft.stages[0];
    const updateQuestions = (questions) => onChange({
        ...draft,
        stages: draft.stages.map((item, index) => (index === stageIndex ? { ...item, questions } : item)),
    });
    const editQuestion = editingIndex === null ? null : stage.questions[editingIndex];
    const updateQuestion = (question) => updateQuestions(
        stage.questions.map((item, index) => (index === editingIndex ? question : item))
    );
    const duplicate = (index) => {
        const questions = [...stage.questions];
        questions.splice(index + 1, 0, { ...clone(stage.questions[index]), id: `draft-${currentStageId}-${Date.now()}` });
        updateQuestions(questions);
    };
    const remove = (index) => {
        if (stage.questions.length <= 1) return;
        updateQuestions(stage.questions.filter((_, itemIndex) => itemIndex !== index));
    };

    const addManualQuestion = () => {
        const newQ = makeQuestion(currentStageId, stage.questions.length);
        updateQuestions([...stage.questions, newQ]);
        setEditingIndex(stage.questions.length);
    };

    return (
        <div>
            {/* Top Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                {/* Stage Tabs */}
                <div className="flex gap-2 overflow-x-auto">
                    {draft.stages.map((item) => {
                        const isActive = currentStageId === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSetStageId(item.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}
                            >
                                <span>{stageMeta[item.id]?.label || item.id}</span>
                                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {item.questions.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={isGenerating}
                        onClick={onRegenerateAll}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                        <RefreshIcon sx={{ fontSize: 15 }} className={isGenerating ? 'animate-spin' : ''} />
                        Regenerate Semua
                    </button>
                    <button
                        type="button"
                        onClick={onPreview}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                    >
                        <VisibilityIcon sx={{ fontSize: 15 }} />
                        Preview Siswa
                    </button>
                    {Number.isInteger(Number(draft.id)) && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onTogglePublish}
                            className={`flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-black transition disabled:opacity-50 ${
                                draft.status === 'published'
                                    ? 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                        >
                            {draft.status === 'published' ? 'Jadikan Draf' : '🚀 Publish Lesson'}
                        </button>
                    )}
                </div>
            </div>

            {/* Questions Table */}
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="hidden grid-cols-[48px_minmax(0,1.2fr)_minmax(0,1.2fr)_100px_130px] gap-3 bg-gray-50 px-4 py-3 text-[10px] font-black uppercase text-gray-400 sm:grid dark:bg-gray-950/50">
                    <span>No.</span>
                    <span>Prompt / Instruksi</span>
                    <span>Konteks / Jawaban</span>
                    <span>Status</span>
                    <span className="text-right">Aksi</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stage.questions.map((question, index) => {
                        const ready = questionReady(question);
                        const isThisRegenerating = regeneratingKey === `${currentStageId}-${index}`;

                        return (
                            <div key={question.id || index} className="grid gap-2 px-4 py-3 sm:grid-cols-[48px_minmax(0,1.2fr)_minmax(0,1.2fr)_100px_130px] sm:items-center">
                                <span className="text-xs font-black text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                                        {question.prompt || 'Pertanyaan belum diisi'}
                                    </p>
                                    <span className="text-[10px] font-medium text-gray-400">
                                        {question.type === 'sentence_builder' ? `${question.tokens?.length || 0} tokens` : `${question.choices?.filter(Boolean).length || 0} opsi`}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-japanese font-bold text-gray-800 dark:text-gray-200">
                                        {question.type === 'sentence_builder'
                                            ? question.tokens?.filter((t) => !t.distractor).map((t) => t.text).join('') || question.context
                                            : question.correctAnswer || question.japanese || question.context || '-'}
                                    </p>
                                    {question.explanation && (
                                        <p className="truncate text-[10px] text-gray-400">
                                            {question.explanation}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                                        {ready ? <CheckCircleOutlinedIcon sx={{ fontSize: 12 }} /> : <ErrorOutlineRoundedIcon sx={{ fontSize: 12 }} />}
                                        {ready ? 'Siap' : 'Belum'}
                                    </span>
                                </div>
                                <div className="flex justify-end gap-1">
                                    <button
                                        type="button"
                                        title="Edit soal"
                                        onClick={() => setEditingIndex(index)}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <EditOutlinedIcon sx={{ fontSize: 15 }} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Variasi / Regenerasi soal ini"
                                        disabled={Boolean(regeneratingKey)}
                                        onClick={() => onRegenerateSingle(currentStageId, index)}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-950/30"
                                    >
                                        <RefreshIcon sx={{ fontSize: 15 }} className={isThisRegenerating ? 'animate-spin' : ''} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Duplikat soal"
                                        onClick={() => duplicate(index)}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <ContentCopyIcon sx={{ fontSize: 15 }} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Hapus soal"
                                        disabled={stage.questions.length <= 1}
                                        onClick={() => remove(index)}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Add Question Button */}
            <div className="mt-3 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                    Total: <strong className="text-gray-900 dark:text-white">{stage.questions.length}</strong> butir soal pada stage ini.
                </span>
                <button
                    type="button"
                    onClick={addManualQuestion}
                    className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                    <AddIcon sx={{ fontSize: 15 }} />
                    Tambah Soal Manual
                </button>
            </div>

            {/* Slide-over editor */}
            {editQuestion && (
                <div className="fixed inset-0 z-[155] flex justify-end bg-gray-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingIndex(null); }}>
                    <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">{stageMeta[currentStageId]?.label || currentStageId}</p>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">Edit soal {editingIndex + 1}</h3>
                            </div>
                            <button type="button" title="Tutup editor" onClick={() => setEditingIndex(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <CloseIcon sx={{ fontSize: 19 }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">{currentStageId === 'sentence_builder' ? <SentenceBuilderEditor question={editQuestion} onChange={updateQuestion} /> : <ChoiceEditor question={editQuestion} onChange={updateQuestion} />}</div>
                        <div className="border-t border-gray-200 p-4 text-right dark:border-gray-800"><button type="button" onClick={() => setEditingIndex(null)} className="h-10 rounded-xl bg-gray-900 px-5 text-xs font-black text-white dark:bg-white dark:text-gray-900">Selesai Edit</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BuilderKuisGrammar({ open, day, module, onClose }) {
    const defaultLevel = module?.program?.level?.name || 'JLPT N5';
    const [draft, setDraft] = useState(() => makeDraft(day, defaultLevel));
    const [activeStageId, setActiveStageId] = useState('transformation');
    const [settings, setSettings] = useState({
        counts: { transformation: 5, sentence_builder: 5, context_choice: 5 },
        difficulty: 'mixed',
        useDistractors: true,
        autoMeaning: true,
    });
    const [showPreview, setShowPreview] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [regeneratingKey, setRegeneratingKey] = useState(null);
    const [generatorSuccess, setGeneratorSuccess] = useState('');
    const [savedAt, setSavedAt] = useState('');
    const [lessons, setLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;
        let active = true;
        setDraft(makeDraft(day, defaultLevel));
        setLessons([]);
        setError('');
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
        setGeneratorSuccess('');

        if (!draft.pattern?.trim()) {
            setError('Pola Grammar wajib diisi terlebih dahulu sebelum menyimpan draf.');
            return;
        }
        if (!draft.title?.trim()) {
            setError('Judul materi grammar wajib diisi.');
            return;
        }
        if (!draft.intro?.meaning?.trim()) {
            setError('Arti pola grammar wajib diisi.');
            return;
        }
        if (!draft.intro?.formula?.trim()) {
            setError('Rumus pola grammar wajib diisi.');
            return;
        }
        const hasEmptyExample = (draft.intro?.examples || []).some(
            (ex) => !ex.japanese?.trim() || !ex.translation?.trim()
        );
        if (hasEmptyExample) {
            setError('Setiap contoh kalimat wajib memiliki Kalimat Jepang dan Arti Indonesia.');
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
            setLessons((current) => [...current.filter((lesson) => lesson.id !== saved.id), saved]);
            setSavedAt(new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
            setGeneratorSuccess('Draf Grammar berhasil disimpan.');
        } catch (requestError) {
            setGeneratorSuccess('');
            const errors = requestError.response?.data?.errors;
            const message = requestError.response?.data?.message;
            if (errors) {
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

            {/* Unified Workspace 1-Screen Grid */}
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

                    {/* Row 1: Cards 1 & 2 */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* Card 1: Grammar Input */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-7">
                            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">1</span>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">Grammar Input</h2>
                                </div>
                                <span className="text-xs font-medium text-gray-400">Pola, rumus & contoh kalimat</span>
                            </div>
                            <IntroEditor
                                draft={draft}
                                onChange={setDraft}
                            />
                        </div>

                        {/* Card 2: Generation Settings */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-5">
                            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">2</span>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">Generation Settings</h2>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Smart Engine</span>
                            </div>
                            <GenerationSettings
                                settings={settings}
                                onChange={setSettings}
                                onGenerate={generateDraft}
                                isGenerating={isGenerating}
                                onSaveDraft={saveDraft}
                                saving={saving}
                            />
                        </div>
                    </div>

                    {/* Row 2: Card 3 - Generated Questions */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">3</span>
                                <h2 className="text-base font-black text-gray-900 dark:text-white">Generated Questions</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">
                                    {totals.ready}/{totals.total} soal siap
                                </span>
                            </div>
                        </div>
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
                </div>
            </main>

            <GrammarQuizPreviewDialog open={showPreview} quiz={draft} onClose={() => setShowPreview(false)} />
            <GrammarBulkImportDialog open={showBulkImport} program={module?.program} onClose={() => setShowBulkImport(false)} />
        </div>,
        document.body,
    );
}
