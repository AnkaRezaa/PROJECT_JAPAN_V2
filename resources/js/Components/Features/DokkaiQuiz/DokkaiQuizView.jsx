import React, { useState, useEffect, useRef } from 'react';
import BackButton from '@/Components/UI/BackButton';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

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
}) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isPassageSheetOpen, setIsPassageSheetOpen] = useState(false);
    const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const hasSubmittedRef = useRef(false);

    const initialTime = Number(quiz?.time_limit || 0);
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        if (!initialTime || initialTime <= 0) return;
        setTimeLeft(initialTime);
        hasSubmittedRef.current = false;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [initialTime]);

    useEffect(() => {
        if (initialTime > 0 && timeLeft === 0 && !hasSubmittedRef.current && !isSubmitting) {
            hasSubmittedRef.current = true;
            setShowSubmitConfirm(false);
            onSubmitQuiz?.();
        }
    }, [timeLeft, initialTime, isSubmitting, onSubmitQuiz]);

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
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    // Keyboard Shortcuts untuk Laptop & Tablet (1-4 / A-D, Arrows, F for Flag)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (isPassageSheetOpen || showSubmitConfirm) return;

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
    }, [currentQuestion, currentQuestionIndex, totalQuestions, isPassageSheetOpen, showSubmitConfirm]);

    const handleSubmitClick = () => {
        if (isSubmitting || hasSubmittedRef.current) return;
        if (hasUnanswered || hasFlagged) {
            setShowSubmitConfirm(true);
            return;
        }
        hasSubmittedRef.current = true;
        onSubmitQuiz?.();
    };

    return (
        <div className="w-full">
            {/* Quick Passage Access Trigger on Mobile & Tablet (< lg) */}
            <div className="lg:hidden mb-3">
                <button
                    type="button"
                    onClick={() => setIsPassageSheetOpen(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 transition active:scale-[0.99] shadow-xs"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                        <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Baca Teks Wacana Acuan</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Buka Wacana →
                    </span>
                </button>
            </div>

            {/* Slide-Up Sheet Modal for Reading Passage on Mobile & Tablet */}
            {isPassageSheetOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsPassageSheetOpen(false)}
                    />
                    <div className="relative z-10 w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
                        {/* Sheet Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-500 shrink-0" />
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white font-japanese truncate">
                                    {quiz?.title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPassageSheetOpen(false)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        {/* Paragraphs Scrollable Content with Ruby Furigana */}
                        <div className="flex-1 overflow-y-auto space-y-4 font-japanese text-base sm:text-lg leading-[2.4] text-gray-950 dark:text-gray-50 tracking-wide pr-1">
                            {paragraphs.map((p) => (
                                <section key={p.id} className="rounded-2xl bg-gray-50/80 p-4 sm:p-5 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800">
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
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                            >
                                Tutup & Lanjut Menjawab Soal
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                <div className="w-full lg:col-span-7 2xl:col-span-7 flex flex-col gap-3.5">
                    {/* Navigation Bar / Question Selector */}
                    <div className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
                                Soal:
                            </span>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
                                {questions.map((q, idx) => {
                                    const isAnswered = Boolean(selectedAnswers[q.id]);
                                    const isCurrent = idx === currentQuestionIndex;
                                    const isFlagged = flaggedQuestions.has(q.id);

                                    return (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
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
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                </span>
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
                                        ? 'bg-rose-100 text-rose-700 animate-pulse dark:bg-rose-950/60 dark:text-rose-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                    ⏱️ {formatTimer(timeLeft)}
                                </span>
                            )}
                            <span className="text-xs font-bold text-gray-400">
                                {answeredCount}/{totalQuestions} Terjawab
                            </span>
                            {isAllAnswered && (
                                <button
                                    type="button"
                                    onClick={handleSubmitClick}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                                >
                                    <CheckCircleIcon sx={{ fontSize: 13 }} />
                                    <span>{isSubmitting ? 'Mengirim...' : 'Kumpulkan'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Question Canvas Card */}
                    {currentQuestion && (
                        <div className="rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
                            {/* Question Header */}
                            <div className="pb-2.5 mb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                        Pertanyaan {currentQuestion.question_number || currentQuestionIndex + 1}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleFlag(currentQuestion.id)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
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
                                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition active:scale-95"
                                    title="Intip teks wacana acuan"
                                >
                                    <AutoStoriesIcon sx={{ fontSize: 14 }} />
                                    <span>Intip Wacana</span>
                                </button>
                            </div>

                            {/* Question Text */}
                            <h3 className="text-xl sm:text-2xl font-extrabold font-japanese text-gray-950 dark:text-white leading-relaxed mb-2 tracking-wide">
                                {currentQuestion.question_text}
                            </h3>
                            {currentQuestion.question_translation && (
                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 mb-5 leading-relaxed font-normal">
                                    {currentQuestion.question_translation}
                                </p>
                            )}

                            {/* Tactile 3D Duolingo-style Options: 2 Columns on sm/laptop */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mt-2">
                                {(currentQuestion.options || []).map((opt) => {
                                    const isSelected = selectedAnswers[currentQuestion.id] === opt.option_label;

                                    return (
                                        <button
                                            key={opt.id || opt.option_label}
                                            type="button"
                                            onClick={() => onSelectAnswer(currentQuestion.id, opt.option_label)}
                                            className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 transition-all flex items-start gap-3.5 group cursor-pointer select-none ${
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
                                                <p className="font-japanese text-base sm:text-lg font-bold text-gray-950 dark:text-gray-50 leading-relaxed tracking-wide">
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
                            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentQuestionIndex === 0}
                                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                                >
                                    <ArrowBackIcon sx={{ fontSize: 16 }} />
                                    <span>Sebelumnya</span>
                                </button>

                                {currentQuestionIndex < totalQuestions - 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl bg-gray-900 border-b-4 border-gray-950 text-white text-xs font-bold shadow-xs hover:bg-gray-800 dark:bg-gray-800 dark:border-gray-950 dark:text-white dark:hover:bg-gray-700 active:border-b-2 active:translate-y-[2px] transition"
                                    >
                                        <span>Berikutnya</span>
                                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                    </button>
                                ) : (
                                    <div className="flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={handleSubmitClick}
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 border-b-4 border-emerald-700 text-white text-xs font-bold shadow-md hover:bg-emerald-700 active:border-b-2 active:translate-y-[2px] transition cursor-pointer disabled:opacity-50"
                                        >
                                            <CheckCircleIcon sx={{ fontSize: 16 }} />
                                            <span>{isSubmitting ? 'Mengirim Jawaban...' : 'Kumpulkan Jawaban'}</span>
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
