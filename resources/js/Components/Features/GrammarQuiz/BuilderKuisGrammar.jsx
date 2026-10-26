import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import UnifiedQuizGeneratorModal from '@/Components/Features/Quiz/Shared/UnifiedQuizGeneratorModal';
import { grammarQuestionsToDraft, grammarStagesFromDraft } from '@/Components/Features/Quiz/Shared/generatorDraftAdapters';
import GrammarQuizPreviewDialog from './GrammarQuizPreviewDialog';
import GrammarBulkImportDialog from './GrammarBulkImportDialog';
import GrammarBankPickerDialog from './GrammarBankPickerDialog';
import IntroEditor from './IntroEditor';
import SentenceBuilderEditor from './SentenceBuilderEditor';
import Field from '@/Components/UI/QuizField';
import { OptionEditorRow, QuestionNavItem, UnifiedQuizBuilderShell, UnifiedQuestionEditorCanvas } from '@/Components/Features/Quiz/Shared';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
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








function questionReady(question) {
    if (!question.prompt?.trim() || !question.explanation?.trim()) return false;
    if (question.type === 'sentence_builder') return question.tokens?.filter((token) => !token.distractor && token.text?.trim()).length >= 2;
    return Boolean(question.correctAnswer?.trim()) && question.choices?.filter((choice) => choice?.trim()).length >= 2 && question.choices.includes(question.correctAnswer);
}

function ChoiceEditor({ question, onChange }) {
    const choicesReading = question.choices_reading || [];
    const updateChoice = (index, value) => {
        const choices = [...question.choices];
        const previous = choices[index];
        choices[index] = value;
        onChange({ ...question, choices, correctAnswer: question.correctAnswer === previous ? value : question.correctAnswer });
    };

    const updateChoiceReading = (index, value) => {
        const choices_reading = [...(question.choices_reading || question.choices.map(() => ''))];
        choices_reading[index] = value;
        onChange({ ...question, choices_reading });
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
                            <OptionEditorRow
                                key={index}
                                index={index}
                                label={optLetter}
                                value={choice}
                                reading={choicesReading[index] || ''}
                                isCorrect={isCorrect}
                                showReading={true}
                                placeholder={`Ketik pilihan ${optLetter}...`}
                                readingPlaceholder={`Cara baca kana pilihan ${optLetter} (opsional)...`}
                                onTextChange={(val) => updateChoice(index, val)}
                                onReadingChange={(val) => updateChoiceReading(index, val)}
                                onSelectCorrect={() => setCorrectAnswer(choice)}
                            />
                        );
                    })}
                </div>
            </div>

            <Field label="Feedback jawaban" required tooltip="Penjelasan materi yang muncul setelah siswa menjawab (alasan kenapa jawaban tersebut benar/salah)."><textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} /></Field>
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

    const moveQuestion = (fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= stage.questions.length) return;
        const nextQuestions = [...stage.questions];
        const temp = nextQuestions[fromIndex];
        nextQuestions[fromIndex] = nextQuestions[toIndex];
        nextQuestions[toIndex] = temp;
        updateQuestions(nextQuestions);
        setActiveIndex(toIndex);
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
                            {draft.status === 'published' ? 'Jadikan Draf' : 'Publikasikan Materi'}
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
                                <QuestionNavItem
                                    key={question.id || index}
                                    index={index}
                                    isSelected={isSelected}
                                    isReady={ready}
                                    title={question.japanese || question.context || question.prompt || ''}
                                    subtitle={
                                        question.type === 'transformation' && question.translation
                                            ? question.translation
                                            : question.type === 'sentence_builder'
                                                ? `${question.tokens?.length || 0} potongan token`
                                                : (question.correctAnswer ? `Kunci: ${question.correctAnswer}` : 'Kunci belum dipilih')
                                    }
                                    typeLabel={stageMeta[question.type]?.label || ''}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < stage.questions.length - 1}
                                    canDuplicate={true}
                                    canDelete={stage.questions.length > 1}
                                    onSelect={() => setActiveIndex(index)}
                                    onMoveUp={() => moveQuestion(index, -1)}
                                    onMoveDown={() => moveQuestion(index, 1)}
                                    onDuplicate={() => duplicate(index)}
                                    onDelete={() => remove(index)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Kolom Kanan: Form Editor In-Place Soal Aktif (8 cols) */}
                <div className="lg:col-span-8">
                    {activeQuestion ? (
                        <UnifiedQuestionEditorCanvas
                            questionNumber={activeIndex + 1}
                            title={`Editor Soal #${activeIndex + 1}`}
                            subtitle={`${stageMeta[currentStageId]?.label} · ${stageMeta[currentStageId]?.description}`}
                            speechText={activeQuestion?.japanese || activeQuestion?.question || activeQuestion?.prompt || ''}
                            canDelete={stage.questions.length > 1}
                            onDuplicate={() => duplicate(activeIndex)}
                            onDelete={() => remove(activeIndex)}
                            extraActions={
                                <button
                                    type="button"
                                    title="Buat variasi soal dari materi"
                                    disabled={Boolean(regeneratingKey)}
                                    onClick={() => onRegenerateSingle(currentStageId, activeIndex)}
                                    className="flex h-8 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                                >
                                    <RefreshIcon sx={{ fontSize: 14 }} className={regeneratingKey === `${currentStageId}-${activeIndex}` ? 'animate-spin' : ''} />
                                    <span>Variasi Baru</span>
                                </button>
                            }
                        >
                            {/* Form Input Komponen */}
                            {currentStageId === 'sentence_builder' ? (
                                <SentenceBuilderEditor question={activeQuestion} onChange={updateActiveQuestion} />
                            ) : (
                                <ChoiceEditor question={activeQuestion} onChange={updateActiveQuestion} />
                            )}
                        </UnifiedQuestionEditorCanvas>
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
    const [showGenerator, setShowGenerator] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [regeneratingKey, setRegeneratingKey] = useState(null);
    const [generatorSuccess, setGeneratorSuccess] = useState('');
    const [savedAt, setSavedAt] = useState('');
    const [lessons, setLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const cleanSnapshotRef = useRef('');
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const currentSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
    const hasUnsavedChanges = Boolean(cleanSnapshotRef.current && currentSnapshot !== cleanSnapshotRef.current);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleRequestClose = () => {
        if (hasUnsavedChanges) {
            openConfirm({
                title: 'Keluar dari Builder Grammar?',
                message: 'Perubahan pada draf belum disimpan dan akan hilang jika Anda keluar. Yakin ingin keluar?',
                confirmLabel: 'Keluar Sekarang',
                variant: 'danger',
                onConfirm: () => {
                    closeConfirm();
                    onClose();
                },
            });
            return;
        }
        onClose();
    };

    const handleSwitchLesson = (targetLesson) => {
        const applySwitch = () => {
            const nextDraft = targetLesson || makeDraft(day, defaultLevel);
            setDraft(nextDraft);
            cleanSnapshotRef.current = JSON.stringify(nextDraft);
            setError('');
            setFieldErrors({});
            setGeneratorSuccess('');
        };

        if (hasUnsavedChanges) {
            openConfirm({
                title: 'Beralih ke Lesson Lain?',
                message: 'Perubahan pada lesson saat ini belum disimpan dan akan hilang. Lanjutkan?',
                confirmLabel: 'Lanjutkan Beralih',
                variant: 'warning',
                onConfirm: () => {
                    closeConfirm();
                    applySwitch();
                },
            });
            return;
        }

        applySwitch();
    };

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
        const initialDraft = makeDraft(day, defaultLevel);
        setDraft(initialDraft);
        cleanSnapshotRef.current = JSON.stringify(initialDraft);
        setLessons([]);
        setError('');
        setFieldErrors({});
        setGeneratorSuccess('');
        window.axios.get(`/admin/module-days/${day.id}/grammar-quizzes`)
            .then(({ data }) => {
                if (!active) return;
                const available = data.lessons || [];
                setLessons(available);
                if (available[0]) {
                    setDraft(available[0]);
                    cleanSnapshotRef.current = JSON.stringify(available[0]);
                }
            })
            .catch(() => active && setError('Data Grammar belum dapat dimuat.'));
        setSavedAt('');
        return () => { active = false; };
    }, [day?.id, open, defaultLevel]);

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
                choices: Array.isArray(question.choices)
                    ? question.choices.map((c) => String(c).trim()).filter(Boolean)
                    : question.choices,
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
            setError('Belum ada soal pada draf kuis. Buat draf melalui Generator Soal atau tambahkan soal manual terlebih dahulu.');
            return;
        }

        const emptyStage = draft.stages.find((stg) => (stg.questions || []).length === 0);
        if (emptyStage) {
            setError(`Stage "${stageMeta[emptyStage.id]?.label || emptyStage.id}" wajib memiliki minimal 1 butir soal.`);
            setActiveMainTab('questions');
            setActiveStageId(emptyStage.id);
            return;
        }

        for (const stg of draft.stages) {
            if (stg.id === 'sentence_builder') continue;
            for (let qIdx = 0; qIdx < (stg.questions || []).length; qIdx++) {
                const q = stg.questions[qIdx];
                const validChoices = (q.choices || []).filter((c) => String(c).trim() !== '');
                if (validChoices.length < 2) {
                    setError(`Soal #${qIdx + 1} pada stage "${stageMeta[stg.id]?.label || stg.id}" wajib memiliki minimal 2 pilihan jawaban.`);
                    setActiveMainTab('questions');
                    setActiveStageId(stg.id);
                    return;
                }
                if (!q.correctAnswer || !validChoices.includes(q.correctAnswer)) {
                    setError(`Kunci jawaban untuk soal #${qIdx + 1} pada stage "${stageMeta[stg.id]?.label || stg.id}" belum dipilih atau tidak sesuai pilihan.`);
                    setActiveMainTab('questions');
                    setActiveStageId(stg.id);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const response = draft.id && Number.isInteger(Number(draft.id))
                ? await window.axios.put(`/admin/grammar-quizzes/${draft.id}`, requestPayload())
                : await window.axios.post(`/admin/module-days/${day.id}/grammar-quizzes`, requestPayload());
            const saved = response.data.lesson;
            setDraft(saved);
            cleanSnapshotRef.current = JSON.stringify(saved);
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
                const errKeys = Object.keys(formatted);
                if (errKeys.some((k) => k.startsWith('lesson.') || k === 'pattern' || k === 'title' || k === 'meaning' || k === 'formula')) {
                    setActiveMainTab('intro');
                } else if (errKeys.some((k) => k.startsWith('stages'))) {
                    setActiveMainTab('questions');
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

    const generateDraft = () => setShowGenerator(true);

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
                operation: 'regenerate',
                quiz_id: draft.id && Number.isInteger(Number(draft.id)) ? Number(draft.id) : null,
                module_day_id: day.id,
                question_id: String(draft.stages.find(stage => stage.id === stageId).questions[index].id),
                existing_questions: grammarQuestionsToDraft(draft.stages),
                level: String(draft.level).match(/N[1-5]/)?.[0] || 'N5',
                input: {
                    pattern: draft.pattern || '',
                    title: draft.title || '',
                    meaning: draft.intro?.meaning || '',
                    formula: draft.intro?.formula || '',
                    explanation: draft.intro?.explanation || '',
                    examples: (draft.intro?.examples || []).filter(example => example.japanese?.trim()),
                },
                settings: {
                    count: Object.values(settings.counts).reduce((sum, count) => sum + Number(count), 0),
                    counts: settings.counts,
                    difficulty: settings.difficulty,
                    target_form: settings.target_form || 'auto',
                    useDistractors: settings.useDistractors,
                    autoMeaning: settings.autoMeaning,
                },
            };
            const response = await window.axios.post(route('admin.quiz-generator', 'grammar'), payload);
            const newQuestion = grammarStagesFromDraft(response.data.draft).find(stage => stage.id === stageId)?.questions[0];
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
                setGeneratorSuccess('Soal berhasil diperbarui dengan variasi baru.');
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

    return (
        <UnifiedQuizBuilderShell
            open={open}
            isModal={true}
            title="Builder Kuis Grammar"
            subtitle={`${module?.title || 'Minggu'} · Hari ${day?.day_number || ''}`}
            categoryBadge="Grammar Builder"
            status={draft.status || 'draft'}
            savedAt={savedAt}
            saving={saving}
            hasUnsavedChanges={hasUnsavedChanges}
            onBack={showGenerator ? undefined : handleRequestClose}
            onSave={saveDraft}
            onToggleStatus={Number.isInteger(Number(draft.id)) ? () => setStatus(draft.status === 'published' ? 'draft' : 'published') : undefined}
            onPreview={() => setShowPreview(true)}
            onImport={() => setShowBulkImport(true)}
            centerContent={
                <>
                    {lessons.length > 0 && (
                        <select
                            value={Number.isInteger(Number(draft.id)) ? draft.id : ''}
                            onChange={(event) => {
                                const selected = lessons.find((lesson) => String(lesson.id) === event.target.value);
                                handleSwitchLesson(selected || null);
                            }}
                            className="h-9 max-w-52 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-900"
                        >
                            <option value="">Lesson baru</option>
                            {lessons.map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                    {lesson.pattern} / {lesson.title}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => handleSwitchLesson(null)}
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black dark:border-gray-700 dark:bg-gray-900 hover:bg-gray-50"
                    >
                        Lesson Baru
                    </button>
                    <button type="button" onClick={generateDraft} className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-300 px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300"><AutoAwesomeIcon sx={{ fontSize: 16 }} />Generator Soal</button>
                </>
            }
            tabs={[{
                    id: 'questions',
                    label: 'Editor Soal Manual',
                    icon: FormatListBulletedIcon,
                    count: `${totals.ready}/${totals.total} Siap`,
                },{
                    id: 'intro',
                    label: 'Materi & Pola Grammar',
                    icon: MenuBookIcon,
                    badge: draft.pattern || null,
                }]}
            activeTab={activeMainTab}
            onTabChange={setActiveMainTab}
            unstyled={true}
            extraModals={
                <>
                    <UnifiedQuizGeneratorModal open={showGenerator} onClose={() => setShowGenerator(false)} type="grammar"
                        initialData={{ quizId: draft.id && Number.isInteger(Number(draft.id)) ? Number(draft.id) : null,
                            moduleDayId: day.id, level: draft.level, hasContent: draft.stages.some(stage => stage.questions?.length), settings,
                            input: { pattern: draft.pattern, title: draft.title, formula: draft.intro?.formula || '', meaning: draft.intro?.meaning || '', explanation: draft.intro?.explanation || '', examples: draft.intro?.examples || [] } }}
                        onApplyDraft={(generated, appliedSettings) => {
                            const lesson = generated.material.lesson;
                            setDraft(current => ({ ...current, pattern: lesson.pattern, title: lesson.title || current.title, level: generated.level,
                                intro: { ...current.intro, formula: lesson.formula, meaning: lesson.meaning, explanation: lesson.explanation, examples: lesson.examples }, stages: grammarStagesFromDraft(generated) }));
                            setSettings(current => ({ ...current, ...appliedSettings, count: generated.questions.length, counts: Object.fromEntries(['transformation', 'sentence_builder', 'context_choice'].map(id => [id, generated.questions.filter(q => q.stage === id).length])) }));
                            setActiveMainTab('questions'); setError(''); setGeneratorSuccess('Draf diterapkan ke editor.');
                        }} />
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
                    <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
                </>
            }
        >
            <div className="space-y-6">
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
                                    Pola grammar belum diisi. Anda dapat mengedit butir soal langsung di bawah, atau melengkapi materi di tab <strong>Materi & Pola Grammar</strong>.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setActiveMainTab('intro')}
                                    className="shrink-0 font-bold underline hover:text-amber-950 dark:text-amber-300"
                                >
                                    Lengkapi Materi
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
                                Lanjut ke Editor Soal
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </UnifiedQuizBuilderShell>
    );
}
