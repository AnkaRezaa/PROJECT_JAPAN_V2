import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import GrammarQuizPreviewDialog from './GrammarQuizPreviewDialog';
import GrammarBulkImportDialog from './GrammarBulkImportDialog';
import grammarQuizFixture from './grammarQuizFixture';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const clone = (value) => JSON.parse(JSON.stringify(value));
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900/30';
const stageMeta = {
    transformation: { label: 'Transformation', description: 'Perubahan bentuk kata' },
    sentence_builder: { label: 'Sentence Builder', description: 'Susun potongan kalimat' },
    context_choice: { label: 'Context Choice', description: 'Pilih sesuai konteks' },
};

function makeDraft(day) {
    const draft = clone(grammarQuizFixture);
    draft.id = `grammar-preview-day-${day?.id || 'new'}`;
    return draft;
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

    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Level">
                    <select className={inputClass} value={draft.level} onChange={(event) => onChange({ ...draft, level: event.target.value })}>
                        <option>JLPT N5</option><option>JLPT N4</option><option>JLPT N3</option><option>JLPT N2</option><option>JLPT N1</option>
                    </select>
                </Field>
                <Field label="Pola Grammar"><input className={inputClass} value={draft.pattern} onChange={(event) => onChange({ ...draft, pattern: event.target.value })} placeholder="Contoh: ～ば～ほど" /></Field>
                <Field label="Judul"><input className={inputClass} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Semakin..., semakin..." /></Field>
                <Field label="Arti"><input className={inputClass} value={draft.intro.meaning} onChange={(event) => updateIntro('meaning', event.target.value)} /></Field>
            </div>
            <Field label="Rumus"><input className={inputClass} value={draft.intro.formula} onChange={(event) => updateIntro('formula', event.target.value)} /></Field>
            <Field label="Penjelasan singkat"><textarea className={`${inputClass} min-h-24 resize-y`} value={draft.intro.explanation} onChange={(event) => updateIntro('explanation', event.target.value)} /></Field>

            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">Contoh kalimat</p>
                        <p className="mt-0.5 text-xs font-medium text-gray-500">Disarankan 3-5 contoh untuk satu pola.</p>
                    </div>
                    <button type="button" onClick={addExample} className="flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><AddIcon sx={{ fontSize: 15 }} />Tambah contoh</button>
                </div>
                <div className="mt-3 space-y-3">
                    {draft.intro.examples.map((example, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-gray-400">Contoh {index + 1}</span>
                                <button type="button" title="Hapus contoh" disabled={draft.intro.examples.length <= 1} onClick={() => removeExample(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"><DeleteOutlineIcon sx={{ fontSize: 17 }} /></button>
                            </div>
                            <div className="grid gap-3 lg:grid-cols-3">
                                <Field label="Kalimat Jepang"><input className={inputClass} value={example.japanese} onChange={(event) => updateExample(index, 'japanese', event.target.value)} /></Field>
                                <Field label="Cara baca"><input className={inputClass} value={example.reading} onChange={(event) => updateExample(index, 'reading', event.target.value)} /></Field>
                                <Field label="Arti Indonesia"><input className={inputClass} value={example.translation} onChange={(event) => updateExample(index, 'translation', event.target.value)} /></Field>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GenerationSettings({ settings, onChange, onGenerate }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
                {Object.entries(stageMeta).map(([key, meta]) => (
                    <label key={key} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <span className="block text-sm font-black text-gray-900 dark:text-white">{meta.label}</span>
                        <span className="mt-1 block min-h-8 text-xs font-medium text-gray-500">{meta.description}</span>
                        <span className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-gray-500">Jumlah soal</span>
                            <input type="number" min="1" max="30" value={settings.counts[key]} onChange={(event) => onChange({ ...settings, counts: { ...settings.counts, [key]: Math.max(1, Math.min(30, Number(event.target.value) || 1)) } })} className="h-10 w-20 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-black dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                        </span>
                    </label>
                ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tingkat kesulitan">
                    <select className={inputClass} value={settings.difficulty} onChange={(event) => onChange({ ...settings, difficulty: event.target.value })}>
                        <option value="mixed">Campuran</option><option value="basic">Dasar</option><option value="advanced">Lanjutan</option>
                    </select>
                </Field>
                <label className="flex min-h-16 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
                    <span><span className="block text-sm font-black text-gray-900 dark:text-white">Tambahkan pengecoh</span><span className="mt-0.5 block text-xs font-medium text-gray-500">Untuk pilihan dan susun kata.</span></span>
                    <input type="checkbox" checked={settings.useDistractors} onChange={(event) => onChange({ ...settings, useDistractors: event.target.checked })} className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                </label>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
                <p className="text-xs font-black text-amber-900 dark:text-amber-100">Generator template, bukan AI</p>
                <p className="mt-1 text-xs font-medium leading-5 text-amber-800 dark:text-amber-200">Generator menyiapkan struktur draf sesuai jumlah yang dipilih. Isi dan jawaban tetap diperiksa admin sebelum dipreview.</p>
            </div>
            <button type="button" onClick={onGenerate} className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"><AutoAwesomeIcon sx={{ fontSize: 18 }} />Buat Draf Soal</button>
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
                    <Field label="Kata Jepang"><input className={inputClass} value={question.japanese || ''} onChange={(event) => onChange({ ...question, japanese: event.target.value })} /></Field>
                    <Field label="Cara baca"><input className={inputClass} value={question.reading || ''} onChange={(event) => onChange({ ...question, reading: event.target.value })} /></Field>
                    <Field label="Arti"><input className={inputClass} value={question.translation || ''} onChange={(event) => onChange({ ...question, translation: event.target.value })} /></Field>
                </div>
            ) : <Field label="Situasi"><textarea className={`${inputClass} min-h-20`} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>}
            <div className="grid gap-3 sm:grid-cols-2">
                {question.choices.map((choice, index) => <Field key={index} label={`Pilihan ${String.fromCharCode(65 + index)}`}><input className={inputClass} value={choice} onChange={(event) => updateChoice(index, event.target.value)} /></Field>)}
            </div>
            <Field label="Jawaban benar"><select className={inputClass} value={question.correctAnswer} onChange={(event) => onChange({ ...question, correctAnswer: event.target.value })}><option value="">Pilih jawaban</option>{question.choices.filter(Boolean).map((choice, index) => <option key={`${choice}-${index}`} value={choice}>{choice}</option>)}</select></Field>
            <Field label="Feedback jawaban"><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
        </div>
    );
}

function SentenceBuilderEditor({ question, onChange }) {
    const syncTokens = (tokens) => onChange({ ...question, tokens, correctOrder: tokens.filter((token) => !token.distractor).map((token) => token.id) });
    const updateToken = (index, field, value) => syncTokens(question.tokens.map((token, tokenIndex) => tokenIndex === index ? { ...token, [field]: value } : token));
    const addToken = () => syncTokens([...question.tokens, { id: `t${Date.now()}`, text: '', reading: '', distractor: false }]);
    const removeToken = (index) => syncTokens(question.tokens.filter((_, tokenIndex) => tokenIndex !== index));

    return (
        <div className="space-y-4">
            <Field label="Instruksi"><input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} /></Field>
            <Field label="Arti atau konteks"><input className={inputClass} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} /></Field>
            <div>
                <div className="flex items-center justify-between"><span className="text-xs font-black text-gray-600 dark:text-gray-300">Potongan kalimat</span><button type="button" onClick={addToken} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 px-2 text-[11px] font-black text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"><AddIcon sx={{ fontSize: 14 }} />Tambah</button></div>
                <div className="mt-2 space-y-2">
                    {question.tokens.map((token, index) => (
                        <div key={token.id} className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-[1fr_1fr_auto_auto] dark:border-gray-800 dark:bg-gray-950/40">
                            <input className={inputClass} value={token.text} onChange={(event) => updateToken(index, 'text', event.target.value)} placeholder={`Potongan ${index + 1}`} />
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

function ReviewQuestions({ draft, onChange }) {
    const [stageId, setStageId] = useState('transformation');
    const [editingIndex, setEditingIndex] = useState(null);
    const stageIndex = draft.stages.findIndex((stage) => stage.id === stageId);
    const stage = draft.stages[stageIndex];
    const updateQuestions = (questions) => onChange({ ...draft, stages: draft.stages.map((item, index) => index === stageIndex ? { ...item, questions } : item) });
    const editQuestion = editingIndex === null ? null : stage.questions[editingIndex];
    const updateQuestion = (question) => updateQuestions(stage.questions.map((item, index) => index === editingIndex ? question : item));
    const duplicate = (index) => {
        const questions = [...stage.questions];
        questions.splice(index + 1, 0, { ...clone(stage.questions[index]), id: `draft-${stageId}-${Date.now()}` });
        updateQuestions(questions);
    };
    const remove = (index) => {
        if (stage.questions.length <= 1) return;
        updateQuestions(stage.questions.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <div>
            <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                {draft.stages.map((item) => <button key={item.id} type="button" onClick={() => { setStageId(item.id); setEditingIndex(null); }} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-black ${stageId === item.id ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'border-transparent text-gray-400'}`}>{stageMeta[item.id].label} ({item.questions.length})</button>)}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="hidden grid-cols-[64px_minmax(0,1fr)_120px_130px] gap-3 bg-gray-50 px-4 py-3 text-[10px] font-black uppercase text-gray-400 sm:grid dark:bg-gray-950/50"><span>No.</span><span>Pertanyaan</span><span>Status</span><span className="text-right">Aksi</span></div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stage.questions.map((question, index) => {
                        const ready = questionReady(question);
                        return (
                            <div key={question.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[64px_minmax(0,1fr)_120px_130px] sm:items-center">
                                <span className="text-xs font-black text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                                <div className="min-w-0"><p className="truncate text-sm font-black text-gray-900 dark:text-white">{question.prompt || 'Pertanyaan belum diisi'}</p><p className="mt-0.5 truncate text-xs font-medium text-gray-500">{question.context || question.japanese || 'Belum ada konteks'}</p></div>
                                <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>{ready ? <CheckCircleOutlinedIcon sx={{ fontSize: 13 }} /> : <ErrorOutlineRoundedIcon sx={{ fontSize: 13 }} />}{ready ? 'Siap' : 'Belum lengkap'}</span>
                                <div className="flex justify-end gap-1"><button type="button" title="Edit soal" onClick={() => setEditingIndex(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><EditOutlinedIcon sx={{ fontSize: 16 }} /></button><button type="button" title="Duplikat soal" onClick={() => duplicate(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><ContentCopyIcon sx={{ fontSize: 16 }} /></button><button type="button" title="Hapus soal" disabled={stage.questions.length <= 1} onClick={() => remove(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"><DeleteOutlineIcon sx={{ fontSize: 16 }} /></button></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {editQuestion && (
                <div className="fixed inset-0 z-[155] flex justify-end bg-gray-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingIndex(null); }}>
                    <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">{stageMeta[stageId].label}</p><h3 className="text-base font-black text-gray-900 dark:text-white">Edit soal {editingIndex + 1}</h3></div><button type="button" title="Tutup editor" onClick={() => setEditingIndex(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><CloseIcon sx={{ fontSize: 19 }} /></button></div>
                        <div className="flex-1 overflow-y-auto p-5">{stageId === 'sentence_builder' ? <SentenceBuilderEditor question={editQuestion} onChange={updateQuestion} /> : <ChoiceEditor question={editQuestion} onChange={updateQuestion} />}</div>
                        <div className="border-t border-gray-200 p-4 text-right dark:border-gray-800"><button type="button" onClick={() => setEditingIndex(null)} className="h-10 rounded-xl bg-gray-900 px-5 text-xs font-black text-white dark:bg-white dark:text-gray-900">Selesai Edit</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GrammarQuizBuilderDialog({ open, day, module, onClose }) {
    const [draft, setDraft] = useState(() => makeDraft(day));
    const [step, setStep] = useState('material');
    const [settings, setSettings] = useState({ counts: { transformation: 5, sentence_builder: 5, context_choice: 5 }, difficulty: 'mixed', useDistractors: true });
    const [showPreview, setShowPreview] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [savedAt, setSavedAt] = useState('');
    const [lessons, setLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;
        let active = true;
        setDraft(makeDraft(day));
        setLessons([]);
        setError('');
        window.axios.get(`/admin/module-days/${day.id}/grammar-quizzes`)
            .then(({ data }) => {
                if (!active) return;
                const available = data.lessons || [];
                setLessons(available);
                if (available[0]) setDraft(available[0]);
            })
            .catch(() => active && setError('Data Grammar belum dapat dimuat.'));
        setStep('material');
        setSavedAt('');
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { active = false; document.body.style.overflow = previousOverflow; };
    }, [day?.id, open]);

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
        setSaving(true);
        setError('');
        try {
            const response = draft.id && Number.isInteger(Number(draft.id))
                ? await window.axios.put(`/admin/grammar-quizzes/${draft.id}`, requestPayload())
                : await window.axios.post(`/admin/module-days/${day.id}/grammar-quizzes`, requestPayload());
            const saved = response.data.lesson;
            setDraft(saved);
            setLessons((current) => [...current.filter((lesson) => lesson.id !== saved.id), saved]);
            setSavedAt(new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : 'Draf Grammar gagal disimpan.');
        } finally {
            setSaving(false);
        }
    };
    const setStatus = async (status) => {
        if (!Number.isInteger(Number(draft.id))) return;
        setSaving(true);
        setError('');
        try {
            await window.axios.patch(`/admin/grammar-quizzes/${draft.id}/status`, { status });
            const updated = { ...draft, status };
            setDraft(updated);
            setLessons((current) => current.map((lesson) => lesson.id === updated.id ? updated : lesson));
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : 'Status Grammar gagal diubah.');
        } finally {
            setSaving(false);
        }
    };
    const generateDraft = () => {
        setDraft((current) => ({
            ...current,
            stages: current.stages.map((stage) => ({
                ...stage,
                questions: Array.from({ length: settings.counts[stage.id] }, (_, index) => stage.questions[index] || makeQuestion(stage.id, index)),
            })),
        }));
        setStep('review');
    };
    const steps = [
        { id: 'material', label: 'Materi Grammar', description: 'Pola, rumus, dan contoh' },
        { id: 'settings', label: 'Buat Soal', description: 'Atur struktur latihan' },
        { id: 'review', label: 'Review Soal', description: `${totals.ready}/${totals.total} soal siap` },
    ];

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Builder Kuis Grammar" className="fixed inset-0 z-[140] flex flex-col bg-[#f5f7f6] dark:bg-gray-950">
            <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
                    <button type="button" onClick={onClose} className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-black text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"><ArrowBackIcon sx={{ fontSize: 19 }} />Kembali</button>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">{module?.title || 'Minggu'} · Hari {day?.day_number}</p><h1 className="truncate text-base font-black text-gray-900 dark:text-white">Builder Kuis Grammar</h1></div>
                    {lessons.length > 0 && <select value={Number.isInteger(Number(draft.id)) ? draft.id : ''} onChange={(event) => setDraft(lessons.find((lesson) => String(lesson.id) === event.target.value) || makeDraft(day))} className="h-10 max-w-52 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-900"><option value="">Lesson baru</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.pattern} / {lesson.title}</option>)}</select>}
                    <button type="button" onClick={() => setDraft(makeDraft(day))} className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-black dark:border-gray-700">Lesson Baru</button>
                    {savedAt && <span className="text-xs font-bold text-emerald-600">Draf tersimpan {savedAt}</span>}
                    <button type="button" onClick={() => setShowBulkImport(true)} className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><UploadFileIcon sx={{ fontSize: 17 }} />Import XLSX</button>
                    <button type="button" onClick={() => setShowPreview(true)} className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><VisibilityIcon sx={{ fontSize: 17 }} />Preview Siswa</button>
                    {Number.isInteger(Number(draft.id)) && <button type="button" disabled={saving} onClick={() => setStatus(draft.status === 'published' ? 'draft' : 'published')} className="h-10 rounded-xl border border-emerald-300 px-3 text-xs font-black text-emerald-700 disabled:opacity-50">{draft.status === 'published' ? 'Jadikan Draf' : 'Terbitkan'}</button>}
                    <button type="button" disabled={saving} onClick={saveDraft} className="flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"><SaveOutlinedIcon sx={{ fontSize: 17 }} />{saving ? 'Menyimpan...' : 'Simpan Draf'}</button>
                </div>
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col lg:flex-row">
                <nav className="shrink-0 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
                    {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold leading-4 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
                    <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
                        {steps.map((item, index) => <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`w-48 shrink-0 rounded-xl border p-3 text-left transition lg:w-full ${step === item.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100 dark:bg-emerald-950/30 dark:ring-emerald-950' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'}`}><span className="text-xs font-black text-gray-900 dark:text-white">{index + 1}. {item.label}</span><span className="mt-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">{item.description}</span></button>)}
                    </div>
                </nav>

                <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Langkah {steps.findIndex((item) => item.id === step) + 1}</p><h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{steps.find((item) => item.id === step)?.label}</h2></div>
                        {step === 'material' && <IntroEditor draft={draft} onChange={setDraft} />}
                        {step === 'settings' && <GenerationSettings settings={settings} onChange={setSettings} onGenerate={generateDraft} />}
                        {step === 'review' && <ReviewQuestions draft={draft} onChange={setDraft} />}
                    </div>
                </main>
            </div>

            <GrammarQuizPreviewDialog open={showPreview} quiz={draft} onClose={() => setShowPreview(false)} />
            <GrammarBulkImportDialog open={showBulkImport} program={module?.program} onClose={() => setShowBulkImport(false)} />
        </div>,
        document.body,
    );
}
