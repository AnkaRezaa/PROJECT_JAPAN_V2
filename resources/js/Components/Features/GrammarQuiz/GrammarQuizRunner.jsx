import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

const STAGE_META = {
    transformation: { short: '1', color: '#22c55e', soft: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300' },
    sentence_builder: { short: '2', color: '#38bdf8', soft: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-300' },
    context_choice: { short: '3', color: '#fbbf24', soft: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' },
};

const arraysEqual = (left, right) => (
    left.length === right.length && left.every((value, index) => value === right[index])
);

function ProgressHeader({ quiz, stageIndex, questionIndex, totalAnswered, totalQuestions, onClose, persist }) {
    const progress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

    return (
        <header className="shrink-0 border-b border-gray-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
                <button type="button" onClick={onClose} aria-label="Tutup pratinjau Grammar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                    <CloseIcon sx={{ fontSize: 22 }} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-extrabold text-gray-500 dark:text-gray-400">
                        <span className="truncate">{quiz.pattern} · Tahap {stageIndex + 1}/3</span>
                        <span>{questionIndex + 1}/{quiz.stages[stageIndex]?.questions.length || 1}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <span className="hidden rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 sm:inline-flex">
                    {persist ? 'Lesson' : 'Preview'}
                </span>
            </div>
        </header>
    );
}

function IntroScreen({ quiz, onStart, onClose }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-5 sm:px-7 sm:py-8">
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                        <ArrowBackIcon sx={{ fontSize: 19 }} /> Kembali
                    </button>
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black uppercase text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">Grammar · {quiz.level}</span>
                </div>

                <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
                    <section>
                        <p className="text-xs font-black uppercase text-brand-700 dark:text-brand-300">Pola hari ini</p>
                        <h1 lang="ja" className="mt-2 text-4xl font-black tracking-normal text-[#2d3742] dark:text-white sm:text-5xl">{quiz.pattern}</h1>
                        <h2 className="mt-3 text-xl font-black text-gray-900 dark:text-white">{quiz.title}</h2>
                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">{quiz.intro.explanation}</p>

                        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/60 dark:bg-violet-950/25">
                            <p className="text-[11px] font-black uppercase text-violet-600 dark:text-violet-300">Rumus</p>
                            <p lang="ja" className="mt-2 text-lg font-black text-gray-900 dark:text-white">{quiz.intro.formula}</p>
                            <p className="mt-2 text-sm font-bold text-violet-700 dark:text-violet-200">{quiz.intro.meaning}</p>
                        </div>
                    </section>

                    <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                            <AutoStoriesIcon className="text-brand-600" sx={{ fontSize: 20 }} /> Contoh
                        </div>
                        <div className="mt-3 space-y-3">
                            {quiz.intro.examples.map((example) => (
                                <div key={example.japanese} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
                                    <JapaneseReading {...example} className="text-sm font-extrabold leading-6 text-gray-900 dark:text-white" />
                                    <JapaneseSpeechButton text={example.japanese} size="small" className="mt-0.5 shrink-0" />
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>

                <button type="button" onClick={onStart} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white shadow-[0_4px_0_#15803d] transition hover:bg-brand-700 active:translate-y-1 active:shadow-none sm:ml-auto sm:w-auto sm:min-w-52">
                    Mulai Lesson <ArrowForwardIcon sx={{ fontSize: 19 }} />
                </button>
            </div>
        </div>
    );
}

function ChoiceQuestion({ question, answer, disabled, onAnswer }) {
    return (
        <div className="grid gap-2.5">
            {question.choices.map((choice, index) => {
                const isSelected = answer === choice;
                return (
                    <button
                        key={choice}
                        type="button"
                        disabled={disabled}
                        onClick={() => onAnswer(choice)}
                        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-default ${isSelected ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-400 dark:bg-green-950/35 dark:text-green-100' : 'border-gray-200 bg-white text-gray-800 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-green-800'}`}
                    >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-current/20'}`}>
                            {String.fromCharCode(65 + index)}
                        </span>
                        <span lang="ja" className="leading-6">{choice}</span>
                    </button>
                );
            })}
        </div>
    );
}

function SentenceBuilderQuestion({ question, selectedIds, disabled, onChange }) {
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const selectedTokens = selected.map((id) => question.tokens.find((token) => token.id === id)).filter(Boolean);
    const availableTokens = question.tokens.filter((token) => !selected.includes(token.id));

    return (
        <div>
            <div className="min-h-20 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/70 dark:bg-sky-950/20">
                {selectedTokens.length === 0 ? (
                    <p className="flex min-h-14 items-center justify-center text-center text-xs font-bold text-gray-400">Ketuk potongan kata di bawah untuk menyusun kalimat.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selectedTokens.map((token, index) => (
                            <button
                                key={token.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(selected.filter((id) => id !== token.id))}
                                aria-label={`Lepas ${token.text}`}
                                className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-black text-gray-900 shadow-[0_2px_0_#bae6fd] transition hover:border-rose-300 hover:bg-rose-50 dark:border-sky-800 dark:bg-gray-900 dark:text-white dark:hover:bg-rose-950/30"
                            >
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-300">{index + 1}</span>
                                <JapaneseReading japanese={token.text} reading={token.reading} className="items-center text-sm font-black" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedTokens.length > 0 && !disabled && (
                <div className="mt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs font-bold text-gray-400 hover:text-rose-500 transition dark:hover:text-rose-400"
                    >
                        Kosongkan susunan
                    </button>
                </div>
            )}

            <div className="mt-4 flex min-h-16 flex-wrap content-start justify-center gap-2">
                {availableTokens.map((token) => (
                    <button
                        key={token.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange([...selected, token.id])}
                        className="h-fit rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-800 shadow-[0_2px_0_#d1d5db] transition hover:-translate-y-0.5 hover:border-sky-400 active:translate-y-0.5 active:shadow-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    >
                        <JapaneseReading japanese={token.text} reading={token.reading} className="items-center" />
                    </button>
                ))}
            </div>
        </div>
    );
}

function QuestionScreen({ stage, question, answer, feedback, onAnswer, onCheck, onContinue }) {
    const meta = STAGE_META[stage.id];
    const canCheck = question.type === 'sentence_builder' ? answer.length > 0 : Boolean(answer);

    const targetSentence = useMemo(() => {
        if (question.type === 'sentence_builder') {
            return question.correctOrder?.map((id) => question.tokens?.find((t) => t.id === id)?.text).filter(Boolean).join('') || '';
        }
        return question.correctAnswer || question.japanese || '';
    }, [question]);

    const targetTranslation = question.translation || question.context || '';

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (feedback) {
                    onContinue();
                } else if (canCheck) {
                    onCheck();
                }
                return;
            }

            if (!feedback && question.type !== 'sentence_builder' && Array.isArray(question.choices)) {
                const key = e.key.toUpperCase();
                let index = -1;
                if (key === 'A' || key === '1') index = 0;
                else if (key === 'B' || key === '2') index = 1;
                else if (key === 'C' || key === '3') index = 2;
                else if (key === 'D' || key === '4') index = 3;

                if (index >= 0 && index < question.choices.length) {
                    e.preventDefault();
                    onAnswer(question.choices[index]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canCheck, feedback, onAnswer, onCheck, onContinue, question]);

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
                <motion.main
                    key={question.id || `${stage.id}-${question.prompt}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5"
                >
                    <div className={`mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase ${meta.soft} ${meta.text}`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: meta.color }}>{meta.short}</span>
                        {stage.label}
                    </div>
                    <h1 className="text-xl font-black leading-7 text-gray-900 dark:text-white sm:text-2xl">{stage.instruction}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{question.prompt}</p>

                    {(question.japanese || question.context) && (
                        <section className="my-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:my-4 sm:p-5">
                            {question.japanese ? (
                                <div className="flex items-center justify-center gap-2">
                                    <JapaneseReading japanese={question.japanese} reading={question.reading} translation={question.translation} className="items-center text-2xl font-black text-gray-900 dark:text-white" />
                                    <JapaneseSpeechButton text={question.japanese} size="small" className="shrink-0" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-[10px] font-black uppercase text-gray-400">Situasi</p>
                                    <p className="mt-2 text-sm font-bold leading-6 text-gray-800 dark:text-gray-100">{question.context}</p>
                                </>
                            )}
                        </section>
                    )}

                    <div className="pb-3">
                        {question.type === 'sentence_builder' ? (
                            <SentenceBuilderQuestion question={question} selectedIds={answer} disabled={Boolean(feedback)} onChange={onAnswer} />
                        ) : (
                            <ChoiceQuestion question={question} answer={answer} disabled={Boolean(feedback)} onAnswer={onAnswer} />
                        )}
                    </div>
                </motion.main>
            </AnimatePresence>

            <footer className={`sticky bottom-0 shrink-0 border-t px-4 py-3 sm:px-6 ${feedback?.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/90' : feedback ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/90' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'}`}>
                <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {feedback ? (
                        <div className="min-w-0 flex-1" aria-live="polite">
                            <p className={`flex items-center gap-2 text-sm font-black ${feedback.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                {feedback.correct ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />}
                                {feedback.correct ? 'Benar!' : 'Belum tepat'}
                            </p>
                            {targetSentence && (
                                <div className="my-1.5 flex items-center justify-between gap-2 rounded-lg bg-white/70 p-2.5 shadow-xs dark:bg-black/25">
                                    <div className="min-w-0">
                                        <p lang="ja" className="text-xs font-black text-gray-900 dark:text-white">
                                            {targetSentence}
                                        </p>
                                        {targetTranslation && (
                                            <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                                {targetTranslation}
                                            </p>
                                        )}
                                    </div>
                                    <JapaneseSpeechButton text={targetSentence} size="small" className="shrink-0" />
                                </div>
                            )}
                            <p className="mt-1 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">{question.explanation}</p>
                        </div>
                    ) : <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Pilih atau susun jawaban, lalu periksa hasilnya.</p>}
                    <button type="button" disabled={!feedback && !canCheck} onClick={feedback ? onContinue : onCheck} className="min-h-11 shrink-0 rounded-xl bg-brand-600 px-6 text-sm font-black text-white shadow-[0_3px_0_#15803d] transition hover:bg-brand-700 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700">
                        {feedback ? (feedback.correct ? 'Lanjut' : 'Coba Lagi') : 'Periksa'}
                    </button>
                </div>
            </footer>
        </div>
    );
}

function ResultScreen({ quiz, result, correctQuestionIds, onRestart, onClose, persist }) {
    const [showReview, setShowReview] = useState(false);
    const accuracy = Number.isFinite(result.score)
        ? result.score
        : (result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0);

    return (
        <div className="flex min-h-0 flex-1 items-center overflow-y-auto px-4 py-6">
            <div className="mx-auto w-full max-w-xl text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-[0_5px_0_#fbbf24] dark:bg-amber-950/50 dark:text-amber-300">
                    <EmojiEventsIcon sx={{ fontSize: 44 }} />
                </span>
                <p className="mt-6 text-xs font-black uppercase text-brand-700 dark:text-brand-300">Lesson Complete</p>
                <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{quiz.pattern} selesai!</h1>
                <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {persist ? 'Hasil, XP, dan progres lesson sudah tersimpan.' : 'Hasil pratinjau ini tidak disimpan.'}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                        ['Akurasi', `${accuracy}%`],
                        ['Benar', result.correct],
                        [persist ? 'XP diperoleh' : 'XP preview', `+${result.xp}`],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4">
                            <p className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">{value}</p>
                            <p className="mt-1 text-[10px] font-black uppercase text-gray-400">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 text-left">
                    <button
                        type="button"
                        onClick={() => setShowReview((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 font-black text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                        <span className="flex items-center gap-2 text-xs font-black uppercase sm:text-sm">
                            <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-brand-600" />
                            Tinjau Rincian Soal ({quiz.stages.reduce((acc, s) => acc + s.questions.length, 0)} Soal)
                        </span>
                        <ChevronRightIcon sx={{ fontSize: 20 }} className={`transition-transform duration-200 ${showReview ? 'rotate-90' : ''}`} />
                    </button>
                    {showReview && (
                        <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                            {quiz.stages.map((stg) => (
                                <div key={stg.id} className="space-y-2">
                                    <p className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500">{stg.label}</p>
                                    {stg.questions.map((q, idx) => {
                                        const isCorrect = correctQuestionIds ? correctQuestionIds.has(q.id) : true;
                                        const target = q.type === 'sentence_builder'
                                            ? q.correctOrder?.map((id) => q.tokens?.find((t) => t.id === id)?.text).filter(Boolean).join('')
                                            : (q.correctAnswer || q.japanese || '');
                                        return (
                                            <div key={q.id || idx} className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{q.prompt}</p>
                                                        {target && (
                                                            <p lang="ja" className="mt-1 text-sm font-black text-gray-900 dark:text-white">
                                                                {target}
                                                            </p>
                                                        )}
                                                        {q.context && (
                                                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                                {q.context}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'}`}>
                                                        {isCorrect ? 'Lancar' : 'Perlu Latihan'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={onRestart} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                        <RefreshIcon sx={{ fontSize: 19 }} /> Ulangi Lesson
                    </button>
                    <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-brand-600 px-5 text-sm font-black text-white shadow-[0_4px_0_#15803d] transition hover:bg-brand-700 active:translate-y-1 active:shadow-none">
                        Kembali ke Roadmap
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GrammarQuizRunner({ quiz, onClose, persist = false }) {
    const [screen, setScreen] = useState('intro');
    const [stageIndex, setStageIndex] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [result, setResult] = useState({ correct: 0, total: 0, xp: 0 });
    const [session, setSession] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [requestError, setRequestError] = useState('');
    const correctQuestionIds = useRef(new Set());
    const firstAttemptedIds = useRef(new Set());
    const totalQuestions = useMemo(() => quiz.stages.reduce((total, stage) => total + stage.questions.length, 0), [quiz.stages]);
    const stage = quiz.stages[stageIndex];
    const question = stage?.questions[questionIndex];
    const answeredBeforeCurrent = quiz.stages.slice(0, stageIndex).reduce((total, item) => total + item.questions.length, 0) + questionIndex;

    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const handleRequestExit = useCallback(() => {
        if (screen === 'result') {
            onClose();
            return;
        }

        openConfirm({
            variant: 'warning',
            presentation: 'quiz-exit',
            title: 'Mau jeda dulu?',
            message: 'Progres kuis saat ini belum tersimpan. Kamu bisa melanjutkan sesi ini kapan saja.',
            cancelLabel: 'Lanjutkan kuis',
            confirmLabel: 'Keluar sesi',
            details: [
                { label: 'Pola Grammar', value: quiz?.pattern || 'Kuis Grammar' },
                { label: 'Progres', value: screen === 'intro' ? 'Belum dimulai' : `Tahap ${stageIndex + 1} dari ${quiz?.stages?.length || 3}` },
            ],
            onConfirm: () => {
                closeConfirm();
                onClose();
            },
        });
    }, [closeConfirm, onClose, openConfirm, quiz?.pattern, quiz?.stages?.length, screen, stageIndex]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleRequestExit();
            }
        };

        window.history.pushState({ grammarQuiz: true }, '');
        const handlePopState = () => {
            if (screen === 'result') {
                onClose();
            } else {
                window.history.pushState({ grammarQuiz: true }, '');
                handleRequestExit();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [handleRequestExit, onClose, screen]);

    useEffect(() => {
        setAnswer(question?.type === 'sentence_builder' ? [] : '');
        setFeedback(null);
    }, [question?.id]);

    const startLesson = async () => {
        setRequestError('');
        if (!persist) {
            setScreen('question');
            return;
        }
        setProcessing(true);
        try {
            const submissionToken = crypto.randomUUID();
            const { data } = await window.axios.post(`/user/quizzes/${quiz.id}/attempts/start`, { submission_token: submissionToken });
            setSession(data);
            setScreen('question');
        } catch (error) {
            setRequestError(error.response?.data?.message || 'Sesi Grammar gagal dimulai.');
        } finally {
            setProcessing(false);
        }
    };

    const checkAnswer = async () => {
        setProcessing(true);
        setRequestError('');
        let correct;
        let recorded = !firstAttemptedIds.current.has(question.id);
        try {
            if (persist) {
                const payload = question.type === 'sentence_builder'
                    ? { ordered_token_ids: answer }
                    : {};
                const { data } = await window.axios.post(`/user/attempts/${session.attempt_id}/answers/first`, {
                    submission_token: session.submission_token,
                    question_id: question.id,
                    answer_text: question.type === 'sentence_builder' ? null : answer,
                    answer_payload: payload,
                });
                correct = data.correct;
                recorded = data.recorded;
            } else {
                correct = question.type === 'sentence_builder'
                    ? arraysEqual(answer, question.correctOrder)
                    : answer === question.correctAnswer;
            }
        } catch (error) {
            setRequestError(error.response?.data?.message || 'Jawaban gagal diperiksa.');
            setProcessing(false);
            return;
        }
        if (recorded) firstAttemptedIds.current.add(question.id);
        const firstCorrect = recorded && correct && !correctQuestionIds.current.has(question.id);

        if (firstCorrect) correctQuestionIds.current.add(question.id);
        setResult((current) => ({
            correct: current.correct + (firstCorrect ? 1 : 0),
            total: current.total + (recorded ? 1 : 0),
            xp: current.xp + (firstCorrect ? (quiz.xpPerCorrectAnswer || 0) : 0),
        }));
        setFeedback({ correct });
        playSoundEffect(correct ? 'correct' : 'incorrect');
        setProcessing(false);
    };

    const continueLesson = async () => {
        if (feedback && !feedback.correct) {
            setAnswer(question.type === 'sentence_builder' ? [] : '');
            setFeedback(null);
            return;
        }

        if (questionIndex < stage.questions.length - 1) {
            setQuestionIndex((index) => index + 1);
            return;
        }
        if (stageIndex < quiz.stages.length - 1) {
            setStageIndex((index) => index + 1);
            setQuestionIndex(0);
            return;
        }
        if (persist) {
            setProcessing(true);
            try {
                const { data } = await window.axios.post('/user/attempts', {
                    quiz_id: quiz.id,
                    answers: [],
                    attempt_id: session.attempt_id,
                    submission_token: session.submission_token,
                    module_flow: true,
                });
                setResult({ correct: data.correct_count, total: data.total_questions, xp: data.xp_earned, score: data.score });
            } catch (error) {
                setRequestError(error.response?.data?.message || 'Hasil Grammar gagal disimpan.');
                setProcessing(false);
                return;
            }
            setProcessing(false);
        }
        setScreen('result');
        playSoundEffect('complete');
    };

    const restart = () => {
        correctQuestionIds.current = new Set();
        firstAttemptedIds.current = new Set();
        setResult({ correct: 0, total: 0, xp: 0 });
        setSession(null);
        setStageIndex(0);
        setQuestionIndex(0);
        setScreen('intro');
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#f7faf8] text-gray-900 dark:bg-gray-950 dark:text-white">
            {screen === 'intro' ? (
                <IntroScreen quiz={quiz} onStart={startLesson} onClose={handleRequestExit} />
            ) : screen === 'result' ? (
                <ResultScreen quiz={quiz} result={result} correctQuestionIds={correctQuestionIds.current} onRestart={restart} onClose={onClose} persist={persist} />
            ) : (
                <>
                    <ProgressHeader quiz={quiz} stageIndex={stageIndex} questionIndex={questionIndex} totalAnswered={answeredBeforeCurrent + (feedback ? 1 : 0)} totalQuestions={totalQuestions} onClose={handleRequestExit} persist={persist} />
                    <QuestionScreen stage={stage} question={question} answer={answer} feedback={feedback} onAnswer={setAnswer} onCheck={checkAnswer} onContinue={continueLesson} />
                </>
            )}
            {(processing || requestError) && <div className="fixed bottom-20 left-1/2 z-[170] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-lg">{processing ? 'Memproses...' : requestError}</div>}
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </div>
    );
}
