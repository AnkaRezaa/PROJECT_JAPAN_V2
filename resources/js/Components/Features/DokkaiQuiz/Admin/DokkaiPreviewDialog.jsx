import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function renderPreviewTextWithFurigana(text, vocabs, showFurigana) {
    if (!text) return null;
    if (!showFurigana || !vocabs || vocabs.length === 0) {
        return <span className="whitespace-pre-line">{text}</span>;
    }

    const sortedVocabs = [...vocabs]
        .filter((v) => Boolean(v?.word && v?.furigana && v.word !== v.furigana))
        .sort((a, b) => b.word.length - a.word.length);

    if (sortedVocabs.length === 0) {
        return <span className="whitespace-pre-line">{text}</span>;
    }

    const escapedWords = sortedVocabs.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const vocabRegex = new RegExp(`(${escapedWords.join('|')})`, 'g');
    const parts = text.split(vocabRegex);

    return (
        <span className="whitespace-pre-line">
            {parts.map((part, index) => {
                const matchingVocab = sortedVocabs.find((v) => v.word === part);
                if (!matchingVocab) {
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                }
                return (
                    <ruby key={index} className="px-0.5">
                        {matchingVocab.word}
                        <rt className="text-indigo-700 dark:text-indigo-300 font-semibold text-[10px]">
                            {matchingVocab.furigana}
                        </rt>
                    </ruby>
                );
            })}
        </span>
    );
}

export default function DokkaiPreviewDialog({ open, onClose, draft }) {
    const [fontSize, setFontSize] = useState('base');
    const [showFurigana, setShowFurigana] = useState(true);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [activeTab, setActiveTab] = useState('reading');

    if (!open || !draft) return null;

    const passage = draft.passage || {};
    const paragraphs = draft.paragraphs || [];
    const questions = draft.questions || [];
    const vocabularies = draft.vocabularies || [];

    const fontSizeClasses = {
        sm: 'text-sm leading-relaxed',
        base: 'text-base leading-loose',
        lg: 'text-lg leading-loose',
        xl: 'text-xl leading-loose',
    };

    const handleSelectOption = (qIdx, optLabel) => {
        setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optLabel }));
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dokkai-preview-title"
            className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-6 bg-gray-900/70 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            <VisibilityIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    JLPT {passage.jlpt_level || 'N3'}
                                </span>
                                <h3 id="dokkai-preview-title" className="text-sm font-black text-gray-900 dark:text-white">
                                    Pratinjau Siswa (Student Preview Mode)
                                </h3>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Simulasi tampilan antarmuka saat dikerjakan oleh siswa di HP atau Laptop.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                {/* Sub-bar Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-xs dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('reading')}
                            className={`rounded-lg px-3 py-1 font-bold transition ${
                                activeTab === 'reading'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            1. Teks Wacana
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('quiz')}
                            className={`rounded-lg px-3 py-1 font-bold transition ${
                                activeTab === 'quiz'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            2. Kuis ({questions.length} Soal)
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFurigana(!showFurigana)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                                showFurigana
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'border-gray-200 text-gray-500 dark:border-gray-700'
                            }`}
                        >
                            {showFurigana ? 'Furigana: Aktif' : 'Furigana: Mati'}
                        </button>

                        <div className="flex items-center rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                            {['sm', 'base', 'lg', 'xl'].map((sz) => (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setFontSize(sz)}
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase transition ${
                                        fontSize === sz
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                                    }`}
                                >
                                    {sz}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-950/40">
                    {activeTab === 'reading' && (
                        <article className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6">
                            <header className="border-b border-gray-100 pb-4 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                        {passage.theme_category || 'Umum'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        ⏱️ Estimasi {passage.estimated_reading_time || 5} Menit
                                    </span>
                                </div>
                                <h2 className="font-japanese text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-snug">
                                    {passage.title || 'Judul Wacana'}
                                </h2>
                                {passage.sub_title && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {passage.sub_title}
                                    </p>
                                )}
                            </header>

                            <div className={`font-japanese space-y-4 text-gray-800 dark:text-gray-200 ${fontSizeClasses[fontSize]}`}>
                                {paragraphs.map((p, idx) => (
                                    <p key={idx} className="indent-4 leading-loose">
                                        {renderPreviewTextWithFurigana(p.content_raw, vocabularies, showFurigana)}
                                    </p>
                                ))}
                            </div>

                            {vocabularies.length > 0 && (
                                <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
                                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2">
                                        Glosarium Kosakata ({vocabularies.length} kata)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {vocabularies.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg border border-gray-100 bg-gray-50/70 p-2 text-xs dark:border-gray-800 dark:bg-gray-950/40"
                                            >
                                                <span className="font-japanese font-bold text-indigo-700 dark:text-indigo-300 block">
                                                    {v.word} ({v.furigana})
                                                </span>
                                                <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate block">
                                                    {v.meaning}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </article>
                    )}

                    {activeTab === 'quiz' && (
                        <div className="mx-auto max-w-2xl space-y-4">
                            {questions.map((q, qIdx) => (
                                <div
                                    key={qIdx}
                                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                                            {qIdx + 1}
                                        </span>
                                        <div>
                                            <h4 className="font-japanese text-sm font-black text-gray-900 dark:text-white leading-relaxed">
                                                {q.question_text}
                                            </h4>
                                            {q.question_translation && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {q.question_translation}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-1">
                                        {(q.options || []).map((opt) => {
                                            const isSelected = selectedAnswers[qIdx] === opt.option_label;
                                            return (
                                                <button
                                                    key={opt.option_label}
                                                    type="button"
                                                    onClick={() => handleSelectOption(qIdx, opt.option_label)}
                                                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                                        isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40'
                                                            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950'
                                                    }`}
                                                >
                                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black transition ${
                                                        isSelected
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                                    }`}>
                                                        {opt.option_label}
                                                    </span>
                                                    <span className="font-japanese text-xs font-medium text-gray-800 dark:text-gray-200">
                                                        {opt.option_text}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Eviden hint in preview */}
                                    {q.evidence_quote && (
                                        <div className="rounded-lg bg-emerald-50/60 p-2.5 text-[11px] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                                            <span className="font-black">📌 Eviden (Paragraf {q.evidence_paragraph_number}): </span>
                                            <span className="font-japanese italic">"{q.evidence_quote}"</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="text-xs text-gray-400">
                        Ini adalah mode pratinjau. Jawaban yang dipilih di sini tidak akan disimpan ke database.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                    >
                        Tutup Pratinjau
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
