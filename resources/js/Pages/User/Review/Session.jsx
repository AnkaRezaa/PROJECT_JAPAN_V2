import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UndoIcon from '@mui/icons-material/Undo';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ReplayIcon from '@mui/icons-material/Replay';
import SchoolIcon from '@mui/icons-material/School';
import KanjiHandwritingCanvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';

const choicesFor = (item) => Array.isArray(item?.options)
    ? item.options
    : (Array.isArray(item?.options?.choices) ? item.options.choices : []);

const normalizeType = (type) => ['fill_blank', 'typing'].includes(type) ? 'fill_blank' : (type || 'multiple_choice');

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function ReviewSession({ reviewSession, backUrl, answerUrl, skipUrl, undoUrl, resetUrl, feedbackUrl }) {
    const prefersReducedMotion = useReducedMotion();
    const [session, setSession] = useState(reviewSession);
    const [answer, setAnswer] = useState('');
    const [handwritingPayload, setHandwritingPayload] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [definitionOpen, setDefinitionOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportText, setReportText] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const menuRef = useRef(null);
    const item = session.current_item;
    const choices = useMemo(() => choicesFor(item), [item]);
    const progress = session.target_count > 0 ? Math.round((session.resolved_count / session.target_count) * 100) : 0;
    const type = normalizeType(item?.type);

    useEffect(() => {
        const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setAnswer('');
        setHandwritingPayload(null);
        setFeedback(null);
        setError(null);
        setDefinitionOpen(false);
        setMenuOpen(false);
    }, [item?.key, session.current_token]);

    useEffect(() => {
        const close = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const submit = async (selectedAnswer = answer, payload = handwritingPayload) => {
        if (submitting || feedback || !item) return;

        if (item.kind === 'question' && type !== 'handwriting' && !String(selectedAnswer).trim()) {
            setError('Pilih atau tulis jawaban terlebih dahulu.');
            return;
        }
        if (item.kind === 'writing' && !payload) {
            setError('Selesaikan tulisan, lalu periksa hasilnya.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const response = await axios.post(answerUrl, {
                item_token: session.current_token,
                answer: selectedAnswer,
                answer_payload: payload ? { ...payload, duration_ms: elapsed * 1000 } : { duration_ms: elapsed * 1000 },
            });
            setFeedback(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Jawaban belum dapat disimpan. Coba sekali lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const skip = async () => {
        if (submitting || !item) return;
        setSubmitting(true);
        setMenuOpen(false);
        try {
            const response = await axios.post(skipUrl, { item_token: session.current_token });
            setFeedback({ result: 'skipped', message: 'Materi dilewati tanpa mengubah progres.', session: response.data.session });
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Materi belum dapat dilewati.');
        } finally {
            setSubmitting(false);
        }
    };

    const undo = async () => {
        if (submitting || !session.can_undo) return;
        setSubmitting(true);
        setMenuOpen(false);
        try {
            const response = await axios.post(undoUrl);
            setSession(response.data.session);
            setFeedback(null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Jawaban terakhir tidak dapat dibatalkan.');
        } finally {
            setSubmitting(false);
        }
    };

    const report = async (event) => {
        event.preventDefault();
        if (reportText.trim().length < 10) return;
        setSubmitting(true);
        try {
            await axios.post(feedbackUrl, {
                category: 'content',
                message: `[Review ${item.source_type} #${item.id}, ${item.skill}] ${reportText.trim()}`,
                page_url: window.location.pathname,
            });
            setReportOpen(false);
            setReportText('');
            setMenuOpen(false);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Laporan belum dapat dikirim.');
        } finally {
            setSubmitting(false);
        }
    };

    if (session.completed) {
        return (
            <div className="min-h-[100dvh] bg-[#f6f8f5] px-4 py-8 text-gray-950 dark:bg-gray-950 dark:text-white">
                <Head title="Review Selesai" />
                <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center">
                    <section className="w-full border-y border-gray-200 bg-white px-5 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-2xl sm:border sm:px-10">
                        <CheckCircleIcon className="text-emerald-600" sx={{ fontSize: 54 }} />
                        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Sesi selesai</p>
                        <h1 className="mt-2 text-2xl font-black">Review hari ini tercatat</h1>
                        <div className="mt-7 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200 py-4 dark:divide-gray-700 dark:border-gray-700">
                            <div><p className="text-2xl font-black text-emerald-600">{session.correct_count}</p><p className="text-xs font-bold text-gray-500">Benar</p></div>
                            <div><p className="text-2xl font-black text-red-600">{session.wrong_count}</p><p className="text-xs font-bold text-gray-500">Salah</p></div>
                            <div><p className="text-2xl font-black text-gray-500">{session.skipped_count}</p><p className="text-xs font-bold text-gray-500">Dilewati</p></div>
                        </div>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link href={backUrl} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Lihat riwayat</Link>
                            <button type="button" onClick={() => router.post(resetUrl)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"><ReplayIcon fontSize="small" /> Sesi baru</button>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#f6f8f5] text-gray-950 dark:bg-gray-950 dark:text-white">
            <Head title={`Review ${session.resolved_count + 1}/${session.target_count}`} />
            <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-[#f6f8f5]/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
                <div className="mx-auto flex max-w-4xl items-center gap-3">
                    <Link href={backUrl} aria-label="Keluar dan lanjutkan nanti" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-200/70 dark:hover:bg-gray-800"><CloseIcon /></Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 text-xs font-black text-gray-600 dark:text-gray-300"><span>{session.resolved_count}/{session.target_count}</span><span>{progress}%</span></div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><motion.div className="h-full rounded-full bg-emerald-500" animate={{ width: `${progress}%` }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }} /></div>
                    </div>
                    <div ref={menuRef} className="relative">
                        <button type="button" aria-label="Opsi Review" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"><MoreVertIcon /></button>
                        {menuOpen && (
                            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                <button type="button" disabled={!session.can_undo || submitting} onClick={undo} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"><UndoIcon fontSize="small" /> Batalkan jawaban terakhir</button>
                                <button type="button" onClick={() => { setReportOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800"><FlagOutlinedIcon fontSize="small" /> Laporkan materi salah</button>
                                <button type="button" onClick={() => { setDefinitionOpen((open) => !open); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800"><VisibilityOutlinedIcon fontSize="small" /> {definitionOpen ? 'Sembunyikan definisi' : 'Tampilkan definisi'}</button>
                                <button type="button" disabled={submitting || Boolean(feedback)} onClick={skip} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"><SkipNextIcon fontSize="small" /> Lewati item</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-4xl px-4 pb-40 pt-5 sm:px-6 sm:pt-8">
                <AnimatePresence mode="wait">
                    <motion.section key={`${item.key}-${session.current_token}`} initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={prefersReducedMotion ? {} : { opacity: 0, x: -18 }} className="mx-auto max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{item.state_label}</span>
                            {item.source?.program && <span className="inline-flex items-center gap-1.5"><SchoolIcon sx={{ fontSize: 16 }} /> {item.source.program}</span>}
                            {item.source?.week && <span>Minggu {item.source.week}{item.source.day ? ` · Hari ${item.source.day}` : ''}</span>}
                        </div>

                        {item.kind === 'question' && (
                            <QuestionItem item={item} type={type} choices={choices} answer={answer} setAnswer={setAnswer} submit={submit} submitting={submitting} feedback={feedback} />
                        )}
                        {item.kind === 'flashcard' && (
                            <FlashcardItem item={item} submit={submit} submitting={submitting} feedback={feedback} definitionOpen={definitionOpen} />
                        )}
                        {item.kind === 'writing' && (
                            <WritingItem item={item} payload={handwritingPayload} setPayload={setHandwritingPayload} submit={submit} submitting={submitting} feedback={feedback} />
                        )}

                        {definitionOpen && item.definition && item.kind !== 'flashcard' && <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-900 dark:border-sky-900 dark:bg-sky-950/35 dark:text-sky-100"><span className="font-black">Definisi:</span> {item.definition}</div>}
                        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
                    </motion.section>
                </AnimatePresence>
            </main>

            <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                <div className="mx-auto flex max-w-4xl items-center justify-around gap-3 text-center">
                    <div><p className="text-[11px] font-bold text-gray-500">Waktu</p><p className="text-sm font-black">{formatTime(elapsed)}</p></div>
                    <div><p className="text-[11px] font-bold text-gray-500">Review</p><p className="text-sm font-black">{session.correct_count + session.wrong_count + session.skipped_count}</p></div>
                    <div><p className="text-[11px] font-bold text-gray-500">Status</p><p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{item.state_label}</p></div>
                </div>
            </footer>

            <AnimatePresence>{feedback && <FeedbackPanel feedback={feedback} onContinue={() => setSession(feedback.session)} />}</AnimatePresence>

            {reportOpen && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/45 sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && setReportOpen(false)}>
                    <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
                        <h2 id="report-title" className="text-lg font-black">Laporkan materi</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Jelaskan istilah, jawaban, atau definisi yang perlu diperiksa admin.</p>
                        <form onSubmit={report} className="mt-4">
                            <textarea autoFocus rows={4} maxLength={3000} value={reportText} onChange={(event) => setReportText(event.target.value)} className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-950" placeholder="Contoh: arti kata ini tidak sesuai dengan contoh kalimat..." />
                            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-black text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button><button disabled={submitting || reportText.trim().length < 10} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">Kirim laporan</button></div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

function QuestionItem({ item, type, choices, answer, setAnswer, submit, submitting, feedback }) {
    return <div className="mt-6">
        <h1 className="break-words text-2xl font-black leading-tight sm:text-3xl"><JapaneseReading japanese={item.question} reading={item.question_reading} /></h1>
        {(type === 'listening' || item.audio_url) && <div className="mt-6 flex justify-center"><JapaneseSpeechButton audioUrl={item.audio_url} text={item.question} autoPlay={type === 'listening'} autoPlayEnabled playbackKey={`review-${item.key}`} className="grid h-14 w-14 place-items-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200" /></div>}
        {type === 'multiple_choice' && choices.length > 0 ? <div className="mt-7 grid gap-3 sm:grid-cols-2">{choices.map((choice, index) => <button key={`${choice}-${index}`} type="button" disabled={submitting || feedback} onClick={() => submit(String(choice))} className="min-h-14 rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-left text-sm font-black shadow-[0_3px_0_#e5e7eb] transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-default dark:border-gray-700 dark:bg-gray-900 dark:shadow-[0_3px_0_#374151] dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"><JapaneseReading japanese={choice} reading={item.option_readings?.[index]} /></button>)}</div> : <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="mt-7 space-y-4"><input autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={submitting || feedback} className="min-h-14 w-full rounded-xl border-2 border-gray-200 bg-white px-5 text-center text-lg font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-300/30 dark:border-gray-700 dark:bg-gray-900" placeholder={type === 'listening' ? 'Ketik jawaban dari audio...' : 'Ketik jawaban...'} /><button disabled={submitting || feedback || !answer.trim()} className="min-h-12 w-full rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">{submitting ? 'Memeriksa...' : 'Periksa jawaban'}</button></form>}
    </div>;
}

function FlashcardItem({ item, submit, submitting, feedback, definitionOpen }) {
    return <div className="mt-6 text-center">
        <p className="text-4xl font-black sm:text-6xl"><JapaneseReading japanese={item.front_text} reading={item.reading} /></p>
        <JapaneseSpeechButton audioUrl={item.audio_url} text={item.front_text} autoPlay autoPlayEnabled playbackKey={`review-card-${item.id}`} className="mx-auto mt-5 grid h-12 w-12 place-items-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200" />
        {definitionOpen && <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5 text-left dark:border-sky-900 dark:bg-sky-950/35"><p className="text-lg font-black text-sky-950 dark:text-sky-100">{item.meaning || 'Definisi belum tersedia'}</p>{item.example_sentence && <p className="mt-3 text-sm font-bold">{item.example_sentence}</p>}{item.example_meaning && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.example_meaning}</p>}</div>}
        <div className="mt-8 grid grid-cols-2 gap-3"><button type="button" disabled={submitting || feedback} onClick={() => submit('learning')} className="min-h-14 rounded-xl bg-red-600 px-4 text-sm font-black text-white shadow-[0_4px_0_#991b1b] hover:bg-red-500 disabled:opacity-50">Belum ingat</button><button type="button" disabled={submitting || feedback} onClick={() => submit('known')} className="min-h-14 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_4px_0_#047857] hover:bg-emerald-500 disabled:opacity-50">Sudah ingat</button></div>
    </div>;
}

function WritingItem({ item, payload, setPayload, submit, submitting, feedback }) {
    return <div className="mt-6"><div className="text-center"><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">Latihan menulis</p><h1 className="mt-2 text-3xl font-black">Tulis {item.character}</h1>{item.meaning && <p className="mt-1 text-sm font-semibold text-gray-500">{item.meaning}</p>}</div><div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6"><KanjiHandwritingCanvas key={item.key} character={item.character} mode="quiz" onChange={setPayload} onComplete={setPayload} /><button type="button" disabled={submitting || feedback || !payload} onClick={() => submit(item.character, payload)} className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 px-5 text-sm font-black text-gray-950 hover:bg-amber-300 disabled:opacity-50">{submitting ? 'Memeriksa...' : 'Periksa tulisan'}</button></div></div>;
}

function FeedbackPanel({ feedback, onContinue }) {
    const skipped = feedback.result === 'skipped';
    const correct = feedback.is_correct;
    const tone = skipped ? 'border-gray-400 bg-gray-100 dark:bg-gray-800' : (correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-red-500 bg-red-50 dark:bg-red-950');
    const title = skipped ? 'Dilewati' : (correct ? 'Benar' : 'Belum tepat');
    return <motion.aside initial={{ y: '100%' }} animate={{ y: 0 }} role="status" aria-live="polite" className={`fixed inset-x-0 bottom-0 z-50 border-t-2 ${tone}`}><div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-lg font-black">{title}</p><p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{feedback.message}</p>{!correct && !skipped && feedback.correct_answer && <p className="mt-1 text-sm font-black">Jawaban: {feedback.correct_answer}</p>}{feedback.explanation && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{feedback.explanation}</p>}</div><button type="button" onClick={onContinue} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black ${skipped ? 'bg-gray-700 text-white hover:bg-gray-800' : correct ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-red-700 text-white hover:bg-red-800'}`}>Lanjutkan <ArrowForwardIcon fontSize="small" /></button></div></motion.aside>;
}
