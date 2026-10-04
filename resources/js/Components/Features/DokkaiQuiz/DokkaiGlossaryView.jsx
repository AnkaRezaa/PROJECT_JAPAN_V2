import React, { useState, useMemo } from 'react';
import Badge from '@/Components/UI/Badge';
import BackButton from '@/Components/UI/BackButton';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SchoolIcon from '@mui/icons-material/School';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export default function DokkaiGlossaryView({
    quiz,
    vocabularies = [],
    onBookmark,
    onPlayAudio,
    onFinishLesson,
    onBackToReview,
}) {
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [drillMode, setDrillMode] = useState('flashcard'); // 'flashcard' | 'quiz'
    const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBookmark, setFilterBookmark] = useState(false);
    const [expandedCards, setExpandedCards] = useState({});

    const activeDrillVocab = vocabularies[practiceIndex] || vocabularies[0];

    const currentQuizOptions = useMemo(() => {
        if (!activeDrillVocab) return [];
        const otherMeanings = vocabularies
            .filter((v) => v.id !== activeDrillVocab.id && v.meaning)
            .map((v) => v.meaning);

        const shuffledDistractors = [...new Set(otherMeanings)].sort(() => 0.5 - Math.random()).slice(0, 3);
        const optionsList = [activeDrillVocab.meaning, ...shuffledDistractors].sort(() => 0.5 - Math.random());
        return optionsList;
    }, [activeDrillVocab, vocabularies]);

    const toggleExpand = (id) => {
        setExpandedCards((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const filteredVocabularies = vocabularies.filter((v) => {
        if (filterBookmark && !v.is_bookmarked) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            v.word?.toLowerCase().includes(q) ||
            v.furigana?.toLowerCase().includes(q) ||
            v.meaning?.toLowerCase().includes(q) ||
            v.romaji?.toLowerCase().includes(q)
        );
    });

    const nextDrill = () => {
        setShowAnswer(false);
        setSelectedQuizAnswer(null);
        setPracticeIndex((prev) => (prev + 1) % vocabularies.length);
    };

    return (
        <div className="mx-auto max-w-5xl 2xl:max-w-6xl w-full space-y-6">
            {/* Header Banner */}
            <div className="rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge color="green" className="text-xs font-bold px-2 py-0.5">
                            {quiz?.jlpt_level || 'Dokkai'} Glosarium
                        </Badge>
                        <span className="text-xs text-gray-400">
                            {vocabularies.length} Kosakata & Kanji
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold font-japanese text-gray-950 dark:text-white">
                        Kosakata: {quiz?.title}
                    </h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                        Tinjau seluruh kata kunci wacana dan simpan ke dek SRS untuk latihan berkala.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onFinishLesson}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-700 active:scale-[0.99] transition shrink-0"
                >
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                    <span>Selesai Belajar Wacana</span>
                </button>
            </div>

            {/* Interactive Flashcard / Drill Widget (Dual Mode: Flashcard & Kuis Pilihan) */}
            {activeDrillVocab && (
                <div className="rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
                    {/* Header with Mode Switcher & Progress */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800 gap-2">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                <SchoolIcon sx={{ fontSize: 16 }} />
                                <span>Latihan Kosakata Teks:</span>
                            </span>
                            <div className="inline-flex items-center rounded-xl bg-gray-100 p-0.5 dark:bg-gray-800 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => { setDrillMode('flashcard'); setShowAnswer(false); setSelectedQuizAnswer(null); }}
                                    className={`px-3 py-1 rounded-lg transition ${
                                        drillMode === 'flashcard'
                                            ? 'bg-white text-emerald-800 shadow-2xs dark:bg-gray-900 dark:text-emerald-300'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                                    }`}
                                >
                                    🎴 Flashcard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDrillMode('quiz'); setShowAnswer(false); setSelectedQuizAnswer(null); }}
                                    className={`px-3 py-1 rounded-lg transition ${
                                        drillMode === 'quiz'
                                            ? 'bg-white text-emerald-800 shadow-2xs dark:bg-gray-900 dark:text-emerald-300'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                                    }`}
                                >
                                    📝 Kuis Pilihan
                                </button>
                            </div>
                        </div>

                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {practiceIndex + 1}/{vocabularies.length} Kata
                        </span>
                    </div>

                    {/* Mode 1: Flashcard Drill */}
                    {drillMode === 'flashcard' ? (
                        <div className="py-5 text-center">
                            <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-japanese text-gray-950 dark:text-white mb-2 tracking-wide">
                                {activeDrillVocab.word}
                            </div>

                            {showAnswer ? (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="text-lg sm:text-xl font-bold text-emerald-800 dark:text-emerald-300 font-japanese">
                                        {activeDrillVocab.furigana}
                                        {activeDrillVocab.romaji && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-2">
                                                [{activeDrillVocab.romaji}]
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm sm:text-base font-semibold text-gray-950 dark:text-gray-100 max-w-md mx-auto leading-relaxed">
                                        {activeDrillVocab.meaning}
                                    </p>
                                    {activeDrillVocab.example_sentence && (
                                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-japanese italic mt-1.5 leading-relaxed">
                                            "{activeDrillVocab.example_sentence}"
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAnswer(true)}
                                    className="mt-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline underline-offset-4 cursor-pointer"
                                >
                                    Ketuk untuk Menampilkan Arti & Bacaan
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Mode 2: Mini Vocabulary Quiz (Fuad PRD) */
                        <div className="py-3 text-center">
                            <div className="text-3xl sm:text-4xl font-extrabold font-japanese text-gray-950 dark:text-white mb-1">
                                {activeDrillVocab.word}
                            </div>
                            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-japanese mb-4">
                                {activeDrillVocab.furigana}
                            </div>

                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                                Pilih Arti Bahasa Indonesia yang Tepat:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto text-left">
                                {currentQuizOptions.map((opt, optIdx) => {
                                    const isChosen = selectedQuizAnswer === opt;
                                    const isCorrect = opt === activeDrillVocab.meaning;

                                    return (
                                        <button
                                            key={optIdx}
                                            type="button"
                                            onClick={() => setSelectedQuizAnswer(opt)}
                                            className={`p-3 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer flex items-center justify-between gap-2 ${
                                                selectedQuizAnswer
                                                    ? isCorrect
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                        : isChosen
                                                        ? 'border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-200'
                                                        : 'border-gray-200 opacity-60 dark:border-gray-800'
                                                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                                            }`}
                                        >
                                            <span>{opt}</span>
                                            {selectedQuizAnswer && isCorrect && <span className="text-emerald-600 font-bold shrink-0">✓</span>}
                                            {selectedQuizAnswer && isChosen && !isCorrect && <span className="text-rose-600 font-bold shrink-0">✕</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            {activeDrillVocab && (
                                <JapaneseSpeechButton
                                    text={activeDrillVocab.word}
                                    audioUrl={activeDrillVocab.audio_url === 'mock' ? null : activeDrillVocab.audio_url}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-600 shadow-2xs hover:text-emerald-600 dark:bg-gray-800 dark:text-gray-300 transition"
                                    iconClassName="!text-base"
                                    title="Dengarkan pelafalan kata"
                                />
                            )}
                            {onBookmark && (
                                <button
                                    type="button"
                                    onClick={() => onBookmark(activeDrillVocab.id)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs transition ${
                                        activeDrillVocab.is_bookmarked
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-50 text-gray-600 hover:text-emerald-600 dark:bg-gray-800 dark:text-gray-300'
                                    }`}
                                    title={activeDrillVocab.is_bookmarked ? 'Tersimpan di SRS' : 'Simpan ke SRS'}
                                >
                                    {activeDrillVocab.is_bookmarked ? (
                                        <BookmarkIcon sx={{ fontSize: 16 }} />
                                    ) : (
                                        <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                                    )}
                                </button>
                            )}
                        </div>

                        {showAnswer && drillMode === 'flashcard' ? (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={() => nextDrill()}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs transition"
                                    title="Lupa arti kata ini"
                                >
                                    🔴 Lupa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => nextDrill()}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs transition"
                                    title="Masih ragu / sulit"
                                >
                                    🟡 Ragu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => nextDrill()}
                                    className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-xs transition"
                                    title="Sudah hafal / paham"
                                >
                                    🟢 Paham →
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={nextDrill}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition"
                            >
                                Kata Berikutnya →
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Full Vocabulary Grid Matrix (Responsive Wanikani/Bunpro Style Cards) */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <AutoStoriesIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                        <span>Daftar Seluruh Kosakata Wacana</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {filteredVocabularies.length}
                        </span>
                    </h3>

                    {/* Filter and Search Bar */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-48">
                            <SearchIcon
                                sx={{ fontSize: 16 }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari kata/arti..."
                                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition outline-hidden"
                            />
                        </div>

                        {onBookmark && (
                            <button
                                type="button"
                                onClick={() => setFilterBookmark(!filterBookmark)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                                    filterBookmark
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                                title="Filter kosakata tersimpan di SRS"
                            >
                                <BookmarkIcon sx={{ fontSize: 14 }} />
                                <span className="hidden sm:inline">SRS</span>
                            </button>
                        )}
                    </div>
                </div>

                {filteredVocabularies.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 dark:text-gray-500 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-xs">Tidak ada kosakata yang cocok dengan pencarian.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {filteredVocabularies.map((vocab) => {
                            const isExpanded = !!expandedCards[vocab.id];
                            return (
                                <div
                                    key={vocab.id}
                                    className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900 transition hover:border-gray-300 dark:hover:border-gray-700 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-gray-100 dark:border-gray-800">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base sm:text-lg font-bold font-japanese text-gray-950 dark:text-white truncate">
                                                        {vocab.word}
                                                    </span>
                                                    {vocab.jlpt_level && (
                                                        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                                                            {vocab.jlpt_level}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-japanese truncate">
                                                    {vocab.furigana}
                                                    {vocab.romaji && (
                                                        <span className="ml-1 text-[11px] text-gray-500 font-mono font-normal">
                                                            [{vocab.romaji}]
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <JapaneseSpeechButton
                                                    text={vocab.word}
                                                    audioUrl={vocab.audio_url === 'mock' ? null : vocab.audio_url}
                                                    className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                                    iconClassName="!text-sm"
                                                    title="Dengarkan pelafalan kata"
                                                />
                                                {onBookmark && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onBookmark(vocab.id)}
                                                        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                                                            vocab.is_bookmarked
                                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                                        }`}
                                                        title={vocab.is_bookmarked ? 'Tersimpan di SRS' : 'Simpan kata'}
                                                    >
                                                        {vocab.is_bookmarked ? (
                                                            <BookmarkIcon sx={{ fontSize: 15 }} />
                                                        ) : (
                                                            <BookmarkBorderIcon sx={{ fontSize: 15 }} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-2 font-medium">
                                            <span className="font-bold text-gray-950 dark:text-white mr-1">Arti:</span>
                                            {vocab.meaning}
                                        </p>

                                        {/* Expandable Example Sentence (Keeps cards ultra-compact by default) */}
                                        {vocab.example_sentence && (
                                            <div className="mt-2">
                                                {isExpanded ? (
                                                    <div className="rounded-xl bg-gray-50/90 p-2.5 dark:bg-gray-800/80 text-xs sm:text-sm text-gray-800 dark:text-gray-200 animate-in fade-in duration-150">
                                                        <p className="font-japanese font-medium leading-relaxed">{vocab.example_sentence}</p>
                                                        {vocab.example_translation && (
                                                            <p className="text-gray-600 dark:text-gray-300 mt-1 italic text-xs font-normal">
                                                                {vocab.example_translation}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(vocab.id)}
                                                    className="mt-1.5 flex items-center gap-0.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                                                >
                                                    <span>{isExpanded ? 'Tutup Contoh' : 'Contoh Kalimat'}</span>
                                                    {isExpanded ? (
                                                        <ExpandLessIcon sx={{ fontSize: 15 }} />
                                                    ) : (
                                                        <ExpandMoreIcon sx={{ fontSize: 15 }} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {vocab.pitch_accent && (
                                        <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
                                            <span className="flex items-center gap-1 font-mono">
                                                <RecordVoiceOverIcon sx={{ fontSize: 11 }} className="text-sky-500" />
                                                <span>Aksen: {vocab.pitch_accent}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Back to Review / Finish Navigation */}
            <div className="pt-4 pb-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                <BackButton onClick={onBackToReview}>
                    Kembali ke Pembahasan
                </BackButton>

                <button
                    type="button"
                    onClick={onFinishLesson}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-700 active:scale-[0.99] transition cursor-pointer"
                >
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                    <span>Selesai & Keluar ke Modul</span>
                </button>
            </div>
        </div>
    );
}
