import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Confetti from 'react-confetti';
import theme from '@/Components/theme/themes';
import { FloatingLearningDecor, RewardSummary } from '@/Components/User/UserVisuals';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import JapaneseSpeechButton, { preloadNarrationAudio } from '@/Components/UI/JapaneseSpeechButton';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import KanjiHandwritingCanvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import StrokeCharacterPreview from '@/Components/Features/Handwriting/StrokeCharacterPreview';
import { loadStrokeCharacter, resolveAvailableCharacters } from '@/Components/Features/Handwriting/strokeData';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import ContextualFeedbackPrompt from '@/Components/Features/Feedback/ContextualFeedbackPrompt';
import { pushAnalyticsEvent } from '@/lib/analytics';

// MUI Icons
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
    const remainingSeconds = String(safeSeconds % 60).padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
};

const reviewPriority = (question) => {
    if (question.review_due) return 0;
    if (question.review_status === 'learning') return 1;
    if (question.review_status === 'review') return 2;
    if (question.review_status === 'new') return 3;
    return 4;
};

function normalizeQuestionType(type) {
    if (type === 'fill_blank' || type === 'typing') return 'fill_blank';
    if (type === 'listening') return 'listening';
    return 'multiple_choice';
}

const japaneseTextPattern = /[\u3040-\u30ff\u3400-\u9fff]/g;

const getJapaneseSpeechText = (question, { includeCorrectAnswer = true } = {}) => {
    const source = [
        question?.kanji,
        question?.question,
        includeCorrectAnswer ? question?.correct_answer : null,
    ].filter(Boolean).join(' ');

    const matches = source.match(japaneseTextPattern);

    return matches?.length ? matches.join('') : '';
};

const isStreamableAudio = (audioUrl) => audioUrl && !audioUrl.includes('youtube.com') && !audioUrl.includes('youtu.be');

const SOUND_PREFERENCE_KEY = 'toku-up.quizSoundEnabled';
const QUIZ_COLORS = {
    progress: '#30C060',
    warm: '#F2B705',
    warmShadow: '#B77900',
    warmSurface: '#FFF8DB',
    ink: '#2D3742',
    success: '#22C55E',
    successDark: '#166534',
    successSurface: '#F0FDF4',
};

function SoundToggleButton({ enabled, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            title={enabled ? 'Nonaktifkan narator otomatis' : 'Aktifkan narator otomatis'}
            aria-label={enabled ? 'Nonaktifkan narator otomatis' : 'Aktifkan narator otomatis'}
            aria-pressed={enabled}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                enabled
                    ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
        >
            {enabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
        </button>
    );
}

function StrokeGuideGallery({ text }) {
    const [characters, setCharacters] = useState([]);
    const [previewCharacter, setPreviewCharacter] = useState(null);

    useEffect(() => {
        let active = true;

        resolveAvailableCharacters(text)
            .then((availableCharacters) => Promise.all(
                availableCharacters
                    .filter(({ character }) => /\p{Script=Han}/u.test(character))
                    .map(({ character }) => loadStrokeCharacter(character)),
            ))
            .then((items) => {
                if (active) setCharacters(items);
            })
            .catch(() => {
                if (active) setCharacters([]);
            });

        return () => {
            active = false;
        };
    }, [text]);

    if (characters.length === 0) return null;

    return (
        <section className="mx-auto mt-5 max-w-2xl text-left sm:mt-7">
            <div className="mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Cara Menulis</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Lihat bentuk dan urutan stroke setiap kanji.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {characters.map((item) => (
                    <article key={item.character} className="flex min-w-0 items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-2.5 dark:border-orange-900/60 dark:bg-orange-950/25 sm:p-3">
                        <svg viewBox="0 0 109 109" className="h-16 w-16 shrink-0 rounded-xl border border-orange-100 bg-white dark:border-gray-700 dark:bg-gray-950" aria-label={`Panduan menulis ${item.character}`}>
                            <path d="M 54.5 0 V 109 M 0 54.5 H 109 M 0 0 L 109 109 M 109 0 L 0 109" fill="none" stroke="#e5e7eb" strokeWidth="0.7" strokeDasharray="3 3" />
                            {item.paths.map((pathData, index) => (
                                <path key={`${item.character}-${index}`} d={pathData} fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                            ))}
                        </svg>
                        <div className="min-w-0 flex-1">
                            <p className="text-xl font-black text-gray-900 dark:text-white">{item.character}</p>
                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.stroke_count} stroke</p>
                            <button type="button" onClick={() => setPreviewCharacter(item.character)} className="mt-1.5 rounded-lg px-2 py-1 text-xs font-black text-orange-600 transition hover:bg-orange-100 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/70">
                                Lihat Urutan
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            <StrokeCharacterPreview
                character={previewCharacter}
                title={`Urutan stroke ${previewCharacter || ''}`}
                open={Boolean(previewCharacter)}
                onClose={() => setPreviewCharacter(null)}
            />
        </section>
    );
}

export default function Quiz({ quiz, questions: rawQuestions = [], flashcards = [], module_flow = false, back_url = null, finish_url = null, learning_feedback = null }) {
    const prefersReducedMotion = useReducedMotion();
    const [soundEnabled, setSoundEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;

        return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false';
    });
    const [sessionFlashcards] = useState(() => flashcards);
    const [questions, setQuestions] = useState(() =>
        rawQuestions
            .map((q, index) => ({
                ...q,
                originalIndex: index,
                originalQuestionId: q.originalQuestionId ?? q.id,
                type: normalizeQuestionType(q.type),
                options: Array.isArray(q.options) ? q.options : [],
                attemptKey: `${q.id}-${index}-0`,
                repeatCount: 0,
            }))
            .sort((a, b) => reviewPriority(a) - reviewPriority(b) || a.originalIndex - b.originalIndex)
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [answerFeedback, setAnswerFeedback] = useState(null);
    
    // Status Quiz
    const [lives, setLives] = useState(5);
    const [score, setScore] = useState(0);
    const [completedOriginalQuestionIds, setCompletedOriginalQuestionIds] = useState(() => new Set());
    const [showResult, setShowResult] = useState(false);
    const [showFlashcard, setShowFlashcard] = useState(false);
    const [handwritingPractice, setHandwritingPractice] = useState(null);
    const [flashcardIndex, setFlashcardIndex] = useState(0);
    const [flashcardReviewing, setFlashcardReviewing] = useState(false);
    const hasTimeLimit = Number(quiz?.time_limit || 0) > 0;
    const [secondsLeft, setSecondsLeft] = useState(Number(quiz?.time_limit || 0));
    const [finishedByTimeout, setFinishedByTimeout] = useState(false);
    const [attemptResult, setAttemptResult] = useState(null);
    const [attemptError, setAttemptError] = useState(null);
    const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
    const [attemptSession, setAttemptSession] = useState(null);
    const [attemptStarting, setAttemptStarting] = useState(Boolean(quiz?.is_weekly_exam));
    const [learningFeedback, setLearningFeedback] = useState(learning_feedback);
    const [feedbackRating, setFeedbackRating] = useState(learning_feedback?.rating || null);
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);
    
    const submitted = useRef(false);
    const answerPendingRef = useRef(false);
    const answerLogRef = useRef({});
    const answerEventsRef = useRef([]);
    const correctMapRef = useRef({});
    const practiceResumeRef = useRef('next');
    const handwritingReviewRecordedRef = useRef(false);

    // Animasi state
    const [shakeKey, setShakeKey] = useState(0); // Trigger shake animation
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    // Window size for Confetti
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        window.localStorage.setItem(SOUND_PREFERENCE_KEY, soundEnabled ? 'true' : 'false');
        if (!soundEnabled) {
            window.speechSynthesis?.cancel?.();
        }
    }, [soundEnabled]);

    useEffect(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!quiz?.is_weekly_exam) return undefined;

        let active = true;
        const submissionToken = window.crypto?.randomUUID?.()
            || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
                const random = Math.floor(Math.random() * 16);
                const value = character === 'x' ? random : (random & 0x3) | 0x8;

                return value.toString(16);
            });

        window.axios.post(route('user.attempts.start', quiz.id), {
            submission_token: submissionToken,
        }).then((response) => {
            if (!active) return;
            setAttemptSession(response.data);
            if (response.data?.remaining_seconds !== null && response.data?.remaining_seconds !== undefined) {
                setSecondsLeft(Number(response.data.remaining_seconds));
            }
        }).catch((error) => {
            if (!active) return;
            setAttemptError(error.response?.data?.message || 'Sesi ujian tidak dapat dimulai.');
        }).finally(() => {
            if (active) setAttemptStarting(false);
        });

        return () => {
            active = false;
        };
    }, [quiz?.id, quiz?.is_weekly_exam]);

    const currentQ = questions[currentIndex];
    const currentType = currentQ?.type || 'multiple_choice';
    const currentSpeechText = getJapaneseSpeechText(currentQ, {
        includeCorrectAnswer: currentType !== 'multiple_choice',
    });
    const hasQuestionAudio = Boolean(currentQ?.audio_url || currentSpeechText);
    const narrationAudioUrl = isStreamableAudio(currentQ?.audio_url) ? currentQ.audio_url : null;
    const totalQuestionCount = rawQuestions.length || questions.length;
    const scoredQuestionCount = rawQuestions.length || questions.filter((question) => !question.isRepeat).length;
    const originalQuestionCount = rawQuestions.length || questions.filter((question) => !question.isRepeat).length || questions.length;

    useEffect(() => {
        const nextQuestion = questions[currentIndex + 1];
        if (isStreamableAudio(nextQuestion?.audio_url)) {
            preloadNarrationAudio(nextQuestion.audio_url);
        }
    }, [currentIndex, questions]);
    const answeredCount = Object.keys(answerLogRef.current).length;
    const correctCount = Object.values(correctMapRef.current).filter(Boolean).length;
    const passingScore = Number(quiz?.passing_score || 70);
    const progressPercentage = originalQuestionCount > 0
        ? Math.min(100, (completedOriginalQuestionIds.size / originalQuestionCount) * 100)
        : 0;
    const flashcardSchedule = useMemo(() => {
        if (quiz?.is_weekly_exam || scoredQuestionCount <= 0) return [];

        const cardCount = Math.min(sessionFlashcards.length, scoredQuestionCount);

        return sessionFlashcards.slice(0, cardCount).map((card, index) => ({
            ...card,
            show_after_completed: Math.max(
                1,
                Math.ceil(((index + 1) * scoredQuestionCount) / (cardCount + 1)),
            ),
        }));
    }, [quiz?.is_weekly_exam, scoredQuestionCount, sessionFlashcards]);
    const activeFlashcard = flashcardSchedule[flashcardIndex] || null;
    const shouldShowScheduledFlashcard = (gameOver) => (
        !gameOver
        && activeFlashcard
        && completedOriginalQuestionIds.size >= activeFlashcard.show_after_completed
    );

    const repeatWrongQuestion = (question) => {
        const repeatCount = Number(question.repeatCount || 0);

        if (repeatCount >= 2) return;

        setQuestions((items) => [
            ...items,
            {
                ...question,
                attemptKey: `${question.id}-${items.length}-${repeatCount + 1}`,
                repeatCount: repeatCount + 1,
                isRepeat: true,
            },
        ]);
    };

    const checkAnswer = async ({ answerValue, selectedIndex = null, answerPayload }) => {
        if (!currentQ || selectedAnswer !== null || answerPendingRef.current) return;

        answerPendingRef.current = true;

        try {
            const response = await window.axios.post(route('user.questions.check', currentQ.id), {
                answer: answerValue,
                answer_payload: answerPayload,
            });
            const isCorrect = Boolean(response.data?.is_correct);
            const explanation = response.data?.explanation;
            const explanationReading = response.data?.explanation_reading;

            const answerEvent = {
                question_id: currentQ.id,
                answer_text: answerValue,
                answer_payload: {
                    ...answerPayload,
                    is_correct: isCorrect,
                    attempt_key: currentQ.attemptKey,
                    repeat_count: currentQ.repeatCount || 0,
                },
            };
            answerLogRef.current[currentQ.id] = answerEvent;
            answerEventsRef.current.push(answerEvent);
            correctMapRef.current[currentQ.id] = isCorrect;
            setSelectedAnswer(selectedIndex ?? answerValue);

            if (isCorrect) {
                playSoundEffect('correct');
                setScore(Object.values({ ...correctMapRef.current, [currentQ.id]: true }).filter(Boolean).length);
                setCompletedOriginalQuestionIds((items) => {
                    const next = new Set(items);
                    next.add(currentQ.originalQuestionId ?? currentQ.id);
                    return next;
                });
                setAnswerFeedback({
                    status: 'correct',
                    title: currentQ.isRepeat ? 'Mantap, sudah membaik!' : 'Benar!',
                    message: currentQ.isRepeat ? 'Soal yang tadi sulit sudah berhasil kamu jawab.' : 'Jawaban ini masuk ke progres mastery.',
                    reading: null,
                });
            } else {
                playSoundEffect('incorrect');
                setLives((value) => Math.max(0, value - 1));
                setShakeKey((value) => value + 1);
                repeatWrongQuestion(currentQ);
                setAnswerFeedback({
                    status: 'wrong',
                    title: 'Belum tepat',
                    message: explanation || 'Soal ini akan muncul lagi di akhir sesi untuk repetisi.',
                    reading: explanationReading,
                });
            }
        } catch (error) {
            setSelectedAnswer(null);
            setAnswerFeedback({
                status: 'error',
                title: 'Gagal mengecek jawaban',
                message: 'Coba kirim ulang jawaban. Jika masih gagal, cek koneksi atau login.',
            });
        } finally {
            answerPendingRef.current = false;
        }
    };

    const handleAnswerClick = (index) => {
        if (selectedAnswer !== null || answerPendingRef.current) return;

        const answerValue = currentQ.options[index] || '';
        if (!answerValue) return;

        checkAnswer({
            answerValue,
            selectedIndex: index,
            answerPayload: {
                selected_index: index,
                selected_option: answerValue,
                question_type: currentType,
            },
        });
    };

    const handleTypedAnswerSubmit = (event) => {
        event.preventDefault();
        if (selectedAnswer !== null || answerPendingRef.current) return;

        const answer = textAnswer.trim();
        if (!answer) return;

        checkAnswer({
            answerValue: answer,
            selectedIndex: null,
            answerPayload: {
                typed_answer: answer,
                question_type: currentType,
            },
        });
    };

    const submitAttempt = async ({ timeout = false } = {}) => {
        if (submitted.current || !quiz?.id) return;
        if (quiz.is_weekly_exam && !attemptSession) {
            setAttemptError('Sesi ujian belum siap. Muat ulang halaman sebelum mengirim jawaban.');
            return;
        }
        submitted.current = true;
        setIsSubmittingAttempt(true);
        setAttemptError(null);

        try {
            const response = await window.axios.post(route('user.attempts.store'), {
                quiz_id: quiz.id,
                module_flow,
                finished_by_timeout: timeout,
                attempt_id: attemptSession?.attempt_id || null,
                submission_token: attemptSession?.submission_token || null,
                answers: answerEventsRef.current,
            });

            setAttemptResult(response.data || null);
            pushAnalyticsEvent('quiz_completed', {
                quiz_type: quiz?.quiz_kind || quiz?.type || 'standard',
                passed: response.data?.passed === true,
            });
            if (response.data?.completed_day) {
                pushAnalyticsEvent('lesson_completed', { completion_type: 'day' });
            }
        } catch (error) {
            submitted.current = false;
            setAttemptError('Hasil kuis belum tersimpan. Coba kirim ulang sebelum keluar dari halaman ini.');
        } finally {
            setIsSubmittingAttempt(false);
        }
    };

    useEffect(() => {
        if (
            !hasTimeLimit
            || questions.length === 0
            || showResult
            || showFlashcard
            || handwritingPractice
            || (quiz?.is_weekly_exam && (attemptStarting || !attemptSession))
        ) return undefined;

        const timer = window.setInterval(() => {
            setSecondsLeft((value) => {
                if (value <= 1) {
                    window.clearInterval(timer);
                    setFinishedByTimeout(true);
                    submitAttempt({ timeout: true });
                    setShowResult(true);
                    return 0;
                }

                return value - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [attemptSession, attemptStarting, handwritingPractice, hasTimeLimit, questions.length, quiz?.is_weekly_exam, showResult, showFlashcard, score]);

    const handleNext = () => {
        const gameOver = lives <= 0;
        const lastQuestion = currentIndex >= questions.length - 1;

        if (shouldShowScheduledFlashcard(gameOver)) {
            practiceResumeRef.current = lastQuestion ? 'finish' : 'next';
            setShowFlashcard(true);
            setSelectedAnswer(null);
            setTextAnswer('');
            setAnswerFeedback(null);
            return;
        }

        if (gameOver || lastQuestion) {
            submitAttempt({ timeout: false });
            playSoundEffect(gameOver ? 'incorrect' : 'complete');
            setShowResult(true);
            return;
        }

        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setTextAnswer('');
        setAnswerFeedback(null);
    };

    const continueAfterFlashcard = () => {
        setShowFlashcard(false);
        setHandwritingPractice(null);
        setFlashcardIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setTextAnswer('');
        setAnswerFeedback(null);

        if (practiceResumeRef.current === 'finish') {
            submitAttempt({ timeout: false });
            playSoundEffect('complete');
            setShowResult(true);
            return;
        }

        setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
    };

    const continueWithHandwriting = async () => {
        try {
            const characters = await resolveAvailableCharacters(
                activeFlashcard?.front_text,
                activeFlashcard?.reading,
            );
            const kanjiCharacters = characters.filter(({ character }) => /\p{Script=Han}/u.test(character));
            const targets = kanjiCharacters.length > 0 ? kanjiCharacters : characters;

            if (targets.length > 0) {
                handwritingReviewRecordedRef.current = false;
                setShowFlashcard(false);
                setHandwritingPractice({
                    characters: targets,
                    character_index: 0,
                    flashcard_id: activeFlashcard?.id,
                    title: activeFlashcard?.front_text,
                    reading: activeFlashcard?.reading,
                    meaning: activeFlashcard?.back_text,
                    audio_url: activeFlashcard?.audio_url,
                });
                return;
            }
        } catch {
            // The normal quiz flow remains available when a stroke asset is missing.
        }

        continueAfterFlashcard();
    };

    const recordHandwritingReview = (isKnown, onSuccess) => {
        if (handwritingReviewRecordedRef.current || !handwritingPractice?.flashcard_id) {
            onSuccess?.();
            return;
        }

        handwritingReviewRecordedRef.current = true;
        setFlashcardReviewing(true);
        router.post(route('user.flashcards.review', handwritingPractice.flashcard_id), {
            action: isKnown ? 'known' : 'learning',
            skill: 'writing',
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess,
            onError: () => {
                handwritingReviewRecordedRef.current = false;
            },
            onFinish: () => setFlashcardReviewing(false),
        });
    };

    const trackHandwritingMistake = (result = {}) => {
        if (Number(result.mistakes || 0) > 0 || result.revealed) {
            recordHandwritingReview(false);
        }
    };

    const finishHandwritingPractice = (result = {}) => {
        if (flashcardReviewing) return;

        const nextIndex = (handwritingPractice?.character_index ?? 0) + 1;
        const currentOutcome = {
            character: result.character || handwritingPractice?.characters?.[handwritingPractice.character_index]?.character,
            outcome: result.outcome === 'skipped' ? 'skipped' : 'completed',
            correct: result.outcome !== 'skipped' && Number(result.mistakes || 0) === 0 && !result.revealed,
        };
        const outcomes = [...(handwritingPractice?.outcomes || []), currentOutcome];

        if (nextIndex < (handwritingPractice?.characters?.length ?? 0)) {
            playSoundEffect(currentOutcome.outcome === 'completed' ? 'correct' : 'select');
            setHandwritingPractice((current) => ({
                ...current,
                character_index: nextIndex,
                outcomes,
            }));
            return;
        }

        if (!handwritingPractice?.flashcard_id) {
            continueAfterFlashcard();
            return;
        }

        recordHandwritingReview(
            outcomes.every((outcome) => outcome.correct),
            continueAfterFlashcard,
        );
    };

    const handleFlashcardReview = (action) => {
        if (flashcardReviewing) return;

        playSoundEffect(action === 'known' ? 'correct' : 'select');

        if (!activeFlashcard?.id) {
            continueAfterFlashcard();
            return;
        }

        setFlashcardReviewing(true);
        router.post(route('user.flashcards.review', activeFlashcard.id), {
            action,
            completed: false,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: continueWithHandwriting,
            onFinish: () => setFlashcardReviewing(false),
        });
    };

    const confirmExit = (e) => {
        e.preventDefault();
        openConfirm({
            variant: 'warning',
            presentation: 'quiz-exit',
            title: 'Mau jeda dulu?',
            message: 'Jawaban yang belum dikirim tidak akan tersimpan. Kamu bisa lanjutkan sesi ini kapan saja sebelum keluar.',
            cancelLabel: 'Lanjutkan kuis',
            confirmLabel: 'Keluar sesi',
            details: [
                { label: 'Kuis', value: quiz?.title || quiz?.module?.title || 'Kuis aktif' },
                { label: 'Progress', value: `${answeredCount}/${totalQuestionCount} soal dijawab` },
                { label: 'Nyawa tersisa', value: `${lives} nyawa` },
            ],
            onConfirm: () => router.get(back_url || '/user/dashboard'),
        });
    };

    const exitConfirmation = (
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    );

    const continueAfterResult = async (continueLearning = true) => {
        if (!learningFeedback && feedbackRating) {
            setFeedbackSubmitting(true);
            setFeedbackError(null);

            try {
                const response = await window.axios.post(route('user.quizzes.feedback.store', quiz.id), {
                    rating: feedbackRating,
                    continue_learning: continueLearning,
                });

                setLearningFeedback(response.data?.feedback || {
                    rating: feedbackRating,
                    continue_learning: continueLearning,
                });
            } catch (error) {
                setFeedbackError(error.response?.data?.message || 'Feedback belum tersimpan. Coba lagi sebelum melanjutkan.');
                return;
            } finally {
                setFeedbackSubmitting(false);
            }
        }

        router.get(attemptResult?.next_url || finish_url || route('user.dashboard'));
    };

    // Jika tidak ada soal dari DB
    if (questions.length === 0) {
        return (
            <div className="relative flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-brand-50 via-white to-learning-50 px-4 py-8 sm:p-6">
                <Head title="Quiz" />
                <FloatingLearningDecor />
                <div className="relative z-10 max-w-md text-center">
                    <p className="mb-4 text-2xl font-black text-gray-700">Belum Ada Soal</p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">Admin belum menambahkan soal untuk kuis ini.</p>
                    <Link href={back_url || route('user.dashboard')} className="inline-flex min-h-11 items-center rounded-lg bg-action-primary px-6 py-3 font-black text-ink-900 no-underline shadow-sm transition hover:bg-action-primary-hover">
                        Kembali
                    </Link>
                </div>
            </div>
        );
    }

    // === TAMPILAN HASIL (SUMMARY SCREEN) ===
    if (showResult) {
        const answeredCount = Object.keys(answerLogRef.current).length;
        const finalCorrectCount = Object.values(correctMapRef.current).filter(Boolean).length;
        const fallbackScore = scoredQuestionCount > 0 ? Math.round((finalCorrectCount / scoredQuestionCount) * 100) : 0;
        const finalScore = Number(attemptResult?.score ?? fallbackScore);
        const hasAnsweredAll = answeredCount >= totalQuestionCount;
        const isSuccess = typeof attemptResult?.passed === 'boolean'
            ? attemptResult.passed
            : (!finishedByTimeout && lives > 0 && hasAnsweredAll && finalScore >= passingScore);
        const resultTotalQuestions = attemptResult?.total_questions ?? totalQuestionCount;
        const retryQuiz = () => {
            if (typeof window !== 'undefined') {
                router.get(window.location.href);
            }
        };
        const retrySubmit = () => submitAttempt({ timeout: finishedByTimeout });

        return (
            <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-8 font-sans sm:p-6"
                 style={{ backgroundColor: theme.sectionBg }}>
                <Head title="Hasil Kuis" />
                
                {isSuccess && !prefersReducedMotion && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={180} />}

                <motion.div 
                    initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.25, duration: 0.5 }}
                    className="relative z-10 w-full max-w-xl"
                >
                    <RewardSummary
                        status={isSuccess ? 'success' : 'review'}
                        title={finishedByTimeout ? 'Waktu Habis!' : (isSuccess ? 'Quest Kuis Selesai!' : 'Belum Lulus')}
                        message={finishedByTimeout
                            ? 'Jawaban yang sudah dikerjakan tetap dikirim, tetapi week belum selesai karena waktu habis.'
                            : isSuccess
                                ? (attemptResult?.message || 'Skor cukup dan mastery naik. Week ini selesai, lanjutkan momentum ke roadmap.')
                                : (attemptResult?.message || `Target lulus ${passingScore}%. Soal yang salah masuk repetisi, ulangi sampai cukup kuat.`)
                        }
                        stats={[
                            { label: 'Skor', value: `${finalScore}%` },
                            { label: 'Benar', value: `${finalCorrectCount}/${resultTotalQuestions}` },
                            { label: 'Target', value: `${passingScore}%` },
                        ]}
                    />
                    {attemptError && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {attemptError}
                        </div>
                    )}
                    {isSuccess && !attemptError && (
                        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left dark:border-amber-900/50 dark:bg-amber-950/20">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Feedback sesi</p>
                            <h2 className="mt-1 text-base font-black text-gray-900 dark:text-white">Bagaimana intensitas sesi ini?</h2>
                            <p className="mt-1 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">Jawabanmu membantu sensei melihat materi yang perlu diperkuat.</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[
                                    ['repeat', 'Perlu diulang'],
                                    ['just_right', 'Pas'],
                                    ['easy', 'Terlalu mudah'],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        disabled={Boolean(learningFeedback)}
                                        onClick={() => setFeedbackRating(value)}
                                        className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-black transition ${feedbackRating === value
                                            ? 'border-amber-500 bg-amber-400 text-gray-950'
                                            : 'border-amber-200 bg-white text-gray-700 hover:border-amber-400 dark:border-amber-900/50 dark:bg-gray-900 dark:text-gray-200'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {learningFeedback && <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">Feedback hari ini sudah tersimpan.</p>}
                            {feedbackError && <p className="mt-3 text-xs font-bold text-red-700 dark:text-red-300">{feedbackError}</p>}
                        </section>
                    )}
                    {!attemptError && attemptResult?.attempt_id && (
                        <ContextualFeedbackPrompt
                            feature="quiz"
                            contextId={attemptResult.attempt_id}
                            collapsibleLabel={isSuccess ? 'Ada kritik atau kendala soal kuis ini?' : null}
                            className="mt-4 rounded-2xl"
                        />
                    )}
                    <button 
                        onClick={() => {
                            if (attemptError) {
                                retrySubmit();
                                return;
                            }

                            if (!isSuccess) {
                                retryQuiz();
                                return;
                            }

                            if (!learningFeedback && !feedbackRating) {
                                setFeedbackError('Pilih feedback singkat sebelum melanjutkan.');
                                return;
                            }

                            continueAfterResult(true);
                        }}
                        disabled={isSubmittingAttempt || feedbackSubmitting}
                        className="mt-4 w-full py-4 rounded-2xl font-black text-white text-lg tracking-wide uppercase shadow-lg hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                        style={{ backgroundColor: theme.doneColor, boxShadow: `0 4px 0 0 ${theme.doneShadow}` }}
                    >
                        {isSubmittingAttempt || feedbackSubmitting ? 'MENYIMPAN...' : (attemptError ? 'KIRIM ULANG HASIL' : (isSuccess ? 'SIMPAN & LANJUTKAN' : 'ULANGI KUIS'))}
                    </button>
                    {isSuccess && !attemptError && !learningFeedback && feedbackRating && (
                        <button
                            type="button"
                            onClick={() => continueAfterResult(false)}
                            disabled={feedbackSubmitting}
                            className="mt-3 w-full py-3 text-sm font-black text-gray-700 transition hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
                        >
                            Simpan untuk nanti
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    if (handwritingPractice) {
        const activeWritingCharacter = handwritingPractice.characters?.[handwritingPractice.character_index];
        const handwritingStep = (handwritingPractice.character_index ?? 0) + 1;
        const handwritingTotal = handwritingPractice.characters?.length ?? 1;

        return (
            <div className="flex min-h-[100dvh] flex-col items-center bg-orange-50 px-4 py-4 font-sans dark:bg-gray-950 sm:py-6">
                <Head title="Latihan Menulis" />
                <header className="mb-3 flex w-full max-w-4xl items-start gap-3 sm:mb-4">
                    <button type="button" onClick={confirmExit} aria-label="Keluar dari kuis" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white">
                        <CloseIcon />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-orange-100 dark:bg-gray-800">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: QUIZ_COLORS.progress }}
                                    initial={false}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>
                            <div className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full bg-white px-2.5 text-sm font-black text-brand-600 shadow-sm ring-1 ring-brand-100 dark:bg-gray-900 dark:ring-brand-900/60">
                                <FavoriteIcon sx={{ fontSize: 19, color: lives > 0 ? '#EF4444' : '#D1D5DB' }} />
                                <span className="tabular-nums">{lives}</span>
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">Penguatan setelah flashcard</p>
                        <h1 className="truncate text-lg font-black text-gray-900 dark:text-white">Tulis {activeWritingCharacter.character}</h1>
                        {handwritingTotal > 1 && <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Karakter {handwritingStep} dari {handwritingTotal}</p>}
                    </div>
                    <SoundToggleButton enabled={soundEnabled} onToggle={() => setSoundEnabled((value) => !value)} />
                </header>
                <main className="w-full max-w-4xl rounded-3xl border border-orange-100 bg-white p-4 shadow-xl shadow-orange-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30 sm:p-5 md:grid md:grid-cols-[minmax(200px,0.72fr)_minmax(0,1fr)] md:items-start md:gap-6">
                    <div className="mb-4 text-center md:mb-0 md:pt-3 md:text-left">
                        <JapaneseReading
                            japanese={handwritingPractice.title}
                            reading={handwritingPractice.reading}
                            className="items-center text-2xl font-black text-gray-900 dark:text-white sm:text-3xl md:items-start"
                        />
                        {handwritingPractice.meaning && <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{handwritingPractice.meaning}</p>}
                        <JapaneseSpeechButton
                            text={[handwritingPractice.title, handwritingPractice.reading].filter(Boolean).join('、')}
                            audioUrl={handwritingPractice.audio_url}
                            autoPlay
                            autoPlayEnabled={soundEnabled}
                            playbackKey={`handwriting-${handwritingPractice.flashcard_id}`}
                            className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 transition hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70 md:mx-0"
                        />
                        <p className="mt-3 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">Tulis seluruh karakter mengikuti panduan transparan, lalu periksa hasilnya.</p>
                    </div>
                    <KanjiHandwritingCanvas
                        key={`${handwritingPractice.flashcard_id}-${activeWritingCharacter.character}`}
                        character={activeWritingCharacter.character}
                        mode="quiz"
                        selfEvaluation
                        onChange={trackHandwritingMistake}
                        onComplete={finishHandwritingPractice}
                    />
                </main>
                {exitConfirmation}
            </div>
        );
    }

    if (showFlashcard && activeFlashcard) {
        return (
            <div className="flex min-h-[100dvh] flex-col items-center overflow-x-hidden bg-gradient-to-br from-orange-50 via-white to-lime-50 px-4 pb-6 pt-4 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:pb-8 sm:pt-5">
                <Head title="Kosakata Baru" />
                <header className="relative z-10 mb-3 flex w-full max-w-4xl items-center gap-3 px-2 sm:mb-4 md:gap-4 md:px-4">
                    <button type="button" onClick={confirmExit} aria-label="Keluar dari kuis" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/50 dark:hover:bg-gray-800 dark:hover:text-white">
                        <CloseIcon />
                    </button>
                    <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: QUIZ_COLORS.progress }}
                            initial={false}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <div className="flex h-10 min-w-[58px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-base font-black text-brand-600 shadow-sm ring-1 ring-brand-100 dark:bg-gray-900 dark:ring-brand-900/60">
                        <FavoriteIcon sx={{ fontSize: 22, color: lives > 0 ? '#EF4444' : '#D1D5DB' }} />
                        <span className="tabular-nums">{lives}</span>
                    </div>
                    {hasTimeLimit && (
                        <div className={`hidden rounded-full px-3 py-1 text-xs font-black tabular-nums sm:block ${secondsLeft <= 10 ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700'}`}>
                            {formatTime(secondsLeft)}
                        </div>
                    )}
                    <SoundToggleButton enabled={soundEnabled} onToggle={() => setSoundEnabled((value) => !value)} />
                </header>

                <main className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center relative z-10">
                    <motion.div
                        key={`flashcard-${activeFlashcard.id}`}
                        initial={{ opacity: 0, y: 30, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.35 }}
                        className="relative w-full overflow-hidden rounded-[1.25rem] border-2 border-orange-100 bg-white shadow-[0_30px_80px_-35px_rgba(234,88,12,0.65)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/50 sm:rounded-[2.5rem]"
                    >
                        <div className="relative border-b border-orange-100 bg-gradient-to-r from-orange-50 to-lime-50 px-4 py-3 dark:border-gray-800 dark:from-orange-950/40 dark:to-lime-950/30 sm:px-8 sm:py-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 sm:text-xs sm:tracking-[0.3em]">Latihan Repetisi</p>
                                    <h1 className="mt-1 text-lg font-black text-gray-900 dark:text-white sm:mt-2 sm:text-2xl">Penguatan materi dari Hari ini</h1>
                                </div>
                                <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-orange-700 shadow-sm dark:bg-gray-900 dark:text-orange-300 dark:ring-1 dark:ring-orange-900/60 sm:px-4 sm:py-2 sm:text-xs">
                                    {flashcardIndex + 1}/{flashcardSchedule.length}
                                </span>
                            </div>
                        </div>

                        <div className="relative max-h-[48dvh] overflow-y-auto overscroll-contain px-4 py-5 text-center sm:max-h-[50dvh] sm:px-8 sm:py-7">
                            <JapaneseReading
                                japanese={activeFlashcard.front_text}
                                reading={activeFlashcard.reading}
                                className="items-center text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-5xl md:text-6xl"
                            />
                            <div className="mx-auto mt-3 h-px max-w-md bg-orange-200 sm:mt-5" />

                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-5 sm:gap-3">
                                <JapaneseSpeechButton
                                    text={activeFlashcard.front_text || activeFlashcard.reading}
                                    audioUrl={activeFlashcard.audio_url}
                                    autoPlay
                                    autoPlayEnabled={soundEnabled}
                                    playbackKey={`flashcard-${activeFlashcard.id}`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-orange-700 dark:hover:bg-orange-950/60 dark:hover:text-orange-300"
                                />
                                {activeFlashcard.hint && (
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-500 dark:bg-gray-800 dark:text-gray-300">{activeFlashcard.hint}</span>
                                )}
                            </div>

                            <h2 className="mt-4 break-words text-xl font-black text-gray-900 dark:text-white sm:mt-5 sm:text-2xl">{activeFlashcard.back_text || 'Belum ada arti'}</h2>
                            {activeFlashcard.meaning_en && activeFlashcard.meaning_en !== activeFlashcard.back_text && (
                                <p className="mt-1 text-sm font-semibold text-gray-500">{activeFlashcard.meaning_en}</p>
                            )}

                            {activeFlashcard.content_type === 'kanji' && (
                                <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-2 text-left sm:mt-5 sm:grid-cols-4">
                                    {activeFlashcard.onyomi && <div className="rounded-lg bg-learning-50 px-3 py-2"><span className="block text-[10px] font-black uppercase text-learning-700">Onyomi</span><span className="text-sm font-bold text-gray-800">{activeFlashcard.onyomi}</span></div>}
                                    {activeFlashcard.kunyomi && <div className="rounded-xl bg-orange-50 px-3 py-2"><span className="block text-[10px] font-black uppercase text-orange-500">Kunyomi</span><span className="text-sm font-bold text-gray-800">{activeFlashcard.kunyomi}</span></div>}
                                    {activeFlashcard.radicals?.length > 0 && <div className="rounded-xl bg-lime-50 px-3 py-2"><span className="block text-[10px] font-black uppercase text-lime-700">Radical</span><span className="text-sm font-bold text-gray-800">{activeFlashcard.radicals.join(', ')}</span></div>}
                                    {activeFlashcard.stroke_count && <div className="rounded-xl bg-sky-50 px-3 py-2"><span className="block text-[10px] font-black uppercase text-sky-600">Stroke</span><span className="text-sm font-bold text-gray-800">{activeFlashcard.stroke_count}</span></div>}
                                </div>
                            )}

                            <StrokeGuideGallery text={activeFlashcard.front_text} />

                            {(activeFlashcard.example_sentence || activeFlashcard.example_meaning) && (
                                <div className="mx-auto mt-4 max-w-2xl rounded-2xl bg-gray-50 p-3 text-left sm:mt-5 sm:p-4">
                                    <p className="break-words text-base font-bold text-gray-700">
                                        <HighlightedLearningText text={activeFlashcard.example_sentence} term={activeFlashcard.front_text} />
                                    </p>
                                    {activeFlashcard.example_reading && (
                                        <p className="mt-1 break-words text-sm font-semibold text-gray-500">
                                            <HighlightedLearningText text={activeFlashcard.example_reading} term={activeFlashcard.reading} />
                                        </p>
                                    )}
                                    <p className="mt-2 break-words text-sm italic text-gray-500">
                                        <HighlightedLearningText text={activeFlashcard.example_meaning} term={activeFlashcard.back_text} />
                                    </p>
                                </div>
                            )}
                            {activeFlashcard.notes && <p className="mx-auto mt-3 max-w-2xl text-left text-xs font-semibold text-gray-500">{activeFlashcard.notes}</p>}
                        </div>
                    </motion.div>

                    <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                        <button
                            onClick={() => handleFlashcardReview('learning')}
                            disabled={flashcardReviewing}
                            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-2 py-3 text-center text-sm font-black text-white shadow-[0_5px_0_#C2410C] transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/60 active:translate-y-1 active:shadow-[0_3px_0_#C2410C] disabled:cursor-wait disabled:opacity-60 dark:bg-orange-600 dark:shadow-[0_5px_0_#9A3412] dark:hover:bg-orange-500 sm:min-h-[60px] sm:rounded-2xl sm:px-5 sm:text-base"
                        >
                            <span className="text-lg leading-none sm:text-xl">?</span>
                            <span>Belum Paham</span>
                        </button>
                        <button
                            onClick={() => handleFlashcardReview('known')}
                            disabled={flashcardReviewing}
                            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-lime-400 px-2 py-3 text-center text-sm font-black text-gray-950 shadow-[0_5px_0_#65A30D] transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-300/60 active:translate-y-1 active:shadow-[0_3px_0_#65A30D] disabled:cursor-wait disabled:opacity-60 dark:bg-lime-500 dark:shadow-[0_5px_0_#3F6212] dark:hover:bg-lime-400 sm:min-h-[60px] sm:rounded-2xl sm:px-5 sm:text-base"
                        >
                            <span className="text-sm leading-none sm:text-base">OK</span>
                            <span>Sudah Paham</span>
                        </button>
                    </div>
                </main>
                {exitConfirmation}
            </div>
        );
    }

    // === TAMPILAN KUIS AKTIF ===
    return (
        <div className={`flex min-h-[100dvh] flex-col items-center overflow-x-hidden px-4 pt-4 font-sans dark:!bg-gray-950 sm:pt-5 md:pt-7 ${selectedAnswer !== null ? 'pb-56 sm:pb-36' : 'pb-8 sm:pb-10'}`}
             style={{ backgroundColor: theme.landingHeroBg }}>
            <Head title={`Quiz - Level 2`} />

            {/* Top Progress & Lives */}
            <header className="relative z-10 mb-4 flex w-full max-w-4xl items-center gap-3 px-2 md:mb-6 md:gap-4 md:px-4">
                <button type="button" onClick={confirmExit} aria-label="Keluar dari kuis" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/50 dark:hover:bg-gray-800 dark:hover:text-white">
                    <CloseIcon />
                </button>
                <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <motion.div 
                        className="h-full rounded-full" 
                        style={{ backgroundColor: QUIZ_COLORS.progress }}
                        initial={false}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
                {hasTimeLimit ? (
                    <div className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black tabular-nums ${secondsLeft <= 10 ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700'}`}>
                        {formatTime(secondsLeft)}
                    </div>
                ) : (
                    <div className="flex h-10 min-w-[58px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-base font-black text-brand-600 shadow-sm ring-1 ring-brand-100 dark:bg-gray-900 dark:ring-brand-900/60">
                        <FavoriteIcon sx={{ fontSize: 22, color: lives > 0 ? '#EF4444' : '#D1D5DB' }} />
                        <span className="tabular-nums">{lives}</span>
                    </div>
                )}
                <SoundToggleButton enabled={soundEnabled} onToggle={() => setSoundEnabled((value) => !value)} />
            </header>

            {/* Quiz Content Area */}
            <main className="w-full max-w-3xl flex-1 flex flex-col items-center relative z-10">
                <JapaneseSpeechButton
                    text={currentSpeechText || currentQ?.kanji || currentQ?.question}
                    audioUrl={narrationAudioUrl}
                    autoPlay={Boolean(narrationAudioUrl || currentSpeechText)}
                    autoPlayEnabled={soundEnabled}
                    playbackKey={`question-${currentQ?.attemptKey}`}
                    renderButton={false}
                    usePreloadedAudio
                />
                
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col items-center"
                    >
                        {/* Question Info */}
                        <div className="mb-4 w-full text-center md:mb-5">
                            <h2 className="mb-1.5 px-1 text-lg font-black text-gray-900 dark:text-white sm:text-xl md:text-2xl">
                                <JapaneseReading
                                    japanese={currentQ.question}
                                    reading={currentQ.question_reading}
                                    className="items-center"
                                />
                            </h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                {currentQ.isRepeat ? 'Penguatan' : `Soal ${Math.min((currentQ.originalIndex ?? 0) + 1, originalQuestionCount)} dari ${originalQuestionCount}`}
                            </p>
                        </div>

                        {/* Flashcard Canvas / Media */}
                        {(currentQ.kanji || currentQ.audio_url || currentSpeechText) && (
                            <div className={`relative mb-4 flex w-full max-w-[500px] items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-[2rem] ${currentQ.audio_url?.includes('youtu') ? 'aspect-video' : 'min-h-36 py-4 sm:min-h-44 sm:py-6 md:min-h-48'}`}>
                                {currentQ.kanji ? (
                                    <span className="max-w-full break-words px-4 text-[60px] font-medium leading-none text-gray-900 select-none dark:text-white sm:text-[80px] md:text-[96px]">{currentQ.kanji}</span>
                                ) : !currentQ.audio_url ? (
                                    <div className="max-h-[72%] overflow-y-auto overscroll-contain px-6 text-center sm:px-8">
                                        <p className="break-words text-2xl font-black text-gray-700 dark:text-gray-100 sm:text-3xl md:text-4xl">{currentSpeechText}</p>
                                    </div>
                                ) : null}
                                
                                {currentQ.audio_url && (
                                    (currentQ.audio_url.includes('youtube.com') || currentQ.audio_url.includes('youtu.be')) ? (
                                        <iframe
                                            src={currentQ.audio_url.includes('watch?v=') ? currentQ.audio_url.replace('watch?v=', 'embed/') : currentQ.audio_url}
                                            className="w-full h-full"
                                            allowFullScreen
                                            title="Audio Question"
                                        />
                                    ) : (
                                        <>
                                            {!currentQ.kanji && <span className="text-gray-600 dark:text-gray-300 font-bold tracking-widest uppercase">Pesan Suara</span>}
                                            <JapaneseSpeechButton
                                                audioUrl={currentQ.audio_url}
                                                text={currentSpeechText || currentQ.kanji || currentQ.question}
                                                autoPlay={false}
                                                autoPlayEnabled={soundEnabled}
                                                playbackKey={`question-${currentQ.attemptKey}`}
                                                className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-2xl border-b-4 border-[#B77900] bg-[#F2B705] text-[#2D3742] shadow-md transition-all hover:bg-[#FFC928] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:translate-y-1 active:border-b-0 md:bottom-6 md:right-6"
                                            />
                                        </>
                                    )
                                )}
                                {!currentQ.audio_url && hasQuestionAudio && (
                                    <JapaneseSpeechButton
                                        text={currentSpeechText || currentQ.kanji || currentQ.question}
                                        autoPlay={false}
                                        autoPlayEnabled={soundEnabled}
                                        playbackKey={`question-${currentQ.attemptKey}`}
                                        className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-2xl border-b-4 border-[#B77900] bg-[#F2B705] text-[#2D3742] shadow-md transition-all hover:bg-[#FFC928] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:translate-y-1 active:border-b-0 md:bottom-6 md:right-6"
                                    />
                                )}
                            </div>
                        )}

                        {/* Answer Area */}
                        <motion.div
                            className="w-full max-w-[500px]"
                            animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                            transition={{ duration: 0.4 }}
                        >
                            {currentType === 'multiple_choice' && currentQ.options.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {currentQ.options.map((option, index) => {
                                        const isSelected = selectedAnswer === index;
                                        let buttonStyle = {
                                            backgroundColor: "white",
                                            borderColor: "#E5E7EB",
                                            color: "#4B5563",
                                            boxShadow: `0 4px 0 0 #E5E7EB`
                                        };

                                        if (isSelected && answerFeedback?.status === 'correct') {
                                            buttonStyle = {
                                                backgroundColor: '#dcfce7',
                                                borderColor: '#22c55e',
                                                color: '#166534',
                                                boxShadow: '0 4px 0 0 #16a34a',
                                            };
                                        } else if (isSelected && answerFeedback?.status === 'wrong') {
                                            buttonStyle = {
                                                backgroundColor: '#fee2e2',
                                                borderColor: '#ef4444',
                                                color: '#991b1b',
                                                boxShadow: '0 4px 0 0 #dc2626',
                                            };
                                        } else if (isSelected) {
                                            buttonStyle = {
                                                backgroundColor: QUIZ_COLORS.warmSurface,
                                                borderColor: QUIZ_COLORS.warm,
                                                color: QUIZ_COLORS.ink,
                                                boxShadow: `0 4px 0 0 ${QUIZ_COLORS.warmShadow}`,
                                            };
                                        }

                                        return (
                                            <button
                                                key={index}
                                                disabled={selectedAnswer !== null}
                                                onClick={() => handleAnswerClick(index)}
                                                className={`relative min-h-[54px] min-w-0 w-full break-words rounded-2xl border-2 px-4 py-3 text-center text-base font-bold leading-tight transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:translate-y-1 active:shadow-none disabled:cursor-default sm:px-5 ${
                                                    !isSelected ? 'hover:border-amber-300 hover:bg-amber-50/50 dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-100 dark:!shadow-[0_4px_0_0_#374151] dark:hover:!border-amber-500' : ''
                                                }`}
                                                style={buttonStyle}
                                            >
                                                <JapaneseReading
                                                    japanese={option}
                                                    reading={currentQ.option_readings?.[index]}
                                                    className="items-center"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <form onSubmit={handleTypedAnswerSubmit} className="space-y-4">
                                    {currentType === 'fill_blank' && currentQ.options?.[0] && (
                                        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-700">
                                            Hint: {currentQ.options[0]}
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={textAnswer}
                                        onChange={(e) => setTextAnswer(e.target.value)}
                                        disabled={selectedAnswer !== null}
                                        placeholder={currentType === 'listening' ? 'Ketik jawaban dari audio...' : 'Ketik jawaban yang tepat...'}
                                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-4 text-center text-lg font-black text-gray-800 shadow-sm outline-none transition-all focus:border-focus focus:ring-4 focus:ring-focus/10 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:disabled:bg-gray-800 sm:px-5 sm:py-5"
                                    />
                                    <button
                                        type="submit"
                                        disabled={selectedAnswer !== null || textAnswer.trim() === ''}
                                        className="min-h-11 w-full rounded-lg bg-action-primary px-6 py-4 text-lg font-black text-ink-900 shadow-sm transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cek Jawaban
                                    </button>
                                </form>
                            )}
                        </motion.div>

                        {answerFeedback?.status === 'error' && selectedAnswer === null && (
                            <div className="mt-5 w-full max-w-[500px] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                {answerFeedback.message}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Floating Success/Action Bar */}
            <AnimatePresence>
                {selectedAnswer !== null && (
                    <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[45dvh] overflow-y-auto border-t-2"
                        role="status"
                        aria-live="polite"
                        style={{ 
                            backgroundColor: answerFeedback?.status === 'wrong' ? '#fef2f2' : QUIZ_COLORS.successSurface,
                            borderColor: answerFeedback?.status === 'wrong' ? '#ef4444' : QUIZ_COLORS.success
                        }}
                    >
                        <div className="mx-auto flex max-w-4xl flex-col items-stretch justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:py-3">
                            
                            {/* Feedback Message */}
                            <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-4">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.25, delay: 0.05 }}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-12 sm:w-12"
                                    style={{ color: answerFeedback?.status === 'wrong' ? '#ef4444' : QUIZ_COLORS.success }}
                                >
                                    {answerFeedback?.status === 'wrong' ? <CloseIcon sx={{ fontSize: 30 }} /> : <CheckCircleIcon sx={{ fontSize: 30 }} />}
                                </motion.div>
                                <div>
                                    <h3 className="mb-0.5 break-words text-lg font-black sm:text-xl"
                                        style={{ color: answerFeedback?.status === 'wrong' ? '#991b1b' : QUIZ_COLORS.successDark }}>
                                        {answerFeedback?.title || 'Jawaban direkam'}
                                    </h3>
                                    <div className="break-words text-xs font-medium sm:text-sm"
                                         style={{ color: answerFeedback?.status === 'wrong' ? '#b91c1c' : QUIZ_COLORS.successDark }}>
                                        <JapaneseReading
                                            japanese={answerFeedback?.message || 'Koreksi dan XP dihitung oleh server.'}
                                            reading={answerFeedback?.reading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button 
                                onClick={handleNext}
                                className="w-full rounded-xl px-8 py-3 text-base font-black uppercase tracking-wide text-white shadow-lg transition-all active:translate-y-1 active:shadow-none hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-10"
                                style={{ 
                                    backgroundColor: theme.doneColor, 
                                    boxShadow: `0 4px 0 0 ${theme.doneShadow}` 
                                }}
                            >
                                {lives === 0 ? "SELESAI" : "LANJUT"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {exitConfirmation}
        </div>
    );
}
