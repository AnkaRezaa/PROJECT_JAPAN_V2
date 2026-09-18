import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useScrollLock } from '@/lib/scrollLock';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
    QUESTION_TYPES,
    emptyQuestion,
    getQuestionError,
    normalizeQuestions,
} from '../Kuis/Builder/helpers';

const optionLabels = ['A', 'B', 'C', 'D'];

const formatDuration = (seconds) => {
    const value = Number(seconds || 0);
    if (!value) return 'Tanpa batas waktu';
    if (value < 60) return `${value} detik`;

    return `${Math.floor(value / 60)} menit`;
};

function ExamQuestionEditor({
    question,
    index,
    error,
    canDelete,
    canMoveUp,
    canMoveDown,
    onChange,
    onOptionChange,
    onDuplicate,
    onDelete,
    onMoveUp,
    onMoveDown,
}) {
    const type = question.type || 'multiple_choice';
    const options = type === 'multiple_choice'
        ? [...(question.options || []), '', '', '', ''].slice(0, 4)
        : [];

    return (
        <article className={`overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900 ${error ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-gray-900 px-2 text-sm font-bold text-white dark:bg-gray-100 dark:text-gray-900">
                        {index + 1}
                    </span>
                    <select
                        value={type}
                        onChange={(event) => onChange('type', event.target.value)}
                        className="h-9 rounded-md border-gray-300 bg-white py-1.5 text-sm font-semibold dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    >
                        {QUESTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                        Bobot
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            value={question.points || 1}
                            onChange={(event) => onChange('points', Number(event.target.value))}
                            className="h-9 w-20 rounded-md border-gray-300 py-1.5 text-sm font-bold dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        />
                    </label>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button type="button" disabled={!canMoveUp} onClick={onMoveUp} title="Naikkan soal" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"><KeyboardArrowUpIcon fontSize="small" /></button>
                    <button type="button" disabled={!canMoveDown} onClick={onMoveDown} title="Turunkan soal" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"><KeyboardArrowDownIcon fontSize="small" /></button>
                    <button type="button" onClick={onDuplicate} title="Duplikat soal" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><ContentCopyOutlinedIcon sx={{ fontSize: 18 }} /></button>
                    <button type="button" disabled={!canDelete} onClick={onDelete} title="Hapus soal" className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"><DeleteOutlineIcon sx={{ fontSize: 19 }} /></button>
                </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
                {error && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}

                {type === 'listening' && (
                    <div>
                        <label className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">URL audio</label>
                        <input
                            type="url"
                            value={question.audio_url || ''}
                            onChange={(event) => onChange('audio_url', event.target.value)}
                            placeholder="https://example.com/audio.mp3"
                            className="h-11 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                        />
                        {question.audio_url && <audio controls src={question.audio_url} className="mt-3 w-full" />}
                    </div>
                )}

                <div>
                    <label className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">Pertanyaan</label>
                    <textarea
                        value={question.question_text || ''}
                        onChange={(event) => onChange('question_text', event.target.value)}
                        rows="3"
                        placeholder="Tulis pertanyaan dengan instruksi yang jelas"
                        className="w-full rounded-md border-gray-300 text-sm leading-6 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                </div>

                {type === 'multiple_choice' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {options.map((option, optionIndex) => (
                            <div key={optionIndex} className={`flex items-center gap-3 rounded-md border p-3 ${question.correct_answer === option && option ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                <input
                                    type="radio"
                                    name={`correct-${index}`}
                                    checked={Boolean(option) && question.correct_answer === option}
                                    onChange={() => onChange('correct_answer', option)}
                                    className="border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    title="Tandai sebagai jawaban benar"
                                />
                                <span className="text-xs font-bold text-gray-500">{optionLabels[optionIndex]}</span>
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(event) => onOptionChange(optionIndex, event.target.value)}
                                    placeholder={`Opsi ${optionLabels[optionIndex]}`}
                                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0 dark:text-white"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <label className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">Jawaban benar</label>
                        <input
                            type="text"
                            value={question.correct_answer || ''}
                            onChange={(event) => onChange('correct_answer', event.target.value)}
                            placeholder="Tulis jawaban yang akan digunakan untuk penilaian"
                            className="h-11 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                )}

                <div>
                    <label className="mb-2 block text-xs font-bold text-gray-600 dark:text-gray-300">Pembahasan setelah ujian</label>
                    <textarea
                        value={question.explanation || ''}
                        onChange={(event) => onChange('explanation', event.target.value)}
                        rows="2"
                        placeholder="Opsional: jelaskan alasan jawaban yang benar"
                        className="w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                    />
                </div>
            </div>
        </article>
    );
}

function StudentExamPreview({ quiz, questions, onClose }) {
    const totalPoints = questions.reduce((sum, question) => sum + Math.max(1, Number(question.points || 1)), 0);

    useScrollLock(true);

    useEffect(() => {
        const closeWithEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', closeWithEscape);

        return () => {
            window.removeEventListener('keydown', closeWithEscape);
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau ujian siswa"
            className="fixed inset-0 z-[120] overflow-y-auto bg-slate-50 text-slate-900 dark:bg-[#0b1121] dark:text-slate-100"
        >
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-3 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Pratinjau siswa</p>
                        <h2 className="truncate text-sm font-black sm:text-base">{quiz.title || 'Ujian Mingguan'}</h2>
                    </div>
                    <span className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:block">
                        {formatDuration(quiz.time_limit)}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                        <span className="hidden sm:inline">Tutup preview</span>
                    </button>
                </div>
            </header>

            <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
                <div className="min-w-0">
                    <section className="mb-5 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Ujian Mingguan</p>
                        <h1 className="mt-2 text-xl font-black sm:text-2xl">{quiz.title || 'Ujian Mingguan'}</h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Ini adalah tampilan yang akan dilihat siswa. Jawaban pada mode preview tidak disimpan.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700 sm:grid-cols-4">
                            <div><span className="block text-xs text-slate-500">Jumlah soal</span><strong>{questions.length}</strong></div>
                            <div><span className="block text-xs text-slate-500">Total bobot</span><strong>{totalPoints}</strong></div>
                            <div><span className="block text-xs text-slate-500">Durasi</span><strong>{formatDuration(quiz.time_limit)}</strong></div>
                            <div><span className="block text-xs text-slate-500">Nilai lulus</span><strong>{quiz.passing_score ?? 70}%</strong></div>
                        </div>
                    </section>

                    {questions.length === 0 ? (
                        <div className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="font-bold">Belum ada soal untuk dipratinjau.</p>
                            <p className="mt-1 text-sm text-slate-500">Tutup preview lalu tambahkan soal pada builder.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((question, index) => (
                                <article id={`preview-question-${index}`} key={question.id || index} className="scroll-mt-24 border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60 sm:px-6">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-900 px-2 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">{index + 1}</span>
                                            <p className="text-xs font-bold uppercase text-slate-500">
                                                {question.type === 'listening' ? 'Listening' : question.type === 'fill_blank' ? 'Isian' : 'Pilihan Ganda'}
                                            </p>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">{question.points || 1} poin</p>
                                    </div>
                                    <div className="p-4 sm:p-6">
                                        {question.type === 'listening' && question.audio_url && <audio controls src={question.audio_url} className="mb-5 w-full" />}
                                        <p className="whitespace-pre-wrap text-base font-semibold leading-7 sm:text-lg">{question.question_text || 'Pertanyaan belum diisi'}</p>
                                        {question.type === 'multiple_choice' ? (
                                            <div className="mt-5 grid gap-3">
                                                {(question.options || []).filter(Boolean).map((option, optionIndex) => (
                                                    <label key={optionIndex} className="flex items-start gap-3 rounded-md border border-slate-200 p-3.5 dark:border-slate-700">
                                                        <input type="radio" disabled className="mt-1 border-slate-300 text-brand-600" />
                                                        <span className="text-sm leading-6">
                                                            <strong className="mr-2">{optionLabels[optionIndex] || String.fromCharCode(65 + optionIndex)}.</strong>
                                                            {option}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-5">
                                                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Jawaban siswa</label>
                                                <input type="text" disabled placeholder="Ketik jawaban" className="h-12 w-full rounded-md border border-slate-300 bg-slate-50 px-4 text-sm dark:border-slate-700 dark:bg-slate-950" />
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="hidden lg:block">
                    <div className="sticky top-24 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm font-black">Daftar soal</p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                            {questions.map((question, index) => (
                                <button
                                    key={question.id || index}
                                    type="button"
                                    onClick={() => document.getElementById(`preview-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    className="flex aspect-square items-center justify-center rounded-md border border-slate-200 text-xs font-bold hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800">
                            Preview hanya memeriksa tampilan. Timer, jawaban, dan hasil tidak dijalankan.
                        </p>
                    </div>
                </aside>
            </main>
        </div>,
        document.body,
    );
}

export default function BuilderUjian({ quiz, questions: initialQuestions = [] }) {
    const returnUrl = quiz?.module?.program_pembelajaran_id
        ? route('admin.modules.index', {
            program_id: quiz.module.program_pembelajaran_id,
            week_id: quiz.module.id,
            focus: 'roadmap',
        })
        : route('admin.programs.index');
    const initialForm = {
        time_limit: quiz?.time_limit ?? '',
        passing_score: quiz?.passing_score ?? 70,
        questions: initialQuestions.length > 0
            ? normalizeQuestions(initialQuestions, quiz?.type)
            : [],
    };
    const cleanSnapshot = useRef(JSON.stringify(initialForm));
    const importInput = useRef(null);
    const { data, setData, post, processing, errors, clearErrors, recentlySuccessful } = useForm(initialForm);
    const [showPreview, setShowPreview] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const [importing, setImporting] = useState(false);
    const generator = useForm({
        content_type: 'all',
        jlpt_level: quiz?.module?.level?.level_name || 'all',
        category: 'all',
        count: 10,
        mode: 'word_to_meaning',
        status: 'published',
    });
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const questionErrors = useMemo(() => data.questions.map(getQuestionError), [data.questions]);
    const firstErrorIndex = questionErrors.findIndex(Boolean);
    const totalPoints = data.questions.reduce((sum, question) => sum + Math.max(1, Number(question.points || 1)), 0);
    const hasUnsavedChanges = JSON.stringify(data) !== cleanSnapshot.current;

    useEffect(() => {
        const warnBeforeLeave = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeLeave);
        return () => window.removeEventListener('beforeunload', warnBeforeLeave);
    }, [hasUnsavedChanges]);

    const updateQuestion = (index, field, value) => {
        clearErrors();
        const questions = [...data.questions];
        const current = { ...questions[index], [field]: value };

        if (field === 'type') {
            current.options = value === 'multiple_choice'
                ? [...(current.options || []), '', '', '', ''].slice(0, 4)
                : [];
            if (value === 'multiple_choice' && !current.options.includes(current.correct_answer)) {
                current.correct_answer = '';
            }
        }
        questions[index] = current;
        setData('questions', questions);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        const questions = [...data.questions];
        const options = [...(questions[questionIndex].options || ['', '', '', ''])];
        const oldValue = options[optionIndex];
        options[optionIndex] = value;
        questions[questionIndex] = {
            ...questions[questionIndex],
            options,
            correct_answer: questions[questionIndex].correct_answer === oldValue
                ? value
                : questions[questionIndex].correct_answer,
        };
        setData('questions', questions);
    };

    const addQuestion = (type = 'multiple_choice') => {
        const question = emptyQuestion(type);
        question.order = data.questions.length;
        setData('questions', [...data.questions, question]);
    };

    const duplicateQuestion = (index) => {
        const duplicate = {
            ...data.questions[index],
            id: null,
            options: [...(data.questions[index].options || [])],
        };
        const questions = [...data.questions];
        questions.splice(index + 1, 0, duplicate);
        setData('questions', questions);
    };

    const removeQuestion = (index) => {
        setData('questions', data.questions.filter((_, itemIndex) => itemIndex !== index));
    };

    const resetToSaved = () => {
        if (!hasUnsavedChanges) return;
        if (!window.confirm('Batalkan semua perubahan yang belum disimpan?')) return;

        setData(JSON.parse(cleanSnapshot.current));
        clearErrors();
    };

    const removeAllQuestions = () => {
        if (data.questions.length === 0) return;
        if (!window.confirm('Hapus semua soal dari ujian ini? Perubahan baru diterapkan setelah menekan Simpan ujian.')) return;

        setData('questions', []);
        clearErrors();
    };

    const moveQuestion = (from, to) => {
        if (to < 0 || to >= data.questions.length) return;
        const questions = [...data.questions];
        const [question] = questions.splice(from, 1);
        questions.splice(to, 0, question);
        setData('questions', questions);
    };

    const saveExam = () => {
        if (firstErrorIndex >= 0) {
            document.getElementById(`exam-question-${firstErrorIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        post(route('admin.quizzes.builder.update', quiz.id), {
            preserveScroll: true,
            onSuccess: () => {
                cleanSnapshot.current = JSON.stringify(data);
            },
        });
    };

    const requireSavedExam = (action) => {
        if (!hasUnsavedChanges) {
            action();
            return;
        }

        openConfirm({
            variant: 'warning',
            title: 'Perubahan Belum Disimpan',
            message: 'Simpan atau reset perubahan soal sebelum mengubah status atau menghapus ujian.',
            confirmLabel: 'Tutup',
            cancelLabel: 'Batal',
            onConfirm: closeConfirm,
        });
    };

    const toggleExamStatus = () => requireSavedExam(() => {
        const nextStatus = quiz.status === 'published' ? 'draft' : 'published';
        openConfirm({
            variant: nextStatus === 'published' ? 'success' : 'warning',
            title: nextStatus === 'published' ? 'Publish Ujian?' : 'Ubah ke Draft?',
            message: nextStatus === 'published' ? 'Ujian akan tersedia mengikuti jadwal Week.' : 'Ujian akan disembunyikan sementara dari user.',
            confirmLabel: nextStatus === 'published' ? 'Publish' : 'Ubah ke Draft',
            onConfirm: () => router.patch(route('admin.quizzes.status', quiz.id), {
                status: nextStatus,
            }, {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    });

    const deleteExam = () => requireSavedExam(() => openConfirm({
        variant: 'danger',
        title: 'Hapus Ujian Mingguan?',
        message: 'Ujian dan seluruh soalnya akan dihapus. Urutan ujian lain pada Week ini akan dirapikan otomatis.',
        confirmLabel: 'Hapus Ujian',
        details: [
            { label: 'Ujian', value: quiz.title || `Ujian ${quiz.exam_order || 1}` },
            { label: 'Soal', value: `${data.questions.length} soal` },
        ],
        onConfirm: () => router.delete(route('admin.quizzes.destroy', quiz.id), {
            onFinish: closeConfirm,
        }),
    }));

    const importQuestions = (file) => {
        if (!file) return;
        setImporting(true);
        router.post(route('admin.quizzes.questions.import', quiz.id), {
            import_file: file,
        }, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: false,
            onFinish: () => {
                setImporting(false);
                if (importInput.current) importInput.current.value = '';
            },
        });
    };

    const generateQuestions = () => {
        generator.post(route('admin.quizzes.questions.generate-vocabulary', quiz.id), {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => setShowGenerator(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Builder ${quiz.title || 'Ujian Mingguan'}`} />
            <div className="min-h-screen bg-surface-muted pb-24 dark:bg-gray-950">
                <header className="sticky top-16 z-30 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:top-0">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-3 py-3 sm:px-6">
                        <button
                            type="button"
                            onClick={() => {
                                if (!hasUnsavedChanges || window.confirm('Perubahan belum disimpan. Tetap keluar?')) router.visit(returnUrl);
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            title="Kembali"
                        >
                            <ArrowBackIcon fontSize="small" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase text-brand-600">Builder Ujian LMS</p>
                            <h1 className="truncate text-sm font-bold text-gray-900 dark:text-white sm:text-base">{quiz.title || 'Ujian Mingguan'}</h1>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${quiz.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                            {quiz.status === 'published' ? 'Terbit' : 'Draf'}
                        </span>
                        <button type="button" onClick={toggleExamStatus} className="h-10 rounded-md border border-gray-300 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                            {quiz.status === 'published' ? 'Jadikan Draft' : 'Publish'}
                        </button>
                        <button type="button" onClick={deleteExam} className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20" title="Hapus ujian">
                            <DeleteOutlineIcon sx={{ fontSize: 19 }} />
                        </button>
                        <button type="button" onClick={() => setShowPreview(true)} className="flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                            <span className="hidden sm:inline">Pratinjau siswa</span>
                        </button>
                        <button type="button" onClick={saveExam} disabled={processing} className="flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                            <SaveOutlinedIcon sx={{ fontSize: 18 }} />
                            {processing ? 'Menyimpan...' : 'Simpan ujian'}
                        </button>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:py-8">
                    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase text-gray-500">Konteks ujian</p>
                                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                                    {quiz.module?.title || 'Week'} - Ujian Minggu {quiz.module?.week_number || ''}
                                </h2>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    Susun soal seperti naskah ujian. Penilaian menggunakan bobot setiap nomor.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[610px]">
                                <label className="col-span-1">
                                    <span className="mb-1 block text-xs font-bold text-gray-500">Waktu (detik)</span>
                                    <input type="number" min="0" value={data.time_limit ?? ''} onChange={(event) => setData('time_limit', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white" placeholder="Tanpa batas" />
                                </label>
                                <label className="col-span-1">
                                    <span className="mb-1 block text-xs font-bold text-gray-500">Nilai lulus</span>
                                    <input type="number" min="1" max="100" value={data.passing_score ?? 70} onChange={(event) => setData('passing_score', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white" />
                                </label>
                                <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
                                    <span className="block text-xs text-gray-500">Soal</span>
                                    <strong className="text-sm dark:text-white">{data.questions.length}</strong>
                                </div>
                                <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
                                    <span className="block text-xs text-gray-500">Total bobot</span>
                                    <strong className="text-sm dark:text-white">{totalPoints}</strong>
                                </div>
                            </div>
                        </div>
                        {(errors.time_limit || errors.passing_score || errors.questions) && (
                            <p className="mt-4 rounded-md border border-brand-200 bg-brand-50 p-3 text-xs font-bold text-brand-700 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-300">
                                {errors.time_limit || errors.passing_score || errors.questions}
                            </p>
                        )}
                    </section>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => addQuestion('multiple_choice')} className="flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-xs font-bold text-white hover:bg-black dark:bg-white dark:text-gray-900">
                            <AddIcon sx={{ fontSize: 18 }} /> Tambah soal
                        </button>
                        <button type="button" onClick={() => importInput.current?.click()} disabled={importing} className="flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            <UploadFileOutlinedIcon sx={{ fontSize: 18 }} /> {importing ? 'Mengimpor...' : 'Import CSV/XLSX'}
                        </button>
                        <input ref={importInput} type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => importQuestions(event.target.files?.[0])} />
                        <a href={route('admin.quizzes.questions.template', { quiz: quiz.id, format: 'xlsx' })} className="flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            <DownloadOutlinedIcon sx={{ fontSize: 18 }} /> Template
                        </a>
                        <button type="button" onClick={() => setShowGenerator((value) => !value)} className="h-10 rounded-md border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            Generate dari kosakata
                        </button>
                        <button type="button" onClick={resetToSaved} disabled={!hasUnsavedChanges} className="flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            <RestartAltIcon sx={{ fontSize: 18 }} /> Reset
                        </button>
                        <button type="button" onClick={removeAllQuestions} disabled={data.questions.length === 0} className="flex h-10 items-center gap-2 rounded-md border border-brand-200 bg-white px-3 text-xs font-bold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-900/50 dark:bg-gray-900 dark:hover:bg-brand-950/20">
                            <DeleteSweepOutlinedIcon sx={{ fontSize: 18 }} /> Hapus semua soal
                        </button>
                        <div className="ml-auto text-xs font-semibold text-gray-500">
                            {recentlySuccessful ? 'Perubahan tersimpan' : hasUnsavedChanges ? 'Ada perubahan belum disimpan' : 'Semua perubahan tersimpan'}
                        </div>
                    </div>

                    {showGenerator && (
                        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                <label><span className="mb-1 block text-xs font-bold text-gray-500">Jenis konten</span><select value={generator.data.content_type} onChange={(event) => generator.setData('content_type', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"><option value="all">Semua</option><option value="kanji">Kanji</option><option value="kosakata">Kosakata</option><option value="bunpo">Tata bahasa</option></select></label>
                                <label><span className="mb-1 block text-xs font-bold text-gray-500">Mode</span><select value={generator.data.mode} onChange={(event) => generator.setData('mode', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"><option value="word_to_meaning">Kata ke arti</option><option value="meaning_to_word">Arti ke kata</option><option value="reading_to_word">Bacaan ke kata</option></select></label>
                                <label><span className="mb-1 block text-xs font-bold text-gray-500">Jumlah</span><input type="number" min="1" max="50" value={generator.data.count} onChange={(event) => generator.setData('count', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white" /></label>
                                <label><span className="mb-1 block text-xs font-bold text-gray-500">Status sumber</span><select value={generator.data.status} onChange={(event) => generator.setData('status', event.target.value)} className="h-10 w-full rounded-md border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"><option value="published">Published</option><option value="draft">Draft</option><option value="all">Semua</option></select></label>
                                <button type="button" disabled={generator.processing} onClick={generateQuestions} className="mt-auto h-10 rounded-md bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{generator.processing ? 'Membuat...' : 'Tambahkan soal'}</button>
                            </div>
                            {Object.keys(generator.errors).length > 0 && <p className="mt-3 text-xs font-bold text-brand-600">{Object.values(generator.errors)[0]}</p>}
                        </section>
                    )}

                    <div className="mt-5 space-y-4">
                        {data.questions.length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Ujian belum memiliki soal</p>
                                <p className="mt-1 text-xs text-gray-500">Tambahkan soal baru, import file, atau generate dari kosakata.</p>
                                <button type="button" onClick={() => addQuestion('multiple_choice')} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-gray-900 px-4 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
                                    <AddIcon sx={{ fontSize: 18 }} /> Tambah soal pertama
                                </button>
                            </div>
                        )}
                        {data.questions.map((question, index) => (
                            <div id={`exam-question-${index}`} key={question.id || `new-${index}`} className="scroll-mt-24">
                                <ExamQuestionEditor
                                    question={question}
                                    index={index}
                                    error={questionErrors[index]}
                                    canDelete={data.questions.length > 0}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < data.questions.length - 1}
                                    onChange={(field, value) => updateQuestion(index, field, value)}
                                    onOptionChange={(optionIndex, value) => updateOption(index, optionIndex, value)}
                                    onDuplicate={() => duplicateQuestion(index)}
                                    onDelete={() => removeQuestion(index)}
                                    onMoveUp={() => moveQuestion(index, index - 1)}
                                    onMoveDown={() => moveQuestion(index, index + 1)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {data.questions.length === 0
                                    ? 'Ujian kosong akan disimpan sebagai Draft'
                                    : questionErrors.filter(Boolean).length
                                        ? `${questionErrors.filter(Boolean).length} soal belum lengkap`
                                        : 'Naskah ujian siap disimpan'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">Periksa pratinjau siswa sebelum mengubah status menjadi Published di Bank Kuis.</p>
                        </div>
                        <button type="button" onClick={saveExam} disabled={processing || firstErrorIndex >= 0} className="h-11 rounded-md bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {processing ? 'Menyimpan...' : 'Simpan seluruh soal'}
                        </button>
                    </div>
                </main>
            </div>
            {showPreview && <StudentExamPreview quiz={{ ...quiz, time_limit: data.time_limit, passing_score: data.passing_score }} questions={data.questions} onClose={() => setShowPreview(false)} />}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
