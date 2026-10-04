import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import JapaneseSpeechButton, { isStreamableAudio } from '@/Components/UI/JapaneseSpeechButton';
import QuizSoundToggle, { japaneseSpeechText, useQuizSoundPreference } from '@/Components/UI/QuizNarration';
import { QuizActionButton, QuizErrorMessage, QuizOptionButton, QuizSurface } from '@/Components/UI/QuizUI';
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

function ProgressHeader({ quiz, stageIndex, questionIndex, totalAnswered, totalQuestions, onClose, persist, soundEnabled, onToggleSound }) {
    const progress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    const currentStage = quiz?.stages?.[stageIndex] || quiz?.stages?.[0];

    return (
        <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={persist ? 'Keluar dari kuis Grammar' : 'Tutup pratinjau Grammar'}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                    <CloseIcon sx={{ fontSize: 20 }} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-black text-gray-700 dark:text-gray-300">
                        <span className="truncate">{[quiz?.pattern, currentStage?.label].filter(Boolean).join(' · ')}</span>
                        <span>{questionIndex + 1}/{currentStage?.questions?.length ?? 0}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <QuizSoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
            </div>
        </header>
    );
}

function IntroScreen({ quiz, onStart, onClose }) {
    const examples = quiz?.intro?.examples || [];

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-5 sm:px-7 sm:py-8">
                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                        <ArrowBackIcon sx={{ fontSize: 19 }} /> Kembali
                    </button>
                    {quiz?.level && <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-black uppercase text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">{quiz.level}</span>}
                </div>

                <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                    <QuizSurface as="section" className="p-5 sm:p-6">
                        {quiz?.pattern && <><p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Pola hari ini</p><h1 lang="ja" className="mt-2 text-3xl font-black font-japanese tracking-normal text-gray-950 dark:text-white sm:text-4xl">{quiz.pattern}</h1></>}
                        {quiz?.title && <h2 className="mt-2 text-lg font-black text-gray-800 dark:text-gray-100">{quiz.title}</h2>}
                        {quiz?.intro?.explanation && (
                            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">{quiz.intro.explanation}</p>
                        )}

                        {(quiz?.intro?.formula || quiz?.intro?.meaning) && (
                            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/80 p-4 dark:border-violet-900/60 dark:bg-violet-950/30">
                                {quiz.intro.formula && <><p className="text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Rumus Pola</p><p lang="ja" className="mt-2 text-base font-black font-japanese text-gray-900 dark:text-white">{quiz.intro.formula}</p></>}
                                {quiz.intro.meaning && <p className="mt-2 text-sm font-bold text-violet-900 dark:text-violet-200">{quiz.intro.meaning}</p>}
                            </div>
                        )}
                    </QuizSurface>

                    <QuizSurface as="aside" className="p-5">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                            <AutoStoriesIcon className="text-emerald-600 dark:text-emerald-400" sx={{ fontSize: 20 }} /> Contoh Kalimat
                        </div>
                        <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {examples.length > 0 ? (
                                examples.map((example, idx) => (
                                    <div key={idx} className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                                        <JapaneseReading {...example} className="text-sm font-extrabold leading-6 text-gray-900 dark:text-white" />
                                        {example.japanese && (
                                            <JapaneseSpeechButton text={example.japanese} size="small" className="mt-0.5 shrink-0 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="py-4 text-center text-xs text-gray-400">Belum ada contoh kalimat</p>
                            )}
                        </div>
                    </QuizSurface>
                </div>

                <div className="mt-6 flex justify-end">
                    <QuizActionButton
                        onClick={onStart}
                        className="flex min-h-12 w-full items-center gap-2 sm:w-auto"
                    >
                        Mulai Lesson <ArrowForwardIcon sx={{ fontSize: 19 }} />
                    </QuizActionButton>
                </div>
            </div>
        </div>
    );
}

function ChoiceQuestion({ question, answer, feedback, disabled, onAnswer }) {
    return (
        <div className="grid gap-2.5">
            {question.choices.map((choice, index) => {
                const isSelected = answer === choice;
                const isWrong = isSelected && feedback?.correct === false;
                const optionState = !isSelected ? 'idle' : !feedback ? 'selected' : isWrong ? 'wrong' : 'correct';
                const letter = String.fromCharCode(65 + index);
                return (
                    <QuizOptionButton
                        key={index}
                        state={optionState}
                        disabled={disabled}
                        onClick={() => onAnswer(choice)}
                        className="flex items-center gap-3 text-left text-sm"
                    >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition ${
                            isWrong
                                ? 'border-rose-700 bg-rose-700 !text-white shadow-sm'
                                : isSelected
                                ? 'border-emerald-700 bg-emerald-700 !text-white shadow-sm'
                                : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                            {letter}
                        </span>
                        <span lang="ja" className="min-w-0 leading-6 font-japanese font-bold">{choice}</span>
                    </QuizOptionButton>
                );
            })}
        </div>
    );
}

function SentenceBuilderQuestion({ question, selectedIds, disabled, onChange }) {
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const selectedTokens = selected.map((id) => question.tokens?.find((token) => token.id === id)).filter(Boolean);
    const availableTokens = (question.tokens || []).filter((token) => !selected.includes(token.id));

    return (
        <div className="space-y-3">
            <div className="min-h-24 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 p-3.5 dark:border-sky-800 dark:bg-sky-950/25">
                {selectedTokens.length === 0 ? (
                    <p className="flex min-h-16 items-center justify-center text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                        Ketuk potongan kata di bawah untuk menyusun kalimat.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {selectedTokens.map((token, index) => (
                            <button
                                key={token.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(selected.filter((id) => id !== token.id))}
                                aria-label={`Lepas ${token.text}`}
                                className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-black text-gray-900 shadow-[0_2px_0_#bae6fd] transition hover:border-rose-300 hover:bg-rose-50 dark:border-sky-700 dark:bg-gray-900 dark:text-white dark:hover:bg-rose-950/30"
                            >
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] font-black text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                                    {index + 1}
                                </span>
                                <JapaneseReading
                                    japanese={token.text}
                                    reading={token.reading}
                                    forcePreferences={{ showRomaji: false, showTranslation: false }}
                                    className="items-center text-sm font-black text-gray-900 dark:text-white"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedTokens.length > 0 && !disabled && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs font-bold text-gray-400 hover:text-rose-600 transition dark:hover:text-rose-400"
                    >
                        Kosongkan susunan
                    </button>
                </div>
            )}

            <div className="flex min-h-16 flex-wrap content-start justify-center gap-2 pt-1">
                {availableTokens.map((token) => (
                    <button
                        key={token.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange([...selected, token.id])}
                        className="h-fit rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-black text-gray-900 shadow-[0_2px_0_#d1d5db] transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:shadow-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-sky-600"
                    >
                        <JapaneseReading
                            japanese={token.text}
                            reading={token.reading}
                            forcePreferences={{ showRomaji: false, showTranslation: false }}
                            className="items-center text-gray-900 dark:text-white font-japanese"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

function QuestionScreen({ stage, question, answer, feedback, onAnswer, onCheck, onContinue, processing, soundEnabled, narrationRevision, persist }) {
    const meta = STAGE_META[stage?.id] || STAGE_META.transformation;
    const canCheck = question?.type === 'sentence_builder' ? answer.length > 0 : Boolean(answer);
    const narrationText = japaneseSpeechText(question?.japanese || question?.prompt);
    const narrationAudioUrl = isStreamableAudio(question?.audio_url) ? question.audio_url : null;
    const narrationKey = `grammar-question-${stage?.id}-${question?.id || question?.prompt}-${narrationRevision}`;

    const targetSentence = useMemo(() => {
        if (!question) return '';
        if (question.type === 'sentence_builder') {
            const tokenIds = question.correctOrder || (feedback?.correct ? answer : []);
            return tokenIds.map((id) => question.tokens?.find((t) => t.id === id)?.text).filter(Boolean).join('');
        }
        return question.correctAnswer || (feedback?.correct ? answer : '');
    }, [answer, feedback?.correct, question]);

    const targetTranslation = question?.translation || '';

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (processing) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (feedback) {
                    onContinue();
                } else if (canCheck) {
                    onCheck();
                }
                return;
            }

            if (!feedback && question?.type !== 'sentence_builder' && Array.isArray(question?.choices)) {
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
    }, [canCheck, feedback, onAnswer, onCheck, onContinue, processing, question]);

    if (!question) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
                Memuat butir pertanyaan...
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <JapaneseSpeechButton
                text={narrationText}
                audioUrl={narrationAudioUrl}
                autoPlay={Boolean(narrationText || narrationAudioUrl)}
                autoPlayEnabled={soundEnabled}
                playbackKey={narrationKey}
                renderButton={false}
                usePreloadedAudio
            />
            <AnimatePresence mode="wait">
                <motion.main
                    key={question.id || `${stage?.id}-${question.prompt}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5"
                >
                    <div className={`mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase ${meta.soft} ${meta.text}`}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-gray-950" style={{ backgroundColor: meta.color }}>{meta.short}</span>
                        {stage?.label}
                    </div>
                    {stage?.instruction && <h1 className="text-xl font-black leading-7 text-gray-950 dark:text-white sm:text-2xl">{stage.instruction}</h1>}
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{question.prompt}</p>

                    {(question.japanese || question.context) && (
                        <QuizSurface className="my-3 p-4 text-center sm:my-4 sm:p-5">
                            {question.japanese ? (
                                <div className="flex items-center justify-center gap-2">
                                    <JapaneseReading
                                        japanese={question.japanese}
                                        reading={question.reading}
                                        translation={question.translation}
                                        className="items-center text-2xl font-black font-japanese text-gray-950 dark:text-white"
                                    />
                                    <JapaneseSpeechButton text={question.japanese} audioUrl={narrationAudioUrl} playbackKey={narrationKey} size="small" className="shrink-0 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Situasi</p>
                                    <p className="mt-2 text-sm font-bold leading-6 text-gray-800 dark:text-gray-100">{question.context}</p>
                                </>
                            )}
                        </QuizSurface>
                    )}

                    <div className="pb-3">
                        {question.type === 'sentence_builder' ? (
                            <SentenceBuilderQuestion question={question} selectedIds={answer} disabled={Boolean(feedback) || processing} onChange={onAnswer} />
                        ) : (
                            <ChoiceQuestion question={question} answer={answer} feedback={feedback} disabled={Boolean(feedback) || processing} onAnswer={onAnswer} />
                        )}
                    </div>
                </motion.main>
            </AnimatePresence>

            <footer className={`sticky bottom-0 shrink-0 border-t px-4 py-3 sm:px-6 ${
                feedback?.correct
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950'
                    : feedback
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
            }`}>
                <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {feedback ? (
                        <div className="min-w-0 flex-1" aria-live="polite">
                            <p className={`flex items-center gap-2 text-sm font-black ${feedback.correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                                {feedback.correct ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />}
                                {feedback.correct ? 'Benar!' : 'Belum tepat'}
                            </p>
                            {!persist && targetSentence && (
                                <div className="my-1.5 flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-black/30">
                                    <div className="min-w-0">
                                        <p lang="ja" className="text-sm font-black font-japanese text-gray-900 dark:text-white">
                                            {targetSentence}
                                        </p>
                                        {targetTranslation && (
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                {targetTranslation}
                                            </p>
                                        )}
                                    </div>
                                    <JapaneseSpeechButton text={targetSentence} size="small" className="shrink-0 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" />
                                </div>
                            )}
                            {question.explanation && (
                                <p className="mt-1 text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300">{question.explanation}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Pilih atau susun jawaban, lalu periksa hasilnya.</p>
                    )}
                    <QuizActionButton
                        disabled={processing || (!feedback && !canCheck)}
                        onClick={feedback ? onContinue : onCheck}
                        className="shrink-0"
                    >
                        {processing ? 'Memproses...' : feedback ? (feedback.correct ? 'Lanjut' : 'Coba Lagi') : 'Periksa'}
                    </QuizActionButton>
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
                <p className="mt-6 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Lesson Selesai</p>
                <h1 className="mt-2 text-3xl font-black font-japanese text-gray-950 dark:text-white">{quiz?.pattern ? `${quiz.pattern} selesai!` : 'Lesson selesai!'}</h1>
                <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {persist ? 'Hasil, XP, dan progres lesson sudah tersimpan.' : 'Hasil pratinjau ini hanya untuk evaluasi admin.'}
                </p>

                <div className={`mt-6 grid gap-2 sm:gap-3 ${persist ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {[
                        ['Akurasi', `${accuracy}%`],
                        ['Benar', result.correct],
                        ...(persist ? [['XP diperoleh', `+${result.xp}`]] : []),
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:p-4">
                            <p className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">{value}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 text-left">
                    <button
                        type="button"
                        onClick={() => setShowReview((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 font-black text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                        <span className="flex items-center gap-2 text-xs font-black uppercase sm:text-sm">
                            <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-600 dark:text-emerald-400" />
                            Tinjau Rincian Soal ({quiz?.stages?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0} Soal)
                        </span>
                        <ChevronRightIcon sx={{ fontSize: 20 }} className={`transition-transform duration-200 ${showReview ? 'rotate-90' : ''}`} />
                    </button>
                    {showReview && (
                        <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                            {quiz?.stages?.map((stg) => (
                                <div key={stg.id} className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">{stg.label}</p>
                                    {(stg.questions || []).map((q, idx) => {
                                        const isCorrect = correctQuestionIds ? correctQuestionIds.has(q.id) : true;
                                        const target = q.type === 'sentence_builder'
                                            ? q.correctOrder?.map((id) => q.tokens?.find((t) => t.id === id)?.text).filter(Boolean).join('')
                                            : q.correctAnswer;
                                        return (
                                            <div key={q.id || idx} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{q.prompt}</p>
                                                        {target && (
                                                            <p lang="ja" className="mt-1 text-sm font-black font-japanese text-gray-900 dark:text-white">
                                                                {target}
                                                            </p>
                                                        )}
                                                        {q.context && (
                                                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                                {q.context}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${isCorrect ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
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
                    <QuizActionButton onClick={onClose} className="min-h-12">
                        {persist ? 'Kembali ke Roadmap' : 'Tutup Pratinjau'}
                    </QuizActionButton>
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
    const [soundEnabled, setSoundEnabled] = useQuizSoundPreference();
    const [narrationRevision, setNarrationRevision] = useState(0);
    const correctQuestionIds = useRef(new Set());
    const firstAttemptedIds = useRef(new Set());
    const stages = quiz?.stages || [];
    const totalQuestions = useMemo(() => stages.reduce((total, s) => total + (s?.questions?.length || 0), 0), [stages]);
    const stage = stages[stageIndex];
    const question = stage?.questions?.[questionIndex];
    const answeredBeforeCurrent = stages.slice(0, stageIndex).reduce((total, item) => total + (item?.questions?.length || 0), 0) + questionIndex;

    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const hasPushedStateRef = useRef(false);

    useEffect(() => {
        window.history.pushState({ grammarQuiz: true }, '');
        hasPushedStateRef.current = true;

        return () => {
            if (hasPushedStateRef.current) {
                hasPushedStateRef.current = false;
                window.history.back();
            }
        };
    }, []);

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
                ...(quiz?.pattern ? [{ label: 'Pola Grammar', value: quiz.pattern }] : []),
                { label: 'Progres', value: screen === 'intro' ? 'Belum dimulai' : `Tahap ${stageIndex + 1} dari ${stages.length}` },
            ],
            onCancel: () => {
                closeConfirm();
                if (!hasPushedStateRef.current) {
                    window.history.pushState({ grammarQuiz: true }, '');
                    hasPushedStateRef.current = true;
                }
            },
            onConfirm: () => {
                closeConfirm();
                onClose();
            },
        });
    }, [closeConfirm, onClose, openConfirm, quiz?.pattern, screen, stageIndex, stages.length]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleRequestExit();
            }
        };

        const handlePopState = () => {
            hasPushedStateRef.current = false;
            if (screen === 'result') {
                onClose();
            } else {
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
            xp: current.xp,
        }));
        setFeedback({ correct });
        playSoundEffect(correct ? 'correct' : 'incorrect');
        setProcessing(false);
    };

    const continueLesson = async () => {
        if (feedback && !feedback.correct) {
            setAnswer(question.type === 'sentence_builder' ? [] : '');
            setFeedback(null);
            setNarrationRevision((revision) => revision + 1);
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

    if (totalQuestions === 0) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#f7faf8] px-4 text-center dark:bg-gray-950">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                    <AutoStoriesIcon sx={{ fontSize: 32 }} />
                </div>
                <h2 className="mt-4 text-lg font-black text-gray-950 dark:text-white">{persist ? 'Kuis Belum Tersedia' : 'Belum Ada Soal pada Draf'}</h2>
                <p className="mt-1 max-w-sm text-xs font-medium text-gray-500 dark:text-gray-400">{persist ? 'Soal untuk kuis ini belum tersedia.' : 'Draf lesson ini belum memiliki butir soal. Silakan tambahkan soal manual atau generate otomatis terlebih dahulu di builder.'}</p>
                <QuizActionButton onClick={onClose} className="mt-5 flex items-center gap-2 text-xs">
                    <ArrowBackIcon sx={{ fontSize: 16 }} /> {persist ? 'Kembali ke Roadmap' : 'Kembali ke Builder'}
                </QuizActionButton>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#f7faf8] text-gray-900 dark:bg-gray-950 dark:text-white">
            {screen === 'intro' ? (
                <IntroScreen quiz={quiz} onStart={startLesson} onClose={handleRequestExit} />
            ) : screen === 'result' ? (
                <ResultScreen quiz={quiz} result={result} correctQuestionIds={correctQuestionIds.current} onRestart={restart} onClose={onClose} persist={persist} />
            ) : (
                <>
                    <ProgressHeader quiz={quiz} stageIndex={stageIndex} questionIndex={questionIndex} totalAnswered={answeredBeforeCurrent + (feedback ? 1 : 0)} totalQuestions={totalQuestions} onClose={handleRequestExit} persist={persist} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled((value) => !value)} />
                    <QuestionScreen stage={stage} question={question} answer={answer} feedback={feedback} onAnswer={setAnswer} onCheck={checkAnswer} onContinue={continueLesson} processing={processing} soundEnabled={soundEnabled} narrationRevision={narrationRevision} persist={persist} />
                </>
            )}
            <QuizErrorMessage className="fixed bottom-20 left-1/2 z-[170] w-[min(90vw,28rem)] -translate-x-1/2 shadow-lg">{requestError}</QuizErrorMessage>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </div>
    );
}
