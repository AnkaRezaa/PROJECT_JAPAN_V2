import React from 'react';
import Badge from '@/Components/UI/Badge';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function DokkaiVocabInspector({
    activeVocab,
    vocabularies = [],
    onSelectVocab,
    onBookmark,
    onPlayAudio,
    className = '',
}) {
    return (
        <aside className={`flex flex-col gap-3.5 ${className}`}>
            {/* Active Word Inspector Card (Satori Reader Style) */}
            <div className="rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all">
                {activeVocab ? (
                    <div>
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-1.5">
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-emerald-800 uppercase dark:bg-emerald-950/70 dark:text-emerald-300">
                                    Terpilih
                                </span>
                                {activeVocab.jlpt_level && (
                                    <Badge color="green" className="text-[10px] py-0.5 px-2 font-bold">
                                        {activeVocab.jlpt_level}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <JapaneseSpeechButton
                                    text={activeVocab.word}
                                    audioUrl={activeVocab.audio_url === 'mock' ? null : activeVocab.audio_url}
                                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-gray-800 transition"
                                    iconClassName="!text-lg"
                                    title="Dengarkan pelafalan kata"
                                />
                                {onBookmark && (
                                    <button
                                        type="button"
                                        onClick={() => onBookmark(activeVocab.id)}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                                            activeVocab.is_bookmarked
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                        }`}
                                        title={activeVocab.is_bookmarked ? 'Tersimpan di SRS' : 'Simpan kata ini'}
                                    >
                                        {activeVocab.is_bookmarked ? (
                                            <BookmarkIcon sx={{ fontSize: 18 }} />
                                        ) : (
                                            <BookmarkBorderIcon sx={{ fontSize: 18 }} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Kanji & Readings */}
                        <div className="mb-2">
                            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white font-japanese">
                                {activeVocab.word}
                            </h3>
                            <div className="mt-1 flex items-baseline gap-2 text-sm sm:text-base">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300 font-japanese">
                                    {activeVocab.furigana}
                                </span>
                                {activeVocab.romaji && (
                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400 font-medium">
                                        [{activeVocab.romaji}]
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Pitch Accent */}
                        {activeVocab.pitch_accent && (
                            <div className="mb-3 flex items-center gap-2">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700 font-medium dark:bg-gray-800 dark:text-gray-300">
                                    Aksen: {activeVocab.pitch_accent}
                                </span>
                            </div>
                        )}

                        {/* Compound Breakdown (Satori Reader & Fuad PRD) */}
                        {activeVocab.compound_breakdown && activeVocab.compound_breakdown.length > 0 && (
                            <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Komponen:
                                </span>
                                {activeVocab.compound_breakdown.map((part, pIdx) => (
                                    <span
                                        key={pIdx}
                                        className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-japanese font-bold text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700"
                                    >
                                        {part}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Contextual Meaning */}
                        <div className="mb-3 rounded-2xl bg-gray-50 p-3 sm:p-3.5 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80">
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                                Arti Kata
                            </div>
                            <p className="text-sm sm:text-base font-semibold leading-relaxed text-gray-950 dark:text-gray-50">
                                {activeVocab.meaning}
                            </p>
                        </div>

                        {/* Example Sentence from Text */}
                        {activeVocab.example_sentence && (
                            <div className="mb-3.5">
                                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                                    Contoh Kalimat:
                                </div>
                                <div className="rounded-2xl bg-gray-100/90 p-3 dark:bg-gray-800/90 text-xs sm:text-sm">
                                    <p className="font-japanese font-medium text-gray-950 dark:text-gray-50 leading-relaxed">
                                        {activeVocab.example_sentence}
                                    </p>
                                    {activeVocab.example_translation && (
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300 font-normal leading-normal">
                                            {activeVocab.example_translation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SRS Action Button */}
                        {onBookmark && (
                            <button
                                type="button"
                                onClick={() => onBookmark(activeVocab.id)}
                                className="w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99] bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                            >
                                {activeVocab.is_bookmarked ? (
                                    <>
                                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                                        <span>Tersimpan di SRS</span>
                                    </>
                                ) : (
                                    <>
                                        <BookmarkAddIcon sx={{ fontSize: 16 }} />
                                        <span>+ Simpan ke SRS (Flashcard)</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="py-6 text-center text-gray-400 dark:text-gray-500">
                        <AutoStoriesIcon sx={{ fontSize: 32 }} className="mb-1.5 opacity-50" />
                        <p className="text-xs">Pilih salah satu kata bergaris pada wacana untuk melihat arti.</p>
                    </div>
                )}
            </div>

            {/* Quick Vocabulary Matrix of the Text (Responsive & Scroll-Clamped) */}
            {vocabularies.length > 0 && (
                <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <AutoStoriesIcon sx={{ fontSize: 15 }} className="text-emerald-500" />
                            <span>Daftar Kosakata Wacana</span>
                        </h4>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {vocabularies.length} Kata
                        </span>
                    </div>

                    {/* Scrollable Container with Clamped Max-Height & Adaptive 2-Columns */}
                    <div className="max-h-44 sm:max-h-52 lg:max-h-60 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-1.5">
                        {vocabularies.map((vocab) => {
                            const isSelected = activeVocab?.id === vocab.id;
                            return (
                                <button
                                    key={vocab.id}
                                    type="button"
                                    onClick={() => onSelectVocab?.(vocab)}
                                    className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-1.5 ${
                                        isSelected
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 ring-1 ring-emerald-300/60'
                                            : 'bg-gray-50/70 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:hover:bg-gray-800 border border-transparent'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-1.5 truncate">
                                            <span className="font-bold text-sm text-gray-950 dark:text-white font-japanese">
                                                {vocab.word}
                                            </span>
                                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-japanese">
                                                {vocab.furigana}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate mt-0.5 font-medium">
                                            {vocab.meaning}
                                        </p>
                                    </div>
                                    {vocab.jlpt_level && (
                                        <span className="shrink-0 rounded bg-gray-200/70 px-1 py-0.2 text-[8px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                            {vocab.jlpt_level}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </aside>
    );
}
