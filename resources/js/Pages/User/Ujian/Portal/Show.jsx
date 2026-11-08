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
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import ExamResultView from '@/Components/Features/ExamPortal/ExamResultView';
import { examCategoryLabel } from '@/Components/Features/ExamPortal/ExamPortalUI';
import { pushAnalyticsEvent } from '@/lib/analytics';

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

const examAudioUrl = (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `/${path.replace(/^\/+/, '')}`;
};

const LoadingSpinner = () => <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;

function StandaloneExamRunner({ initialAttempt, onExit, startTokenKey }) {
    const [attempt, setAttempt] = useState(() => ({
        ...initialAttempt,
        server_revision: Number(initialAttempt.server_revision ?? 0),
    }));

    const localAnswersKey = `toku-up-exam-answers-${initialAttempt.id}`;
    const localPartsKey = `${localAnswersKey}-parts`;

    const [answers, setAnswers] = useState(() => {
        const serverAnswers = Object.fromEntries(
            initialAttempt.sections.flatMap((section) => section.questions)
                .filter((question) => question.answer?.answer_text)
                .map((question) => [question.id, question.answer.answer_text]),
        );
        try {
            const cached = JSON.parse(window.localStorage.getItem(localAnswersKey) || '{}');
            return { ...serverAnswers, ...cached };
        } catch {
            return serverAnswers;
        }
    });

    const [builderParts, setBuilderParts] = useState(() => {
        const saved = Object.fromEntries(initialAttempt.sections.flatMap((section) => section.questions)
            .filter((question) => question.type === 'sentence_builder' && Array.isArray(question.answer?.answer_payload?.option_indexes))
            .map((question) => [question.id, question.answer.answer_payload.option_indexes]));
        try {
            const cached = JSON.parse(window.localStorage.getItem(localPartsKey) || '{}');
            return { ...saved, ...cached };
        } catch {
            return saved;
        }
    });
    const builderPartsRef = useRef(builderParts);
    const [flagged, setFlagged] = useState(() => new Set(
        initialAttempt.sections.flatMap((section) => section.questions)
            .filter((question) => question.answer?.flagged)
            .map((question) => question.id),
    ));
    const flaggedRef = useRef(flagged);

    const [remaining, setRemaining] = useState(initialAttempt.remaining_seconds);
    const [busy, setBusy] = useState(false);
    const [syncStatus, setSyncStatus] = useState('saved');
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [recovering, setRecovering] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showTabWarning, setShowTabWarning] = useState(false);
    const [audioPlays, setAudioPlays] = useState(() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = sessionStorage.getItem(`exam_audio_plays_${initialAttempt?.id}`);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    const savePromiseRef = useRef(null);
    const revisionRef = useRef(Number(initialAttempt.server_revision ?? 0));
    const displayDeadlineRef = useRef(Date.now() + Math.max(0, Number(initialAttempt.remaining_seconds) || 0) * 1000);
    const hasSubmittedRef = useRef(false);
    const debounceTimeoutRef = useRef(null);

    const isJft = attempt.exam?.category === 'jft_basic';
    const questions = useMemo(() => attempt.sections.flatMap((section) => (
        section.questions.map((question) => ({
            ...question,
            sectionKey: section.key,
            sectionTitle: section.title,
        }))
    )), [attempt.sections]);

    const recoverResult = async () => {
        setRecovering(true);
        setError('');
        try {
            const response = await window.axios.get(route('user.exam-attempts.result', initialAttempt.id));
            setResult(response.data.result);
            window.localStorage.removeItem(startTokenKey);
            window.localStorage.removeItem(localAnswersKey);
            window.localStorage.removeItem(localPartsKey);
        } catch (requestError) {
            if (requestError.response?.status === 403) {
                setResult({ pending: true });
                window.localStorage.removeItem(startTokenKey);
                window.localStorage.removeItem(localAnswersKey);
                window.localStorage.removeItem(localPartsKey);
            } else {
                setError('Hasil belum dapat dimuat. Periksa koneksi dan coba lagi.');
            }
        } finally {
            setRecovering(false);
        }
    };

    useEffect(() => {
        if (['submitted', 'timed_out'].includes(initialAttempt.status)) recoverResult();
    }, []);

    useEffect(() => {
        const restored = {};
        questions.forEach((question) => {
            if (question.type === 'sentence_builder' && !Object.hasOwn(builderPartsRef.current, question.id) && Array.isArray(question.answer?.answer_payload?.option_indexes)) {
                restored[question.id] = question.answer.answer_payload.option_indexes;
            }
        });
        if (Object.keys(restored).length) {
            builderPartsRef.current = { ...builderPartsRef.current, ...restored };
            setBuilderParts(builderPartsRef.current);
        }
    }, [questions]);

    useEffect(() => () => clearTimeout(debounceTimeoutRef.current), []);

    useEffect(() => {
        if (result || initialAttempt.status !== 'in_progress') return undefined;
        const tick = () => setRemaining(Math.max(0, Math.ceil((displayDeadlineRef.current - Date.now()) / 1000)));
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [result, initialAttempt.status]);

    const syncRemaining = (seconds) => {
        const safe = Math.max(0, Number(seconds) || 0);
        displayDeadlineRef.current = Date.now() + safe * 1000;
        setRemaining(safe);
    };

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                setTabSwitchCount((prev) => prev + 1);
                setShowTabWarning(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    const answerRows = (overrideAnswers = answers) => questions
        .filter((item) => overrideAnswers[item.id] !== undefined || flaggedRef.current.has(item.id))
        .map((item) => ({
            question_id: item.id,
            answer_text: overrideAnswers[item.id] ?? null,
            ...(item.type === 'sentence_builder' ? { answer_payload: { option_indexes: builderPartsRef.current[item.id] || [] } } : {}),
            flagged: flaggedRef.current.has(item.id),
        }));

    const save = async (overrideAnswers = answers) => {
        const rows = answerRows(overrideAnswers);
        if (rows.length === 0) return { ok: true, revision: revisionRef.current };
        if (savePromiseRef.current) {
            const previous = await savePromiseRef.current;
            if (!previous?.ok) return previous;
            return save(overrideAnswers);
        }

        setSyncStatus('saving');
        savePromiseRef.current = (async () => {
            try {
                for (let offset = 0; offset < rows.length; offset += 100) {
                    const response = await window.axios.put(route('user.exam-attempts.answers', attempt.id), {
                        autosave_token: uuid(),
                        client_revision: revisionRef.current,
                        answers: rows.slice(offset, offset + 100),
                    });
                    revisionRef.current = Number(response.data.server_revision ?? revisionRef.current);
                    setAttempt((val) => ({ ...val, server_revision: revisionRef.current }));
                    if (response.data.remaining_seconds !== undefined) {
                        syncRemaining(response.data.remaining_seconds);
                    }
                }
                setSyncStatus('saved');
                setError('');
                return { ok: true, revision: revisionRef.current };
            } catch (requestError) {
                if (requestError.response?.status === 409) {
                    const syncRes = await window.axios.get(route('user.exam-attempts.show', attempt.id)).catch(() => null);
                    if (syncRes?.data?.attempt) {
                        revisionRef.current = Number(syncRes.data.attempt.server_revision ?? 0);
                        setAttempt(syncRes.data.attempt);
                    }
                    setSyncStatus('error');
                } else {
                    setSyncStatus(window.navigator.onLine ? 'error' : 'offline');
                }
                setError('Jawaban belum tersimpan. Periksa koneksi dan coba lagi.');
                return { ok: false };
            } finally {
                savePromiseRef.current = null;
            }
        })();
        return savePromiseRef.current;
    };

    useEffect(() => {
        const handleOnline = () => {
            setSyncStatus('saving');
            save();
        };
        const handleOffline = () => {
            setSyncStatus('offline');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [answers, flagged]);

    const handleAnswerChange = (questionId, value) => {
        const next = { ...answers, [questionId]: value };
        setAnswers(next);
        try {
            window.localStorage.setItem(localAnswersKey, JSON.stringify(next));
        } catch {
            // ignore
        }

        setSyncStatus('saving');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            save(next);
        }, 1200);
    };

    const toggleFlag = (questionId) => {
        const next = new Set(flaggedRef.current);
        if (next.has(questionId)) next.delete(questionId);
        else next.add(questionId);
        flaggedRef.current = next;
        setFlagged(next);
        const nextAnswers = { ...answers, [questionId]: answers[questionId] ?? '' };
        setAnswers(nextAnswers);
        try {
            window.localStorage.setItem(localAnswersKey, JSON.stringify(nextAnswers));
        } catch {
            // Autosave remains available when local storage is unavailable.
        }

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            save(nextAnswers);
        }, 800);
    };

    const updateBuilderParts = (question, parts) => {
        const next = { ...builderPartsRef.current, [question.id]: parts };
        builderPartsRef.current = next;
        setBuilderParts(next);
        try {
            window.localStorage.setItem(localPartsKey, JSON.stringify(next));
        } catch {
            // Storage may be unavailable; autosave still persists the selection.
        }
        handleAnswerChange(question.id, parts.map((index) => question.options[index]).join(''));
    };

    const chooseBuilderPart = (question, index) => updateBuilderParts(question, [...(builderPartsRef.current[question.id] || []), index]);

    const resetBuilder = (question) => updateBuilderParts(question, []);

    const handlePlayAudio = (questionId) => {
        setAudioPlays((prev) => {
            const currentCount = prev[questionId] || 0;
            if (currentCount >= 2) return prev;
            const updated = { ...prev, [questionId]: currentCount + 1 };
            if (typeof window !== 'undefined' && initialAttempt?.id) {
                try {
                    sessionStorage.setItem(`exam_audio_plays_${initialAttempt.id}`, JSON.stringify(updated));
                } catch {}
            }
            return updated;
        });
        return true;
    };

    const scrollToQuestion = (index) => {
        const element = document.getElementById(`question-node-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const advance = async () => {
        setBusy(true);
        setError('');
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        try {
            if (savePromiseRef.current) await savePromiseRef.current;
            const saved = await save();
            if (!saved?.ok) return;
            const response = await window.axios.post(route('user.exam-attempts.advance', attempt.id), {
                client_revision: saved.revision,
            });
            const next = response.data.attempt;
            revisionRef.current = Number(next.server_revision);
            setAttempt(next);
            syncRemaining(next.remaining_seconds);
            setShowAdvanceModal(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (requestError) {
            if (requestError.response?.status === 409) {
                const response = await window.axios.get(route('user.exam-attempts.show', attempt.id)).catch(() => null);
                if (response?.data?.attempt) {
                    revisionRef.current = Number(response.data.attempt.server_revision);
                    setAttempt(response.data.attempt);
                }
            }
            setError(requestError.response?.data?.message || 'Bagian berikutnya belum dapat dibuka. Coba lagi.');
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;
        setBusy(true);
        setError('');
        try {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            if (savePromiseRef.current) await savePromiseRef.current;
            if (remaining > 0 && !(await save())?.ok) {
                hasSubmittedRef.current = false;
                return;
            }

            const response = await window.axios.post(route('user.exam-attempts.submit', attempt.id));
            window.localStorage.removeItem(startTokenKey);
            window.localStorage.removeItem(localAnswersKey);
            window.localStorage.removeItem(localPartsKey);
            setResult(response.data.result || { pending: true });
            pushAnalyticsEvent('exam_completed', {
                exam_type: initialAttempt.exam?.type || 'exam',
                result_available: response.data.result_available === true,
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (requestError) {
            hasSubmittedRef.current = false;
            setError(requestError.response?.data?.message || 'Ujian belum dapat dikirim.');
        } finally {
            setBusy(false);
            setShowSubmitModal(false);
        }
    };

    useEffect(() => {
        if (initialAttempt.status !== 'in_progress' || remaining > 0 || result || busy) return;
        submit();
    }, [remaining, busy, result]);

    if (result) {
        return (
            <ExamPortalLayout>
                <Head title={`Hasil ${initialAttempt.exam.title}`} />
                <ExamResultView result={result} totalQuestions={questions.length} onExit={onExit} />
            </ExamPortalLayout>
        );
    }

    if (initialAttempt.status !== 'in_progress') {
        return <ExamPortalLayout><main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-xl font-bold">Memuat hasil ujian</h1>{error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}<button type="button" disabled={recovering} onClick={recoverResult} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{recovering ? 'Memuat...' : 'Coba lagi'}</button></main></ExamPortalLayout>;
    }

    const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
    const unansweredCount = questions.length - answeredCount;
    const flaggedCount = flagged.size;
    const firstUnansweredIndex = questions.findIndex((q) => !answers[q.id]);

    return (
        <ExamPortalLayout>
            <Head title={initialAttempt.exam.title} />
            <main
                className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Floating Tab Switch Warning */}
                {showTabWarning && (
                    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                            <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
                            <span>
                                Peringatan Integritas: Anda terdeteksi beralih jendela/tab ({tabSwitchCount}x). Tetaplah berada di layar ujian.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTabWarning(false)}
                            className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        >
                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                        </button>
                    </div>
                )}

                {/* Sticky Header Bar */}
                <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dbe5df] bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#142019]/95 sm:px-6 sm:py-4">
                    <div>
                        <span className="text-[11px] font-black uppercase text-brand-700 dark:text-green-400">
                            {examCategoryLabel(attempt.exam)} · {initialAttempt.exam.title}
                        </span>
                        <div className="mt-0.5 flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                {syncStatus === 'saving' && (
                                    <>
                                        <SyncRoundedIcon sx={{ fontSize: 15 }} className="animate-spin text-blue-600" />
                                        <span>Menyimpan...</span>
                                    </>
                                )}
                                {syncStatus === 'saved' && (
                                    <>
                                        <CloudDoneOutlinedIcon sx={{ fontSize: 15 }} className="text-emerald-600" />
                                        <span>Jawaban tersimpan</span>
                                    </>
                                )}
                                {syncStatus === 'offline' && (
                                    <>
                                        <CloudOffOutlinedIcon sx={{ fontSize: 15 }} className="text-amber-600" />
                                        <span>Mode Offline (Disimpan di browser)</span>
                                    </>
                                )}
                                {syncStatus === 'error' && (
                                    <span className="text-red-600">Gagal sync, mencoba kembali...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Countdown Timer */}
                        <div
                            className={`rounded-lg border px-3.5 py-1.5 font-mono text-sm font-black transition ${
                                remaining <= 180
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                                    : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-gray-700 dark:bg-[#111b16] dark:text-gray-100'
                            }`}
                        >
                            <AccessTimeRoundedIcon sx={{ fontSize: 16 }} className="mr-1.5" />
                            {formatTime(remaining)}
                        </div>

                        {/* Top Submit Button */}
                        <button
                            type="button"
                            onClick={() => setShowSubmitModal(true)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-black text-white shadow-sm transition hover:bg-brand-700"
                        >
                            <SendOutlinedIcon sx={{ fontSize: 14 }} />
                            <span>Kirim Ujian</span>
                        </button>
                    </div>
                </header>

                {error && !showAdvanceModal && !showSubmitModal && (
                    <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>
                )}

                {/* Main Content: Split Grid (Continuous Paper Flow + Sticky Anchor Navigator) */}
                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_270px]">
                    
                    {/* Left Column: Continuous Paper-Style Questions */}
                    <fieldset disabled={busy} className="min-w-0 space-y-10">
                        {attempt.sections.map((section, sIdx) => {
                            const sectionQuestions = section.questions;

                            return (
                                <section
                                    key={section.id}
                                    id={`section-block-${section.key}`}
                                    className="rounded-2xl border border-[#dbe5df] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#142019] sm:p-7"
                                >
                                    {/* Section Banner */}
                                    <div className="border-b border-slate-200 pb-3 dark:border-gray-800">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-green-400">
                                                    Bagian {(attempt.navigation?.section_index ?? sIdx) + 1}
                                                </span>
                                                <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                                                    {section.title}
                                                </h2>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                                {sectionQuestions.length} Soal
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {sectionDescriptions[section.key] || 'Jawab pertanyaan berikut sesuai petunjuk.'}
                                        </p>
                                    </div>

                                    {/* Questions in this Section */}
                                    <div className="mt-6 divide-y divide-slate-100 dark:divide-gray-800/80">
                                        {sectionQuestions.map((q) => {
                                            const globalIndex = questions.findIndex((item) => item.id === q.id);
                                            const isFlagged = flagged.has(q.id);
                                            const isAnswered = Boolean(answers[q.id]);
                                            const optionQuestion = ['multiple_choice', 'listening', 'fill_blank'].includes(q.type) && q.options?.length > 0;
                                            const selectedParts = builderParts[q.id] || [];
                                            const playCount = audioPlays[q.id] || 0;
                                            const canPlayAudio = playCount < 2;

                                            return (
                                                <article
                                                    key={q.id}
                                                    id={`question-node-${globalIndex}`}
                                                    className="select-none py-7 first:pt-2 last:pb-0"
                                                >
                                                    {/* Card Header: Number & Flag Button */}
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-800 dark:bg-gray-800 dark:text-gray-200">
                                                                {isJft && section.key === 'listening' ? (attempt?.navigation?.question_index ?? 0) + 1 : globalIndex + 1}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-slate-400">
                                                                {q.type === 'multiple_choice' && 'Pilihan Ganda'}
                                                                {q.type === 'typing' && 'Isian Huruf/Kata'}
                                                                {q.type === 'fill_blank' && 'Lengkapi Kalimat'}
                                                                {q.type === 'sentence_builder' && 'Susun Kalimat'}
                                                                {q.type === 'listening' && 'Mendengarkan (Choukai)'}
                                                            </span>
                                                            {isAnswered && (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                                    <CheckCircleRoundedIcon sx={{ fontSize: 13 }} /> Terjawab
                                                                </span>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => toggleFlag(q.id)}
                                                            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                                                                isFlagged
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                                                                    : 'border border-slate-200 text-slate-500 hover:border-slate-300 dark:border-gray-700 dark:text-gray-400'
                                                            }`}
                                                        >
                                                            <FlagOutlinedIcon sx={{ fontSize: 15 }} />
                                                            <span>{isFlagged ? 'Ragu-ragu' : 'Tandai'}</span>
                                                        </button>
                                                    </div>

                                                    {/* Listening Audio Box with Play Limit */}
                                                    {q.type === 'listening' && (
                                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 dark:border-brand-900/50 dark:bg-brand-950/20">
                                                            <div className="flex items-center gap-3">
                                                                <JapaneseSpeechButton
                                                                    audioUrl={examAudioUrl(q.audio_path)}
                                                                    text={q.question_reading || q.question_text}
                                                                    disabled={!canPlayAudio}
                                                                    onPlay={() => handlePlayAudio(q.id)}
                                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition ${
                                                                        canPlayAudio
                                                                            ? 'bg-brand-600 hover:bg-brand-700'
                                                                            : 'cursor-not-allowed bg-slate-400 opacity-50'
                                                                    }`}
                                                                />
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                                        {q.audio_path ? 'Audio Rekaman Dialog' : 'Audio Percakapan'}
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-500">
                                                                        {canPlayAudio
                                                                            ? `Klik tombol untuk mendengarkan (Maksimal 2x putar)`
                                                                            : 'Batas pemutaran audio telah tercapai (2/2).'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="rounded-md border border-brand-200 bg-white px-2 py-0.5 text-[10px] font-bold text-brand-800 dark:border-brand-800 dark:bg-[#111b16] dark:text-brand-300">
                                                                Diputar: {playCount}/2 kali
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Question Text & Reading */}
                                                    <div className="mt-4">
                                                        <p className="text-base font-bold leading-relaxed text-slate-900 dark:text-white sm:text-lg">
                                                            {q.question_text}
                                                        </p>
                                                        {q.question_reading && (
                                                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                                                                {q.question_reading}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Input: Multiple Choice / Radio Options */}
                                                    {optionQuestion && (
                                                        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                                                            {q.options.map((option, oIdx) => {
                                                                const isSelected = answers[q.id] === option;

                                                                return (
                                                                    <label
                                                                        key={`${option}-${oIdx}`}
                                                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm font-semibold transition ${
                                                                            isSelected
                                                                                ? 'border-brand-600 bg-brand-50/70 text-brand-900 ring-1 ring-brand-500 dark:border-green-700 dark:bg-green-950/30 dark:text-green-200'
                                                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-gray-700 dark:bg-[#111b16] dark:hover:bg-white/5'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${q.id}`}
                                                                            checked={isSelected}
                                                                            onChange={() => handleAnswerChange(q.id, option)}
                                                                            className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                                                                        />
                                                                        <span className="flex-1">{option}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Input: Sentence Builder */}
                                                    {q.type === 'sentence_builder' && (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="min-h-[56px] rounded-xl border border-dashed border-brand-300 bg-brand-50/30 p-3 dark:border-green-800 dark:bg-green-950/20">
                                                                {selectedParts.length ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {selectedParts.map((part, pIdx) => (
                                                                            <span
                                                                                key={`${part}-${pIdx}`}
                                                                                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm dark:border-green-800 dark:bg-[#142019] dark:text-gray-100"
                                                                            >
                                                                                {q.options?.[part]}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-slate-400">
                                                                        Klik potongan kata di bawah sesuai urutan kalimat yang tepat.
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {q.options?.map((part, pIdx) => (
                                                                    <button
                                                                        key={`${part}-${pIdx}`}
                                                                        type="button"
                                                                        disabled={selectedParts.includes(pIdx)}
                                                                        onClick={() => chooseBuilderPart(q, pIdx)}
                                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-[#111b16] dark:text-gray-200"
                                                                    >
                                                                        {part}
                                                                    </button>
                                                                ))}
                                                                {selectedParts.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => resetBuilder(q)}
                                                                        className="rounded-lg px-2.5 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                    >
                                                                        Ulangi
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Input: Typing Text */}
                                                    {!optionQuestion && q.type !== 'sentence_builder' && (
                                                        <div className="mt-4">
                                                            <input
                                                                type="text"
                                                                value={answers[q.id] || ''}
                                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                placeholder="Ketik jawaban Anda di sini..."
                                                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-gray-700 dark:bg-[#111b16] dark:text-white"
                                                            />
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        {/* End of Exam Section Banner */}
                        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/80 to-white p-6 dark:border-brand-900/50 dark:from-[#172e21] dark:to-[#142019]">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        {isJft && attempt.navigation?.has_next ? 'Selesai dengan bagian ini?' : 'Sudah Selesai Memeriksa Seluruh Soal?'}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {answeredCount} dari {questions.length} soal {isJft ? 'yang ditampilkan ' : ''}telah Anda isi.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => isJft && attempt.navigation?.has_next ? setShowAdvanceModal(true) : setShowSubmitModal(true)}
                                    disabled={busy}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-brand-700"
                                >
                                    <SendOutlinedIcon sx={{ fontSize: 17 }} />
                                    <span>{isJft && attempt.navigation?.has_next ? 'Lanjutkan' : 'Kirim & Akhiri Ujian'}</span>
                                </button>
                            </div>
                        </div>
                    </fieldset>

                    {/* Right Column: Sticky Anchor Navigator */}
                    <aside className="self-start rounded-2xl border border-[#dbe5df] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#142019] lg:sticky lg:top-24">
                        <div className="border-b border-slate-100 pb-3 dark:border-gray-800">
                            <p className="text-xs font-black uppercase text-slate-500">
                                Navigasi Soal
                            </p>
                            <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300">
                                <span>{isJft ? 'Bagian saat ini' : 'Progress Pengerjaan'}</span>
                                <span className="text-brand-600 font-extrabold">{answeredCount}/{questions.length}</span>
                            </div>
                            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                                <div
                                    className="h-full rounded-full bg-brand-600 transition-all duration-300"
                                    style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Question Numbers Palette */}
                        <div className="mt-4 grid grid-cols-5 gap-1.5">
                            {questions.map((item, index) => {
                                const isAnswered = Boolean(answers[item.id]);
                                const isFlagged = flagged.has(item.id);

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToQuestion(index)}
                                        title={`Nomor ${index + 1} (${isAnswered ? 'Terjawab' : 'Belum'} ${isFlagged ? '- Ragu' : ''})`}
                                        className={`grid h-9 place-items-center rounded-lg text-xs font-bold transition ${
                                            isFlagged
                                                ? 'border border-amber-400 bg-amber-100 text-amber-900 ring-1 ring-amber-400 dark:bg-amber-950/60 dark:text-amber-200'
                                                : isAnswered
                                                    ? 'border border-brand-500 bg-brand-50 text-brand-900 font-black dark:border-green-700 dark:bg-green-950/40 dark:text-green-200'
                                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-[#111b16] dark:text-gray-300'
                                        }`}
                                    >
                                        {isJft && item.sectionKey === 'listening' ? (attempt?.navigation?.question_index ?? 0) + 1 : index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-brand-50 border border-brand-500" />
                                <span>Terjawab ({answeredCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-amber-100 border border-amber-400" />
                                <span>Ragu-ragu ({flaggedCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded bg-white border border-slate-200" />
                                <span>Belum dijawab ({unansweredCount})</span>
                            </div>
                        </div>

                        {/* Quick Submit in Sidebar */}
                        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setShowSubmitModal(true)}
                                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-brand-700"
                            >
                                <SendOutlinedIcon sx={{ fontSize: 14 }} />
                                <span>Kirim Ujian</span>
                            </button>
                        </div>
                    </aside>
                </div>

                {showAdvanceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="advance-title">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-[#142019]">
                            <h2 id="advance-title" className="text-base font-bold">Lanjutkan ujian?</h2>
                            <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">Setelah melanjutkan, Anda tidak dapat kembali ke bagian atau soal listening ini.</p>
                            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                            <div className="mt-5 flex justify-end gap-2">
                                <button type="button" disabled={busy} onClick={() => setShowAdvanceModal(false)} className="rounded-lg border px-4 py-2 text-sm">Kembali</button>
                                <button type="button" disabled={busy} onClick={advance} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Menyimpan...' : 'Ya, lanjutkan'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Konfirmasi & Rekapitulasi Submit */}
                {showSubmitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#142019]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-green-950/50 dark:text-green-300">
                                        <QuizOutlinedIcon sx={{ fontSize: 22 }} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Konfirmasi Pengiriman Ujian
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Periksa rekapitulasi sebelum mengakhiri sesi.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitModal(false)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800"
                                >
                                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                                </button>
                            </div>

                            {/* Summary Badges Grid */}
                            <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <span className="block text-xl font-black text-emerald-700 dark:text-emerald-300">
                                        {answeredCount}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                                        Terjawab
                                    </span>
                                </div>
                                <div className={`rounded-xl border p-3 ${
                                    unansweredCount > 0
                                        ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30'
                                        : 'border-slate-200 bg-slate-50 dark:border-gray-700 dark:bg-gray-800/40'
                                }`}>
                                    <span className={`block text-xl font-black ${
                                        unansweredCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400'
                                    }`}>
                                        {unansweredCount}
                                    </span>
                                    <span className={`text-[10px] font-bold ${
                                        unansweredCount > 0 ? 'text-rose-800 dark:text-rose-400' : 'text-slate-500'
                                    }`}>
                                        Kosong
                                    </span>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                                    <span className="block text-xl font-black text-amber-700 dark:text-amber-300">
                                        {flaggedCount}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400">
                                        Ragu-ragu
                                    </span>
                                </div>
                            </div>

                            {unansweredCount > 0 && (
                                <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold leading-relaxed text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                                    Masih ada <strong>{unansweredCount} soal {isJft ? 'yang ditampilkan ' : ''}</strong>yang belum dijawab. Nilai Anda akan dihitung berdasarkan jawaban yang sudah terisi.
                                </p>
                            )}

                            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                                Setelah dikirim, jawaban tidak dapat diubah lagi dan skor Anda akan langsung diproses.
                            </p>

                            {error && (
                                <p className="mt-2 text-xs font-bold text-rose-600">
                                    {error}
                                </p>
                            )}

                            {/* Modal Action Buttons */}
                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setShowSubmitModal(false);
                                        if (firstUnansweredIndex !== -1) {
                                            scrollToQuestion(firstUnansweredIndex);
                                        }
                                    }}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    {firstUnansweredIndex !== -1 ? 'Periksa Soal Kosong' : 'Kembali Memeriksa'}
                                </button>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={submit}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-black text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                                >
                                    {busy && <LoadingSpinner />}
                                    <span>{busy ? 'Mengirim...' : 'Ya, Selesaikan & Kirim'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </ExamPortalLayout>
    );
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
                            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${isSimulation ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>{isSimulation ? 'Simulasi Ujian' : 'Latihan Ujian'}</span><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{examCategoryLabel(exam)}</span></div>
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

                    {isSimulation && <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100"><h2 className="font-black">Tentang hasil simulasi</h2><p className="mt-2 text-sm leading-6">Skor yang ditampilkan merupakan estimasi TOKU-UP untuk membantu evaluasi belajar dan bukan nilai resmi penyelenggara ujian.</p></section>}
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
