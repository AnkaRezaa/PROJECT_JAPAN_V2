import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';

const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainder = safeSeconds % 60;

    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const answered = (value) => value !== undefined && value !== null && String(value).trim() !== '';

export default function KerjakanUjian({
    quiz,
    questions = [],
    total_points = 0,
    module_flow = true,
    back_url = null,
    finish_url = null,
}) {
    const [answers, setAnswers] = useState({});
    const [flagged, setFlagged] = useState(() => new Set());
    const [attemptSession, setAttemptSession] = useState(null);
    const [attemptError, setAttemptError] = useState('');
    const [attemptStarting, setAttemptStarting] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(Number(quiz?.time_limit || 0));
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const questionRefs = useRef({});
    const submittedRef = useRef(false);
    const timerSubmitRef = useRef(null);
    const hasTimeLimit = Number(quiz?.time_limit || 0) > 0;
    const answeredCount = useMemo(
        () => questions.filter((question) => answered(answers[question.id])).length,
        [answers, questions],
    );
    const unansweredCount = Math.max(0, questions.length - answeredCount);
    const draftKey = attemptSession
        ? `toku-up-exam-draft-${quiz.id}-${attemptSession.attempt_id}`
        : null;

    useEffect(() => {
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

            const stored = window.localStorage.getItem(
                `toku-up-exam-draft-${quiz.id}-${response.data.attempt_id}`,
            );
            if (stored) {
                try {
                    const draft = JSON.parse(stored);
                    setAnswers(draft.answers || {});
                    setFlagged(new Set(draft.flagged || []));
                    setDraftSavedAt(draft.saved_at || null);
                } catch {
                    window.localStorage.removeItem(
                        `toku-up-exam-draft-${quiz.id}-${response.data.attempt_id}`,
                    );
                }
            }
        }).catch((error) => {
            if (active) {
                setAttemptError(error.response?.data?.message || 'Sesi ujian tidak dapat dimulai.');
            }
        }).finally(() => {
            if (active) setAttemptStarting(false);
        });

        return () => {
            active = false;
        };
    }, [quiz.id]);

    useEffect(() => {
        if (!draftKey || result) return;

        const timeout = window.setTimeout(() => {
            const savedAt = new Date().toISOString();
            window.localStorage.setItem(draftKey, JSON.stringify({
                answers,
                flagged: [...flagged],
                saved_at: savedAt,
            }));
            setDraftSavedAt(savedAt);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [answers, draftKey, flagged, result]);

    useEffect(() => {
        const preventAccidentalExit = (event) => {
            if (!attemptSession || result || submittedRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', preventAccidentalExit);
        return () => window.removeEventListener('beforeunload', preventAccidentalExit);
    }, [attemptSession, result]);

    const submitAttempt = useCallback(async ({ timeout = false } = {}) => {
        if (!attemptSession || submittedRef.current || result) return;

        submittedRef.current = true;
        setSubmitting(true);
        setAttemptError('');
        setShowSubmitDialog(false);

        try {
            const payloadAnswers = questions
                .filter((question) => answered(answers[question.id]))
                .map((question) => ({
                    question_id: question.id,
                    answer_text: String(answers[question.id]),
                }));
            const response = await window.axios.post(route('user.attempts.store'), {
                quiz_id: quiz.id,
                answers: payloadAnswers,
                module_flow,
                finished_by_timeout: timeout,
                attempt_id: attemptSession.attempt_id,
                submission_token: attemptSession.submission_token,
            });

            setResult(response.data);
            if (draftKey) window.localStorage.removeItem(draftKey);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            submittedRef.current = false;
            setAttemptError(error.response?.data?.message || 'Hasil ujian belum dapat disimpan. Silakan kirim ulang.');
        } finally {
            setSubmitting(false);
        }
    }, [answers, attemptSession, draftKey, module_flow, questions, quiz.id, result]);

    useEffect(() => {
        timerSubmitRef.current = submitAttempt;
    }, [submitAttempt]);

    useEffect(() => {
        if (!hasTimeLimit || !attemptSession || result || submitting) return undefined;
        if (secondsLeft <= 0) {
            timerSubmitRef.current?.({ timeout: true });
            return undefined;
        }

        const timer = window.setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [attemptSession, hasTimeLimit, result, secondsLeft, submitting]);

    const updateAnswer = (questionId, value) => {
        setAnswers((current) => ({ ...current, [questionId]: value }));
    };

    const toggleFlag = (questionId) => {
        setFlagged((current) => {
            const next = new Set(current);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const scrollToQuestion = (questionId) => {
        questionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (result) {
        const passed = Boolean(result.passed);
        const reviews = Array.isArray(result.answer_review) ? result.answer_review : [];

        return (
            <>
                <Head title={`Hasil ${quiz.title || 'Ujian Mingguan'}`} />
                <main className="min-h-screen bg-[#f3f5f7] px-4 py-8 text-gray-900 sm:px-6 lg:py-12">
                    <div className="mx-auto max-w-4xl">
                        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className={`h-2 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className="p-5 sm:p-8">
                                <div className="flex flex-col gap-5 border-b border-gray-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase text-gray-500">Hasil ujian mingguan</p>
                                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{quiz.title || 'Ujian Mingguan'}</h1>
                                        <p className="mt-2 text-sm text-gray-600">{result.message}</p>
                                    </div>
                                    <div className={`min-w-32 rounded-lg border px-5 py-4 text-center ${passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                        <p className="text-xs font-bold uppercase text-gray-500">Nilai akhir</p>
                                        <p className={`mt-1 text-4xl font-bold ${passed ? 'text-emerald-700' : 'text-red-700'}`}>{result.score}</p>
                                        <p className="mt-1 text-xs font-semibold text-gray-600">{passed ? 'Lulus' : 'Belum lulus'}</p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {[
                                        ['Terjawab', `${result.answered_count ?? answeredCount}/${result.total_questions ?? questions.length}`],
                                        ['Batas lulus', `${result.passing_score ?? quiz.passing_score ?? 70}%`],
                                        ['Status', passed ? 'Lulus' : 'Belum lulus'],
                                        ['Waktu', result.finished_by_timeout ? 'Waktu habis' : 'Dikirim'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <p className="text-xs text-gray-500">{label}</p>
                                            <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 space-y-4">
                                    <h2 className="text-lg font-bold">Tinjauan jawaban</h2>
                                    {reviews.map((review, index) => (
                                        <article key={review.question_id} className={`rounded-lg border p-4 sm:p-5 ${review.is_correct ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                            <div className="flex items-start gap-3">
                                                {review.is_correct
                                                    ? <CheckCircleOutlineIcon className="mt-0.5 text-emerald-600" />
                                                    : <ErrorOutlineIcon className="mt-0.5 text-red-600" />}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-xs font-bold uppercase text-gray-500">Soal {index + 1}</p>
                                                        <p className="text-xs font-bold text-gray-600">{review.earned_points}/{review.max_points} poin</p>
                                                    </div>
                                                    <JapaneseReading japanese={review.question} reading={review.question_reading} className="mt-2 font-semibold text-gray-900" />
                                                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                                        <div>
                                                            <dt className="text-xs font-bold uppercase text-gray-500">Jawaban Anda</dt>
                                                            <dd className="mt-1 text-gray-800">{review.user_answer || 'Tidak dijawab'}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-xs font-bold uppercase text-gray-500">Jawaban benar</dt>
                                                            <dd className="mt-1 font-semibold text-gray-900">
                                                                <JapaneseReading japanese={review.correct_answer} reading={review.correct_answer_reading} />
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    {review.explanation && (
                                                        <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-600">
                                                            <JapaneseReading japanese={review.explanation} reading={review.explanation_reading} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    {!passed && (
                                        <button
                                            type="button"
                                            onClick={() => window.location.reload()}
                                            className="h-11 rounded-md border border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                                        >
                                            Kerjakan ulang
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => router.get(result.next_url || finish_url || back_url || route('user.kelas.index'))}
                                        className="h-11 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
                                    >
                                        Kembali ke roadmap
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Head title={quiz.title || 'Ujian Mingguan'} />
            <div className="min-h-screen bg-surface-muted text-gray-900">
                <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
                    <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-6">
                        <button
                            type="button"
                            onClick={() => router.get(back_url || route('user.kelas.index'))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                            title="Kembali ke roadmap"
                        >
                            <ArrowBackIcon fontSize="small" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold uppercase text-brand-700">Ujian Mingguan</p>
                            <h1 className="truncate text-sm font-bold sm:text-base">{quiz.title || 'Ujian Mingguan'}</h1>
                        </div>
                        <div className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold ${hasTimeLimit && secondsLeft <= 60 ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                            <AccessTimeOutlinedIcon sx={{ fontSize: 18 }} />
                            <span>{hasTimeLimit ? formatTime(secondsLeft) : 'Tanpa batas'}</span>
                        </div>
                    </div>
                </header>

                <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:py-8">
                    <div className="min-w-0">
                        <section className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                    <MenuBookOutlinedIcon />
                                </div>
                                <div>
                                    <h2 className="font-bold">{quiz.module?.title || quiz.lesson?.title || 'Materi Mingguan'}</h2>
                                    <p className="mt-1 text-sm leading-6 text-gray-600">
                                        Jawab seluruh soal dengan teliti. Anda dapat menandai soal untuk diperiksa kembali sebelum mengirim.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 text-sm sm:grid-cols-4">
                                <div><span className="block text-xs text-gray-500">Jumlah soal</span><strong>{questions.length}</strong></div>
                                <div><span className="block text-xs text-gray-500">Total bobot</span><strong>{total_points || questions.reduce((sum, item) => sum + Number(item.points || 1), 0)}</strong></div>
                                <div><span className="block text-xs text-gray-500">Nilai lulus</span><strong>{quiz.passing_score ?? 70}%</strong></div>
                                <div><span className="block text-xs text-gray-500">Draft</span><strong>{draftSavedAt ? 'Tersimpan' : 'Menunggu jawaban'}</strong></div>
                            </div>
                        </section>

                        {attemptError && (
                            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                                {attemptError}
                            </div>
                        )}

                        {attemptStarting ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
                                <p className="mt-3 text-sm font-semibold text-gray-600">Menyiapkan sesi ujian...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {questions.map((question, index) => {
                                    const isFlagged = flagged.has(question.id);
                                    const hasAnswer = answered(answers[question.id]);

                                    return (
                                        <article
                                            key={question.id}
                                            ref={(element) => { questionRefs.current[question.id] = element; }}
                                            className={`scroll-mt-24 rounded-lg border bg-white shadow-sm ${isFlagged ? 'border-amber-300' : 'border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-gray-900 px-2 text-sm font-bold text-white">{index + 1}</span>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-gray-500">
                                                            {question.type === 'listening' ? 'Listening' : question.type === 'fill_blank' ? 'Isian' : 'Pilihan Ganda'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{question.points || 1} poin</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFlag(question.id)}
                                                    className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold ${isFlagged ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <FlagOutlinedIcon sx={{ fontSize: 16 }} />
                                                    <span className="hidden sm:inline">{isFlagged ? 'Ditandai' : 'Tandai'}</span>
                                                </button>
                                            </div>
                                            <div className="p-4 sm:p-6">
                                                {question.type === 'listening' && question.audio_url && (
                                                    <audio controls className="mb-5 w-full" src={question.audio_url} />
                                                )}
                                                <JapaneseReading japanese={question.question} reading={question.question_reading} className="whitespace-pre-wrap text-base font-semibold leading-7 text-gray-900 sm:text-lg" />

                                                {question.type === 'multiple_choice' ? (
                                                    <div className="mt-5 grid gap-3">
                                                        {(question.options || []).map((option, optionIndex) => (
                                                            <label
                                                                key={`${question.id}-${optionIndex}`}
                                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${answers[question.id] === option ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`question-${question.id}`}
                                                                    value={option}
                                                                    checked={answers[question.id] === option}
                                                                    onChange={() => updateAnswer(question.id, option)}
                                                                    className="mt-1 border-gray-300 text-brand-600 focus:ring-focus"
                                                                />
                                                                <span className="text-sm leading-6 text-gray-800">
                                                                    <strong className="mr-2">{String.fromCharCode(65 + optionIndex)}.</strong>
                                                                    <JapaneseReading japanese={option} reading={question.option_readings?.[optionIndex]} />
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="mt-5">
                                                        <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Jawaban Anda</label>
                                                        <input
                                                            type="text"
                                                            value={answers[question.id] || ''}
                                                            onChange={(event) => updateAnswer(question.id, event.target.value)}
                                                            className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 focus:border-focus focus:ring-focus"
                                                            placeholder="Ketik jawaban"
                                                        />
                                                    </div>
                                                )}

                                                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                                                    <span>{hasAnswer ? 'Sudah dijawab' : 'Belum dijawab'}</span>
                                                    {index < questions.length - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => scrollToQuestion(questions[index + 1].id)}
                                                            className="font-bold text-brand-700 hover:text-brand-800"
                                                        >
                                                            Soal berikutnya
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {!attemptStarting && (
                            <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-5">
                                <div>
                                    <p className="text-sm font-bold">{answeredCount} dari {questions.length} soal terjawab</p>
                                    <p className="mt-1 text-xs text-gray-500">{flagged.size} soal ditandai untuk ditinjau.</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={!attemptSession || submitting || questions.length === 0}
                                    onClick={() => setShowSubmitDialog(true)}
                                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto"
                                >
                                    <SendOutlinedIcon sx={{ fontSize: 18 }} />
                                    {submitting ? 'Mengirim...' : 'Periksa dan kirim'}
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-bold">Navigasi soal</h2>
                            <div className="mt-4 grid grid-cols-5 gap-2">
                                {questions.map((question, index) => {
                                    const hasAnswer = answered(answers[question.id]);
                                    const isFlagged = flagged.has(question.id);

                                    return (
                                        <button
                                            key={question.id}
                                            type="button"
                                            onClick={() => scrollToQuestion(question.id)}
                                            className={`relative flex h-9 items-center justify-center rounded-md border text-xs font-bold ${
                                                hasAnswer
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-300 bg-white text-gray-600'
                                            }`}
                                            title={`Soal ${index + 1}`}
                                        >
                                            {index + 1}
                                            {isFlagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-xs text-gray-600">
                                <div className="flex items-center justify-between"><span>Terjawab</span><strong>{answeredCount}</strong></div>
                                <div className="flex items-center justify-between"><span>Belum dijawab</span><strong>{unansweredCount}</strong></div>
                                <div className="flex items-center justify-between"><span>Ditandai</span><strong>{flagged.size}</strong></div>
                            </div>
                        </div>
                    </aside>
                </main>

                <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden">
                    <div className="mx-auto flex max-w-7xl items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold">{answeredCount}/{questions.length} terjawab</p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                                <div className="h-full bg-emerald-500" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!attemptSession || submitting || questions.length === 0}
                            onClick={() => setShowSubmitDialog(true)}
                            className="h-10 rounded-lg bg-brand-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                        >
                            Kirim
                        </button>
                    </div>
                </div>
            </div>

            {showSubmitDialog && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
                    <div className="w-full rounded-t-xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-lg sm:p-6">
                        <h2 className="text-lg font-bold">Kirim jawaban ujian?</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Setelah dikirim, jawaban pada attempt ini tidak dapat diubah.
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                ['Terjawab', answeredCount],
                                ['Kosong', unansweredCount],
                                ['Ditandai', flagged.size],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-center">
                                    <p className="text-lg font-bold">{value}</p>
                                    <p className="text-xs text-gray-500">{label}</p>
                                </div>
                            ))}
                        </div>
                        {unansweredCount > 0 && (
                            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                                Masih ada {unansweredCount} soal yang belum dijawab.
                            </p>
                        )}
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSubmitDialog(false)}
                                className="h-11 flex-1 rounded-md border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Periksa lagi
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => submitAttempt({ timeout: false })}
                                className="h-11 flex-1 rounded-lg bg-brand-600 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                                {submitting ? 'Mengirim...' : 'Kirim ujian'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
