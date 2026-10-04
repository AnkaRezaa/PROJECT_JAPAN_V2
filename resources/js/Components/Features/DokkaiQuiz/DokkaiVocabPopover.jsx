import React from 'react';
import Badge from '@/Components/UI/Badge';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CloseIcon from '@mui/icons-material/Close';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

export default function DokkaiVocabPopover({
    vocab,
    onBookmark,
    onClose,
    onPlayAudio,
    alignment = 'center',
    arrowLeft = null,
    isFlipDown = false,
    className = '',
}) {
    if (!vocab) return null;

    const arrowPositionClass = arrowLeft !== null
        ? ''
        : (alignment === 'left' ? 'left-5' : alignment === 'right' ? 'right-5' : 'left-1/2 -translate-x-1/2');

    const arrowStyle = arrowLeft !== null ? { left: `${arrowLeft}px` } : undefined;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Kosakata: ${vocab.word}`}
            className={`w-full rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-2xl transition-all dark:border-gray-700/80 dark:bg-gray-800 text-left normal-case tracking-normal select-text relative ${className}`}
        >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5 dark:border-gray-700">
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white font-japanese">
                            {vocab.word}
                        </span>
                        {vocab.furigana && vocab.furigana !== vocab.word && (
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-japanese">
                                {vocab.furigana}
                            </span>
                        )}
                        {vocab.jlpt_level && (
                            <Badge color="green" className="text-[10px] py-0.5 px-1.5 font-bold">
                                {vocab.jlpt_level}
                            </Badge>
                        )}
                    </div>
                    {vocab.romaji && (
                        <p className="mt-0.5 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-sans">
                            {vocab.romaji}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <JapaneseSpeechButton
                        text={vocab.word}
                        audioUrl={vocab.audio_url === 'mock' ? null : vocab.audio_url}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-emerald-400 transition"
                        iconClassName="!text-lg"
                        title="Dengarkan Pelafalan"
                    />
                    {onBookmark && (
                        <button
                            type="button"
                            onClick={() => onBookmark(vocab.id)}
                            className={`p-1.5 rounded-lg transition ${
                                vocab.is_bookmarked
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                    : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-gray-700'
                            }`}
                            title={vocab.is_bookmarked ? 'Tersimpan di SRS' : 'Simpan ke SRS'}
                        >
                            {vocab.is_bookmarked ? <BookmarkIcon sx={{ fontSize: 18 }} /> : <BookmarkBorderIcon sx={{ fontSize: 18 }} />}
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            aria-label="Tutup popover"
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-2.5 pt-1.5 text-xs">
                <p className="font-bold text-gray-800 dark:text-gray-200 leading-snug">
                    {vocab.meaning}
                </p>
                {vocab.part_of_speech && (
                    <p className="text-gray-400 dark:text-gray-500 mt-1 text-[11px]">
                        {vocab.part_of_speech}
                    </p>
                )}
            </div>

            {/* Compound Breakdown (Satori Reader & Fuad PRD) */}
            {vocab.compound_breakdown && vocab.compound_breakdown.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Komponen:
                    </span>
                    {vocab.compound_breakdown.map((part, pIdx) => (
                        <span
                            key={pIdx}
                            className="rounded-md bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-japanese font-semibold text-gray-800 dark:text-gray-200"
                        >
                            {part}
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1 font-mono text-gray-600 dark:text-gray-300 text-[11px]">
                    <RecordVoiceOverIcon sx={{ fontSize: 13 }} className="text-emerald-600 dark:text-emerald-400" />
                    <span><span className="font-bold text-emerald-600 dark:text-emerald-400">Pitch:</span> {vocab.pitch_accent || 'Heiban [0]'}</span>
                </span>
                {vocab.is_bookmarked && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">SRS Aktif</span>
                )}
            </div>

            {/* Dynamic Arrow Pointer (Top if flipped down, Bottom if floating up) */}
            {isFlipDown ? (
                <div
                    style={arrowStyle}
                    className={`absolute -top-2 ${arrowPositionClass} w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white dark:border-b-gray-800 drop-shadow-xs pointer-events-none -translate-x-1/2`}
                />
            ) : (
                <div
                    style={arrowStyle}
                    className={`absolute -bottom-2 ${arrowPositionClass} w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-gray-800 drop-shadow-xs pointer-events-none -translate-x-1/2`}
                />
            )}
        </div>
    );
}
