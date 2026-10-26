import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DokkaiReadingView from './DokkaiReadingView';
import DokkaiQuizView from './DokkaiQuizView';
import DokkaiResultView from './DokkaiResultView';
import DokkaiReviewView from './DokkaiReviewView';
import DokkaiGlossaryView from './DokkaiGlossaryView';

import Badge from '@/Components/UI/Badge';

import CloseIcon from '@mui/icons-material/Close';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import useQuizCheckpoint from '@/Hooks/useQuizCheckpoint';
import ResumeQuizModal from '@/Components/Features/Quiz/ResumeQuizModal';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { QuizActionButton } from '@/Components/UI/QuizUI';

const STEPS = [
    { key: 'reading', label: '1. Baca Wacana', icon: AutoStoriesIcon },
    { key: 'quiz', label: '2. Soal Dokkai', icon: QuizIcon },
    { key: 'result', label: '3. Hasil Evaluasi', icon: EmojiEventsIcon },
    { key: 'review', label: '4. Pembahasan & Eviden', icon: FindInPageIcon },
];

export default function DokkaiQuizRunner({
    quiz,
    paragraphs = [],
    vocabularies = [],
    questions = [],
    initialAttempt = null,
    onClose,
    onSubmitAttempt,
    onBookmark,
    persist = true,
}) {
    const displayQuiz = useMemo(() => persist || !quiz ? quiz : { ...quiz, xp_reward: null }, [persist, quiz]);
    const [step, setStep] = useState(initialAttempt ? 'result' : 'reading');
    const [unlockedSteps, setUnlockedSteps] = useState(() => {
        if (initialAttempt) return ['reading', 'quiz', 'result', 'review'];
        return ['reading'];
    });
    const [selectedAnswers, setSelectedAnswers] = useState(initialAttempt?.user_answers || {});
    const [result, setResult] = useState(initialAttempt || null);
    const [showFurigana, setShowFurigana] = useState(true);
    const [fontSize, setFontSize] = useState('base');
    const [activeVocab, setActiveVocab] = useState(vocabularies[0] || null);

    const {
        hasCheckpoint,
        initialCheckpointData,
        saveCheckpoint,
        clearCheckpoint,
        dismissResume,
        formattedSavedTime,
    } = useQuizCheckpoint({
        quizType: 'dokkai',
        quizId: quiz?.id,
        enabled: persist && !initialAttempt,
    });

    const [isResumeModalOpen, setIsResumeModalOpen] = useState(() => {
        if (!hasCheckpoint || !persist || initialAttempt) return false;
        const hasSavedAnswers = Object.keys(initialCheckpointData?.selectedAnswers || {}).length > 0;
        return Boolean(initialCheckpointData?.step === 'quiz' || hasSavedAnswers);
    });

    const progressRef = useRef(null);
    if (!progressRef.current) {
        progressRef.current = {
            step: 'reading', selectedAnswers: {}, questionId: questions[0]?.id,
            submission_token: crypto.randomUUID(), submission_status: 'idle',
        };
    }
    const clockRef = useRef({ remainingMs: Math.max(0, Number(quiz?.time_limit || 0) * 1000), startedAt: null });
    const [timeLeft, setTimeLeft] = useState(Number(quiz?.time_limit || 0));
    const [questionId, setQuestionId] = useState(questions[0]?.id);
    const [submissionStatus, setSubmissionStatus] = useState('idle');
    const [submitError, setSubmitError] = useState('');
    const submittingRef = useRef(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const remainingMilliseconds = useCallback(() => {
        const clock = clockRef.current;
        return Math.max(0, clock.remainingMs - (clock.startedAt === null ? 0 : Date.now() - clock.startedAt));
    }, []);

    const persistProgress = useCallback((changes = {}) => {
        progressRef.current = { ...progressRef.current, ...changes };
        if (!persist || initialAttempt || progressRef.current.submission_status === 'confirmed') return;
        saveCheckpoint({ ...progressRef.current, remainingMs: remainingMilliseconds(), capturedAt: Date.now() });
    }, [persist, initialAttempt, saveCheckpoint, remainingMilliseconds]);

    const handleResumeCheckpoint = () => {
        if (initialCheckpointData) {
            progressRef.current = { ...progressRef.current, ...initialCheckpointData };
            clockRef.current = {
                remainingMs: Number.isFinite(initialCheckpointData.remainingMs)
                    ? Math.max(0, initialCheckpointData.remainingMs) : Number(quiz?.time_limit || 0) * 1000,
                startedAt: null,
            };
            setTimeLeft(Math.ceil(clockRef.current.remainingMs / 1000));
            setQuestionId(initialCheckpointData.questionId ?? questions[0]?.id);
            setSubmissionStatus(initialCheckpointData.submission_status || 'idle');
            if (initialCheckpointData.submission_status === 'unconfirmed') {
                setSubmitError('Hasil belum terkonfirmasi. Kirim ulang untuk memeriksa dan menyimpan hasil.');
            }
            if (initialCheckpointData.selectedAnswers) {
                setSelectedAnswers(initialCheckpointData.selectedAnswers);
            }
            if (initialCheckpointData.step) {
                setStep(initialCheckpointData.step);
                setUnlockedSteps(Array.from(new Set(['reading', initialCheckpointData.step])));
            }
        }
        setIsResumeModalOpen(false);
        dismissResume();
    };

    const handleRestartCheckpoint = () => {
        clearCheckpoint();
        progressRef.current = {
            step: 'reading', selectedAnswers: {}, questionId: questions[0]?.id,
            submission_token: crypto.randomUUID(), submission_status: 'idle',
        };
        clockRef.current = { remainingMs: Number(quiz?.time_limit || 0) * 1000, startedAt: null };
        setTimeLeft(Number(quiz?.time_limit || 0));
        setQuestionId(questions[0]?.id);
        setSubmissionStatus('idle');
        setSubmitError('');
        setResult(null);
        setSelectedAnswers({});
        setStep('reading');
        setUnlockedSteps(['reading']);
        setIsResumeModalOpen(false);
    };

    // Narator Teks Bahasa Jepang
    const fullPassageText = useMemo(() => {
        return paragraphs.map((p) => p.content_raw).filter(Boolean).join('\n\n');
    }, [paragraphs]);

    const baseDurationSecs = useMemo(() => {
        const charCount = fullPassageText.replace(/\s+/g, '').length;
        return Math.max(20, Math.round(charCount / 5.5));
    }, [fullPassageText]);

    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState('1.0x');
    const [currentTime, setCurrentTime] = useState(0);

    const timerRef = useRef(null);

    const currentSpeedMultiplier = useMemo(() => {
        const num = parseFloat(audioSpeed) || 1.0;
        return num > 0 ? num : 1.0;
    }, [audioSpeed]);

    const dynamicTotalDuration = useMemo(() => {
        return Math.max(15, Math.round(baseDurationSecs / currentSpeedMultiplier));
    }, [baseDurationSecs, currentSpeedMultiplier]);

    const formatTimeDisplay = (totalSecs) => {
        const m = Math.floor(totalSecs / 60);
        const s = Math.floor(totalSecs % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const stopNarration = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsPlayingAudio(false);
    };

    const startNarration = (speed = currentSpeedMultiplier) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !fullPassageText) {
            return;
        }

        window.speechSynthesis.cancel();
        if (timerRef.current) clearInterval(timerRef.current);

        const utterance = new SpeechSynthesisUtterance(fullPassageText);
        utterance.lang = 'ja-JP';
        utterance.rate = speed;

        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ja') || v.lang?.toLowerCase().includes('jp'));
        if (jaVoice) {
            utterance.voice = jaVoice;
        }

        utterance.onend = () => {
            setIsPlayingAudio(false);
            setCurrentTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('Narator suara selesai/berhenti:', e);
            }
            setIsPlayingAudio(false);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);

        timerRef.current = setInterval(() => {
            setCurrentTime((prev) => {
                if (prev >= dynamicTotalDuration) {
                    stopNarration();
                    return 0;
                }
                return prev + 1;
            });
        }, 1000);
    };

    const handlePlayToggle = () => {
        if (isPlayingAudio) {
            stopNarration();
        } else {
            startNarration(currentSpeedMultiplier);
        }
    };

    const handleSpeedChange = (newSpeed) => {
        setAudioSpeed(newSpeed);
        const newMultiplier = parseFloat(newSpeed) || 1.0;
        if (isPlayingAudio) {
            startNarration(newMultiplier);
        }
    };

    useEffect(() => {
        return () => {
            stopNarration();
        };
    }, []);

    useEffect(() => {
        if (step !== 'reading') {
            stopNarration();
        }
    }, [step]);

    // Local bookmark state toggle (dynamic)
    const [localVocabularies, setLocalVocabularies] = useState(vocabularies);

    const [currentQuestions, setCurrentQuestions] = useState(questions);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const canRun = step === 'quiz' && !isResumeModalOpen && !isSubmitting
            && submissionStatus === 'idle' && !confirmState.show && !result;
        const pause = () => {
            clockRef.current.remainingMs = remainingMilliseconds();
            clockRef.current.startedAt = null;
            setTimeLeft(Math.ceil(clockRef.current.remainingMs / 1000));
        };
        const syncVisibility = () => {
            pause();
            if (canRun && document.visibilityState !== 'hidden') clockRef.current.startedAt = Date.now();
            if (!isResumeModalOpen && progressRef.current.step === 'quiz') persistProgress();
        };
        const onPageHide = () => { pause(); if (!isResumeModalOpen) persistProgress(); };
        syncVisibility();
        const interval = canRun ? window.setInterval(() => setTimeLeft(Math.ceil(remainingMilliseconds() / 1000)), 250) : null;
        document.addEventListener('visibilitychange', syncVisibility);
        window.addEventListener('pagehide', onPageHide);
        return () => {
            pause();
            if (interval) window.clearInterval(interval);
            document.removeEventListener('visibilitychange', syncVisibility);
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [step, isResumeModalOpen, isSubmitting, submissionStatus, confirmState.show, result, persistProgress, remainingMilliseconds]);

    const exitRef = useRef(null);
    const guardActive = persist && !initialAttempt && !result && !isResumeModalOpen
        && (step === 'quiz' || unlockedSteps.includes('quiz'));
    const guardRef = useRef(guardActive);
    guardRef.current = guardActive;
    const historyGuardEnabled = persist && !initialAttempt && !isResumeModalOpen && unlockedSteps.includes('quiz');
    const historyGuardRef = useRef(null);
    const closingRef = useRef(false);
    const closeRunner = () => {
        if (closingRef.current) return;
        const hasGuardEntry = historyGuardRef.current && window.history.state?.dokkaiGuard === historyGuardRef.current;
        closingRef.current = true;
        onClose?.({ historyOffset: hasGuardEntry ? -2 : -1 });
    };
    const handleRequestExit = () => {
        if (submittingRef.current || confirmState.show) return;
        if (!guardActive) { closeRunner(); return; }
        openConfirm({
            variant: 'warning', presentation: 'quiz-exit', zIndex: 'z-[10060]',
            title: 'Mau jeda dulu?',
            message: 'Jawaban dan sisa waktu disimpan agar kamu bisa melanjutkan sesi ini.',
            cancelLabel: 'Lanjutkan kuis', confirmLabel: 'Keluar sesi',
            details: [{ label: 'Progres', value: `${Object.keys(selectedAnswers).length}/${questions.length} soal dijawab` }],
            onConfirm: () => { persistProgress(); closeConfirm(); closeRunner(); },
        });
    };
    exitRef.current = handleRequestExit;

    useEffect(() => {
        if (!historyGuardEnabled) return;
        const onNavigate = (event) => {
            if (event.navigationType !== 'traverse' || !event.cancelable || closingRef.current || !guardRef.current) return;
            event.preventDefault();
            exitRef.current?.();
        };
        window.navigation?.addEventListener('navigate', onNavigate);
        // Keep Back in this document, before Inertia restores the previous page.
        const marker = crypto.randomUUID();
        historyGuardRef.current = marker;
        const originalState = window.history.state;
        window.history.pushState({ ...originalState, dokkaiGuard: marker }, '');
        const onPopState = (event) => {
            if (closingRef.current) return;
            event.stopImmediatePropagation();
            if (!guardRef.current) {
                guardRef.current = false;
                closeRunner();
                return;
            }
            window.history.pushState({ ...originalState, dokkaiGuard: marker }, '');
            exitRef.current?.();
        };
        window.addEventListener('popstate', onPopState, true);
        return () => {
            window.navigation?.removeEventListener('navigate', onNavigate);
            window.removeEventListener('popstate', onPopState, true);
            if (window.history.state?.dokkaiGuard === marker) window.history.back();
            historyGuardRef.current = null;
        };
    }, [historyGuardEnabled]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== 'Escape' || event.defaultPrevented || !guardRef.current) return;
            event.preventDefault();
            exitRef.current?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        setCurrentQuestions(questions);
    }, [questions]);

    const handleToggleBookmark = async (vocabId) => {
        setLocalVocabularies((prev) =>
            prev.map((v) => (v.id === vocabId ? { ...v, is_bookmarked: !v.is_bookmarked } : v))
        );
        if (activeVocab?.id === vocabId) {
            setActiveVocab((prev) => (prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : prev));
        }
        if (onBookmark) {
            try {
                await onBookmark(vocabId);
            } catch (err) {
                // Keep UI optimistic or log error
            }
        }
    };

    const handleSelectAnswer = (questionId, optionLabel) => {
        if (submittingRef.current || submissionStatus !== 'idle' || (quiz?.time_limit > 0 && remainingMilliseconds() <= 0)) return;
        const updated = { ...progressRef.current.selectedAnswers, [questionId]: optionLabel };
        setSelectedAnswers(updated);
        persistProgress({ step: 'quiz', selectedAnswers: updated });
    };

    const handleSubmitQuiz = async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        setSubmitError('');
        let finalResult = null;

        if (persist) {
            setSubmissionStatus('unconfirmed');
            persistProgress({ step: 'quiz', submission_status: 'unconfirmed' });
            try {
                if (!onSubmitAttempt) throw new Error('Penyimpanan hasil belum tersedia.');
                const response = await onSubmitAttempt({
                    quiz_id: quiz?.id,
                    answers: progressRef.current.selectedAnswers,
                    submission_token: progressRef.current.submission_token,
                });

                if (response?.result && Number.isFinite(Number(response.result.score))
                    && Number.isFinite(Number(response.result.total_questions)) && response.result.total_questions > 0) {
                    finalResult = {
                        ...response.result,
                        user_answers: response.result.user_answers || progressRef.current.selectedAnswers,
                    };
                }
                if (!finalResult) throw new Error('Server belum mengonfirmasi hasil kuis.');
                if (response?.questions && Array.isArray(response.questions) && response.questions.length > 0) {
                    setCurrentQuestions(response.questions);
                }
            } catch (err) {
                setSubmitError(err.response?.data?.message || 'Hasil belum terkonfirmasi. Periksa koneksi lalu coba kirim ulang.');
                setIsSubmitting(false);
                submittingRef.current = false;
                return;
            }
        }

        if (!persist) {
            let correctCount = 0;
            currentQuestions.forEach((q) => {
                const correctOpt = (q.options || []).find((o) => o.is_correct);
                if (correctOpt && selectedAnswers[q.id] === correctOpt.option_label) {
                    correctCount++;
                }
            });

            const total = currentQuestions.length || 1;
            const calculatedScore = Math.round((correctCount / total) * 100);

            finalResult = {
                score: calculatedScore,
                correct_count: correctCount,
                total_questions: total,
                xp_earned: 0,
                is_passed: calculatedScore >= Number(quiz?.passing_score ?? 70),
                user_answers: selectedAnswers,
            };
        }

        progressRef.current.submission_status = 'confirmed';
        setSubmissionStatus('confirmed');
        clearCheckpoint();
        setSelectedAnswers(finalResult.user_answers);
        setResult(finalResult);
        setUnlockedSteps(['reading', 'quiz', 'result', 'review', 'glossary']);
        setStep('result');
        setIsSubmitting(false);
        submittingRef.current = false;
    };

    const audioState = useMemo(() => ({
        isPlaying: isPlayingAudio,
        speed: audioSpeed,
        timeFormatted: `${formatTimeDisplay(currentTime)} / ${formatTimeDisplay(dynamicTotalDuration)}`,
        currentTime,
        duration: dynamicTotalDuration,
        onPlayToggle: handlePlayToggle,
        onSpeedChange: handleSpeedChange,
    }), [isPlayingAudio, audioSpeed, currentTime, dynamicTotalDuration]);

    const currentProgressPercentage = useMemo(() => {
        switch (step) {
            case 'reading':
                return 20;
            case 'quiz': {
                const answeredCount = Object.keys(selectedAnswers).length;
                const total = questions.length || 1;
                return 20 + Math.round((answeredCount / total) * 40);
            }
            case 'result':
                return 80;
            case 'review':
                return 90;
            case 'glossary':
                return 100;
            default:
                return 20;
        }
    }, [step, selectedAnswers, questions.length]);

    if (isResumeModalOpen && initialCheckpointData) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                <ResumeQuizModal
                    isOpen={true}
                    onResume={handleResumeCheckpoint}
                    onRestart={handleRestartCheckpoint}
                    savedTimeFormatted={formattedSavedTime}
                    quizTitle={quiz?.title ? `Dokkai: ${quiz.title}` : 'Kuis Dokkai'}
                    currentStepDescription={initialCheckpointData?.selectedAnswers ? `${Object.keys(initialCheckpointData.selectedAnswers).length} dari ${questions.length} soal terjawab` : 'Tahap Kuis'}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/70 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100 flex flex-col">
            {/* Global Header Runner */}
            <header className="sticky top-0 z-40 border-b border-gray-200/90 bg-white/95 backdrop-blur-md px-3 sm:px-5 py-2 sm:py-2.5 dark:border-gray-800 dark:bg-gray-900/95 shadow-2xs">
                <div className="mx-auto flex max-w-7xl 2xl:max-w-[1536px] items-center justify-between gap-3 sm:gap-4">
                    {/* Left: Close & Title */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {onClose && (
                            <button
                                type="button"
                                onClick={handleRequestExit}
                                disabled={isSubmitting}
                                aria-label="Tutup kuis Dokkai"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                                title="Tutup / Kembali"
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="font-extrabold text-sm sm:text-base tracking-tight text-gray-900 dark:text-white">
                                    Dokkai
                                </span>
                                {!persist && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">Pratinjau</span>}
                                {quiz?.jlpt_level && (
                                    <Badge color="green" className="text-[10px] py-0.5 px-2">
                                        {quiz.jlpt_level}
                                    </Badge>
                                )}
                                {/* Mobile Step Indicator */}
                                <span className="xl:hidden rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-300" title={`Tahap: ${STEPS.find((s) => s.key === step)?.label}`}>
                                    {STEPS.findIndex((s) => s.key === step) + 1}/{STEPS.length}
                                </span>
                            </div>
                            <h2 className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px] sm:max-w-xs md:max-w-md font-japanese font-semibold">
                                {quiz?.title || 'Wacana Membaca'}
                            </h2>
                        </div>
                    </div>

                    {/* Center: Stepper (Desktop) - Guarded Navigation */}
                    <nav className="hidden xl:flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
                        {STEPS.map((s) => {
                            const isCurrent = step === s.key;
                            const isUnlocked = unlockedSteps.includes(s.key);
                            const IconComponent = s.icon;

                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    disabled={!isUnlocked || isSubmitting}
                                    onClick={() => { if (isUnlocked) { persistProgress({ step: s.key }); setStep(s.key); } }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                        isCurrent
                                            ? 'bg-white text-gray-900 shadow-2xs dark:bg-gray-900 dark:text-white'
                                            : isUnlocked
                                            ? 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white cursor-pointer'
                                            : 'text-gray-400/60 dark:text-gray-600 cursor-not-allowed opacity-50'
                                    }`}
                                    title={!isUnlocked ? 'Selesaikan tahap sebelumnya terlebih dahulu' : undefined}
                                >
                                    <IconComponent sx={{ fontSize: 15 }} />
                                    <span>{s.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right: Controls (Furigana, Font Resizer) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Furigana Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowFurigana((prev) => !prev)}
                            className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold font-japanese transition ${
                                showFurigana
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                            title="Toggle Furigana (Bacaan Kana)"
                        >
                            <span>振</span>
                            <span className="text-[10px] uppercase font-sans">
                                {showFurigana ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* Font Resizer (Available on all screens) */}
                        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-800">
                            <button
                                type="button"
                                onClick={() => setFontSize('sm')}
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                                    fontSize === 'sm' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                                title="Ukuran Teks Kecil"
                            >
                                A-
                            </button>
                            <button
                                type="button"
                                onClick={() => setFontSize('base')}
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                                    fontSize === 'base' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                                title="Ukuran Teks Sedang"
                            >
                                A
                            </button>
                            <button
                                type="button"
                                onClick={() => setFontSize('lg')}
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                                    fontSize === 'lg' ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                                title="Ukuran Teks Besar"
                            >
                                A+
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tactile Progress Bar (Ecosystem Standar Kuis Japanlingo) */}
            <div className="h-1.5 w-full bg-gray-200/60 dark:bg-gray-800 overflow-hidden sticky top-[49px] sm:top-[57px] z-30">
                <div
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    style={{ width: `${currentProgressPercentage}%` }}
                />
            </div>

            {/* Main Stage Content */}
            <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1536px] mx-auto p-3 sm:p-4 lg:p-5 xl:p-6">
                {submitError && (
                    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                        <p>{submitError}</p>
                        <QuizActionButton onClick={handleSubmitQuiz} disabled={isSubmitting}>Coba Kirim Ulang</QuizActionButton>
                    </div>
                )}
                {step === 'reading' && (
                    <DokkaiReadingView
                        quiz={displayQuiz}
                        paragraphs={paragraphs}
                        vocabularies={localVocabularies}
                        showFurigana={showFurigana}
                        fontSize={fontSize}
                        activeVocab={activeVocab}
                        onSelectVocab={(v) => setActiveVocab(v)}
                        onBookmarkVocab={handleToggleBookmark}
                        onProceedToQuiz={() => {
                            setUnlockedSteps((prev) => Array.from(new Set([...prev, 'quiz'])));
                            setStep('quiz');
                            persistProgress({ step: 'quiz', selectedAnswers });
                        }}
                        audioState={audioState}
                    />
                )}

                {step === 'quiz' && (
                    <DokkaiQuizView
                        quiz={displayQuiz}
                        paragraphs={paragraphs}
                        vocabularies={localVocabularies}
                        showFurigana={showFurigana}
                        fontSize={fontSize}
                        questions={currentQuestions}
                        selectedAnswers={selectedAnswers}
                        onSelectAnswer={handleSelectAnswer}
                        onSubmitQuiz={handleSubmitQuiz}
                        isSubmitting={isSubmitting}
                        timeLeft={timeLeft}
                        questionId={questionId}
                        onQuestionChange={(id) => { setQuestionId(id); persistProgress({ questionId: id }); }}
                        answersLocked={submissionStatus !== 'idle' || confirmState.show}
                        onBackToReading={() => { persistProgress({ step: 'reading' }); setStep('reading'); }}
                    />
                )}

                {step === 'result' && (
                    <DokkaiResultView
                        quiz={displayQuiz}
                        preview={!persist}
                        result={result}
                        onReviewAnswers={() => setStep('review')}
                        onFinish={closeRunner}
                        onRetry={() => {
                            handleRestartCheckpoint();
                            persistProgress({ step: 'quiz' });
                            setUnlockedSteps(['reading', 'quiz']);
                            setStep('quiz');
                        }}
                    />
                )}

                {step === 'review' && (
                    <DokkaiReviewView
                        quiz={displayQuiz}
                        paragraphs={paragraphs}
                        questions={currentQuestions}
                        userAnswers={selectedAnswers}
                        onFinish={closeRunner}
                        onBackToResult={() => setStep('result')}
                    />
                )}

                {step === 'glossary' && (
                    <DokkaiGlossaryView
                        quiz={displayQuiz}
                        vocabularies={localVocabularies}
                        onBookmark={handleToggleBookmark}
                        onFinishLesson={onClose ? closeRunner : (() => setStep('reading'))}
                        onBackToReview={() => setStep('review')}
                    />
                )}
            </main>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </div>
    );
}
