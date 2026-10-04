import React, { useState, useEffect } from 'react';
import DokkaiVocabInspector from './DokkaiVocabInspector';
import DokkaiVocabPopover from './DokkaiVocabPopover';
import { kanaToRomaji } from '@/Components/Features/Learning/JapaneseRomanizer';
import Badge from '@/Components/UI/Badge';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const FONT_CLASSES = {
    sm: 'text-base sm:text-lg leading-[2.3] tracking-wide',
    base: 'text-lg sm:text-xl md:text-[22px] leading-[2.5] tracking-wide',
    lg: 'text-xl sm:text-2xl md:text-[25px] leading-[2.7] tracking-wide',
};

function renderInteractiveText(
    text,
    allVocabs,
    activeVocab,
    onWordClick,
    basePrefix = 'p',
    showFurigana = true
) {
    if (!text) return null;

    const sortedVocabs = [...(allVocabs || [])]
        .filter((v) => Boolean(v?.word))
        .sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));

    const escapedWords = sortedVocabs.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const vocabRegex = escapedWords.length > 0 ? new RegExp(`(${escapedWords.join('|')})`, 'g') : null;

    const primaryParts = vocabRegex ? text.split(vocabRegex) : [text];

    const segmentSubText = (subText, baseKey) => {
        if (!subText) return null;

        const renderTokenButton = (token, sIdx) => {
            const isPunctuation = /^[、。！？「」『』（）\s\n\r\t]+$/.test(token);
            if (isPunctuation) {
                return <span key={`${baseKey}-${sIdx}`} className="text-gray-400 select-none">{token}</span>;
            }

            const itemKey = `${baseKey}-${sIdx}`;
            const isSelected = activeVocab?.word === token;

            return (
                <button
                    key={itemKey}
                    type="button"
                    data-dokkai-popover="true"
                    onClick={(e) => onWordClick({
                        id: `token-${token}`,
                        word: token,
                        furigana: token,
                        romaji: kanaToRomaji(token),
                        meaning: 'Kosakata / elemen wacana',
                        part_of_speech: /^[ぁ-ん]+$/.test(token) ? 'Partikel / Tata Bahasa' : 'Kosakata',
                        example_sentence: text,
                        is_bookmarked: false,
                        uniqueKey: itemKey,
                    }, e)}
                    className={`inline-flex items-baseline min-w-[20px] justify-center px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-all ${
                        isSelected
                            ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-100 ring-2 ring-emerald-500/40 font-semibold shadow-2xs'
                            : 'hover:bg-emerald-50/80 hover:text-emerald-950 dark:hover:bg-emerald-950/40'
                    }`}
                    title={`Klik untuk menginspeksi: ${token}`}
                >
                    {token}
                </button>
            );
        };

        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
            const segments = Array.from(segmenter.segment(subText));
            return segments.map((seg, sIdx) => renderTokenButton(seg.segment, sIdx));
        }

        const fallbackRegex = /([、。！？「」『』（）\s\n\r\t]+|[^\x00-\x7F]+|[a-zA-Z0-9]+)/g;
        const matches = subText.match(fallbackRegex) || [subText];
        return matches.map((token, sIdx) => renderTokenButton(token, sIdx));
    };

    return primaryParts.map((part, index) => {
        const matchingVocab = sortedVocabs.find((v) => v.word === part);
        if (!matchingVocab) {
            return <React.Fragment key={`p-${index}`}>{segmentSubText(part, `${basePrefix}-seg-${index}`)}</React.Fragment>;
        }

        const itemKey = `${basePrefix}-vocab-${matchingVocab.id || index}`;
        const isSelected = activeVocab?.id === matchingVocab.id || activeVocab?.word === matchingVocab.word;

        return (
            <button
                key={itemKey}
                type="button"
                data-dokkai-popover="true"
                onClick={(e) => onWordClick({
                    ...matchingVocab,
                    uniqueKey: itemKey,
                }, e)}
                className={`inline-flex items-baseline px-1.5 py-0.5 mx-0.5 rounded-md cursor-pointer transition-all ${
                    isSelected
                        ? 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/90 dark:text-emerald-100 ring-2 ring-emerald-500 font-bold shadow-xs'
                        : 'border-b-2 border-dashed border-emerald-600/80 hover:bg-emerald-100/70 text-gray-950 dark:text-gray-50 dark:hover:bg-emerald-950/60'
                }`}
                title={`Klik untuk menginspeksi: ${matchingVocab.word} (${matchingVocab.furigana})`}
            >
                {showFurigana && matchingVocab.furigana && matchingVocab.furigana !== matchingVocab.word ? (
                    <ruby>
                        {matchingVocab.word}
                        <rt className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                            {matchingVocab.furigana}
                        </rt>
                    </ruby>
                ) : (
                    <span>{matchingVocab.word}</span>
                )}
            </button>
        );
    });
}

export default function DokkaiReadingView({
    quiz,
    paragraphs = [],
    vocabularies = [],
    showFurigana = true,
    fontSize = 'base',
    activeVocab = null,
    onSelectVocab,
    onBookmarkVocab,
    onProceedToQuiz,
    onPlayAudio,
    audioState,
}) {
    const [floatingVocab, setFloatingVocab] = useState(null);
    const [popoverCoords, setPopoverCoords] = useState(null);
    const [isVocabDrawerOpen, setIsVocabDrawerOpen] = useState(false);

    useEffect(() => {
        if (!floatingVocab) return;

        const handlePointerDown = (e) => {
            if (!e.target.closest('[data-dokkai-popover]')) {
                setFloatingVocab(null);
                setPopoverCoords(null);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setFloatingVocab(null);
                setPopoverCoords(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [floatingVocab]);

    const handleWordClick = (vocab, event) => {
        let coords = null;
        if (event?.currentTarget && typeof window !== 'undefined') {
            const rect = event.currentTarget.getBoundingClientRect();
            const popoverWidth = Math.min(320, window.innerWidth - 24);
            const idealLeft = rect.left + rect.width / 2 - popoverWidth / 2;
            const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, idealLeft));
            const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, rect.left + rect.width / 2 - left));
            const isFlipDown = rect.top < 230;
            const top = isFlipDown ? rect.bottom + 10 : undefined;
            const bottom = !isFlipDown ? window.innerHeight - rect.top + 10 : undefined;

            coords = {
                left,
                top,
                bottom,
                width: popoverWidth,
                arrowLeft,
                isFlipDown,
            };
        }

        const currentVocabWithBookmark = {
            ...vocab,
            is_bookmarked: vocabularies.find((v) => v.id === vocab.id)?.is_bookmarked ?? vocab.is_bookmarked,
        };
        setFloatingVocab(currentVocabWithBookmark);
        setPopoverCoords(coords);
        onSelectVocab?.(currentVocabWithBookmark);
    };

    const handleBookmarkToggle = (vocabId) => {
        onBookmarkVocab?.(vocabId);
        if (floatingVocab) {
            setFloatingVocab((prev) => (prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : prev));
        }
    };

    return (
        <div className="w-full pb-20 lg:pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                {/* LEFT COLUMN: Balanced 7 cols on laptop & desktop */}
                <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-4">
                    {/* Wacana Main Card */}
                    <article className="rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all flex flex-col">
                        {/* Compact Header & Audio Bar */}
                        <header className="pb-4 mb-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                                        <AutoStoriesIcon sx={{ fontSize: 14 }} />
                                        <span>{quiz?.theme_category || 'Dokkai'}</span>
                                    </span>
                                    {quiz?.jlpt_level && (
                                        <Badge color="green" className="text-[10px] py-0.5 px-2 font-bold">
                                            {quiz.jlpt_level}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <span className="flex items-center gap-1 text-[11px]">
                                        <TimerOutlinedIcon sx={{ fontSize: 14 }} />
                                        <span>{quiz?.estimated_reading_time || 5} min</span>
                                    </span>
                                    {quiz?.xp_reward && (
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                            +{quiz.xp_reward} XP
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight font-japanese leading-relaxed">
                                        {quiz?.title}
                                    </h1>
                                    {quiz?.sub_title && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                                            {quiz.sub_title}
                                        </p>
                                    )}
                                </div>

                                {/* Integrated Voice Narrator Audio Bar */}
                                {(quiz?.audio_url || paragraphs.length > 0) && (
                                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/80 p-1.5 sm:px-3 border border-emerald-200/80 dark:bg-gray-800/80 dark:border-emerald-800/50 shrink-0">
                                        <button
                                            type="button"
                                            onClick={audioState?.onPlayToggle}
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition active:scale-95 cursor-pointer ${
                                                audioState?.isPlaying
                                                    ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                            title={audioState?.isPlaying ? 'Jeda Suara Narator' : 'Dengarkan Narator Wacana (Suara Jepang)'}
                                        >
                                            {audioState?.isPlaying ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase leading-none">
                                                Narator
                                            </span>
                                            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-mono font-medium">
                                                {audioState?.timeFormatted || '00:00 / 01:22'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-0.5 rounded-full bg-gray-200/70 p-0.5 dark:bg-gray-700/70 ml-1">
                                            {['0.8x', '1.0x', '1.2x'].map((spd) => (
                                                <button
                                                    key={spd}
                                                    type="button"
                                                    onClick={() => audioState?.onSpeedChange?.(spd)}
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                                                        audioState?.speed === spd
                                                            ? 'bg-emerald-600 text-white shadow-xs'
                                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {spd}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </header>

                        {/* Interactive Reading Guide Chip */}
                        <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-1.5 border border-emerald-200/70 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200">
                            <LightbulbOutlinedIcon sx={{ fontSize: 16 }} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-medium">
                                💡 <strong>Tips Membaca:</strong> Ketuk kata yang bergaris hijau putus-putus untuk memunculkan arti kontekstual & aksen nada.
                            </span>
                        </div>

                        {/* Unified Reader Canvas (Satori Reader Style) */}
                        <div className={`space-y-5 sm:space-y-6 font-japanese text-gray-950 dark:text-gray-50 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 ${FONT_CLASSES[fontSize] || FONT_CLASSES.base} ${!showFurigana ? 'furigana-hidden' : ''}`}>
                            {paragraphs.map((p) => (
                                <section
                                    key={p.id}
                                    id={`paragraph-${p.id}`}
                                    className="relative rounded-2xl p-4 sm:p-5 lg:p-6 bg-gray-50/70 hover:bg-gray-50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800/80 transition-all"
                                >
                                    <div className="flex items-center justify-between pb-1.5 mb-2 text-xs font-bold text-gray-600 dark:text-gray-300 select-none">
                                        <span className="uppercase tracking-wider">
                                            {p.label || `Paragraf ${p.paragraph_number}`}
                                        </span>
                                        {p.character_count && (
                                            <span className="font-mono text-[11px] opacity-80">
                                                {p.character_count}字
                                            </span>
                                        )}
                                    </div>

                                    {/* Render Text with Inline Interactive Keywords */}
                                    <div className="whitespace-pre-line tracking-wide">
                                        {renderInteractiveText(
                                            p.content_raw,
                                            vocabularies,
                                            activeVocab,
                                            handleWordClick,
                                            `p-${p.id}`,
                                            showFurigana
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* Bottom CTA within article for Desktop */}
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                            <span className="text-[11px] text-gray-400">
                                Klik kata bergaris untuk melihat arti & aksen.
                            </span>
                            <button
                                type="button"
                                onClick={onProceedToQuiz}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-700 active:translate-y-0.5 transition"
                            >
                                <span>Lanjut ke Soal Kuis</span>
                                <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                {quiz?.xp_reward && (
                                    <span className="ml-1 rounded-full bg-emerald-700/60 px-1.5 py-0.2 text-[10px] font-black text-emerald-100">
                                        +{quiz.xp_reward} XP
                                    </span>
                                )}
                            </button>
                        </div>
                    </article>

                    {/* Dokkai Reading Tips Box (Compact) */}
                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 sm:p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                            <LightbulbOutlinedIcon sx={{ fontSize: 16 }} />
                        </div>
                        <div className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                            <span className="font-bold text-amber-950 dark:text-amber-100 mr-1">Tips Dokkai:</span>
                            Perhatikan konjungsi penting (seperti 「特に」、「このように」、「しかし」) untuk menemukan transisi argumen penulis.
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Balanced 5 cols on laptop & desktop */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20">
                    <DokkaiVocabInspector
                        activeVocab={activeVocab}
                        vocabularies={vocabularies}
                        onSelectVocab={onSelectVocab}
                        onBookmark={onBookmarkVocab}
                        onPlayAudio={onPlayAudio}
                    />
                </div>
            </div>

            {/* Clamped Fixed Popover for All Screen Sizes (Mobile, Tablet, Desktop) */}
            {floatingVocab && popoverCoords && (
                <div
                    data-dokkai-popover="true"
                    className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
                    style={{
                        left: `${popoverCoords.left}px`,
                        top: popoverCoords.top !== undefined ? `${popoverCoords.top}px` : 'auto',
                        bottom: popoverCoords.bottom !== undefined ? `${popoverCoords.bottom}px` : 'auto',
                        width: `${popoverCoords.width}px`,
                    }}
                >
                    <DokkaiVocabPopover
                        vocab={floatingVocab}
                        arrowLeft={popoverCoords.arrowLeft}
                        isFlipDown={popoverCoords.isFlipDown}
                        onBookmark={handleBookmarkToggle}
                        onClose={() => {
                            setFloatingVocab(null);
                            setPopoverCoords(null);
                        }}
                        onPlayAudio={onPlayAudio}
                    />
                </div>
            )}

            {/* Mobile/Tablet Floating Quick Vocabulary Button */}
            {vocabularies.length > 0 && (
                <div className="lg:hidden fixed bottom-24 right-4 z-30">
                    <button
                        type="button"
                        onClick={() => setIsVocabDrawerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-lg hover:bg-emerald-700 active:scale-95 transition"
                    >
                        <AutoStoriesIcon sx={{ fontSize: 16 }} />
                        <span>Kosakata ({vocabularies.length})</span>
                    </button>
                </div>
            )}

            {/* Mobile/Tablet Vocabulary Slide-Over Drawer Sheet */}
            {isVocabDrawerOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsVocabDrawerOpen(false)}
                    />
                    <div className="relative z-10 w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto p-4 sm:p-6 animate-in slide-in-from-bottom duration-300">
                        {/* Drag Handle & Header */}
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <AutoStoriesIcon sx={{ fontSize: 18 }} className="text-emerald-500" />
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                    Daftar Kosakata Wacana
                                </h3>
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    {vocabularies.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsVocabDrawerOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        {/* Inspector Component */}
                        <DokkaiVocabInspector
                            activeVocab={activeVocab}
                            vocabularies={vocabularies}
                            onSelectVocab={(v) => {
                                onSelectVocab?.(v);
                            }}
                            onBookmark={onBookmarkVocab}
                            onPlayAudio={onPlayAudio}
                        />
                    </div>
                </div>
            )}

            {/* Mobile Fixed Sticky Bottom Action Tray */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-gray-200/90 bg-white/95 backdrop-blur-md p-3 sm:p-4 pb-safe dark:border-gray-800 dark:bg-gray-900/95 shadow-lg">
                <button
                    type="button"
                    onClick={onProceedToQuiz}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 sm:py-3.5 px-4 font-bold text-sm sm:text-base text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                >
                    <span>Lanjut ke Soal Kuis</span>
                    <ArrowForwardIcon sx={{ fontSize: 18 }} />
                    {quiz?.xp_reward && (
                        <span className="ml-1 rounded-full bg-emerald-700/60 px-2 py-0.5 text-xs font-black text-emerald-100">
                            +{quiz.xp_reward} XP
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
