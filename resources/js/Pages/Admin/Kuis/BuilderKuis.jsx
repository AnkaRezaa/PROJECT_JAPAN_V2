import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import HandwritingFlashcardWorkspace from '@/Components/Features/Handwriting/HandwritingFlashcardWorkspace';
import { FlashcardEditorWorkspace } from '@/Pages/Admin/Flashcard/BuilderFlashcard';
import {
    QUESTION_TYPES,
    TYPE_COLORS,
    TYPE_LABELS,
    emptyQuestion,
    getQuestionError,
    normalizeQuestionType,
    normalizeQuestions,
} from './Builder/helpers';

export default function QuizBuilder({
    quiz,
    questions: initialQuestions = [],
    flashcardWorkspace = null,
}) {
    const builderReturnUrl = quiz?.module?.program_pembelajaran_id
        ? route('admin.modules.index', {
            program_id: quiz.module.program_pembelajaran_id,
            week_id: quiz.module.id,
            day_id: quiz.day?.id,
            focus: 'roadmap',
        })
        : route('admin.programs.index');
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState(
        flashcardWorkspace?.sets?.length ? 'flashcards' : 'questions',
    );
    const [activeFlashcardSetId, setActiveFlashcardSetId] = useState(
        flashcardWorkspace?.sets?.[0]?.id ?? null,
    );
    const [importProcessing, setImportProcessing] = useState(false);
    const [importPreview, setImportPreview] = useState(null);
    const [importError, setImportError] = useState('');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showVocabularyGenerate, setShowVocabularyGenerate] = useState(false);
    const [vocabularyPreview, setVocabularyPreview] = useState(null);
    const [vocabularyGeneratorError, setVocabularyGeneratorError] = useState('');
    const [vocabularyGeneratorLoading, setVocabularyGeneratorLoading] = useState(false);
    const [showStudentPreview, setShowStudentPreview] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewAnswers, setPreviewAnswers] = useState({});
    const importInputRef = useRef(null);
    const initialForm = {
        time_limit: quiz?.time_limit ?? '',
        passing_score: quiz?.passing_score ?? 70,
        questions: normalizeQuestions(initialQuestions, quiz?.type),
    };
    const cleanSnapshotRef = useRef(JSON.stringify(initialForm));

    const { data, setData, post, processing, recentlySuccessful, errors, clearErrors } = useForm(initialForm);
    const vocabularyForm = useForm({
        content_type: 'all',
        jlpt_level: quiz?.module?.level?.level_name || 'all',
        category: 'all',
        count: 10,
        mode: 'word_to_meaning',
        status: 'published',
    });
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const activeQ = data.questions[activeIndex] || data.questions[0] || emptyQuestion(quiz?.type || 'multiple_choice');
    const flashcardSets = flashcardWorkspace?.sets || [];
    const activeFlashcardSet = flashcardSets.find((set) => set.id === activeFlashcardSetId)
        || flashcardSets[0]
        || null;
    const optLabels = ['A', 'B', 'C', 'D'];
    const questionErrors = useMemo(() => data.questions.map(getQuestionError), [data.questions]);
    const firstQuestionError = questionErrors.find(Boolean);
    const currentSnapshot = useMemo(() => JSON.stringify(data), [data]);
    const hasUnsavedChanges = currentSnapshot !== cleanSnapshotRef.current;

    useEffect(() => {
        if (activeIndex > data.questions.length - 1) {
            setActiveIndex(Math.max(0, data.questions.length - 1));
        }
    }, [activeIndex, data.questions.length]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const requestUnsavedAction = (action, config = {}) => {
        if (!hasUnsavedChanges) {
            action();
            return;
        }

        openConfirm({
            variant: 'warning',
            title: 'Ada Perubahan Belum Disimpan',
            message: 'Perubahan terakhir di builder belum dipublish. Lanjutkan aksi ini?',
            confirmLabel: 'Lanjutkan',
            ...config,
            onConfirm: () => {
                closeConfirm();
                action();
            },
        });
    };

    const updateQuestion = (index, field, value) => {
        clearErrors();
        const updated = [...data.questions];
        updated[index] = { ...updated[index], [field]: value };
        setData('questions', updated);
    };

    const updateOption = (qIndex, optIndex, value) => {
        clearErrors();
        const updated = [...data.questions];
        const opts = [...(updated[qIndex].options || ['', '', '', ''])];
        const previousValue = opts[optIndex];
        opts[optIndex] = value;
        updated[qIndex] = {
            ...updated[qIndex],
            options: opts,
            correct_answer: updated[qIndex].correct_answer === previousValue
                ? value
                : updated[qIndex].correct_answer,
        };
        setData('questions', updated);
    };

    const updateOptionReading = (qIndex, optIndex, value) => {
        clearErrors();
        const updated = [...data.questions];
        const readings = [...(updated[qIndex].option_readings || ['', '', '', ''])];
        readings[optIndex] = value;
        updated[qIndex] = { ...updated[qIndex], option_readings: readings };
        setData('questions', updated);
    };

    const setCorrectAnswer = (qIndex, value) => {
        clearErrors();
        const updated = [...data.questions];
        updated[qIndex] = { ...updated[qIndex], correct_answer: value };
        setData('questions', updated);
    };

    const changeQuestionType = (index, newType) => {
        clearErrors();
        const updated = [...data.questions];
        const nextDefaults = emptyQuestion(newType);
        updated[index] = {
            ...updated[index],
            type: newType,
            options: newType === 'multiple_choice' && Array.isArray(updated[index].options) && updated[index].options.length
                ? updated[index].options
                : nextDefaults.options,
            option_readings: newType === 'multiple_choice' && Array.isArray(updated[index].option_readings) && updated[index].option_readings.length
                ? updated[index].option_readings
                : nextDefaults.option_readings,
        };
        setData('questions', updated);
    };

    const addQuestion = (type) => {
        clearErrors();
        const newQ = emptyQuestion(type || quiz?.type || 'multiple_choice');
        newQ.order = data.questions.length;
        setData('questions', [...data.questions, newQ]);
        setActiveIndex(data.questions.length);
    };

    const removeQuestion = (index) => {
        if (data.questions.length <= 1) return;
        clearErrors();
        const updated = data.questions.filter((_, i) => i !== index);
        setData('questions', updated);
        if (activeIndex >= updated.length) setActiveIndex(updated.length - 1);
    };

    const handleSave = () => {
        if (firstQuestionError) {
            const invalidIndex = questionErrors.findIndex(Boolean);
            setActiveTab('questions');
            setActiveIndex(invalidIndex);
            openConfirm({
                variant: 'warning',
                title: 'Soal Belum Lengkap',
                message: firstQuestionError,
                details: [{ label: 'Nomor soal', value: `Q${invalidIndex + 1}` }],
                confirmLabel: 'Perbaiki',
                cancelLabel: 'Tutup',
                onConfirm: closeConfirm,
            });
            return;
        }

        post(route('admin.quizzes.builder.update', quiz.id), {
            preserveScroll: true,
            onSuccess: () => {
                cleanSnapshotRef.current = JSON.stringify(data);
            },
        });
    };

    const toggleQuizStatus = () => {
        const nextStatus = quiz?.status === 'published' ? 'draft' : 'published';
        requestUnsavedAction(() => openConfirm({
            variant: nextStatus === 'published' ? 'success' : 'warning',
            title: nextStatus === 'published' ? 'Publish Kuis?' : 'Ubah ke Draft?',
            message: nextStatus === 'published'
                ? 'Kuis akan tersedia mengikuti aturan akses dan progres Day.'
                : 'Kuis akan disembunyikan sementara dari user.',
            confirmLabel: nextStatus === 'published' ? 'Publish' : 'Ubah ke Draft',
            onConfirm: () => router.patch(route('admin.quizzes.status', quiz.id), {
                status: nextStatus,
            }, {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        }), {
            title: 'Simpan Soal Terlebih Dahulu',
            message: 'Status tidak dapat diubah sebelum perubahan soal disimpan.',
        });
    };

    const deleteQuiz = () => {
        requestUnsavedAction(() => openConfirm({
            variant: 'danger',
            title: 'Hapus Kuis Day?',
            message: 'Kuis, soal, dan data terkait akan dihapus. Aksi ini tidak dapat dibatalkan.',
            confirmLabel: 'Hapus Kuis',
            details: [
                { label: 'Day', value: quiz?.day?.title || '-' },
                { label: 'Soal', value: `${data.questions.length} soal` },
            ],
            onConfirm: () => router.delete(route('admin.quizzes.destroy', quiz.id), {
                onFinish: closeConfirm,
            }),
        }), {
            title: 'Perubahan Belum Disimpan',
            message: 'Simpan atau batalkan perubahan soal sebelum menghapus kuis.',
        });
    };

    const openStudentPreview = () => {
        setPreviewIndex(activeIndex);
        setPreviewAnswers({});
        setShowStudentPreview(true);
    };

    const previewImportFile = async (file, input) => {
        const payload = new FormData();
        payload.append('import_file', file);
        setImportProcessing(true);
        setImportError('');
        setImportPreview(null);

        try {
            const response = await window.axios.post(
                route('admin.quizzes.questions.import.preview', quiz.id),
                payload,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setImportPreview({
                ...response.data,
                file,
                file_name: file.name,
                file_size: file.size,
            });
        } catch (error) {
            const message = error.response?.data?.message
                || error.response?.data?.errors?.import_file?.[0]
                || 'Gagal membaca file import. Pastikan format dan header template benar.';
            setImportError(message);
        } finally {
            setImportProcessing(false);
            input.value = '';
        }
    };

    const handleImportQuestions = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const input = event.target;

        const importNow = () => previewImportFile(file, input);

        if (hasUnsavedChanges) {
            input.value = '';
            requestUnsavedAction(importNow, {
                title: 'Preview Import Soal?',
                message: 'File akan dicek dulu sebelum disimpan. Simpan perubahan manual dulu jika masih diperlukan.',
                confirmLabel: 'Cek File',
            });
            return;
        }

        importNow();
    };

    const handleConfirmImport = () => {
        if (!importPreview?.file || importPreview.valid_count <= 0) return;

        const payload = new FormData();
        payload.append('import_file', importPreview.file);
        setImportProcessing(true);

        router.post(route('admin.quizzes.questions.import', quiz.id), payload, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                setImportPreview(null);
                setImportError('');
            },
            onFinish: () => setImportProcessing(false),
        });
    };

    useEffect(() => {
        setVocabularyPreview(null);
        setVocabularyGeneratorError('');
    }, [
        vocabularyForm.data.content_type,
        vocabularyForm.data.jlpt_level,
        vocabularyForm.data.category,
        vocabularyForm.data.count,
        vocabularyForm.data.mode,
        vocabularyForm.data.status,
    ]);

    const handleGenerateVocabularyQuestions = async (event) => {
        event.preventDefault();

        setVocabularyGeneratorLoading(true);
        setVocabularyGeneratorError('');

        try {
            const response = await window.axios.post(
                route('admin.quizzes.questions.generate-vocabulary.preview', quiz.id),
                vocabularyForm.data,
            );
            setVocabularyPreview(response.data);
        } catch (error) {
            setVocabularyGeneratorError(
                error.response?.data?.errors?.generate?.[0]
                || error.response?.data?.message
                || 'Preview soal tidak dapat dibuat.',
            );
        } finally {
            setVocabularyGeneratorLoading(false);
        }
    };

    const confirmGenerateVocabularyQuestions = () => {
        if (!vocabularyPreview?.vocabulary_ids?.length) return;

        requestUnsavedAction(() => {
            router.post(route('admin.quizzes.questions.generate-vocabulary', quiz.id), {
                ...vocabularyForm.data,
                vocabulary_ids: vocabularyPreview.vocabulary_ids,
            }, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    setShowVocabularyGenerate(false);
                    setVocabularyPreview(null);
                },
            });
        }, {
            title: 'Generate Soal Kosakata?',
            message: `${vocabularyPreview.count} soal pada preview akan ditambahkan ke editor.`,
            confirmLabel: 'Tambahkan Soal',
        });
    };

    const totalPoints = data.questions.reduce(
        (total, question) => total + Math.max(1, Number(question.points || 1)),
        0,
    );

    // ─── RENDER: QUESTION EDITOR (by type) ──────────────────
    const renderEditor = () => {
        const qType = activeQ.type || 'multiple_choice';

        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-brand-600 overflow-hidden">
                {/* Editor Header */}
                <div className="flex flex-col gap-3 p-4 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        </div>
                        <h2 className="font-black text-gray-900 dark:text-white">Q{activeIndex + 1}</h2>
                        {questionErrors[activeIndex] && (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-black uppercase text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Belum lengkap</span>
                        )}
                        <select
                            value={qType}
                            onChange={(e) => changeQuestionType(activeIndex, e.target.value)}
                            className="bg-transparent font-medium text-sm text-gray-600 dark:text-gray-400 focus:outline-none cursor-pointer"
                        >
                            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Bobot</span>
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={activeQ.points || 1}
                                onChange={(event) => updateQuestion(activeIndex, 'points', Number(event.target.value))}
                                className="h-8 w-20 rounded-lg border border-gray-200 bg-white px-2 text-sm font-black text-gray-800 outline-none focus:border-focus dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                        </label>
                        <button onClick={() => removeQuestion(activeIndex)} className="text-gray-300 hover:text-brand-500 transition-colors">
                            <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-6 sm:p-8 sm:space-y-8">
                    {errors.questions && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm font-bold text-brand-700 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300">
                            {errors.questions}
                        </div>
                    )}
                    {/* ─── Listening: Audio URL ─── */}
                    {qType === 'listening' && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <MicNoneOutlinedIcon sx={{ fontSize: 14 }} /> Audio URL
                            </label>
                            <input
                                type="text"
                                value={activeQ.audio_url || ''}
                                onChange={(e) => updateQuestion(activeIndex, 'audio_url', e.target.value)}
                                placeholder="https://example.com/audio.mp3"
                                className="w-full rounded-xl border border-transparent bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-100 focus:bg-white focus:ring-4 focus:ring-focus/10 dark:bg-gray-800/50 dark:text-white dark:focus:border-brand-900/30 dark:focus:bg-gray-950"
                            />
                            {activeQ.audio_url && (
                                <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
                                        <MicNoneOutlinedIcon sx={{ fontSize: 20 }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-green-700 dark:text-green-400 truncate">{activeQ.audio_url}</p>
                                        <audio controls className="w-full mt-2 h-8" src={activeQ.audio_url} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Question Text ─── */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                            {qType === 'listening' ? 'Question After Listening' : qType === 'fill_blank' ? 'Sentence (use ___ for blank)' : 'Question Text'}
                        </label>
                        <div className="relative">
                            <textarea
                                value={activeQ.question_text}
                                onChange={(e) => updateQuestion(activeIndex, 'question_text', e.target.value)}
                                placeholder={
                                    qType === 'fill_blank'
                                        ? 'e.g. 彼は___に行きました。'
                                        : qType === 'listening'
                                        ? 'e.g. 音声で言っていることは何ですか？'
                                        : 'Contoh: Pilih cara baca yang benar untuk 経済'
                                }
                                className="w-full min-h-[100px] rounded-xl border border-transparent bg-gray-50 p-4 text-base font-medium text-gray-900 outline-none transition-all resize-none focus:border-brand-100 focus:bg-white focus:ring-4 focus:ring-focus/10 dark:bg-gray-800/50 dark:text-white dark:focus:border-brand-900/30 dark:focus:bg-gray-950"
                            />
                        </div>
                        <input
                            type="text"
                            value={activeQ.question_reading || ''}
                            onChange={(e) => updateQuestion(activeIndex, 'question_reading', e.target.value)}
                            placeholder="Cara baca kana (opsional), contoh: けいざい"
                            className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-medium text-sky-900 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                        />
                    </div>

                    {/* ─── Multiple Choice: Options Grid ─── */}
                    {qType === 'multiple_choice' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {(activeQ.options || ['', '', '', '']).map((opt, optIdx) => {
                                const isCorrect = activeQ.correct_answer === opt && opt !== '';
                                return (
                                    <div key={optIdx} className="relative group">
                                        <div className={`absolute left-4 top-7 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-xs font-bold z-10 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-gray-200'}`}>
                                            {optLabels[optIdx]}
                                        </div>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => updateOption(activeIndex, optIdx, e.target.value)}
                                            placeholder={`Opsi ${optLabels[optIdx]}`}
                                            className={`w-full h-14 rounded-xl pl-14 pr-12 text-sm font-medium focus:outline-none ${
                                                isCorrect
                                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-500 text-green-900 dark:text-green-200 font-bold focus:ring-4 focus:ring-green-500/20'
                                                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:border-gray-400'
                                            }`}
                                        />
                                        <input
                                            type="text"
                                            value={activeQ.option_readings?.[optIdx] || ''}
                                            onChange={(e) => updateOptionReading(activeIndex, optIdx, e.target.value)}
                                            placeholder="Cara baca kana (opsional)"
                                            className="mt-2 h-10 w-full rounded-lg border border-sky-100 bg-sky-50/60 px-3 text-xs font-medium text-sky-900 outline-none focus:border-sky-300 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCorrectAnswer(activeIndex, opt)}
                                            className={`absolute right-4 top-7 -translate-y-1/2 ${isCorrect ? 'text-green-500' : 'text-gray-300 hover:text-gray-400 dark:text-gray-500'}`}
                                        >
                                            {isCorrect ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 22 }} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ─── Fill in Blank: Answer Input ─── */}
                    {qType === 'fill_blank' && (
                        <div className="space-y-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 dark:bg-purple-900/20 dark:border-purple-900/40">
                                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Preview Soal</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                                    {activeQ.question_text
                                        ? activeQ.question_text.split('___').map((part, i, arr) => (
                                            <React.Fragment key={i}>
                                                {part}
                                                {i < arr.length - 1 && (
                                                    <span className="inline-block mx-1 px-4 py-1 bg-white dark:bg-gray-950 border-2 border-dashed border-purple-400 dark:border-purple-700 rounded-lg text-purple-600 dark:text-purple-300 font-black text-sm">
                                                        {activeQ.correct_answer || '?'}
                                                    </span>
                                                )}
                                            </React.Fragment>
                                        ))
                                        : <span className="text-gray-300">Tulis kalimat dengan ___ ...</span>
                                    }
                                </p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Jawaban Benar (isi dari blank)</label>
                                <input
                                    type="text"
                                    value={activeQ.correct_answer}
                                    onChange={(e) => updateQuestion(activeIndex, 'correct_answer', e.target.value)}
                                    placeholder="Contoh: 学校"
                                    className="w-full h-14 bg-white dark:bg-gray-950 border-2 border-purple-300 dark:border-purple-800 rounded-xl px-4 text-lg font-bold text-purple-900 dark:text-purple-200 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                                <input
                                    type="text"
                                    value={activeQ.correct_answer_reading || ''}
                                    onChange={(e) => updateQuestion(activeIndex, 'correct_answer_reading', e.target.value)}
                                    placeholder="Cara baca kana (opsional)"
                                    className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-medium text-sky-900 outline-none focus:border-sky-300 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Hint (Opsional)</label>
                                <input
                                    type="text"
                                    value={(activeQ.options && activeQ.options[0]) || ''}
                                    onChange={(e) => {
                                        const updated = [...data.questions];
                                        updated[activeIndex] = { ...updated[activeIndex], options: [e.target.value] };
                                        setData('questions', updated);
                                    }}
                                    placeholder="e.g. がっこう (petunjuk membaca)"
                                    className="w-full h-12 rounded-xl border border-transparent bg-gray-50 px-4 text-sm font-medium text-gray-600 outline-none focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-500/10 dark:bg-gray-800/50 dark:text-gray-300 dark:focus:border-gray-600 dark:focus:bg-gray-950"
                                />
                                <input
                                    type="text"
                                    value={activeQ.correct_answer_reading || ''}
                                    onChange={(e) => updateQuestion(activeIndex, 'correct_answer_reading', e.target.value)}
                                    placeholder="Cara baca kana (opsional)"
                                    className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-medium text-sky-900 outline-none focus:border-sky-300 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── Listening: Answer (same as MC or direct) ─── */}
                    {qType === 'listening' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Jawaban Benar</label>
                                <input
                                    type="text"
                                    value={activeQ.correct_answer}
                                    onChange={(e) => updateQuestion(activeIndex, 'correct_answer', e.target.value)}
                                    placeholder="Contoh: 天気予報"
                                    className="w-full h-14 bg-white dark:bg-gray-950 border-2 border-green-300 dark:border-green-800 rounded-xl px-4 text-lg font-bold text-green-900 dark:text-green-200 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                                <HelpOutlineIcon className="text-green-500" sx={{ fontSize: 18 }} />
                                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Siswa akan mendengarkan audio, lalu mengetikkan jawaban. Cocok untuk latihan <strong>dictation</strong> atau <strong>comprehension</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* ─── Explanation (all types) ─── */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Explanation for Correct Answer
                        </label>
                        <textarea
                            value={activeQ.explanation || ''}
                            onChange={(e) => updateQuestion(activeIndex, 'explanation', e.target.value)}
                            placeholder="Contoh: 経済 (keizai) berarti ekonomi."
                            className="w-full min-h-[80px] rounded-xl border border-transparent bg-gray-50 p-4 text-sm font-medium text-gray-500 outline-none transition-all resize-none focus:border-brand-100 focus:bg-white focus:ring-4 focus:ring-focus/10 dark:bg-gray-800/50 dark:text-gray-300 dark:focus:border-brand-900/30 dark:focus:bg-gray-950"
                        />
                        <input
                            type="text"
                            value={activeQ.explanation_reading || ''}
                            onChange={(e) => updateQuestion(activeIndex, 'explanation_reading', e.target.value)}
                            placeholder="Cara baca kana untuk teks Jepang pada pembahasan (opsional)"
                            className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-medium text-sky-900 outline-none focus:border-sky-300 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                        />
                    </div>
                </div>
            </div>
        );
    };

    // ─── RENDER: SETTINGS PANEL ─────────────────────────────
    const renderSettings = () => (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-6">
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><SettingsIcon sx={{ fontSize: 20 }} className="text-brand-700" /> Pengaturan Kuis</h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"><TimerOutlinedIcon sx={{ fontSize: 12 }} /> Batas Waktu (detik)</label>
                        <input
                            type="number"
                            min="0"
                            value={data.time_limit ?? ''}
                            onChange={(e) => setData('time_limit', e.target.value)}
                            className="w-full h-12 rounded-xl border border-transparent bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-brand-100 focus:bg-white focus:ring-4 focus:ring-focus/10 dark:bg-gray-800/50 dark:text-white dark:focus:border-brand-900/30 dark:focus:bg-gray-950"
                            placeholder="Kosong = tanpa batas"
                        />
                        {errors.time_limit && <p className="mt-1 text-[10px] font-bold text-red-600">{errors.time_limit}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingUpIcon sx={{ fontSize: 12 }} /> Nilai Lulus (%)</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={data.passing_score ?? 70}
                            onChange={(e) => setData('passing_score', e.target.value)}
                            className="w-full h-12 rounded-xl border border-transparent bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-brand-100 focus:bg-white focus:ring-4 focus:ring-focus/10 dark:bg-gray-800/50 dark:text-white dark:focus:border-brand-900/30 dark:focus:bg-gray-950"
                            placeholder="Default 70"
                        />
                        {errors.passing_score && <p className="mt-1 text-[10px] font-bold text-red-600">{errors.passing_score}</p>}
                    </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
                        <div className="flex items-start gap-3">
                            <ShuffleIcon className="mt-0.5 text-amber-600 dark:text-amber-300" sx={{ fontSize: 20 }} />
                            <div>
                                <h3 className="text-sm font-black text-amber-800 dark:text-amber-200">Fitur lanjutan belum aktif</h3>
                                <p className="mt-1 text-xs font-semibold text-amber-700/80 dark:text-amber-200/80">
                                    Pengacakan soal, pengacakan opsi, batas percobaan, dan aturan tampilan pembahasan belum disimpan di backend. Untuk saat ini user memakai urutan soal dan feedback dari flow kuis yang sudah aktif.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6 dark:border-gray-800">
                    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lokasi latihan</p>
                        <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">Week {quiz?.module?.week_number || '-'} - {quiz?.module?.title || 'Modul'}</p>
                        <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">Hari {quiz?.day?.day_number || '-'} - {quiz?.day?.title || 'Day'}</p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${quiz?.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                                {quiz?.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={toggleQuizStatus} className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                                    {quiz?.status === 'published' ? 'Ubah ke Draft' : 'Publish Kuis'}
                                </button>
                                <button type="button" onClick={deleteQuiz} className="h-10 rounded-xl border border-red-200 px-4 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20">
                                    Hapus Kuis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ─── RENDER: ANALYSIS PANEL ─────────────────────────────
    const renderAnalysis = () => {
        const qCount = data.questions.length;
        const mcCount = data.questions.filter(q => (q.type || 'multiple_choice') === 'multiple_choice').length;
        const fillCount = data.questions.filter(q => q.type === 'fill_blank').length;
        const listenCount = data.questions.filter(q => q.type === 'listening').length;
        const filledCount = data.questions.filter((_, index) => !questionErrors[index]).length;

        return (
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Total Soal', value: qCount, color: 'text-brand-700' },
                        { label: 'Multiple Choice', value: mcCount, color: 'text-brand-600 dark:text-brand-400' },
                        { label: 'Fill in Blank', value: fillCount, color: 'text-purple-600' },
                        { label: 'Listening', value: listenCount, color: 'text-green-600' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 text-center">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Completeness */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2"><BarChartIcon sx={{ fontSize: 18 }} className="text-brand-700" /> Kelengkapan Soal</h3>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                        <div className="h-3 bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all" style={{ width: `${qCount > 0 ? (filledCount / qCount) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{filledCount}/{qCount} soal terisi lengkap ({qCount > 0 ? Math.round((filledCount / qCount) * 100) : 0}%)</p>
                </div>

                {/* Per-Question Analysis Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2"><TrendingUpIcon sx={{ fontSize: 18 }} className="text-brand-700" /> Item Analysis</h3>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Analisis tiap soal — data akan terisi setelah ada percobaan siswa</p>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                <th className="px-5 py-3 text-left">#</th>
                                <th className="px-5 py-3 text-left">Tipe</th>
                                <th className="px-5 py-3 text-left">Soal</th>
                                <th className="px-5 py-3 text-center">Difficulty (p)</th>
                                <th className="px-5 py-3 text-center">Discrimination</th>
                                <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.questions.map((q, i) => {
                                const isFilled = !questionErrors[i];
                                const typeConf = TYPE_LABELS[q.type || 'multiple_choice'];
                                const typeColor = TYPE_COLORS[q.type || 'multiple_choice'];
                                return (
                                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 dark:bg-gray-800/50">
                                        <td className="px-5 py-3 font-black text-gray-400 dark:text-gray-500">Q{i + 1}</td>
                                        <td className="px-5 py-3"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${typeColor}`}>{typeConf}</span></td>
                                        <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{q.question_text || <span className="text-gray-300 italic">Kosong</span>}</td>
                                        <td className="px-5 py-3 text-center font-bold text-gray-600 dark:text-gray-300">
                                            {q.correct_rate === null || q.correct_rate === undefined ? '-' : `${q.correct_rate}%`}
                                        </td>
                                        <td className="px-5 py-3 text-center font-bold text-gray-600 dark:text-gray-300">
                                            {q.attempts_count ? `${q.correct_count}/${q.attempts_count}` : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {isFilled
                                                ? <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Siap</span>
                                                : <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded">Belum Lengkap</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 rounded-2xl p-5 flex items-start gap-3">
                    <HelpOutlineIcon className="text-brand-500 shrink-0 mt-0.5" sx={{ fontSize: 18 }} />
                    <div>
                        <p className="text-sm font-bold text-brand-900">Tentang Item Analysis</p>
                        <p className="text-xs text-brand-700 dark:text-brand-400 mt-1 leading-relaxed">
                            <strong>Difficulty (p-value)</strong>: Proporsi siswa yang menjawab benar. Rentang 0.0 (semua salah) — 1.0 (semua benar). Ideal: 0.3–0.7.<br />
                            <strong>Discrimination</strong>: Seberapa baik soal membedakan siswa pintar vs kurang. Positif = baik. Nol/negatif = soal perlu direvisi.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // ─── RENDER: STUDENT PREVIEW ────────────────────────────
    const renderPreview = (question = activeQ, index = activeIndex, fullScreen = false) => {
        const qType = question.type || 'multiple_choice';
        return (
            <div className={`relative flex flex-col overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 ${fullScreen ? 'h-full min-h-0 rounded-2xl' : 'h-[500px] rounded-[2rem]'}`}>
                <div className="bg-brand-600 h-12 flex items-center px-4 justify-between shrink-0">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Pratinjau Siswa</span>
                    <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900/50"></div>
                </div>
                <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                        <div className="h-1.5 bg-brand-600 rounded-full" style={{ width: `${data.questions.length > 0 ? ((index + 1) / data.questions.length) * 100 : 0}%` }}></div>
                    </div>

                    {qType === 'listening' && question.audio_url && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                            <MicNoneOutlinedIcon className="text-green-600" sx={{ fontSize: 16 }} />
                            <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase">Audio</span>
                        </div>
                    )}

                    <div className="text-center mb-6">
                        <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-2">Soal {index + 1}</p>
                        <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                            {question.question_text || <span className="text-gray-300">...</span>}
                        </h3>
                    </div>

                    {qType === 'multiple_choice' && (
                        <div className="space-y-2 mb-auto">
                            {(question.options || []).map((opt, i) => (
                                <button type="button" key={i} onClick={() => setPreviewAnswers((answers) => ({ ...answers, [index]: opt }))} className={`w-full border rounded-xl px-4 py-2.5 text-center text-xs font-bold ${
                                    previewAnswers[index] === opt && opt !== '' ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {opt || <span className="text-gray-300">-</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {qType === 'fill_blank' && (
                        <div className="mb-auto">
                            <div className="border-2 border-dashed border-purple-300 rounded-xl px-4 py-3 text-center">
                                <input type="text" value={previewAnswers[index] || ''} onChange={(event) => setPreviewAnswers((answers) => ({ ...answers, [index]: event.target.value }))} placeholder="Ketik jawaban siswa" className="w-full border-none bg-transparent text-center text-sm font-bold text-purple-600" />
                            </div>
                        </div>
                    )}

                    {qType === 'listening' && (
                        <div className="mb-auto">
                            <div className="border-2 border-dashed border-green-300 rounded-xl px-4 py-3 text-center">
                                <input type="text" value={previewAnswers[index] || ''} onChange={(event) => setPreviewAnswers((answers) => ({ ...answers, [index]: event.target.value }))} placeholder="Ketik jawaban siswa" className="w-full border-none bg-transparent text-center text-sm font-bold text-green-600" />
                            </div>
                        </div>
                    )}

                    <p className="mt-4 text-center text-xs font-bold text-gray-400">Mode pratinjau tidak menyimpan jawaban, attempt, nilai, atau XP.</p>
                </div>
                <div className="h-10 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between px-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Waktu: {data.time_limit ? `${data.time_limit} detik` : 'Tanpa batas'}</span>
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Lulus: {data.passing_score || 70}%</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Poin: {totalPoints}</span>
                </div>
            </div>
        );
    };
    const previewQuestion = data.questions[previewIndex] || emptyQuestion(quiz?.type || 'multiple_choice');

    return (
        <AuthenticatedLayout>
            <div className="min-h-screen bg-surface-muted flex flex-col font-sans">
            <Head title="Editor Kuis & Repetisi - TOKU-UP" />

            {/* Top Nav */}
            <header className="sticky top-16 z-40 shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 lg:top-0 lg:min-h-16 lg:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <button type="button" onClick={() => requestUnsavedAction(() => router.visit(builderReturnUrl), { title: 'Keluar dari Builder?', message: 'Perubahan terakhir belum dipublish. Keluar sekarang?' })} className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">JP</div>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-black leading-none tracking-tight text-gray-900 dark:text-white">Editor Kuis &amp; Repetisi</h1>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                Minggu {quiz?.module?.week_number || '-'} / Hari {quiz?.day?.day_number || '-'} / {quiz?.type}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:w-auto lg:pb-0">
                    {[
                        { value: 'flashcards', label: 'Materi Repetisi', icon: <StyleOutlinedIcon sx={{ fontSize: 16 }} /> },
                        { value: 'handwriting', label: 'Handwriting', icon: <DrawOutlinedIcon sx={{ fontSize: 16 }} /> },
                        { value: 'questions', label: 'Soal', icon: <FormatListBulletedIcon sx={{ fontSize: 16 }} /> },
                        { value: 'settings', label: 'Pengaturan', icon: <SettingsIcon sx={{ fontSize: 16 }} /> },
                        { value: 'analysis', label: 'Analisis', icon: <AssessmentIcon sx={{ fontSize: 16 }} /> },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                const leavesQuestionForm = ['questions', 'settings', 'analysis'].includes(activeTab)
                                    && ['flashcards', 'handwriting'].includes(tab.value);

                                if (leavesQuestionForm) {
                                    requestUnsavedAction(() => setActiveTab(tab.value), {
                                        title: `Buka ${tab.label}?`,
                                        message: 'Simpan perubahan soal terlebih dahulu agar tidak hilang.',
                                        confirmLabel: 'Lanjutkan',
                                    });
                                    return;
                                }

                                setActiveTab(tab.value);
                            }}
                            className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${
                                activeTab === tab.value ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.value === 'flashcards' && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] dark:bg-gray-800">
                                    {flashcardSets.reduce((total, set) => total + (set.flashcards?.length || 0), 0)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {['questions', 'settings'].includes(activeTab) && (
                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    {hasUnsavedChanges && <span className="text-xs font-bold text-yellow-600">Belum disimpan</span>}
                    {recentlySuccessful && <span className="text-xs font-bold text-green-600 animate-pulse">Tersimpan!</span>}
                    {importError && <span className="max-w-xs text-xs font-bold text-red-600">{importError}</span>}
                    {activeTab === 'questions' && <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowAddMenu(value => !value)}
                            className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                            <AddIcon sx={{ fontSize: 18 }} />
                            Tambah Soal
                        </button>
                        {showAddMenu && (
                            <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Tambah soal</p>
                                {QUESTION_TYPES.map((type) => (
                                    <button
                                        type="button"
                                        key={type.value}
                                        onClick={() => {
                                            addQuestion(type.value);
                                            setShowAddMenu(false);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                    >
                                        <AddIcon sx={{ fontSize: 16 }} />
                                        {type.label}
                                    </button>
                                ))}
                                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setShowVocabularyGenerate(true);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <ShuffleIcon sx={{ fontSize: 16 }} />
                                    Generate dari Kosakata
                                </button>
                                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                                <a
                                    href={route('admin.quizzes.questions.template', { quiz: quiz.id, format: 'xlsx' })}
                                    onClick={() => setShowAddMenu(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    Unduh Template Excel
                                </a>
                                <a
                                    href={route('admin.quizzes.questions.template', { quiz: quiz.id, format: 'csv' })}
                                    onClick={() => setShowAddMenu(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    Unduh Template CSV
                                </a>
                            </div>
                        )}
                    </div>}
                    {activeTab === 'questions' && (
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            disabled={importProcessing}
                            className="flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        >
                            <UploadFileIcon sx={{ fontSize: 18 }} />
                            {importProcessing ? 'Memeriksa File...' : 'Import Excel / CSV'}
                        </button>
                    )}
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".csv,.txt,.xlsx"
                        className="hidden"
                        onChange={handleImportQuestions}
                    />
                    {activeTab === 'questions' && <button
                        type="button"
                        onClick={openStudentPreview}
                        className="flex h-9 items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300"
                    >
                        <VisibilityIcon sx={{ fontSize: 18 }} />
                        Pratinjau Siswa
                    </button>}
                    <button onClick={handleSave} disabled={processing} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl px-6 h-9 shadow-md shadow-brand-500/20 text-sm font-bold flex items-center gap-2 transition-colors">
                        <SaveOutlinedIcon sx={{ fontSize: 18 }} />
                        {processing ? 'Menyimpan...' : 'Simpan & Publish'}
                    </button>
                </div>
                )}
                </div>
            </header>

            {/* Workspace */}
            {!['flashcards', 'handwriting'].includes(activeTab) ? (
            <main className="flex-1 flex flex-col overflow-hidden lg:flex-row">

                {/* Left Panel (only on questions tab) */}
                {activeTab === 'questions' && (
                    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 lg:w-72 lg:border-b-0 lg:border-r">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Questions ({data.questions.length})</span>
                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Points: {totalPoints}</span>
                        </div>
                        <div className="flex-1 overflow-x-auto p-3 lg:overflow-y-auto">
                            <div className="flex min-w-max gap-2 lg:min-w-0 lg:block lg:space-y-2">
                            {data.questions.map((q, i) => {
                                const tLabel = TYPE_LABELS[q.type || 'multiple_choice'];
                                const tColor = TYPE_COLORS[q.type || 'multiple_choice'];
                                const itemError = questionErrors[i];
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setActiveIndex(i)}
                                        className={`w-56 shrink-0 rounded-xl border p-3 text-left transition-all lg:w-full ${
                                            activeIndex === i ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm ring-1 ring-brand-500' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeIndex === i ? 'text-brand-700 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>Q{i + 1}</span>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${tColor}`}>{tLabel}</span>
                                            {itemError && <span className="ml-auto h-2 w-2 rounded-full bg-yellow-500" title={itemError}></span>}
                                        </div>
                                        <p className={`text-sm font-bold truncate ${activeIndex === i ? 'text-brand-900 dark:text-brand-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {q.question_text || 'Pertanyaan baru...'}
                                        </p>
                                    </button>
                                );
                            })}
                            </div>
                        </div>
                    </aside>
                )}

                {/* Center */}
                <section className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {activeTab === 'questions' && renderEditor()}
                    {activeTab === 'settings' && renderSettings()}
                    {activeTab === 'analysis' && renderAnalysis()}

                </section>
            </main>
            ) : activeTab === 'handwriting' ? (
                <HandwritingFlashcardWorkspace
                    sets={flashcardSets}
                    module={quiz?.module}
                    day={quiz?.day}
                />
            ) : (
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        {flashcardSets.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto border-b border-gray-200 py-3 dark:border-gray-800">
                                {flashcardSets.map((set) => (
                                    <button
                                        key={set.id}
                                        type="button"
                                        onClick={() => setActiveFlashcardSetId(set.id)}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black ${
                                            activeFlashcardSet?.id === set.id
                                                ? 'bg-brand-600 text-white'
                                                : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                                        }`}
                                    >
                                        {set.title}
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeFlashcardSet ? (
                            <FlashcardEditorWorkspace
                                key={activeFlashcardSet.id}
                                set={activeFlashcardSet}
                                vocabulary={flashcardWorkspace?.vocabulary || {}}
                                filters={flashcardWorkspace?.filters || {}}
                                quizzes={[quiz]}
                                embedded
                                hostRoute={route('admin.quizzes.builder', quiz.id)}
                            />
                        ) : (
                            <div className="my-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                                <StyleOutlinedIcon className="text-gray-300" sx={{ fontSize: 42 }} />
                                <h2 className="mt-3 text-lg font-black text-gray-900 dark:text-white">Flashcard Day belum dibuat</h2>
                                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Buat set flashcard untuk Day ini dari halaman Roadmap, lalu kembali ke editor latihan.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.visit(builderReturnUrl)}
                                    className="mt-5 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-brand-700"
                                >
                                    Kembali ke Roadmap
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            )}
            {showStudentPreview && (
                <div className="fixed inset-0 z-[90] flex flex-col bg-gray-950 p-3 sm:p-5">
                    <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 pb-3 text-white">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Pratinjau Siswa</p>
                            <h2 className="truncate text-base font-black">Draft saat ini - tidak membuat pengerjaan atau XP</h2>
                        </div>
                        <button type="button" onClick={() => setShowStudentPreview(false)} className="rounded-xl border border-white/20 px-4 py-2 text-sm font-black hover:bg-white/10">
                            Tutup
                        </button>
                    </div>
                    <div className="mx-auto min-h-0 w-full max-w-5xl flex-1">
                        {renderPreview(previewQuestion, previewIndex, true)}
                    </div>
                    <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 pt-3 sm:flex sm:justify-between">
                        <button
                            type="button"
                            onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                            disabled={previewIndex === 0}
                            className="h-11 rounded-xl border border-white/20 px-5 text-sm font-black text-white disabled:opacity-30"
                        >
                            Sebelumnya
                        </button>
                        <span className="hidden self-center text-sm font-bold text-gray-300 sm:block">
                            {previewIndex + 1} dari {data.questions.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                if (previewIndex >= data.questions.length - 1) {
                                    setShowStudentPreview(false);
                                    return;
                                }
                                setPreviewIndex((index) => index + 1);
                            }}
                            className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-black text-white"
                        >
                            {previewIndex >= data.questions.length - 1 ? 'Selesai' : 'Berikutnya'}
                        </button>
                    </div>
                </div>
            )}
            {showVocabularyGenerate && (
                <div className="fixed inset-0 z-[110] flex items-end overflow-y-auto bg-gray-950/50 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
                    <form onSubmit={handleGenerateVocabularyQuestions} className="w-full max-w-lg rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-900 sm:rounded-3xl sm:p-6">
                        <div className="mb-5">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Bank Konten</p>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Generate Soal dari Materi</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Soal baru akan ditambahkan ke akhir quiz ini.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="space-y-1 sm:col-span-2">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Tipe Konten</span>
                                <select value={vocabularyForm.data.content_type} onChange={(e) => vocabularyForm.setData('content_type', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="all">Semua tipe</option>
                                    <option value="kosakata">Kosakata</option>
                                    <option value="kanji">Kanji</option>
                                    <option value="bunpo">Bunpo</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Level</span>
                                <select value={vocabularyForm.data.jlpt_level} onChange={(e) => vocabularyForm.setData('jlpt_level', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="all">Semua Level</option>
                                    <option value="N5">N5</option>
                                    <option value="N4">N4</option>
                                    <option value="N3">N3</option>
                                    <option value="N2">N2</option>
                                    <option value="N1">N1</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Jumlah</span>
                                <input type="number" min="1" max="50" value={vocabularyForm.data.count} onChange={(e) => vocabularyForm.setData('count', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Mode Soal</span>
                                <select value={vocabularyForm.data.mode} onChange={(e) => vocabularyForm.setData('mode', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="word_to_meaning">Kata Jepang ke arti</option>
                                    <option value="meaning_to_word">Arti ke kata Jepang</option>
                                    <option value="reading_to_word">Reading ke kata Jepang</option>
                                </select>
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Kategori</span>
                                <input
                                    type="text"
                                    value={vocabularyForm.data.category === 'all' ? '' : vocabularyForm.data.category}
                                    onChange={(e) => vocabularyForm.setData('category', e.target.value.trim() || 'all')}
                                    placeholder="Kosongkan untuk semua kategori"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                                <p className="text-[11px] font-medium text-gray-400">Contoh: noun, verb, counter. Kosongkan jika ingin acak semua kategori.</p>
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">Sumber Data</span>
                                <select value={vocabularyForm.data.status} onChange={(e) => vocabularyForm.setData('status', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    <option value="published">Published saja</option>
                                    <option value="draft">Draft saja</option>
                                    <option value="all">Semua status</option>
                                </select>
                            </label>
                        </div>
                        {vocabularyPreview && (
                            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                                {vocabularyPreview.questions.slice(0, 8).map((question, index) => (
                                    <div key={`${question.question_text}-${index}`} className="rounded-xl bg-white p-3 dark:bg-gray-900">
                                        <p className="text-xs font-black text-gray-900 dark:text-white">{index + 1}. {question.question_text}</p>
                                        <p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Jawaban: {question.correct_answer}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {(vocabularyForm.errors.generate || vocabularyGeneratorError) && (
                            <p className="mt-3 text-sm font-bold text-red-600">{vocabularyForm.errors.generate || vocabularyGeneratorError}</p>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowVocabularyGenerate(false)} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                            {vocabularyPreview ? (
                                <button type="button" onClick={confirmGenerateVocabularyQuestions} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-black text-white">
                                    Tambahkan {vocabularyPreview.count} Soal
                                </button>
                            ) : (
                                <button disabled={vocabularyGeneratorLoading} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">
                                    {vocabularyGeneratorLoading ? 'Membuat Preview...' : 'Pratinjau'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
            {importPreview && (
                <div className="fixed inset-0 z-[110] flex items-end overflow-y-auto bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-600">Preview Import</p>
                                    <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Cek Soal Sebelum Import</h2>
                                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {importPreview.file_name} - {Math.max(1, Math.round((importPreview.file_size || 0) / 1024))} KB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImportPreview(null)}
                                    className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-black text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Tutup
                                </button>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Baris</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{importPreview.total_rows}</p>
                                </div>
                                <div className="rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Valid</p>
                                    <p className="mt-1 text-2xl font-black text-green-700 dark:text-green-300">{importPreview.valid_count}</p>
                                </div>
                                <div className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-900/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Error</p>
                                    <p className="mt-1 text-2xl font-black text-brand-700 dark:text-brand-300">{importPreview.invalid_count}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.3fr_1fr]">
                            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Contoh Soal Valid</h3>
                                    {importPreview.has_more_valid_rows && <span className="text-xs font-bold text-gray-400">Menampilkan 10 pertama</span>}
                                </div>
                                <div className="space-y-3">
                                    {(importPreview.valid_rows || []).length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm font-bold text-gray-400 dark:border-gray-700">
                                            Tidak ada soal valid dari file ini.
                                        </div>
                                    )}
                                    {(importPreview.valid_rows || []).map((row) => (
                                        <div key={`valid-${row.row}`} className="rounded-2xl border border-gray-100 p-4 shadow-sm dark:border-gray-800">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500 dark:bg-gray-800 dark:text-gray-300">Baris {row.row}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${TYPE_COLORS[row.type] || TYPE_COLORS.multiple_choice}`}>
                                                    {TYPE_LABELS[row.type] || row.type}
                                                </span>
                                            </div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{row.question_text}</p>
                                            <p className="mt-1 text-xs font-bold text-green-700 dark:text-green-300">Jawaban: {row.correct_answer}</p>
                                            {Array.isArray(row.options) && row.options.length > 0 && (
                                                <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Opsi: {row.options.join(' | ')}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="min-h-0 overflow-y-auto border-t border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40 sm:p-6 lg:border-l lg:border-t-0">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Catatan Error</h3>
                                    {importPreview.has_more_errors && <span className="text-xs font-bold text-gray-400">Menampilkan 30 pertama</span>}
                                </div>
                                <div className="space-y-2">
                                    {(importPreview.errors || []).length === 0 && (
                                        <div className="rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                            Tidak ada error. File siap diimport.
                                        </div>
                                    )}
                                    {(importPreview.errors || []).map((error) => (
                                        <div key={`error-${error.row}-${error.message}`} className="rounded-2xl border border-red-100 bg-white p-4 dark:border-red-900/30 dark:bg-gray-900">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Baris {error.row}</p>
                                            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{error.message}</p>
                                            {error.question_text && <p className="mt-1 truncate text-xs text-gray-400">{error.question_text}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                Baris error akan dilewati. Hanya soal valid yang disimpan ke database.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setImportPreview(null)}
                                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={importProcessing || importPreview.valid_count <= 0}
                                    className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {importProcessing ? 'Import...' : `Import ${importPreview.valid_count} Soal`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
            </div>
        </AuthenticatedLayout>
    );
}
