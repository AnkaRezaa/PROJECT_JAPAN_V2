import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import SchoolIcon from '@mui/icons-material/School';
import KanjiHandwritingCanvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';

const normalizeType = (type) => {
    if (type === 'fill_blank' || type === 'typing') return 'fill_blank';
    if (type === 'listening') return 'listening';
    if (type === 'handwriting') return 'handwriting';
    return 'multiple_choice';
};

const choicesFor = (question) => {
    if (Array.isArray(question?.options)) return question.options;
    if (Array.isArray(question?.options?.choices)) return question.options.choices;
    return [];
};

export default function QuickKuis({ quickSession, backUrl, answerUrl, resetUrl }) {
    const prefersReducedMotion = useReducedMotion();
    const [session, setSession] = useState(quickSession);
    const [answer, setAnswer] = useState('');
    const [handwritingPayload, setHandwritingPayload] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const question = session.current_question;
    const type = normalizeType(question?.type);
    const choices = useMemo(() => choicesFor(question), [question]);
    const progress = session.target_count > 0
        ? Math.round((session.resolved_count / session.target_count) * 100)
        : 0;

    useEffect(() => {
        setAnswer('');
        setHandwritingPayload(null);
        setFeedback(null);
        setError(null);
    }, [question?.id, session.current_token]);

    const submitAnswer = async (selectedAnswer = answer) => {
        if (submitting || feedback || !question) return;

        if (type !== 'handwriting' && String(selectedAnswer).trim() === '') {
            setError('Pilih atau tulis jawaban terlebih dahulu.');
            return;
        }

        if (type === 'handwriting' && !handwritingPayload) {
            setError('Selesaikan tulisan, lalu periksa jawaban.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await axios.post(answerUrl, {
                item_token: session.current_token,
                answer: type === 'handwriting' ? question.character : String(selectedAnswer),
                answer_payload: type === 'handwriting' ? handwritingPayload : null,
            });

            setFeedback(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Jawaban belum dapat diperiksa. Coba sekali lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const continueSession = () => {
        if (!feedback?.session) return;
        setSession(feedback.session);
    };

    if (session.completed) {
        return (
            <div className="min-h-[100dvh] bg-[#f7f4ef] px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-white sm:py-12">
                <Head title="Quick Kuis Selesai" />
                <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-2xl items-center justify-center">
                    <section className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 sm:p-10">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircleIcon sx={{ fontSize: 36 }} />
                        </div>
                        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Sesi selesai</p>
                        <h1 className="mt-2 text-center text-2xl font-black sm:text-3xl">Latihan hari ini sudah tercatat</h1>
                        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Materi yang belum kuat akan diprioritaskan lagi pada Quick Kuis berikutnya.
                        </p>
                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{session.mastered_count}</p>
                                <p className="mt-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">Dikuasai</p>
                            </div>
                            <div className="rounded-2xl bg-amber-50 p-4 text-center dark:bg-amber-950/30">
                                <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{session.review_count}</p>
                                <p className="mt-1 text-xs font-bold text-amber-800 dark:text-amber-200">Perlu diulang</p>
                            </div>
                        </div>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link href={backUrl} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-gray-300 px-5 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                                Kembali ke dashboard
                            </Link>
                    <button type="button" onClick={() => router.post(resetUrl)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-action-primary px-5 text-sm font-black text-ink-900 transition hover:bg-action-primary-hover">
                                <ReplayIcon fontSize="small" /> Mulai sesi baru
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#f7f4ef] text-gray-900 transition-colors dark:bg-gray-950 dark:text-white">
            <Head title={`Quick Kuis - ${session.resolved_count + 1}/${session.target_count}`} />
            <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
                <div className="mx-auto flex max-w-4xl items-center gap-3">
                    <Link href={backUrl} aria-label="Keluar dan lanjutkan nanti" title="Keluar dan lanjutkan nanti" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-200/70 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white">
                        <CloseIcon />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-xs font-black text-gray-600 dark:text-gray-300">
                            <span>Materi ditinjau {session.resolved_count} dari {session.target_count}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <motion.div className="h-full rounded-full bg-progress-active" animate={{ width: `${progress}%` }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35 }} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
                <AnimatePresence mode="wait">
                    <motion.section key={`${question.id}-${session.current_token}`} initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={prefersReducedMotion ? {} : { opacity: 0, x: -24 }} className="mx-auto w-full max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                                <SchoolIcon sx={{ fontSize: 16 }} /> {question.source.program}
                            </span>
                            <span>Minggu {question.source.week}{question.source.day ? ` · Hari ${question.source.day}` : ''}</span>
                            {question.attempt_number > 1 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">Penguatan</span>}
                        </div>

                        <h1 className="mt-6 break-words text-2xl font-black leading-tight sm:text-3xl">
                            <JapaneseReading japanese={question.question} reading={question.question_reading} />
                        </h1>
                        {question.source.day_title && <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{question.source.day_title}</p>}

                        {(type === 'listening' || question.audio_url) && (
                            <div className="mt-6 flex justify-center rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                                <JapaneseSpeechButton audioUrl={question.audio_url} text={question.question} autoPlay={type === 'listening'} autoPlayEnabled playbackKey={`quick-${question.id}-${session.current_token}`} className="flex h-14 w-14 items-center justify-center rounded-full bg-action-secondary text-white shadow-md" />
                            </div>
                        )}

                        <div className="mt-7">
                            {type === 'handwriting' ? (
                                <div className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                                    <p className="mb-4 text-center text-5xl font-black">{question.character}</p>
                                    <KanjiHandwritingCanvas key={`${question.id}-${session.current_token}`} character={question.character} mode="quiz" onChange={setHandwritingPayload} onComplete={setHandwritingPayload} />
                                    <button type="button" disabled={submitting || feedback} onClick={() => submitAnswer()} className="mt-5 min-h-12 w-full rounded-2xl bg-action-primary px-5 text-sm font-black text-ink-900 transition hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                                        {submitting ? 'Memeriksa...' : 'Periksa tulisan'}
                                    </button>
                                </div>
                            ) : type === 'multiple_choice' && choices.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {choices.map((choice, index) => (
                                        <button key={`${choice}-${index}`} type="button" disabled={submitting || feedback} onClick={() => { setAnswer(String(choice)); submitAnswer(String(choice)); }} className="min-h-14 rounded-2xl border-2 border-gray-200 bg-white px-5 py-4 text-left text-sm font-black text-gray-800 shadow-[0_3px_0_#e5e7eb] transition hover:border-learning-300 hover:bg-learning-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-learning-300/50 disabled:cursor-default dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:shadow-[0_3px_0_#374151] dark:hover:border-learning-600 dark:hover:bg-learning-950/30 sm:text-base">
                                            <JapaneseReading japanese={choice} reading={question.option_readings?.[index]} />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <form onSubmit={(event) => { event.preventDefault(); submitAnswer(); }} className="space-y-4">
                                    <input autoFocus type="text" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={submitting || feedback} placeholder={type === 'listening' ? 'Ketik jawaban dari audio...' : 'Ketik jawaban...'} className="min-h-14 w-full rounded-2xl border-2 border-gray-200 bg-white px-5 text-center text-lg font-black text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                                    <button type="submit" disabled={submitting || feedback || !answer.trim()} className="min-h-12 w-full rounded-2xl bg-action-primary px-5 text-sm font-black text-ink-900 transition hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                                        {submitting ? 'Memeriksa...' : 'Periksa jawaban'}
                                    </button>
                                </form>
                            )}
                        </div>

                        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
                    </motion.section>
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {feedback && (
                    <motion.aside initial={prefersReducedMotion ? false : { y: '100%' }} animate={{ y: 0 }} exit={prefersReducedMotion ? {} : { y: '100%' }} role="status" aria-live="polite" className={`fixed inset-x-0 bottom-0 z-40 border-t-2 ${feedback.is_correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
                        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div>
                                <p className={`text-lg font-black ${feedback.is_correct ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>{feedback.is_correct ? 'Benar' : 'Belum tepat'}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{feedback.message}</p>
                                {!feedback.is_correct && feedback.correct_answer && <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">Jawaban: {feedback.correct_answer}</p>}
                                {feedback.explanation && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{feedback.explanation}</p>}
                            </div>
                            <button type="button" onClick={continueSession} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white ${feedback.is_correct ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'}`}>
                                Lanjutkan <ArrowForwardIcon fontSize="small" />
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}
