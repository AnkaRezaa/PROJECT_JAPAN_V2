import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const STEPS = [
    { key: 'reading', label: '1. Baca Wacana', icon: AutoStoriesIcon },
    { key: 'quiz', label: '2. Soal Dokkai', icon: QuizIcon },
    { key: 'result', label: '3. Hasil Evaluasi', icon: EmojiEventsIcon },
    { key: 'review', label: '4. Pembahasan & Eviden', icon: FindInPageIcon },
    { key: 'glossary', label: '5. Glosarium & Latihan', icon: MenuBookIcon },
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
        if (initialAttempt) return ['reading', 'quiz', 'result', 'review', 'glossary'];
        return ['reading'];
    });
    const [selectedAnswers, setSelectedAnswers] = useState(initialAttempt?.user_answers || {});
    const [result, setResult] = useState(initialAttempt || null);
    const [showFurigana, setShowFurigana] = useState(true);
    const [fontSize, setFontSize] = useState('base');
    const [activeVocab, setActiveVocab] = useState(vocabularies[0] || null);

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
        setSelectedAnswers((prev) => ({
            ...prev,
            [questionId]: optionLabel,
        }));
    };

    const handleSubmitQuiz = async () => {
        setIsSubmitting(true);
        let finalResult = null;

        if (onSubmitAttempt) {
            try {
                const response = await onSubmitAttempt({
                    quiz_id: quiz?.id,
                    answers: selectedAnswers,
                });

                if (response?.result) {
                    finalResult = {
                        ...response.result,
                        user_answers: selectedAnswers,
                    };
                }
                if (response?.questions && Array.isArray(response.questions) && response.questions.length > 0) {
                    setCurrentQuestions(response.questions);
                }
            } catch (err) {
                console.error('Gagal memproses pengerjaan kuis di server:', err);
            }
        }

        // Fallback evaluasi lokal jika offline atau pratinjau statis tanpa respon server
        if (!finalResult) {
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
                xp_earned: persist
                    ? calculatedScore >= 70 ? (quiz?.xp_reward || 80) : Math.round((quiz?.xp_reward || 80) * 0.4)
                    : 0,
                is_passed: calculatedScore >= 70,
                user_answers: selectedAnswers,
            };
        }

        setResult(finalResult);
        setUnlockedSteps(['reading', 'quiz', 'result', 'review', 'glossary']);
        setStep('result');
        setIsSubmitting(false);
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
                                onClick={onClose}
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
                                    {STEPS.findIndex((s) => s.key === step) + 1}/5
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
                                    disabled={!isUnlocked}
                                    onClick={() => isUnlocked && setStep(s.key)}
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
                        onBackToReading={() => setStep('reading')}
                    />
                )}

                {step === 'result' && (
                    <DokkaiResultView
                        quiz={displayQuiz}
                        preview={!persist}
                        result={result}
                        onReviewAnswers={() => setStep('review')}
                        onProceedToGlossary={() => setStep('glossary')}
                        onRetry={() => {
                            setSelectedAnswers({});
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
                        onProceedToGlossary={() => setStep('glossary')}
                        onBackToResult={() => setStep('result')}
                    />
                )}

                {step === 'glossary' && (
                    <DokkaiGlossaryView
                        quiz={displayQuiz}
                        vocabularies={localVocabularies}
                        onBookmark={handleToggleBookmark}
                        onFinishLesson={onClose || (() => setStep('reading'))}
                        onBackToReview={() => setStep('review')}
                    />
                )}
            </main>
        </div>
    );
}
