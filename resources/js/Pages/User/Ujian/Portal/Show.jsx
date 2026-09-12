import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import WifiRoundedIcon from '@mui/icons-material/WifiRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import ExamResultView from '@/Components/Features/ExamPortal/ExamResultView';

const sectionDescriptions = {
    vocabulary: 'Pengenalan huruf, penggunaan kosakata, dan pemahaman makna.',
    grammar_reading: 'Pola kalimat, tata bahasa, dan pemahaman bacaan.',
    listening: 'Pemahaman informasi dan percakapan melalui audio.',
};

const uuid = () => window.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });

const formatTime = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const remainder = safe % 60;

    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const LoadingSpinner = () => <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;

function StandaloneExamRunner({ initialAttempt, onExit, startTokenKey }) {
    const [attempt, setAttempt] = useState(() => ({
        ...initialAttempt,
        server_revision: Number(initialAttempt.server_revision ?? 0),
    }));
    const [answers, setAnswers] = useState(() => Object.fromEntries(
        initialAttempt.sections.flatMap((section) => section.questions)
            .filter((question) => question.answer?.answer_text)
            .map((question) => [question.id, question.answer.answer_text]),
    ));
    const [builderParts, setBuilderParts] = useState({});
    const [flagged, setFlagged] = useState(() => new Set(
        initialAttempt.sections.flatMap((section) => section.questions)
            .filter((question) => question.answer?.flagged)
            .map((question) => question.id),
    ));
    const [current, setCurrent] = useState(0);
    const [remaining, setRemaining] = useState(initialAttempt.remaining_seconds);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const savePromiseRef = useRef(null);
    const hasSubmittedRef = useRef(false);
    const questions = useMemo(() => initialAttempt.sections.flatMap((section) => (
        section.questions.map((question) => ({ ...question, sectionTitle: section.title }))
    )), [initialAttempt.sections]);
    const question = questions[current];

    useEffect(() => {
        if (result || remaining <= 0) return undefined;
        const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [remaining, result]);

    const answerRows = () => questions
        .filter((item) => answers[item.id] !== undefined || flagged.has(item.id))
        .map((item) => ({ question_id: item.id, answer_text: answers[item.id] ?? null, flagged: flagged.has(item.id) }));

    const save = async () => {
        const rows = answerRows();
        if (rows.length === 0) return;
        if (savePromiseRef.current) return savePromiseRef.current;

        savePromiseRef.current = (async () => {
            try {
                const response = await window.axios.put(route('user.exam-attempts.answers', attempt.id), {
                    autosave_token: uuid(), client_revision: Number(attempt.server_revision ?? 0), answers: rows,
                });
                setAttempt((value) => ({ ...value, server_revision: Number(response.data.server_revision ?? value.server_revision) }));
                if (response.data.remaining_seconds !== undefined) {
                    setRemaining(response.data.remaining_seconds);
                }
            } catch (requestError) {
                if (requestError.response?.status === 409) {
                    const syncRes = await window.axios.get(route('user.exam-attempts.show', attempt.id)).catch(() => null);
                    if (syncRes?.data?.attempt) {
                        setAttempt((value) => ({ ...value, server_revision: Number(syncRes.data.attempt.server_revision ?? 0) }));
                    }
                } else {
                    throw requestError;
                }
            } finally {
                savePromiseRef.current = null;
            }
        })();
        return savePromiseRef.current;
    };

    const move = async (next) => {
        setBusy(true); setError('');
        try {
            await save();
            setCurrent(Math.max(0, Math.min(questions.length - 1, next)));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Jawaban belum dapat disimpan.');
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;
        setBusy(true); setError('');
        try {
            if (savePromiseRef.current) await savePromiseRef.current;
            else if (remaining > 0) await save();
            const response = await window.axios.post(route('user.exam-attempts.submit', attempt.id));
            window.localStorage.removeItem(startTokenKey);
            setResult(response.data.result || { pending: true });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (requestError) {
            hasSubmittedRef.current = false;
            setError(requestError.response?.data?.message || 'Ujian belum dapat dikirim.');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        if (remaining > 0 || result || busy) return;
        submit();
    }, [remaining, busy, result]);

    const toggleFlag = () => setFlagged((currentFlags) => {
        const next = new Set(currentFlags);
        if (next.has(question.id)) next.delete(question.id);
        else next.add(question.id);
        return next;
    });

    const chooseBuilderPart = (part) => {
        const parts = [...(builderParts[question.id] || []), part];
        setBuilderParts((value) => ({ ...value, [question.id]: parts }));
        setAnswers((value) => ({ ...value, [question.id]: parts.join('') }));
    };

    const resetBuilder = () => {
        setBuilderParts((value) => ({ ...value, [question.id]: [] }));
        setAnswers((value) => ({ ...value, [question.id]: '' }));
    };

    if (result) {
        return (
            <ExamPortalLayout>
                <Head title={`Hasil ${initialAttempt.exam.title}`} />
                <ExamResultView result={result} totalQuestions={questions.length} onExit={onExit} />
            </ExamPortalLayout>
        );
    }

    const optionQuestion = ['multiple_choice', 'listening', 'fill_blank'].includes(question.type) && question.options?.length > 0;
    const selectedParts = builderParts[question.id] || [];

    return <ExamPortalLayout><Head title={initialAttempt.exam.title} /><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe5df] pb-5 dark:border-white/10"><div><p className="text-xs font-black uppercase text-brand-700">{question.sectionTitle}</p><h1 className="mt-1 text-lg font-black">{initialAttempt.exam.title}</h1></div><div className={`rounded-md border px-4 py-2 font-mono text-sm font-black ${remaining <= 60 ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#142019]'}`}>{formatTime(remaining)}</div></header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]"><section className="border border-[#dbe5df] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#142019] sm:p-7">
            <div className="flex items-center justify-between gap-4"><p className="text-sm font-black text-gray-500">Soal {current + 1} dari {questions.length}</p><button type="button" onClick={toggleFlag} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black ${flagged.has(question.id) ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}><FlagOutlinedIcon fontSize="small" /> Tandai</button></div>
            {question.type === 'listening' && (
                <div className="mt-6 flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
                    <JapaneseSpeechButton
                        audioUrl={question.audio_path ? `/${question.audio_path.replace(/^\//, '')}` : null}
                        text={question.question_reading || question.question_text}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-md hover:bg-brand-700"
                    />
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {question.audio_path ? 'Audio Rekaman Dialog' : 'Narator Suara Otomatis'}
                        </p>
                        <p className="text-xs text-gray-500">Dengarkan audio percakapan soal.</p>
                    </div>
                </div>
            )}
            <p className="mt-6 text-lg font-bold leading-8">{question.question_text}</p>{question.question_reading && <p className="mt-2 text-sm text-gray-500">{question.question_reading}</p>}
            {optionQuestion && <div className="mt-6 grid gap-3">{question.options.map((option, index) => <label key={`${option}-${index}`} className={`flex cursor-pointer items-center gap-3 border p-4 text-sm font-semibold transition ${answers[question.id] === option ? 'border-brand-500 bg-brand-50 dark:border-green-700 dark:bg-green-950/30' : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'}`}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === option} onChange={() => setAnswers((value) => ({ ...value, [question.id]: option }))} className="text-brand-600 focus:ring-focus" /><span>{option}</span></label>)}</div>}
            {question.type === 'sentence_builder' && <div className="mt-6"><div className="min-h-16 border border-dashed border-brand-300 bg-brand-50/40 p-3 dark:border-green-800 dark:bg-green-950/20">{selectedParts.length ? <div className="flex flex-wrap gap-2">{selectedParts.map((part, index) => <span key={`${part}-${index}`} className="border border-brand-300 bg-white px-3 py-2 text-sm font-bold dark:border-green-800 dark:bg-[#142019]">{part}</span>)}</div> : <p className="text-sm text-gray-500">Pilih potongan sesuai urutan kalimat.</p>}</div><div className="mt-3 flex flex-wrap gap-2">{question.options.map((part, index) => <button key={`${part}-${index}`} type="button" disabled={selectedParts.includes(part)} onClick={() => chooseBuilderPart(part)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-[#111b16]">{part}</button>)}<button type="button" onClick={resetBuilder} className="rounded-md px-3 py-2 text-xs font-black text-rose-600">Ulangi susunan</button></div></div>}
            {!optionQuestion && question.type !== 'sentence_builder' && <input value={answers[question.id] || ''} onChange={(event) => setAnswers((value) => ({ ...value, [question.id]: event.target.value }))} className="mt-6 h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-sm focus:border-brand-500 focus:ring-focus dark:border-gray-700 dark:bg-[#111b16]" placeholder="Ketik jawaban" />}
            {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
            <div className="mt-7 flex items-center justify-between border-t border-gray-200 pt-5 dark:border-gray-700"><button type="button" disabled={busy || current === 0} onClick={() => move(current - 1)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black disabled:opacity-40 dark:border-gray-700">Sebelumnya</button>{current < questions.length - 1 ? <button type="button" disabled={busy} onClick={() => move(current + 1)} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-black text-white disabled:opacity-40">{busy && <LoadingSpinner />}{busy ? 'Menyimpan...' : 'Berikutnya'}</button> : <button type="button" disabled={busy} onClick={submit} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-black text-white disabled:opacity-40">{busy ? <LoadingSpinner /> : <SendOutlinedIcon fontSize="small" />} {busy ? 'Mengirim...' : 'Kirim ujian'}</button>}</div>
        </section><aside className="self-start border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] lg:sticky lg:top-24"><p className="text-xs font-black uppercase text-gray-500">Navigasi soal</p><div className="mt-3 grid grid-cols-5 gap-2">{questions.map((item, index) => <button key={item.id} type="button" onClick={() => setCurrent(index)} className={`grid h-9 place-items-center rounded-md border text-xs font-black ${index === current ? 'border-brand-600 bg-brand-600 text-white' : answers[item.id] ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200' : 'border-gray-200 dark:border-gray-700'}`}>{index + 1}</button>)}</div><p className="mt-4 text-xs leading-5 text-gray-500">{Object.keys(answers).filter((id) => answers[id]).length} dari {questions.length} soal dijawab.</p></aside></div>
    </main></ExamPortalLayout>;
}

export default function Show({ exam }) {
    const [checks, setChecks] = useState({ connection: false, device: false, audio: false, agreement: false });
    const [attempt, setAttempt] = useState(null);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState('');
    const needsAudio = exam.sections?.some((section) => section.key === 'listening');
    const allChecked = checks.connection && checks.device && (!needsAudio || checks.audio) && checks.agreement;
    const toggle = (key) => setChecks((current) => ({ ...current, [key]: !current[key] }));
    const isSimulation = exam.type === 'simulation';
    const startTokenKey = `toku-up-standalone-exam-${exam.id}-${exam.session_id}`;

    const startExam = async () => {
        setStarting(true);
        setStartError('');
        try {
            const submissionToken = window.localStorage.getItem(startTokenKey) || uuid();
            window.localStorage.setItem(startTokenKey, submissionToken);
            const response = await window.axios.post(route('user.exams.attempts.start', exam.slug), {
                session_id: exam.session_id,
                submission_token: submissionToken,
                mode: 'full',
                agreement_accepted: checks.agreement,
            });
            setAttempt(response.data.attempt);
        } catch (requestError) {
            setStartError(requestError.response?.data?.message || 'Sesi ujian tidak dapat dimulai.');
        } finally {
            setStarting(false);
        }
    };

    if (attempt) {
        return <StandaloneExamRunner initialAttempt={attempt} startTokenKey={startTokenKey} onExit={() => window.location.assign(route('user.exams.library'))} />;
    }

    return (
        <ExamPortalLayout>
            <Head title={exam.title} />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
                    <Link href={route('user.exams.library')} className="inline-flex items-center gap-2 text-sm font-black text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-green-300"><ArrowBackRoundedIcon sx={{ fontSize: 19 }} /> Kembali ke kumpulan ujian</Link>
                    <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${isSimulation ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>{isSimulation ? 'Simulasi JLPT' : 'Latihan Ujian'}</span><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">JLPT {exam.level}</span></div>
                            <h1 className="mt-4 text-2xl font-black leading-tight text-[#17231d] dark:text-white sm:text-3xl">{exam.title}</h1>
                            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">{exam.description}</p>
                        </div>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-gray-200 pt-5 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
                        <span className="inline-flex items-center gap-2"><AccessTimeRoundedIcon sx={{ fontSize: 19 }} /> <strong>{exam.duration_minutes} menit</strong></span>
                        <span className="inline-flex items-center gap-2"><QuizOutlinedIcon sx={{ fontSize: 19 }} /> <strong>{exam.question_count} soal</strong></span>
                        <span className="inline-flex items-center gap-2"><LayersOutlinedIcon sx={{ fontSize: 19 }} /> <strong>{exam.section_count} bagian</strong></span>
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-10">
                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-black">Bagian ujian</h2>
                        <div className="mt-4 space-y-3">
                            {exam.sections?.map((section, index) => (
                                <div key={section.key} className="flex gap-4 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:p-5">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e7f8ec] text-sm font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{index + 1}</span>
                                    <div><h3 className="font-black">{section.label}</h3><p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{sectionDescriptions[section.key]}</p></div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8 dark:border-white/10">
                        <h2 className="text-xl font-black">Ketentuan pengerjaan</h2>
                        <ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Waktu berjalan setelah sesi dimulai.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Jawaban terakhir dikirim saat waktu habis.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Soal dapat ditandai untuk diperiksa kembali.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Hasil simulasi tidak mengubah progres kelas.</li>
                        </ul>
                    </section>

                    {isSimulation && <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100"><h2 className="font-black">Tentang hasil simulasi</h2><p className="mt-2 text-sm leading-6">Skor yang ditampilkan merupakan estimasi TOKU-UP untuk membantu evaluasi belajar dan bukan nilai resmi penyelenggara JLPT.</p></section>}
                </div>

                <aside className="self-start rounded-lg border border-[#dbe5df] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#142019] lg:sticky lg:top-24">
                    <h2 className="text-lg font-black">Pemeriksaan perangkat</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Konfirmasi kesiapan sebelum masuk ke ruang ujian.</p>
                    <div className="mt-5 space-y-2">
                        {[
                            ['connection', 'Koneksi internet stabil', WifiRoundedIcon],
                            ['device', 'Perangkat dan baterai siap', DevicesRoundedIcon],
                            ...(needsAudio ? [['audio', 'Audio dapat terdengar', HeadphonesOutlinedIcon]] : []),
                            ['agreement', 'Saya memahami dan menyetujui ketentuan ujian', CheckCircleRoundedIcon],
                        ].map(([key, label, Icon]) => (
                            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checks[key] ? 'border-brand-300 bg-brand-50 dark:border-green-800 dark:bg-green-950/40' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'}`}>
                                <input type="checkbox" checked={checks[key]} onChange={() => toggle(key)} className="rounded border-gray-300 text-brand-600 focus:ring-focus" />
                                <Icon sx={{ fontSize: 19 }} className={checks[key] ? 'text-brand-700 dark:text-green-300' : 'text-gray-400'} />
                                <span className="text-sm font-bold">{label}</span>
                            </label>
                        ))}
                    </div>
                    {startError && <p className="mt-4 text-sm font-semibold text-rose-600">{startError}</p>}
                    <button type="button" disabled={!allChecked || !exam.session_id || starting} onClick={startExam} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400">
                        {starting ? <LoadingSpinner /> : <LockClockOutlinedIcon sx={{ fontSize: 19 }} />} {starting ? 'Menyiapkan ujian...' : !exam.session_id ? 'Sesi belum tersedia' : allChecked ? (exam.status === 'completed' ? 'Kerjakan lagi' : 'Mulai ujian') : 'Lengkapi pemeriksaan'}
                    </button>
                    <p className="mt-3 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">Jawaban disimpan saat berpindah soal dan sebelum ujian dikirim.</p>
                </aside>
            </div>
        </ExamPortalLayout>
    );
}
