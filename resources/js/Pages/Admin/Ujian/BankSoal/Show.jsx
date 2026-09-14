import React, { useMemo, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminDialog from '@/Components/UI/AdminDialog';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { StatusBadge, apiErrorMessage, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

const categoryLabels = {
    vocabulary: 'Kosakata & Huruf (文字・語彙)',
    grammar: 'Tata Bahasa (文法)',
    reading: 'Bacaan (読解)',
    listening: 'Mendengarkan (聴解)',
};

const categoryBadges = {
    vocabulary: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    grammar: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    reading: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    listening: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
};

const questionTypes = [
    ['multiple_choice', 'Pilihan Ganda'],
    ['listening', 'Mendengarkan'],
    ['fill_blank', 'Isian Singkat'],
    ['sentence_builder', 'Susun Kalimat'],
];

export default function Show({ bank, levels = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Modals
    const [wrapperModal, setWrapperModal] = useState(null); // null, { mode: 'create' }, { mode: 'edit', wrapper }
    const [questionModal, setQuestionModal] = useState(null); // null, { mode: 'create', defaultWrapperId }, { mode: 'edit', question }
    const [importModal, setImportModal] = useState(false);

    // Import State
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importBusy, setImportBusy] = useState(false);
    const [importError, setImportError] = useState('');

    const { confirmState, requestConfirm, closeConfirm } = useConfirmAction();

    // Form Wrapper
    const [wrapperForm, setWrapperForm] = useState({
        title: '',
        wrapper_code: '',
        category: 'reading',
        mondai_number: '',
        stimulus_text: '',
        stimulus_reading: '',
        audio_url: '',
    });

    // Form Question
    const [questionForm, setQuestionForm] = useState({
        exam_question_wrapper_id: '',
        code: '',
        type: 'multiple_choice',
        points: 1,
        question_text: '',
        question_reading: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        explanation: '',
        audio_url: '',
    });

    // Filtering
    const filteredWrappers = useMemo(() => {
        return (bank.wrappers || []).filter((wrapper) => {
            if (selectedCategory !== 'all' && wrapper.category !== selectedCategory) return false;
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const inWrapper = `${wrapper.title} ${wrapper.wrapper_code} ${wrapper.stimulus_text}`.toLowerCase().includes(term);
            const inQuestions = (wrapper.questions || []).some((q) => `${q.code} ${q.question_text} ${q.explanation}`.toLowerCase().includes(term));
            return inWrapper || inQuestions;
        });
    }, [bank.wrappers, selectedCategory, searchTerm]);

    const filteredStandalone = useMemo(() => {
        return (bank.standalone_questions || []).filter((q) => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return `${q.code} ${q.question_text} ${q.explanation}`.toLowerCase().includes(term);
        });
    }, [bank.standalone_questions, searchTerm]);

    // Handlers Wrapper
    const openCreateWrapper = () => {
        setWrapperForm({
            title: '',
            wrapper_code: '',
            category: selectedCategory !== 'all' ? selectedCategory : 'reading',
            mondai_number: '',
            stimulus_text: '',
            stimulus_reading: '',
            audio_url: '',
        });
        setWrapperModal({ mode: 'create' });
    };

    const openEditWrapper = (wrapper) => {
        setWrapperForm({
            title: wrapper.title,
            wrapper_code: wrapper.wrapper_code || '',
            category: wrapper.category || 'reading',
            mondai_number: wrapper.mondai_number || '',
            stimulus_text: wrapper.stimulus_text || '',
            stimulus_reading: wrapper.stimulus_reading || '',
            audio_url: wrapper.audio_url || '',
        });
        setWrapperModal({ mode: 'edit', wrapper });
    };

    const handleSaveWrapper = async (e) => {
        e.preventDefault();
        try {
            if (wrapperModal.mode === 'create') {
                await window.axios.post(route('admin.exams.question-banks.wrappers.store', bank.slug), wrapperForm);
            } else {
                await window.axios.patch(route('admin.exams.question-banks.wrappers.update', wrapperModal.wrapper.id), wrapperForm);
            }
            setWrapperModal(null);
            router.reload({ preserveScroll: true });
        } catch (err) {
            alert(apiErrorMessage(err));
        }
    };

    const handleDeleteWrapper = (wrapper) => {
        requestConfirm({
            title: 'Hapus Wacana (Wrapper)',
            message: `Hapus wacana "${wrapper.title}"? Seluruh butir soal di bawahnya juga akan ikut terhapus.`,
            confirmLabel: 'Ya, Hapus',
            isDestructive: true,
            onConfirm: async () => {
                await window.axios.delete(route('admin.exams.question-banks.wrappers.destroy', wrapper.id));
                router.reload({ preserveScroll: true });
            },
        });
    };

    // Handlers Question
    const openCreateQuestion = (defaultWrapperId = '') => {
        setQuestionForm({
            exam_question_wrapper_id: defaultWrapperId ? String(defaultWrapperId) : '',
            code: '',
            type: 'multiple_choice',
            points: 1,
            question_text: '',
            question_reading: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_answer: '',
            explanation: '',
            audio_url: '',
        });
        setQuestionModal({ mode: 'create' });
    };

    const openEditQuestion = (question) => {
        const opts = question.options || [];
        setQuestionForm({
            exam_question_wrapper_id: question.exam_question_wrapper_id ? String(question.exam_question_wrapper_id) : '',
            code: question.code || '',
            type: question.type || 'multiple_choice',
            points: question.points || 1,
            question_text: question.question_text || '',
            question_reading: question.question_reading || '',
            option_a: opts[0] || '',
            option_b: opts[1] || '',
            option_c: opts[2] || '',
            option_d: opts[3] || '',
            correct_answer: question.correct_answer || '',
            explanation: question.explanation || '',
            audio_url: question.audio_url || '',
        });
        setQuestionModal({ mode: 'edit', question });
    };

    const handleSaveQuestion = async (e) => {
        e.preventDefault();
        const payload = {
            exam_question_wrapper_id: questionForm.exam_question_wrapper_id || null,
            code: questionForm.code || null,
            type: questionForm.type,
            points: Number(questionForm.points) || 1,
            question_text: questionForm.question_text,
            question_reading: questionForm.question_reading || null,
            options: [questionForm.option_a, questionForm.option_b, questionForm.option_c, questionForm.option_d].filter((val) => val.trim() !== ''),
            correct_answer: questionForm.correct_answer,
            explanation: questionForm.explanation || null,
            audio_url: questionForm.audio_url || null,
        };

        try {
            if (questionModal.mode === 'create') {
                await window.axios.post(route('admin.exams.question-banks.questions.store', bank.slug), payload);
            } else {
                await window.axios.patch(route('admin.exams.question-banks.questions.update', questionModal.question.id), payload);
            }
            setQuestionModal(null);
            router.reload({ preserveScroll: true });
        } catch (err) {
            alert(apiErrorMessage(err));
        }
    };

    const handleDeleteQuestion = (question) => {
        requestConfirm({
            title: 'Hapus Butir Soal',
            message: 'Apakah Anda yakin ingin menghapus butir soal ini dari bank soal?',
            confirmLabel: 'Ya, Hapus',
            isDestructive: true,
            onConfirm: async () => {
                await window.axios.delete(route('admin.exams.question-banks.questions.destroy', question.id));
                router.reload({ preserveScroll: true });
            },
        });
    };

    // Handlers Mass Import
    const handleCheckImportFile = async () => {
        if (!importFile) return;
        setImportBusy(true);
        setImportError('');
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await window.axios.post(route('admin.exams.question-banks.import.preview', bank.slug), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportPreview(response.data);
        } catch (err) {
            setImportError(apiErrorMessage(err));
        } finally {
            setImportBusy(false);
        }
    };

    const handleCommitImport = async () => {
        if (!importFile || !importPreview?.valid) return;
        setImportBusy(true);
        setImportError('');
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            await window.axios.post(route('admin.exams.question-banks.import', bank.slug), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportModal(false);
            setImportFile(null);
            setImportPreview(null);
            router.reload({ preserveScroll: true });
        } catch (err) {
            setImportError(apiErrorMessage(err));
        } finally {
            setImportBusy(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${bank.title} - Bank Soal`} />
            <div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {/* Header Breadcrumb & Actions */}
                    <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
                        <div>
                            <Link
                                href={route('admin.exams.question-banks.index')}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            >
                                <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Kembali ke Katalog Bank Soal
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded bg-brand-600 px-2.5 py-0.5 text-xs font-black text-white">
                                    {bank.level}
                                </span>
                                {bank.source && (
                                    <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        Sumber: {bank.source}
                                    </span>
                                )}
                                <StatusBadge status={bank.status} />
                            </div>
                            <h1 className="mt-2 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">
                                {bank.title}
                            </h1>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                {bank.description || 'Pengelolaan stimulus wacana/audio dan butir-butir soal di dalam bank.'}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setImportFile(null);
                                    setImportPreview(null);
                                    setImportError('');
                                    setImportModal(true);
                                }}
                                className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-xs font-black text-white hover:bg-amber-700 shadow-sm"
                            >
                                <UploadFileRoundedIcon fontSize="small" /> Mass Import (XLSX/CSV)
                            </button>
                            <button
                                type="button"
                                onClick={openCreateWrapper}
                                className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-xs font-black text-white hover:bg-brand-700"
                            >
                                <AddRoundedIcon fontSize="small" /> + Tambah Wacana
                            </button>
                            <button
                                type="button"
                                onClick={() => openCreateQuestion('')}
                                className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            >
                                <AddRoundedIcon fontSize="small" /> + Soal Mandiri
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase text-gray-400">Kategori:</span>
                            {['all', 'reading', 'listening', 'vocabulary', 'grammar'].map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-black transition ${
                                        selectedCategory === cat
                                            ? 'bg-brand-600 text-white shadow'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {cat === 'all' ? 'Semua Kategori' : categoryLabels[cat] || cat}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full max-w-xs">
                            <SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`${fieldClassName} mt-0 pl-10 text-xs`}
                                placeholder="Cari wacana, teks, pertanyaan..."
                            />
                        </div>
                    </div>

                    {/* Hierarchical Wrapper & Question Cards */}
                    <div className="space-y-6">
                        {filteredWrappers.map((wrapper) => (
                            <section
                                key={wrapper.id}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                            >
                                {/* Wrapper Header (Induk) */}
                                <div className="border-b border-gray-200 bg-slate-50/80 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <FolderOutlinedIcon className="text-brand-600" fontSize="small" />
                                            <h2 className="text-base font-black text-gray-950 dark:text-white">
                                                {wrapper.title}
                                            </h2>
                                            {wrapper.wrapper_code && (
                                                <span className="rounded bg-gray-200 px-2 py-0.5 text-[11px] font-black text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {wrapper.wrapper_code}
                                                </span>
                                            )}
                                            <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${categoryBadges[wrapper.category] || 'bg-gray-100'}`}>
                                                {categoryLabels[wrapper.category] || wrapper.category}
                                            </span>
                                            {wrapper.mondai_number && (
                                                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                    {wrapper.mondai_number}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openCreateQuestion(wrapper.id)}
                                                className="inline-flex h-8 items-center gap-1 rounded bg-brand-50 px-2.5 text-xs font-black text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300"
                                            >
                                                <AddRoundedIcon fontSize="small" /> Tambah Soal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditWrapper(wrapper)}
                                                className="grid h-8 w-8 place-items-center rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                title="Edit Wacana"
                                            >
                                                <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteWrapper(wrapper)}
                                                className="grid h-8 w-8 place-items-center rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                title="Hapus Wacana"
                                            >
                                                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stimulus Text Box */}
                                    {wrapper.stimulus_text && (
                                        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 font-japanese text-sm leading-relaxed text-gray-800 shadow-inner dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
                                            <p className="whitespace-pre-line">{wrapper.stimulus_text}</p>
                                        </div>
                                    )}

                                    {/* Audio Player Bar */}
                                    {wrapper.audio_url && (
                                        <div className="mt-2.5 flex items-center gap-3 rounded-md bg-amber-50/70 px-3 py-2 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                                            <VolumeUpRoundedIcon className="text-amber-700" fontSize="small" />
                                            <audio controls src={wrapper.audio_url} className="h-8 w-full max-w-md" />
                                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Audio Wacana Bersama</span>
                                        </div>
                                    )}
                                </div>

                                {/* Child Questions List (Indented under wrapper) */}
                                <div className="space-y-4 p-5 pl-7 sm:pl-9 border-l-4 border-l-brand-500 bg-gray-50/40 dark:bg-gray-900/30">
                                    {(wrapper.questions || []).map((question, qIdx) => (
                                        <article
                                            key={question.id}
                                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="grid h-6 w-6 place-items-center rounded bg-brand-600 text-xs font-black text-white">
                                                        {qIdx + 1}
                                                    </span>
                                                    {question.code && (
                                                        <span className="text-xs font-bold text-gray-400">
                                                            [{question.code}]
                                                        </span>
                                                    )}
                                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                        {question.points} poin
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditQuestion(question)}
                                                        className="grid h-7 w-7 place-items-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        title="Edit Soal"
                                                    >
                                                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteQuestion(question)}
                                                        className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                        title="Hapus Soal"
                                                    >
                                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Prompt */}
                                            <p className="mt-2 font-japanese text-sm font-bold text-gray-950 dark:text-white">
                                                {question.question_text}
                                            </p>
                                            {question.question_reading && (
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                    {question.question_reading}
                                                </p>
                                            )}

                                            {/* Audio (if question-specific) */}
                                            {question.audio_url && (
                                                <div className="mt-2">
                                                    <audio controls src={question.audio_url} className="h-7 w-64" />
                                                </div>
                                            )}

                                            {/* Options Grid */}
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {(question.options || []).map((opt, optIdx) => {
                                                    const letter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);
                                                    const isCorrect = opt === question.correct_answer;
                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                                                                isCorrect
                                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                                    : 'border-gray-200 bg-gray-50/50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-black ${
                                                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                {letter}
                                                            </span>
                                                            <span className="font-japanese">{opt}</span>
                                                            {isCorrect && (
                                                                <CheckCircleRoundedIcon className="ml-auto text-emerald-600" sx={{ fontSize: 16 }} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation */}
                                            {question.explanation && (
                                                <div className="mt-2.5 rounded bg-slate-100/70 p-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                                    <strong>Pembahasan:</strong> {question.explanation}
                                                </div>
                                            )}
                                        </article>
                                    ))}

                                    {(wrapper.questions || []).length === 0 && (
                                        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-xs font-bold text-gray-400 dark:border-gray-700">
                                            Belum ada pertanyaan pada wacana ini.{' '}
                                            <button
                                                type="button"
                                                onClick={() => openCreateQuestion(wrapper.id)}
                                                className="text-brand-600 underline hover:text-brand-700"
                                            >
                                                Tambah butir soal sekarang
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}

                        {/* Standalone Questions Section */}
                        {filteredStandalone.length > 0 && (
                            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <div className="border-b border-gray-200 bg-slate-50/80 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-base font-black text-gray-950 dark:text-white">
                                                Soal Mandiri (Tanpa Wacana)
                                            </h2>
                                            <p className="text-xs text-gray-500">Soal kosakata / tata bahasa langsung tanpa bacaan panjang.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openCreateQuestion('')}
                                            className="inline-flex h-8 items-center gap-1 rounded bg-brand-50 px-2.5 text-xs font-black text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300"
                                        >
                                            <AddRoundedIcon fontSize="small" /> Tambah Soal Mandiri
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-4 p-5 sm:grid-cols-2">
                                    {filteredStandalone.map((question, qIdx) => (
                                        <article
                                            key={question.id}
                                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="grid h-6 w-6 place-items-center rounded bg-gray-700 text-xs font-black text-white">
                                                        {qIdx + 1}
                                                    </span>
                                                    {question.code && (
                                                        <span className="text-xs font-bold text-gray-400">
                                                            [{question.code}]
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditQuestion(question)}
                                                        className="grid h-7 w-7 place-items-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        title="Edit Soal"
                                                    >
                                                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteQuestion(question)}
                                                        className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                        title="Hapus Soal"
                                                    >
                                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="mt-2 font-japanese text-sm font-bold text-gray-950 dark:text-white">
                                                {question.question_text}
                                            </p>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {(question.options || []).map((opt, optIdx) => {
                                                    const letter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);
                                                    const isCorrect = opt === question.correct_answer;
                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                                                                isCorrect
                                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                                    : 'border-gray-200 bg-gray-50/50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-black ${
                                                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                {letter}
                                                            </span>
                                                            <span className="truncate font-japanese">{opt}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {filteredWrappers.length === 0 && filteredStandalone.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
                                <p className="font-bold text-gray-950 dark:text-white">Belum ada wacana atau soal di bank ini</p>
                                <p className="mt-1 text-xs text-gray-500">Mulai dengan mengunggah berkas XLSX/CSV atau menambah wacana secara manual.</p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setImportModal(true)}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-amber-600 px-4 text-xs font-black text-white hover:bg-amber-700"
                                    >
                                        <UploadFileRoundedIcon fontSize="small" /> Mass Import (XLSX/CSV)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCreateWrapper}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-xs font-black text-white hover:bg-brand-700"
                                    >
                                        <AddRoundedIcon fontSize="small" /> + Tambah Wacana
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Tambah/Edit Wacana (Wrapper) */}
            <AdminDialog
                isOpen={Boolean(wrapperModal)}
                onClose={() => setWrapperModal(null)}
                title={wrapperModal?.mode === 'create' ? 'Tambah Wacana Baru (Wrapper)' : 'Edit Wacana (Wrapper)'}
                subtitle="Wacana ini akan membungkus butir-butir pertanyaan di bawahnya."
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSaveWrapper} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Judul Wacana / Topik</label>
                            <input
                                type="text"
                                required
                                value={wrapperForm.title}
                                onChange={(e) => setWrapperForm({ ...wrapperForm, title: e.target.value })}
                                className={fieldClassName}
                                placeholder="Contoh: Dokkai Mondai 4 - Bacaan Menengah"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Kode Wacana (Opsional)</label>
                            <input
                                type="text"
                                value={wrapperForm.wrapper_code}
                                onChange={(e) => setWrapperForm({ ...wrapperForm, wrapper_code: e.target.value })}
                                className={fieldClassName}
                                placeholder="Contoh: WRAP-N3-D01"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Kategori</label>
                            <select
                                value={wrapperForm.category}
                                onChange={(e) => setWrapperForm({ ...wrapperForm, category: e.target.value })}
                                className={fieldClassName}
                            >
                                <option value="reading">Bacaan (読解)</option>
                                <option value="listening">Mendengarkan (聴解)</option>
                                <option value="vocabulary">Kosakata & Huruf (文字・語彙)</option>
                                <option value="grammar">Tata Bahasa (文法)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Mondai (Opsional)</label>
                            <input
                                type="text"
                                value={wrapperForm.mondai_number}
                                onChange={(e) => setWrapperForm({ ...wrapperForm, mondai_number: e.target.value })}
                                className={fieldClassName}
                                placeholder="Contoh: Mondai 4"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">
                            Teks Wacana Bahasa Jepang (Stimulus Teks)
                        </label>
                        <textarea
                            rows="5"
                            value={wrapperForm.stimulus_text}
                            onChange={(e) => setWrapperForm({ ...wrapperForm, stimulus_text: e.target.value })}
                            className={`${fieldClassName} h-auto py-2.5 font-japanese text-sm`}
                            placeholder="Tempelkan paragraf teks bacaan bahasa Jepang di sini..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">
                            URL Berkas Audio Listening (Opsional)
                        </label>
                        <input
                            type="text"
                            value={wrapperForm.audio_url}
                            onChange={(e) => setWrapperForm({ ...wrapperForm, audio_url: e.target.value })}
                            className={fieldClassName}
                            placeholder="Contoh: https://storage.googleapis.com/.../audio.mp3 atau /storage/audio/..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setWrapperModal(null)}
                            className="h-10 rounded-md border border-gray-300 px-4 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="h-10 rounded-md bg-brand-600 px-5 text-xs font-black text-white hover:bg-brand-700"
                        >
                            Simpan Wacana
                        </button>
                    </div>
                </form>
            </AdminDialog>

            {/* Modal Tambah/Edit Soal */}
            <AdminDialog
                isOpen={Boolean(questionModal)}
                onClose={() => setQuestionModal(null)}
                title={questionModal?.mode === 'create' ? 'Tambah Butir Soal' : 'Edit Butir Soal'}
                subtitle="Masukkan pertanyaan, opsi pilihan ganda A/B/C/D, dan kunci jawaban."
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Pilih Wacana Induk</label>
                            <select
                                value={questionForm.exam_question_wrapper_id}
                                onChange={(e) => setQuestionForm({ ...questionForm, exam_question_wrapper_id: e.target.value })}
                                className={fieldClassName}
                            >
                                <option value="">-- Soal Mandiri (Tanpa Wacana) --</option>
                                {(bank.wrappers || []).map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.mondai_number ? `[${w.mondai_number}] ` : ''}{w.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Kode Soal</label>
                                <input
                                    type="text"
                                    value={questionForm.code}
                                    onChange={(e) => setQuestionForm({ ...questionForm, code: e.target.value })}
                                    className={fieldClassName}
                                    placeholder="N3-001"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Bobot Poin</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={questionForm.points}
                                    onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                                    className={fieldClassName}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Kalimat Pertanyaan</label>
                        <input
                            type="text"
                            required
                            value={questionForm.question_text}
                            onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                            className={`${fieldClassName} font-japanese`}
                            placeholder="Contoh: 本文の内容と合っているものはどれですか。"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Opsi A</label>
                            <input
                                type="text"
                                required
                                value={questionForm.option_a}
                                onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                                className={`${fieldClassName} font-japanese`}
                                placeholder="Teks pilihan A"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Opsi B</label>
                            <input
                                type="text"
                                required
                                value={questionForm.option_b}
                                onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                                className={`${fieldClassName} font-japanese`}
                                placeholder="Teks pilihan B"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Opsi C</label>
                            <input
                                type="text"
                                value={questionForm.option_c}
                                onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                                className={`${fieldClassName} font-japanese`}
                                placeholder="Teks pilihan C"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Opsi D</label>
                            <input
                                type="text"
                                value={questionForm.option_d}
                                onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                                className={`${fieldClassName} font-japanese`}
                                placeholder="Teks pilihan D"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Kunci Jawaban Benar</label>
                        <select
                            required
                            value={questionForm.correct_answer}
                            onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                            className={fieldClassName}
                        >
                            <option value="">-- Pilih Jawaban Benar --</option>
                            {questionForm.option_a && <option value={questionForm.option_a}>A: {questionForm.option_a}</option>}
                            {questionForm.option_b && <option value={questionForm.option_b}>B: {questionForm.option_b}</option>}
                            {questionForm.option_c && <option value={questionForm.option_c}>C: {questionForm.option_c}</option>}
                            {questionForm.option_d && <option value={questionForm.option_d}>D: {questionForm.option_d}</option>}
                        </select>
                        <p className="mt-1 text-[11px] text-gray-400">Kunci akan otomatis dicocokkan dengan teks pilihan yang dipilih.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-700 dark:text-gray-300">Pembahasan / Catatan (Opsional)</label>
                        <textarea
                            rows="2"
                            value={questionForm.explanation}
                            onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                            className={`${fieldClassName} h-auto py-2 text-xs`}
                            placeholder="Penjelasan mengapa opsi tersebut benar..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setQuestionModal(null)}
                            className="h-10 rounded-md border border-gray-300 px-4 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="h-10 rounded-md bg-brand-600 px-5 text-xs font-black text-white hover:bg-brand-700"
                        >
                            Simpan Soal
                        </button>
                    </div>
                </form>
            </AdminDialog>

            {/* Modal Mass Import (XLSX / CSV) */}
            <AdminDialog
                isOpen={importModal}
                onClose={() => setImportModal(false)}
                title="Mass Import Bank Soal (XLSX & CSV)"
                subtitle="Unggah ratusan soal sekaligus dari template standar atau dataset eksternal."
                maxWidth="max-w-3xl"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 p-3 dark:bg-gray-800">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Butuh template acuan?</span>
                        <div className="flex gap-2">
                            <a
                                href={route('admin.exams.question-banks.template', 'xlsx')}
                                className="inline-flex h-8 items-center gap-1 rounded border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
                            >
                                <DownloadRoundedIcon fontSize="small" /> Template XLSX
                            </a>
                            <a
                                href={route('admin.exams.question-banks.template', 'csv')}
                                className="inline-flex h-8 items-center gap-1 rounded border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
                            >
                                <DownloadRoundedIcon fontSize="small" /> Template CSV
                            </a>
                        </div>
                    </div>

                    {/* File Dropzone */}
                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                        <UploadFileRoundedIcon className="mx-auto text-gray-400" sx={{ fontSize: 40 }} />
                        <p className="mt-2 text-xs font-black text-gray-700 dark:text-gray-300">
                            {importFile ? importFile.name : 'Pilih atau seret berkas .xlsx atau .csv'}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">Ukuran maksimal 10 MB</p>
                        <input
                            type="file"
                            accept=".xlsx, .csv, .txt"
                            onChange={(e) => {
                                setImportFile(e.target.files[0] || null);
                                setImportPreview(null);
                            }}
                            className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-black file:text-brand-700 hover:file:bg-brand-100"
                        />
                    </div>

                    {/* Check / Preview Button */}
                    {importFile && !importPreview && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled={importBusy}
                                onClick={handleCheckImportFile}
                                className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-5 text-xs font-black text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                                {importBusy ? 'Memeriksa berkas...' : 'Periksa & Pratinjau Berkas'}
                            </button>
                        </div>
                    )}

                    {importError && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                            {importError}
                        </div>
                    )}

                    {/* Preview Result */}
                    {importPreview && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-800/40">
                                <div className="flex items-center gap-2 text-xs font-black">
                                    {importPreview.valid ? (
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <CheckCircleRoundedIcon fontSize="small" /> Berkas Valid
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-rose-600">
                                            <ErrorOutlineRoundedIcon fontSize="small" /> Terdapat Kesalahan
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4 text-xs font-bold text-gray-600 dark:text-gray-300">
                                    <span><strong>{importPreview.summary?.wrappers || 0}</strong> Wacana</span>
                                    <span><strong>{importPreview.summary?.questions || 0}</strong> Butir Soal</span>
                                </div>
                            </div>

                            {/* Errors list */}
                            {importPreview.errors?.length > 0 && (
                                <div className="max-h-36 overflow-y-auto rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                                    <p className="font-black">Harap perbaiki galat berikut sebelum mengimpor:</p>
                                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                        {importPreview.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Sample Table */}
                            {importPreview.data?.questions?.length > 0 && (
                                <div className="max-h-48 overflow-auto rounded border border-gray-200 text-xs dark:border-gray-800">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-100 dark:bg-gray-800 text-[11px] font-black uppercase text-gray-500">
                                            <tr>
                                                <th className="p-2">No</th>
                                                <th className="p-2">Wrapper Code</th>
                                                <th className="p-2">Pertanyaan</th>
                                                <th className="p-2">Kunci</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {importPreview.data.questions.slice(0, 10).map((q, i) => (
                                                <tr key={i}>
                                                    <td className="p-2">{q.row_number}</td>
                                                    <td className="p-2 font-mono font-bold text-brand-600">{q.wrapper_code || '-'}</td>
                                                    <td className="p-2 truncate max-w-xs font-japanese">{q.question_text}</td>
                                                    <td className="p-2 font-bold text-emerald-600">{q.correct_answer}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImportPreview(null);
                                        setImportFile(null);
                                    }}
                                    className="h-10 rounded-md border border-gray-300 px-4 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Pilih File Lain
                                </button>
                                <button
                                    type="button"
                                    disabled={!importPreview.valid || importBusy}
                                    onClick={handleCommitImport}
                                    className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {importBusy ? 'Menyimpan...' : 'Simpan Seluruh Soal ke Bank'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </AdminDialog>

            <ConfirmActionDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                isDestructive={confirmState.isDestructive}
                onConfirm={confirmState.onConfirm}
                onClose={closeConfirm}
            />
        </AuthenticatedLayout>
    );
}
