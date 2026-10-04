import React, { useState } from 'react';
import BackButton from '@/Components/UI/BackButton';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';

function renderParagraphWithEvidence(content, quote, isEvidence) {
    if (!content) return null;
    if (!isEvidence || !quote || !content.includes(quote)) {
        return <p className="whitespace-pre-line">{content}</p>;
    }
    const parts = content.split(quote);
    return (
        <p className="whitespace-pre-line">
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <mark className="bg-amber-200 dark:bg-amber-900/80 text-gray-950 dark:text-amber-100 rounded px-1.5 py-0.5 font-bold border-b-2 border-amber-500 shadow-2xs">
                            {quote}
                        </mark>
                    )}
                </React.Fragment>
            ))}
        </p>
    );
}

export default function DokkaiReviewView({
    quiz,
    paragraphs = [],
    questions = [],
    userAnswers = {},
    onProceedToGlossary,
    onBackToResult,
}) {
    const [highlightedParagraphId, setHighlightedParagraphId] = useState(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);

    const scrollToEvidence = (paragraphId) => {
        setHighlightedParagraphId(paragraphId);
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        if (isMobile) {
            setIsPassageModalOpen(true);
        }
        const delay = isMobile ? 320 : 60;
        setTimeout(() => {
            const targetId = isMobile ? `mobile-review-paragraph-${paragraphId}` : `review-paragraph-${paragraphId}`;
            const element = document.getElementById(targetId) || document.getElementById(`review-paragraph-${paragraphId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, delay);
    };

    const currentQuestion = questions[activeQuestionIndex] || questions[0];

    return (
        <div className="w-full">
            {/* Quick Passage Access Trigger on Mobile & Tablet (< lg) */}
            <div className="lg:hidden mb-3">
                <button
                    type="button"
                    onClick={() => setIsPassageModalOpen(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 transition active:scale-[0.99] shadow-xs"
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                        <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Buka Wacana & Cek Eviden</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Buka Wacana →
                    </span>
                </button>
            </div>

            {/* Slide-Up Sheet Modal for Evidence Reading on Mobile & Tablet */}
            {isPassageModalOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsPassageModalOpen(false)}
                    />
                    <div className="relative z-10 w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-500 shrink-0" />
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white font-japanese truncate">
                                    Wacana & Eviden Jawaban
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPassageModalOpen(false)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 font-japanese text-sm leading-[2.1] text-gray-700 dark:text-gray-300 pr-1">
                            {paragraphs.map((p) => {
                                const isHighlighted = highlightedParagraphId === p.id || currentQuestion?.evidence_paragraph_id === p.id;
                                return (
                                    <section
                                        key={p.id}
                                        id={`mobile-review-paragraph-${p.id}`}
                                        className={`rounded-2xl p-3.5 transition-all duration-300 border ${
                                            isHighlighted
                                                ? 'ring-2 ring-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 shadow-sm'
                                                : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between pb-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            <span>{p.label || `Paragraf ${p.paragraph_number}`}</span>
                                            {isHighlighted && (
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <FindInPageIcon sx={{ fontSize: 13 }} />
                                                    <span>Eviden Terpilih</span>
                                                </span>
                                            )}
                                        </div>
                                        {renderParagraphWithEvidence(p.content_raw, currentQuestion?.evidence_quote, isHighlighted)}
                                    </section>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setIsPassageModalOpen(false)}
                                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                            >
                                Tutup & Kembali ke Pembahasan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                {/* LEFT COLUMN: Sticky Reading Passage on Laptops & Desktops (lg:) */}
                <div className="hidden lg:block lg:col-span-5 2xl:col-span-5 lg:sticky lg:top-20">
                    <div className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 max-h-[calc(100vh-7rem)] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                <AutoStoriesIcon sx={{ fontSize: 16 }} />
                                <span>Wacana Acuan Eviden</span>
                            </span>
                            <span className="text-[11px] text-gray-400">
                                Klik tombol eviden pada soal
                            </span>
                        </div>

                        <h2 className="text-lg font-bold font-japanese text-gray-900 dark:text-white mb-3">
                            {quiz?.title}
                        </h2>

                        <div className="space-y-3 font-japanese text-sm leading-[2.1] text-gray-700 dark:text-gray-300">
                            {paragraphs.map((p) => {
                                const isHighlighted = highlightedParagraphId === p.id || currentQuestion?.evidence_paragraph_id === p.id;

                                return (
                                    <section
                                        key={p.id}
                                        id={`review-paragraph-${p.id}`}
                                        className={`rounded-2xl p-3.5 transition-all duration-300 border ${
                                            isHighlighted
                                                ? 'ring-2 ring-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 shadow-sm'
                                                : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between pb-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            <span>{p.label || `Paragraf ${p.paragraph_number}`}</span>
                                            {isHighlighted && (
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <FindInPageIcon sx={{ fontSize: 13 }} />
                                                    <span>Eviden Terpilih</span>
                                                </span>
                                            )}
                                        </div>
                                        {renderParagraphWithEvidence(p.content_raw, currentQuestion?.evidence_quote, isHighlighted)}
                                    </section>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Question Breakdown & Distractor Traps */}
                <div className="w-full lg:col-span-7 2xl:col-span-7 flex flex-col gap-4">
                    {/* Question Switcher Tabs */}
                    <div className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between gap-2 overflow-x-auto">
                        <div className="flex items-center gap-1.5">
                            {questions.map((q, idx) => {
                                const userAns = userAnswers[q.id];
                                const correctOpt = (q.options || []).find((o) => o.is_correct);
                                const isCorrect = userAns && correctOpt && userAns === correctOpt.option_label;
                                const isCurrent = idx === activeQuestionIndex;

                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveQuestionIndex(idx);
                                            if (q.evidence_paragraph_id) {
                                                scrollToEvidence(q.evidence_paragraph_id);
                                            }
                                        }}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            isCurrent
                                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                                                : isCorrect
                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                                        }`}
                                    >
                                        <span>No. {q.question_number || idx + 1}</span>
                                        {isCorrect ? (
                                            <CheckCircleIcon sx={{ fontSize: 14 }} className="text-emerald-500" />
                                        ) : (
                                            <CancelIcon sx={{ fontSize: 14 }} className="text-rose-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <span className="text-[11px] font-bold text-gray-400 shrink-0">
                            {activeQuestionIndex + 1}/{questions.length}
                        </span>
                    </div>

                    {/* Detailed Analysis Card for Active Question */}
                    {currentQuestion && (
                        <div className="rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                            {/* Header & Evidence Trigger Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Pembahasan Soal {currentQuestion.question_number || activeQuestionIndex + 1}
                                </span>

                                {currentQuestion.evidence_paragraph_id && (
                                    <button
                                        type="button"
                                        onClick={() => scrollToEvidence(currentQuestion.evidence_paragraph_id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs transition active:scale-95 shadow-2xs"
                                    >
                                        <FindInPageIcon sx={{ fontSize: 15 }} />
                                        <span>Lihat Eviden di Wacana</span>
                                    </button>
                                )}
                            </div>

                            {/* Question Title */}
                            <div>
                                <h3 className="text-xl sm:text-2xl font-extrabold font-japanese text-gray-950 dark:text-white leading-relaxed tracking-wide">
                                    {currentQuestion.question_text}
                                </h3>
                                {currentQuestion.question_translation && (
                                    <p className="mt-1.5 text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed font-normal">
                                        {currentQuestion.question_translation}
                                    </p>
                                )}
                            </div>

                            {/* Options Breakdown with Correct/Incorrect Markers in 2 Columns on sm/laptop */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(currentQuestion.options || []).map((opt) => {
                                    const isUserChoice = userAnswers[currentQuestion.id] === opt.option_label;
                                    const isCorrect = opt.is_correct;

                                    return (
                                        <div
                                            key={opt.id || opt.option_label}
                                            className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition flex flex-col justify-between ${
                                                isCorrect
                                                    ? 'border-emerald-500/80 bg-emerald-50/80 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-600'
                                                    : isUserChoice
                                                    ? 'border-rose-400 bg-rose-50/80 text-rose-950 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700'
                                                    : 'border-gray-200 bg-gray-50/60 text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                                                isCorrect
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : isUserChoice
                                                                    ? 'bg-rose-600 text-white'
                                                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                            }`}
                                                        >
                                                            {opt.option_label}
                                                        </span>
                                                        <span className="font-bold font-japanese text-sm sm:text-base text-gray-950 dark:text-white leading-relaxed">
                                                            {opt.option_text}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        {isCorrect && (
                                                            <span className="rounded bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 uppercase">
                                                                Benar
                                                            </span>
                                                        )}
                                                        {isUserChoice && !isCorrect && (
                                                            <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-900 dark:bg-rose-900 dark:text-rose-100 uppercase">
                                                                Pilihanmu
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {opt.option_translation && (
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium leading-normal">
                                                        {opt.option_translation}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Evidence Quote Card */}
                            {currentQuestion.evidence_quote && (
                                <div className="rounded-2xl bg-sky-50/90 p-4 sm:p-5 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60">
                                    <div className="text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 mb-1.5">
                                        Kutipan Bukti Langsung (Evidence Quote)
                                    </div>
                                    <blockquote className="font-japanese text-sm sm:text-base leading-relaxed text-sky-950 dark:text-sky-100 font-medium italic border-l-3 border-sky-500 pl-3">
                                        "{currentQuestion.evidence_quote}"
                                    </blockquote>
                                </div>
                            )}

                            {/* Explanation Body */}
                            {currentQuestion.explanation_correct && (
                                <div className="rounded-2xl bg-gray-50/90 p-4 sm:p-5 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800 space-y-2">
                                    <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                                        <LightbulbOutlinedIcon sx={{ fontSize: 18 }} className="text-amber-500" />
                                        <span>Penjelasan Kunci Jawaban</span>
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-normal">
                                        {currentQuestion.explanation_correct}
                                    </p>
                                </div>
                            )}

                            {/* Distractor Traps Analysis */}
                            {currentQuestion.explanation_distractors && (
                                <div className="space-y-2.5 pt-2">
                                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Analisis Jebakan Pilihan (Distractor Traps):
                                    </div>
                                    <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                                        {Object.entries(currentQuestion.explanation_distractors).map(([lbl, exp]) => (
                                            <div key={lbl} className="rounded-xl bg-gray-100/70 p-3 dark:bg-gray-800/80 flex items-start gap-2.5">
                                                <span className="font-extrabold text-gray-950 dark:text-white uppercase shrink-0">
                                                    Opsi {lbl}:
                                                </span>
                                                <p className="leading-relaxed text-gray-800 dark:text-gray-200 font-normal">
                                                    {exp}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom CTA to Glossary */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <BackButton onClick={onBackToResult}>
                            Kembali ke Hasil
                        </BackButton>

                        <button
                            type="button"
                            onClick={onProceedToGlossary}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                        >
                            <MenuBookIcon sx={{ fontSize: 16 }} />
                            <span>Lanjut ke Glosarium & Latihan</span>
                            <ArrowForwardIcon sx={{ fontSize: 16 }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
