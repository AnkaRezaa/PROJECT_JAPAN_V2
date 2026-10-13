import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import TranslateIcon from '@mui/icons-material/Translate';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import useQuizCheckpoint from '@/Hooks/useQuizCheckpoint';
import ResumeQuizModal from '@/Components/Features/Quiz/ResumeQuizModal';
import SentenceBuilder from '@/Components/Features/Quiz/SentenceBuilder';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

const PILLAR_CONFIG = {
    kosakata: {
        label: 'Kanji & Kosakata',
        kanji: '漢',
        badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border-violet-200 dark:border-violet-800/60',
        pipActive: 'bg-violet-500 ring-2 ring-violet-300 dark:ring-violet-700',
        pipDone: 'bg-violet-500',
        pipBorder: 'border-violet-300 dark:border-violet-800',
        icon: TranslateIcon,
    },
    bunpo: {
        label: 'Tata Bahasa (Bunpo)',
        kanji: '文',
        badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        pipActive: 'bg-sky-500 ring-2 ring-sky-300 dark:ring-sky-700',
        pipDone: 'bg-sky-500',
        pipBorder: 'border-sky-300 dark:border-sky-800',
        icon: AutoStoriesIcon,
    },
    dokkai: {
        label: 'Wacana (Dokkai)',
        kanji: '読',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        pipActive: 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700',
        pipDone: 'bg-emerald-500',
        pipBorder: 'border-emerald-300 dark:border-emerald-800',
        icon: MenuBookIcon,
    },
};

function DonutScoreGauge({ score = 0, correctCount = 0, totalQuestions = 10 }) {
    const size = 150;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const ringColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
            <svg className="-rotate-90 transform" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-slate-100 dark:text-slate-800"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                    {correctCount}/{totalQuestions}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Benar ({score}%)
                </span>
            </div>
        </div>
    );
}

export default function KuisCampuranRunner({ quiz, submitUrl, backUrl }) {
    const questions = useMemo(() => quiz?.questions || [], [quiz]);
    const totalQuestions = questions.length || 10;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [fontSize, setFontSize] = useState('base');
    const isSelectingRef = useRef(false);
    const isWeakspotQuiz = Boolean(quiz?.is_weakspot);

    const {
        hasCheckpoint,
        initialCheckpointData,
        formattedSavedTime,
        saveCheckpoint,
        clearCheckpoint,
        dismissResume,
    } = useQuizCheckpoint({
        quizType: 'mixed',
        quizId: isWeakspotQuiz ? null : (quiz?.day_id || quiz?.quiz_id || 'general'),
        maxAgeDays: 3,
        enabled: !isWeakspotQuiz,
    });

    const [showResumeModal, setShowResumeModal] = useState(() => {
        if (isWeakspotQuiz || !hasCheckpoint) return false;
        return Boolean(initialCheckpointData?.answers && Object.keys(initialCheckpointData.answers).length > 0);
    });

    const handleResume = () => {
        if (initialCheckpointData) {
            setUserAnswers(initialCheckpointData.answers || {});
            setCurrentIndex(initialCheckpointData.currentIndex ?? 0);
        }
        setShowResumeModal(false);
        dismissResume();
    };

    const handleRestart = () => {
        clearCheckpoint();
        setUserAnswers({});
        setCurrentIndex(0);
        setShowResumeModal(false);
    };

    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const handleRequestExit = (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (resultData) {
            router.get(backUrl || route('user.dashboard'));
            return;
        }

        const answeredCount = Object.keys(userAnswers).length;
        openConfirm({
            variant: 'warning',
            presentation: 'quiz-exit',
            title: 'Mau jeda dulu?',
            message: 'Jawaban yang sudah kamu isi akan tersimpan otomatis di checkpoint. Kamu bisa melanjutkan latihan ini kapan saja.',
            cancelLabel: 'Lanjutkan kuis',
            confirmLabel: 'Keluar sesi',
            details: [
                { label: 'Kuis', value: quiz?.title || 'Kuis Campuran 10 Soal' },
                { label: 'Progres', value: `${answeredCount}/${totalQuestions} soal dijawab` },
            ],
            onConfirm: () => {
                closeConfirm();
                router.get(backUrl || route('user.dashboard'));
            },
        });
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !resultData && !showResumeModal) {
                event.preventDefault();
                handleRequestExit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [resultData, showResumeModal, userAnswers]);

    // Validasi checkpoint SEBELUM masuk ke antarmuka soal kuis
    if (!isWeakspotQuiz && showResumeModal && initialCheckpointData?.answers) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors items-center justify-center p-4">
                <Head title={`Lanjutkan ${quiz?.title || 'Kuis'}`} />
                <ResumeQuizModal
                    isOpen={true}
                    title={quiz?.title || 'Kuis Campuran 10 Soal'}
                    savedQuestionNumber={(initialCheckpointData?.currentIndex ?? 0) + 1}
                    totalQuestions={totalQuestions}
                    savedTimeText={formattedSavedTime}
                    onResume={handleResume}
                    onRestart={handleRestart}
                />
            </div>
        );
    }

    if (quiz?.has_weakspot === false || questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <Head title={quiz?.title || 'Kuis Titik Lemah'} />
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <CheckCircleIcon sx={{ fontSize: 36 }} />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                        {quiz?.title || 'Kuis Titik Lemah'}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                        {quiz?.message || 'Luar biasa! Belum ada titik lemah yang perlu dilatih. Kuis ini khusus untuk melatih kembali materi dan soal yang pernah kamu jawab salah.'}
                    </p>
                    <div className="mt-6">
                        <Link
                            href={backUrl || route('user.progress')}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
                        >
                            <ArrowBackIcon sx={{ fontSize: 18 }} />
                            Kembali ke Progres
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex] || null;
    const currentCategory = currentQuestion?.category_key || 'kosakata';
    const config = PILLAR_CONFIG[currentCategory] || PILLAR_CONFIG.kosakata;
    const isSentenceBuilder = currentQuestion?.type === 'sentence_builder' || Boolean(currentQuestion?.tokens?.length);

    const handleSelectOption = (optionText) => {
        if (isSelectingRef.current || isSubmitting || resultData) return;
        isSelectingRef.current = true;

        const updated = {
            ...userAnswers,
            [currentQuestion.id]: {
                raw_id: currentQuestion.raw_id,
                source_type: currentQuestion.source_type,
                answer: optionText,
            },
        };
        setUserAnswers(updated);

        // Simpan Checkpoint
        saveCheckpoint({
            answers: updated,
            currentIndex: currentIndex,
        });

        setTimeout(() => {
            isSelectingRef.current = false;
        }, 350);
    };

    const handleSentenceBuilderChange = (newSelectedIds) => {
        if (isSubmitting || resultData) return;

        const tokenMap = new Map((currentQuestion.tokens || []).map((t) => [t.id, t.text]));
        const assembledText = newSelectedIds.map((id) => tokenMap.get(id) || '').join('');

        const updated = {
            ...userAnswers,
            [currentQuestion.id]: {
                raw_id: currentQuestion.raw_id,
                source_type: currentQuestion.source_type,
                answer: assembledText,
                ordered_token_ids: newSelectedIds,
            },
        };
        setUserAnswers(updated);

        // Simpan Checkpoint
        saveCheckpoint({
            answers: updated,
            currentIndex: currentIndex,
        });
    };

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        const formattedAnswers = questions.map((q) => {
            const recorded = userAnswers[q.id];
            return {
                raw_id: q.raw_id,
                source_type: q.source_type,
                answer: recorded ? recorded.answer : null,
                ordered_token_ids: recorded?.ordered_token_ids || null,
            };
        });

        try {
            const response = await axios.post(submitUrl, {
                submission_token: quiz.session_token,
                answers: formattedAnswers,
            });

            clearCheckpoint();
            setResultData(response.data);
        } catch (err) {
            console.error('Submit error:', err);
            setSubmitError(
                err?.response?.data?.message || 'Gagal mengirim jawaban. Periksa koneksi internet Anda.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
            <Head title={quiz?.title || 'Kuis Campuran 10 Soal'} />

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleRequestExit}
                        className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
                        title="Kembali"
                    >
                        <ArrowBackIcon sx={{ fontSize: 22 }} />
                    </button>

                    <div className="text-center flex-1 min-w-0">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {quiz?.is_weakspot ? (
                                <>
                                    <span className="text-rose-600 dark:text-rose-400">Titik Lemah</span>
                                    <span>·</span>
                                    <span className="text-rose-600 dark:text-rose-400">Remedial</span>
                                </>
                            ) : (
                                <>
                                    <span>Hari {quiz?.day_number || '1'}</span>
                                    <span>·</span>
                                    <span>Kuis Campuran</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {quiz?.title || '10 Soal Campuran'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                            quiz?.is_weakspot
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}>
                            <FlashOnIcon sx={{ fontSize: 14 }} />
                            <span>{quiz?.is_weakspot ? '+20 XP' : '+30 XP'}</span>
                        </span>
                    </div>
                </div>

                {/* 10-Pip Segmented Progress Bar */}
                {!resultData && (
                    <div className="max-w-3xl mx-auto mt-3">
                        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                            {questions.map((q, idx) => {
                                const isCurrent = idx === currentIndex;
                                const isAnswered = Boolean(userAnswers[q.id]?.answer || userAnswers[q.id]?.ordered_token_ids?.length);
                                const qCat = q.category_key || 'kosakata';
                                const qConf = PILLAR_CONFIG[qCat] || PILLAR_CONFIG.kosakata;

                                return (
                                    <button
                                        key={q.id || idx}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        title={`Soal ${idx + 1} (${qConf.label})`}
                                        className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 relative ${
                                            isCurrent
                                                ? `ring-2 ring-offset-1 ring-amber-400 scale-105 ${qConf.pipDone}`
                                                : isAnswered
                                                ? qConf.pipDone
                                                : `bg-slate-200 dark:bg-slate-800 border ${qConf.pipBorder}`
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {/* Error Banner jika Submit Gagal */}
            {submitError && (
                <div className="max-w-3xl mx-auto w-full px-4 pt-4">
                    <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                            <WarningAmberIcon sx={{ fontSize: 18 }} />
                            <span>{submitError}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="font-bold underline hover:no-underline shrink-0"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col justify-between">
                {resultData ? (
                    /* ================= RESULT SCREEN ================= */
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 py-4">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                Selesai
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {quiz?.is_weakspot || resultData?.is_weakspot
                                    ? (resultData.passed ? 'Pemulihan Titik Lemah Berhasil! 🎉' : 'Sesi Remedial Selesai 💪')
                                    : (resultData.passed ? 'Luar Biasa! Kuis Lulus 🎉' : 'Latihan Selesai! Tetap Semangat 💪')}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                {quiz?.is_weakspot || resultData?.is_weakspot
                                    ? 'Hasil perbaikan dari butir-butir soal yang sebelumnya dijawab salah.'
                                    : 'Evaluasi 3 pilar JLPT dari sesi kuis campuran hari ini.'}
                            </p>
                        </div>

                        {/* Donut Gauge */}
                        <div className="p-6 rounded-3xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm text-center">
                            <DonutScoreGauge
                                score={resultData.score || 0}
                                correctCount={resultData.correct_count || 0}
                                totalQuestions={resultData.total_questions || 10}
                            />

                            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                                <FlashOnIcon sx={{ fontSize: 16 }} />
                                <span>+{resultData.xp_earned || 0} XP Diperoleh</span>
                            </div>
                        </div>

                        {/* Breakdown 3 Pilar */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                                Rincian Perolehan per Pilar
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {Object.entries(resultData.breakdown || {}).map(([key, item]) => {
                                    const conf = PILLAR_CONFIG[key] || PILLAR_CONFIG.kosakata;
                                    const IconComponent = conf.icon;

                                    return (
                                        <div
                                            key={key}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${conf.badge}`}>
                                                        <IconComponent sx={{ fontSize: 16 }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {conf.label}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                    {item.correct}/{item.total}
                                                </span>
                                            </div>

                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${conf.pipDone}`}
                                                    style={{ width: `${item.percentage || 0}%` }}
                                                />
                                            </div>
                                            <div className="text-right mt-1.5">
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    {item.percentage}% Akurasi
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            {resultData.weakspot_category && (
                                <Link
                                    href={typeof route !== 'undefined' && route().has('user.weakspot.show') ? route('user.weakspot.show', { category: resultData.weakspot_category }) : route('user.progress')}
                                    className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition"
                                >
                                    <span>Latih Titik Lemah ({PILLAR_CONFIG[resultData.weakspot_category]?.label || 'Kategori'})</span>
                                </Link>
                            )}

                            <Link
                                href={backUrl || route('user.dashboard')}
                                className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.98] transition"
                            >
                                <span>Kembali ke Modul</span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => router.reload()}
                                className="p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center"
                                title="Ulangi Kuis"
                            >
                                <ReplayIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ================= QUIZ RUNNER SCREEN ================= */
                    <div className="space-y-5">
                        {/* Pre-Header Morphing Pill */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${config.badge}`}>
                                    <span>{config.kanji}</span>
                                    <span>{config.label}</span>
                                </span>
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Soal {currentIndex + 1} dari {totalQuestions}
                            </span>
                        </div>

                        {/* Sticky Mini-Passage View (Khusus Dokkai) */}
                        {currentQuestion?.source_type === 'dokkai' && currentQuestion?.passage_text && (
                            <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 backdrop-blur-xs space-y-2 max-h-[30vh] overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                        <MenuBookIcon sx={{ fontSize: 14 }} />
                                        <span>Kutipan Wacana</span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setFontSize(fontSize === 'sm' ? 'base' : 'sm')}
                                            className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition"
                                        >
                                            {fontSize === 'sm' ? 'A+' : 'A-'}
                                        </button>
                                    </div>
                                </div>
                                <p className={`leading-relaxed text-slate-800 dark:text-slate-200 ${fontSize === 'sm' ? 'text-xs' : 'text-sm'}`}>
                                    {currentQuestion.passage_text}
                                </p>
                            </div>
                        )}

                        {/* Question Card */}
                        <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 shadow-sm space-y-3">
                            {currentQuestion?.question_reading && (
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {currentQuestion.question_reading}
                                </p>
                            )}
                            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white leading-relaxed">
                                {currentQuestion?.question_text || 'Pertanyaan tidak ditemukan'}
                            </h2>
                            {currentQuestion?.context && (
                                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {currentQuestion.context}
                                </p>
                            )}
                        </div>

                        {/* Interactive Area: SentenceBuilder vs MCQ */}
                        {isSentenceBuilder ? (
                            <SentenceBuilder
                                tokens={currentQuestion?.tokens || []}
                                selectedIds={userAnswers[currentQuestion?.id]?.ordered_token_ids || []}
                                onChange={handleSentenceBuilderChange}
                                disabled={isSubmitting || Boolean(resultData)}
                                theme={currentCategory === 'bunpo' ? 'sky' : 'amber'}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                                {(currentQuestion?.options || []).map((option, idx) => {
                                    const optionText = option.text || option;
                                    const isSelected = userAnswers[currentQuestion?.id]?.answer === optionText;
                                    const letter = String.fromCharCode(65 + idx); // A, B, C, D

                                    return (
                                        <button
                                            key={option.id || idx}
                                            type="button"
                                            onClick={() => handleSelectOption(optionText)}
                                            className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left font-semibold text-sm sm:text-base transition-all duration-150 active:scale-[0.99] ${
                                                isSelected
                                                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {letter}
                                            </span>
                                            <span className="flex-1 leading-snug">{optionText}</span>
                                            {isSelected && (
                                                <CheckCircleIcon sx={{ fontSize: 20 }} className="text-amber-500 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Sticky Action Dock (Saat Mengerjakan) */}
            {!resultData && (
                <footer className="sticky bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 px-4 py-3">
                    <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                                currentIndex === 0
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
                            >
                                Lewati
                            </button>

                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    'Mengirim...'
                                ) : currentIndex === totalQuestions - 1 ? (
                                    'Selesai & Kirim'
                                ) : (
                                    'Selanjutnya →'
                                )}
                            </button>
                        </div>
                    </div>
                </footer>
            )}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </div>
    );
}
