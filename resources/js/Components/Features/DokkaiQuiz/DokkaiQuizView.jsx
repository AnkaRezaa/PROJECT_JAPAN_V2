import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import BackButton from '@/Components/UI/BackButton';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function renderPassageWithFurigana(text, vocabs, isFuriganaEnabled) {
    if (!text) return null;
    if (!isFuriganaEnabled || !vocabs || vocabs.length === 0) {
        return <p className="whitespace-pre-line">{text}</p>;
    }
    const sortedVocabs = [...vocabs]
        .filter((v) => Boolean(v?.word && v?.furigana && v.word !== v.furigana))
        .sort((a, b) => b.word.length - a.word.length);

    if (sortedVocabs.length === 0) {
        return <p className="whitespace-pre-line">{text}</p>;
    }

    const escapedWords = sortedVocabs.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const vocabRegex = new RegExp(`(${escapedWords.join('|')})`, 'g');
    const parts = text.split(vocabRegex);

    return (
        <p className="whitespace-pre-line">
            {parts.map((part, index) => {
                const matchingVocab = sortedVocabs.find((v) => v.word === part);
                if (!matchingVocab) {
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                }
                return (
                    <ruby key={index} className="px-0.5">
                        {matchingVocab.word}
                        <rt className="text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                            {matchingVocab.furigana}
                        </rt>
                    </ruby>
                );
            })}
        </p>
    );
}

export default function DokkaiQuizView({
    quiz,
    paragraphs = [],
    vocabularies = [],
    showFurigana = true,
    fontSize = 'base',
    questions = [],
    selectedAnswers = {},
    onSelectAnswer,
    onSubmitQuiz,
    isSubmitting = false,
    onBackToReading,
    timeLeft = 0,
    questionId,
    onQuestionChange,
    answersLocked = false,
}) {
    const currentQuestionIndex = Math.max(0, questions.findIndex((question) => question.id === questionId));
    const setCurrentQuestionIndex = (index) => onQuestionChange?.(questions[index]?.id);
    const [isPassageSheetOpen, setIsPassageSheetOpen] = useState(false);
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const hasSubmittedRef = useRef(false);

    const initialTime = Number(quiz?.time_limit || 0);
    const answersDisabled = isSubmitting || answersLocked || (initialTime > 0 && timeLeft <= 0);

    useEffect(() => {
        if (initialTime > 0 && timeLeft === 0 && !hasSubmittedRef.current && !isSubmitting && !answersLocked) {
            hasSubmittedRef.current = true;
            setShowSubmitConfirm(false);
            onSubmitQuiz?.();
        }
    }, [timeLeft, initialTime, isSubmitting, answersLocked, onSubmitQuiz]);

    const formatTimer = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const currentQuestion = questions[currentQuestionIndex] || questions[0];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const isAllAnswered = totalQuestions > 0 && answeredCount >= totalQuestions;
    const hasUnanswered = !isAllAnswered;
    const hasFlagged = flaggedQuestions.size > 0;
    const firstUnansweredIndex = questions.findIndex((q) => !selectedAnswers[q.id]);

    const toggleFlag = (questionId) => {
        setFlaggedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    // Keyboard Shortcuts untuk Laptop & Tablet (1-4 / A-D, Arrows, F for Flag)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (isPassageSheetOpen || showSubmitConfirm || isSubmitting || answersLocked) return;

            const key = e.key ? e.key.toUpperCase() : '';
            const options = currentQuestion?.options || [];

            if (['1', '2', '3', '4'].includes(key)) {
                const optIndex = parseInt(key, 10) - 1;
                if (options[optIndex]) {
                    e.preventDefault();
                    onSelectAnswer(currentQuestion.id, options[optIndex].option_label);
                }
            } else if (['A', 'B', 'C', 'D'].includes(key)) {
                const opt = options.find((o) => o.option_label?.toUpperCase() === key);
                if (opt) {
                    e.preventDefault();
                    onSelectAnswer(currentQuestion.id, opt.option_label);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (key === 'F') {
                e.preventDefault();
                if (currentQuestion?.id) toggleFlag(currentQuestion.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestion, currentQuestionIndex, totalQuestions, isPassageSheetOpen, showSubmitConfirm, isSubmitting, answersLocked]);

    const handleSubmitClick = () => {
        if (isSubmitting || answersLocked || hasSubmittedRef.current) return;
        if (hasUnanswered || hasFlagged) {
            setShowSubmitConfirm(true);
            return;
        }
        hasSubmittedRef.current = true;
        onSubmitQuiz?.();
    };

    return (
        <div className="w-full">
            <Dialog open={isPassageSheetOpen} onClose={setIsPassageSheetOpen} className="relative z-[180]">
                <div aria-hidden="true" className="fixed inset-0 bg-black/40" />
                <div className="fixed inset-0 flex items-end justify-center">
                    <DialogPanel className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-xl border-t border-gray-200 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                        {/* Sheet Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-500 shrink-0" />
                                <DialogTitle className="min-w-0 [overflow-wrap:anywhere] font-japanese text-sm font-bold text-gray-900 dark:text-white">
                                    {quiz?.title}
                                </DialogTitle>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPassageSheetOpen(false)}
                                aria-label="Tutup wacana"
                                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        {/* Paragraphs Scrollable Content with Ruby Furigana */}
                        <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] pr-1 font-japanese leading-[2.2] text-gray-950 dark:text-gray-50 ${fontSize === 'lg' ? 'text-lg' : fontSize === 'sm' ? 'text-sm' : 'text-base'}`}>
                            {paragraphs.map((p) => (
                                <section key={p.id} className="border-b border-gray-200/80 px-1 pb-3 dark:border-gray-800 sm:px-3">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                                        {p.label || `Paragraf ${p.paragraph_number}`}
                                    </div>
                                    {renderPassageWithFurigana(p.content_raw, vocabularies, showFurigana)}
                                </section>
                            ))}
                        </div>

                        {/* Bottom Action inside sheet */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setIsPassageSheetOpen(false)}
                                className="min-h-11 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                            >
                                Kembali ke Soal
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            {/* Main Stage: Dual-Column on Laptops & Desktops (lg:), Single-Column on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                {/* LEFT COLUMN: Sticky Reading Passage on Laptops & Desktops (lg:) */}
                <div className="hidden lg:block lg:col-span-5 2xl:col-span-5 lg:sticky lg:top-20">
                    <div className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 max-h-[calc(100vh-7rem)] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                <AutoStoriesIcon sx={{ fontSize: 16 }} />
                                <span>Teks Acuan Soal</span>
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {paragraphs.length} Paragraf
                            </span>
                        </div>
                        <h2 className="text-xl font-extrabold font-japanese text-gray-950 dark:text-white mb-3">
                            {quiz?.title}
                        </h2>
                        <div className="space-y-4 font-japanese text-base sm:text-lg leading-[2.4] text-gray-950 dark:text-gray-50 tracking-wide">
                            {paragraphs.map((p) => (
                                <section key={p.id} className="rounded-2xl bg-gray-50/70 p-4 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                                        {p.label || `Paragraf ${p.paragraph_number}`}
                                    </div>
                                    {renderPassageWithFurigana(p.content_raw, vocabularies, showFurigana)}
                                </section>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Interactive Question Card (Full width on < lg, 7 cols on lg:) */}
                <div className="flex w-full min-w-0 flex-col gap-2.5 lg:col-span-7 lg:gap-3.5">
                    {/* Navigation Bar / Question Selector */}
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200/90 bg-white px-2.5 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:gap-2.5 lg:rounded-2xl lg:p-3">
                        <div className="flex min-w-0 max-w-full items-center gap-2 max-lg:basis-full">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
                                Soal:
                            </span>
                            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain py-1">
                                {questions.map((q, idx) => {
                                    const isAnswered = Boolean(selectedAnswers[q.id]);
                                    const isCurrent = idx === currentQuestionIndex;
                                    const isFlagged = flaggedQuestions.has(q.id);

                                    return (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            aria-label={`Soal ${idx + 1}${isFlagged ? ', ragu-ragu' : ''}`}
                                            aria-current={isCurrent ? 'step' : undefined}
                                            className={`relative flex size-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition lg:size-8 lg:rounded-xl ${
                                                isCurrent
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : isAnswered
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                                            } ${isFlagged ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
                                            title={`Soal ${idx + 1}${isFlagged ? ' (Ragu-ragu)' : ''}`}
                                        >
                                            {q.question_number || idx + 1}
                                            {isFlagged && (
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {initialTime > 0 && (
                                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${
                                    timeLeft < 60
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                    <AccessTimeIcon sx={{ fontSize: 13 }} />
                                    <span>{formatTimer(timeLeft)}</span>
                                </span>
                            )}
                            <span className="text-xs font-bold text-gray-400">
                                {answeredCount}/{totalQuestions} Terjawab
                            </span>
                            {isAllAnswered && (
                                <button
                                    type="button"
                                    onClick={handleSubmitClick}
                                    disabled={isSubmitting || answersLocked}
                                    className="hidden items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 lg:inline-flex"
                                >
                                    <CheckCircleIcon sx={{ fontSize: 13 }} />
                                    <span>{isSubmitting ? 'Mengirim...' : 'Kumpulkan'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Question Canvas Card */}
                    {currentQuestion && (
                        <div className="flex min-w-0 flex-col rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-3xl sm:p-5 lg:p-6">
                            {/* Question Header */}
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-gray-100 pb-2 dark:border-gray-800 sm:mb-3 sm:pb-2.5">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                        Pertanyaan {currentQuestion.question_number || currentQuestionIndex + 1}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleFlag(currentQuestion.id)}
                                        aria-pressed={flaggedQuestions.has(currentQuestion.id)}
                                        className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 lg:min-h-0 ${
                                            flaggedQuestions.has(currentQuestion.id)
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                        title="Tandai soal ragu-ragu"
                                    >
                                        {flaggedQuestions.has(currentQuestion.id) ? (
                                            <BookmarkIcon sx={{ fontSize: 14 }} className="text-amber-600" />
                                        ) : (
                                            <BookmarkBorderIcon sx={{ fontSize: 14 }} />
                                        )}
                                        <span>{flaggedQuestions.has(currentQuestion.id) ? 'Ragu-ragu' : 'Tandai'}</span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPassageSheetOpen(true)}
                                    aria-haspopup="dialog"
                                    className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 lg:hidden"
                                >
                                    <AutoStoriesIcon sx={{ fontSize: 14 }} />
                                    <span>Wacana</span>
                                </button>
                            </div>

                            {/* Question Text */}
                            <h3 className="mb-2 [overflow-wrap:anywhere] font-japanese text-lg font-extrabold leading-relaxed text-gray-950 dark:text-white sm:text-2xl sm:tracking-wide">
                                <HighlightedLearningText text={currentQuestion.question_text} term={currentQuestion.highlight_text} variant="question" />
                            </h3>
                            {currentQuestion.question_translation && (
                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-5 leading-relaxed font-normal">
                                    {currentQuestion.question_translation}
                                </p>
                            )}

                            {/* Tactile 3D Duolingo-style Options: 2 Columns on sm/laptop */}
                            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
                                {(currentQuestion.options || []).map((opt) => {
                                    const isSelected = selectedAnswers[currentQuestion.id] === opt.option_label;

                                    return (
                                        <button
                                            key={opt.id || opt.option_label}
                                            type="button"
                                            onClick={() => onSelectAnswer(currentQuestion.id, opt.option_label)}
                                            disabled={answersDisabled}
                                            aria-pressed={isSelected}
                                            className={`group flex min-h-12 w-full min-w-0 cursor-pointer select-none items-start gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all sm:gap-3.5 sm:rounded-2xl sm:p-4.5 ${
                                                isSelected
                                                    ? 'border-emerald-500 border-b-[4px] border-b-emerald-600 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500 dark:border-b-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500/20 active:border-b-2 active:translate-y-[2px]'
                                                    : 'border-gray-200 border-b-[4px] border-b-gray-300 bg-white hover:border-gray-300 hover:bg-gray-50/60 dark:border-gray-700 dark:border-b-gray-900 dark:bg-gray-800/90 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-100 active:border-b-2 active:translate-y-[2px]'
                                            }`}
                                        >
                                            <span
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black transition ${
                                                    isSelected
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                                                }`}
                                            >
                                                {opt.option_label}
                                            </span>
                                            <div className="flex-1 pt-0.5 min-w-0">
                                                <p className="[overflow-wrap:anywhere] font-japanese text-base font-bold leading-relaxed text-gray-950 dark:text-gray-50 sm:text-lg sm:tracking-wide">
                                                    {opt.option_text}
                                                </p>
                                                {opt.option_translation && (
                                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-normal font-medium">
                                                        {opt.option_translation}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Navigation Prev / Next & Submit */}
                            <div className="mt-4 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 sm:mt-5 sm:flex sm:items-center sm:justify-between sm:gap-2.5 sm:pt-4">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentQuestionIndex === 0}
                                    aria-label="Soal sebelumnya"
                                    title="Soal sebelumnya"
                                    className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:min-h-0 sm:w-auto sm:gap-1.5 sm:rounded-xl sm:px-4"
                                >
                                    <ArrowBackIcon sx={{ fontSize: 16 }} />
                                    <span className="hidden sm:inline">Sebelumnya</span>
                                </button>

                                {currentQuestionIndex < totalQuestions - 1 ? (
                                    <>
                                    <span className="self-center text-center text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400 sm:hidden">
                                        {currentQuestionIndex + 1} / {totalQuestions}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        aria-label="Soal berikutnya"
                                        title="Soal berikutnya"
                                        className="flex min-h-11 w-full min-w-0 items-center justify-center gap-1 rounded-lg border-b-4 border-gray-950 bg-gray-900 px-2 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-gray-800 active:translate-y-[2px] active:border-b-2 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 sm:min-h-0 sm:w-auto sm:gap-1.5 sm:rounded-xl sm:px-6"
                                    >
                                        <span className="hidden sm:inline">Berikutnya</span>
                                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                    </button>
                                    </>
                                ) : (
                                    <div className="col-span-2 flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
                                        <button
                                            type="button"
                                            onClick={handleSubmitClick}
                                            disabled={isSubmitting || answersLocked}
                                            className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border-b-4 border-emerald-700 bg-emerald-600 px-2 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:translate-y-[2px] active:border-b-2 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:gap-1.5 sm:rounded-xl sm:px-6 sm:py-2.5"
                                        >
                                            <CheckCircleIcon sx={{ fontSize: 16 }} />
                                            <span>{isSubmitting ? 'Mengirim...' : <>Kumpulkan<span className="hidden sm:inline"> Jawaban</span></>}</span>
                                        </button>
                                        {firstUnansweredIndex !== -1 && (
                                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 text-center sm:text-right">
                                                * Soal No. {firstUnansweredIndex + 1} belum dijawab (klik untuk melengkapi)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Back to Reading Action */}
                    <div className="flex justify-start items-center">
                        <BackButton onClick={onBackToReading}>
                            Kembali ke Teks Wacana
                        </BackButton>
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <ConfirmActionDialog
                show={showSubmitConfirm}
                processing={isSubmitting}
                zIndex="z-[10050]"
                variant={hasUnanswered ? 'warning' : hasFlagged ? 'warning' : 'success'}
                title={hasUnanswered ? 'Masih Ada Soal Belum Terjawab' : hasFlagged ? 'Periksa Soal Bertanda Ragu-ragu' : 'Kumpulkan Jawaban Kuis'}
                message={
                    hasUnanswered
                        ? `Masih ada ${totalQuestions - answeredCount} soal yang belum dijawab${hasFlagged ? ` dan ${flaggedQuestions.size} soal bertanda ragu-ragu` : ''}. Yakin ingin mengumpulkan sekarang?`
                        : hasFlagged
                            ? `Kamu masih memiliki ${flaggedQuestions.size} soal yang ditandai ragu-ragu. Yakin ingin mengumpulkan sekarang?`
                            : `Semua ${totalQuestions} soal telah dijawab. Apakah kamu yakin ingin menyelesaikan kuis ini?`
                }
                confirmLabel="Ya, Kumpulkan"
                cancelLabel="Periksa Lagi"
                onConfirm={() => {
                    if (isSubmitting || hasSubmittedRef.current) return;
                    hasSubmittedRef.current = true;
                    setShowSubmitConfirm(false);
                    onSubmitQuiz?.();
                }}
                onCancel={() => setShowSubmitConfirm(false)}
            />
        </div>
    );
}
