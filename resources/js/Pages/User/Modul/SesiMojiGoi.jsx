import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import QuizSoundToggle, { useQuizSoundPreference } from '@/Components/UI/QuizNarration';
import { QuizActionButton, QuizSurface } from '@/Components/UI/QuizUI';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import KanjiHandwritingCanvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import StrokeCharacterPreview from '@/Components/Features/Handwriting/StrokeCharacterPreview';
import { loadStrokeCharacter, resolveAvailableCharacters } from '@/Components/Features/Handwriting/strokeData';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';

function StrokeGuideGallery({ text }) {
    const [characters, setCharacters] = useState([]);
    const [previewCharacter, setPreviewCharacter] = useState(null);

    useEffect(() => {
        let active = true;

        resolveAvailableCharacters(text)
            .then((availableCharacters) => Promise.all(
                availableCharacters
                    .filter(({ character }) => /\p{Script=Han}/u.test(character))
                    .map(({ character }) => loadStrokeCharacter(character)),
            ))
            .then((items) => {
                if (active) setCharacters(items);
            })
            .catch(() => {
                if (active) setCharacters([]);
            });

        return () => {
            active = false;
        };
    }, [text]);

    if (characters.length === 0) return null;

    return (
        <section className="mx-auto mt-5 max-w-2xl text-left sm:mt-7">
            <div className="mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Cara Menulis</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Lihat bentuk dan urutan stroke setiap kanji.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {characters.map((item) => (
                    <article key={item.character} className="flex min-w-0 items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-2.5 dark:border-violet-900/60 dark:bg-violet-950/25 sm:p-3">
                        <svg viewBox="0 0 109 109" className="h-16 w-16 shrink-0 rounded-xl border border-violet-100 bg-white dark:border-gray-700 dark:bg-gray-950" aria-label={`Panduan menulis ${item.character}`}>
                            <path d="M 54.5 0 V 109 M 0 54.5 H 109 M 0 0 L 109 109 M 109 0 L 0 109" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="0.7" strokeDasharray="3 3" />
                            {item.paths.map((pathData, index) => (
                                <path key={`${item.character}-${index}`} d={pathData} fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                            ))}
                        </svg>
                        <div className="min-w-0 flex-1">
                            <p className="text-xl font-black text-gray-900 dark:text-white">{item.character}</p>
                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.stroke_count} stroke</p>
                            <button type="button" onClick={() => setPreviewCharacter(item.character)} className="mt-1.5 rounded-lg px-2 py-1 text-xs font-black text-violet-700 transition fine-pointer:hover:bg-violet-100 dark:text-violet-300 dark:fine-pointer:hover:bg-violet-950/70">
                                Lihat Urutan
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            <StrokeCharacterPreview
                character={previewCharacter}
                title={`Urutan stroke ${previewCharacter || ''}`}
                open={Boolean(previewCharacter)}
                onClose={() => setPreviewCharacter(null)}
            />
        </section>
    );
}

export default function SesiMojiGoi({ focus = 'kanji', day, cards = [], quiz_url = null, quiz_question_count = 0, back_url = '/user/kelas' }) {
    const isKanjiSession = focus === 'kanji';
    const [soundEnabled, setSoundEnabled] = useQuizSoundPreference();
    const [showIntro, setShowIntro] = useState(!isKanjiSession && cards.length > 0);
    const [queue, setQueue] = useState(() => cards.map((card, idx) => ({ ...card, queueKey: `${card.id}-${idx}-0`, repeatCount: 0 })));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [knownIds, setKnownIds] = useState(() => new Set(cards.filter((c) => c.is_known).map((c) => c.id)));
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(cards.length === 0);
    const [handwritingPractice, setHandwritingPractice] = useState(null);
    const [handwritingStrokeWidth, setHandwritingStrokeWidth] = useState(5);
    const [handwritingBlankMode, setHandwritingBlankMode] = useState(false);

    const activeCard = queue[currentIndex] || null;
    const totalUnique = cards.length;
    const masteredCount = knownIds.size;
    const progressPercent = totalUnique > 0 ? Math.min(100, Math.round((masteredCount / totalUnique) * 100)) : 100;

    const advanceQueue = (currentQueueLength) => {
        if (currentIndex + 1 >= currentQueueLength) {
            playSoundEffect('complete');
            setCompleted(true);
            return;
        }
        setCurrentIndex((prev) => prev + 1);
    };

    const handleReview = async (action) => {
        if (!activeCard || submitting) return;
        setSubmitting(true);

        const nextKnown = new Set(knownIds);
        let nextQueueLength = queue.length;

        if (action === 'known') {
            nextKnown.add(activeCard.id);
            setKnownIds(nextKnown);
            playSoundEffect('correct');
        } else {
            nextKnown.delete(activeCard.id);
            setKnownIds(nextKnown);
            playSoundEffect('incorrect');
            const repeatItem = {
                ...activeCard,
                repeatCount: (activeCard.repeatCount || 0) + 1,
                queueKey: `${activeCard.id}-repeat-${Date.now()}`,
            };
            setQueue((prev) => [...prev, repeatItem]);
            nextQueueLength = queue.length + 1;
        }

        const isLastStep = currentIndex + 1 >= nextQueueLength && nextKnown.size >= totalUnique;

        router.post(
            route('user.flashcards.review', activeCard.id),
            {
                action,
                skill: 'recognition',
                completed: isLastStep,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: async () => {
                    setSubmitting(false);

                    if (isKanjiSession && action === 'known' && day?.handwriting_enabled) {
                        try {
                            const chars = await resolveAvailableCharacters(activeCard.front_text, activeCard.reading);
                            const kanjiChars = chars.filter(({ character }) => /\p{Script=Han}/u.test(character));
                            if (kanjiChars.length > 0) {
                                setHandwritingPractice({
                                    characters: kanjiChars,
                                    character_index: 0,
                                    flashcard_id: activeCard.id,
                                    title: activeCard.front_text,
                                    reading: activeCard.reading,
                                    audio_reading_override: activeCard.audio_reading_override || null,
                                    meaning: activeCard.back_text,
                                    audio_url: activeCard.audio_url,
                                    nextQueueLength,
                                });
                                return;
                            }
                        } catch {
                            // Continue gracefully when stroke data is unavailable.
                        }
                    }

                    advanceQueue(nextQueueLength);
                },
            },
        );
    };

    const finishHandwritingStep = () => {
        if (!handwritingPractice) return;
        const nextCharIdx = handwritingPractice.character_index + 1;
        if (nextCharIdx < handwritingPractice.characters.length) {
            setHandwritingPractice((prev) => ({ ...prev, character_index: nextCharIdx }));
            return;
        }
        const qLen = handwritingPractice.nextQueueLength;
        setHandwritingPractice(null);
        advanceQueue(qLen);
    };

    if (showIntro && !isKanjiSession) {
        const introTitle = day?.kotoba_intro_title || `Pengantar Kotoba — Hari ${day?.day_number}`;
        const introBody = day?.kotoba_intro_body || day?.description || 'Pelajari arti dan cara baca kosakata tema hari ini. Fokus pada pemahaman kata dan pelafalan tanpa latihan menulis kanji.';

        return (
            <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-pink-50 via-white to-rose-50 px-4 py-6 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:px-7 sm:py-8">
                <Head title={`Kotoba — Hari ${day?.day_number}`} />
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
                    <div className="flex items-center justify-between gap-3">
                        <Link href={back_url} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                            <ArrowBackIcon sx={{ fontSize: 19 }} /> Kembali ke Roadmap
                        </Link>
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-800 dark:bg-pink-950/60 dark:text-pink-300">
                            言葉 • Kotoba ({totalUnique} Kata)
                        </span>
                    </div>

                    <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                        <QuizSurface as="section" className="p-5 sm:p-7">
                            <p className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                                Hari {day?.day_number} • {day?.title}
                            </p>
                            <h1 className="mt-2 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">{introTitle}</h1>
                            <p className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">{introBody}</p>
                        </QuizSurface>

                        <QuizSurface as="aside" className="p-5">
                            <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                                <AutoStoriesIcon className="text-pink-600 dark:text-pink-400" sx={{ fontSize: 20 }} /> Gambaran Kata Hari Ini
                            </div>
                            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                                {cards.map((card) => (
                                    <div key={card.id} className="flex items-center justify-between gap-2 rounded-xl border border-pink-100 bg-pink-50/50 px-3 py-2 dark:border-pink-900/40 dark:bg-pink-950/20">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-gray-900 dark:text-white">{card.front_text}</p>
                                            <p className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">{card.reading} — {card.back_text}</p>
                                        </div>
                                        <JapaneseSpeechButton
                                            text={card.audio_reading_override || card.reading || card.front_text}
                                            audioUrl={card.audio_url}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pink-200 bg-white text-pink-600 dark:border-pink-800 dark:bg-gray-900 dark:text-pink-300"
                                        />
                                    </div>
                                ))}
                            </div>
                        </QuizSurface>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <QuizActionButton onClick={() => setShowIntro(false)} className="flex min-h-12 w-full items-center justify-center gap-2 sm:w-auto">
                            Mulai Sesi Kotoba <ArrowForwardIcon sx={{ fontSize: 19 }} />
                        </QuizActionButton>
                    </div>
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-4 py-8 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
                <Head title={`Sesi ${isKanjiSession ? 'Kanji' : 'Kotoba'} Selesai`} />
                <QuizSurface className="w-full max-w-md p-6 text-center sm:p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircleIcon sx={{ fontSize: 38 }} />
                    </div>
                    <h1 className="mt-4 text-2xl font-black text-gray-950 dark:text-white">
                        Sesi {isKanjiSession ? '漢字 Kanji' : '言葉 Kotoba'} Selesai!
                    </h1>
                    <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {totalUnique === 0
                            ? `Belum ada kartu ${isKanjiSession ? 'Kanji' : 'Kotoba'} pada hari ini.`
                            : `Kamu sudah menyelesaikan ${masteredCount} dari ${totalUnique} kartu ${isKanjiSession ? 'Kanji' : 'Kotoba'} Hari ${day?.day_number}.`}
                    </p>
                    {quiz_url && quiz_question_count > 0 ? (
                        <div className="mt-6 space-y-2.5">
                            <Link
                                href={quiz_url}
                                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-sm transition ${
                                    isKanjiSession
                                        ? 'bg-violet-600 hover:bg-violet-700'
                                        : 'bg-pink-600 hover:bg-pink-700'
                                }`}
                            >
                                Lanjut ke Kuis {isKanjiSession ? 'Kanji' : 'Kotoba'} ({quiz_question_count} Soal)
                                <ArrowForwardIcon sx={{ fontSize: 18 }} />
                            </Link>
                            <Link
                                href={back_url}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Kembali ke Roadmap
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href={back_url}
                            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                        >
                            Kembali ke Roadmap
                        </Link>
                    )}
                </QuizSurface>
            </div>
        );
    }

    if (handwritingPractice) {
        const activeChar = handwritingPractice.characters[handwritingPractice.character_index];
        return (
            <div className="flex min-h-[100dvh] flex-col items-center bg-violet-50/70 px-4 py-4 font-sans dark:bg-gray-950 sm:py-6">
                <Head title={`Latihan Menulis ${activeChar.character}`} />
                <header className="mb-4 flex w-full max-w-4xl items-center gap-3">
                    <Link href={back_url} aria-label="Kembali ke roadmap" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800">
                        <CloseIcon />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Latihan Menulis Kanji</p>
                        <h1 className="truncate text-lg font-black text-gray-900 dark:text-white">
                            {handwritingBlankMode ? 'Tulis Kanji dari Ingatan' : `Tulis ${activeChar.character}`}
                        </h1>
                    </div>
                    <QuizSoundToggle enabled={soundEnabled} onToggle={() => setSoundEnabled((v) => !v)} />
                </header>
                <main className="w-full max-w-4xl rounded-3xl border border-violet-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6 md:grid md:grid-cols-[minmax(200px,0.72fr)_minmax(0,1fr)] md:items-start md:gap-6">
                    <div className="mb-4 text-center md:mb-0 md:text-left">
                        {handwritingBlankMode ? (
                            <div className="space-y-1">
                                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                                    Mode Kosongan
                                </span>
                                {handwritingPractice.reading && (
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{handwritingPractice.reading}</p>
                                )}
                            </div>
                        ) : (
                            <JapaneseReading japanese={handwritingPractice.title} reading={handwritingPractice.reading} className="items-center text-3xl font-black text-gray-900 dark:text-white md:items-start" />
                        )}
                        {handwritingPractice.meaning && <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{handwritingPractice.meaning}</p>}
                        {handwritingBlankMode && (
                            <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Karakter kanji disembunyikan. Tulis dari ingatan berdasarkan bacaan & artinya.
                            </p>
                        )}
                        <JapaneseSpeechButton
                            text={handwritingPractice.audio_reading_override || handwritingPractice.reading || handwritingPractice.title}
                            audioUrl={handwritingPractice.audio_url}
                            autoPlay
                            autoPlayEnabled={soundEnabled}
                            playbackKey={`moji-hw-${handwritingPractice.flashcard_id}-${handwritingPractice.character_index}`}
                            className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 md:mx-0 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                        />
                    </div>
                    <KanjiHandwritingCanvas
                        key={`moji-hw-${handwritingPractice.flashcard_id}-${handwritingPractice.character_index}-${activeChar.character}`}
                        character={activeChar.character}
                        mode="quiz"
                        selfEvaluation
                        strokeWidth={handwritingStrokeWidth}
                        onStrokeWidthChange={setHandwritingStrokeWidth}
                        onBlankModeChange={setHandwritingBlankMode}
                        onSkip={finishHandwritingStep}
                        onComplete={finishHandwritingStep}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className={`flex min-h-[100dvh] flex-col items-center px-4 pb-8 pt-4 font-sans dark:bg-gray-950 ${isKanjiSession ? 'bg-gradient-to-br from-violet-50 via-white to-indigo-50' : 'bg-gradient-to-br from-pink-50 via-white to-rose-50'}`}>
            <Head title={`${isKanjiSession ? 'Kanji' : 'Kotoba'} — Hari ${day?.day_number}`} />
            <header className="mb-4 flex w-full max-w-4xl items-center gap-3">
                <Link href={back_url} aria-label="Kembali ke roadmap" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800">
                    <CloseIcon />
                </Link>
                <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: isKanjiSession ? '#7C3AED' : '#DB2777' }}
                        initial={false}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4 }}
                    />
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-gray-800 shadow-xs dark:bg-gray-900 dark:text-gray-200">
                    {masteredCount}/{totalUnique}
                </span>
                <QuizSoundToggle enabled={soundEnabled} onToggle={() => setSoundEnabled((v) => !v)} />
            </header>

            {activeCard && (
                <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center">
                    <motion.div
                        key={activeCard.queueKey}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full overflow-hidden rounded-[2rem] border-2 border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                    >
                        <div className={`flex items-center justify-between border-b px-6 py-4 dark:border-gray-800 ${isKanjiSession ? 'bg-violet-50/80 dark:bg-violet-950/30' : 'bg-pink-50/80 dark:bg-pink-950/30'}`}>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isKanjiSession ? 'text-violet-700 dark:text-violet-300' : 'text-pink-700 dark:text-pink-300'}`}>
                                    {isKanjiSession ? '漢字 • Sesi Kanji' : '言葉 • Sesi Kotoba'}
                                </p>
                                <h1 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Hari {day?.day_number} — {day?.title}</h1>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 shadow-xs dark:bg-gray-900 dark:text-gray-200">
                                {currentIndex + 1}/{queue.length}
                            </span>
                        </div>

                        <div className="max-h-[55dvh] overflow-y-auto px-6 py-6 text-center">
                            <JapaneseReading
                                japanese={activeCard.front_text}
                                reading={activeCard.reading}
                                className="items-center text-4xl font-black text-gray-950 dark:text-white sm:text-5xl"
                            />

                            <div className="mt-4 flex items-center justify-center gap-2">
                                <JapaneseSpeechButton
                                    text={activeCard.audio_reading_override || activeCard.reading || activeCard.front_text}
                                    audioUrl={activeCard.audio_url}
                                    autoPlay
                                    autoPlayEnabled={soundEnabled}
                                    playbackKey={`moji-card-${activeCard.queueKey}`}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                />
                            </div>

                            <h2 className="mt-4 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">{activeCard.back_text || 'Belum ada arti'}</h2>

                            {isKanjiSession && (
                                <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-4">
                                    {activeCard.onyomi && <div className="rounded-lg bg-sky-50 px-3 py-2 dark:bg-sky-950/50"><span className="block text-[10px] font-black uppercase text-sky-700 dark:text-sky-300">Onyomi</span><span className="text-sm font-bold text-gray-800 dark:text-gray-100">{activeCard.onyomi}</span></div>}
                                    {activeCard.kunyomi && <div className="rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/50"><span className="block text-[10px] font-black uppercase text-orange-600 dark:text-orange-300">Kunyomi</span><span className="text-sm font-bold text-gray-800 dark:text-gray-100">{activeCard.kunyomi}</span></div>}
                                    {activeCard.radicals?.length > 0 && <div className="rounded-lg bg-lime-50 px-3 py-2 dark:bg-lime-950/40"><span className="block text-[10px] font-black uppercase text-lime-700 dark:text-lime-300">Radical</span><span className="text-sm font-bold text-gray-800 dark:text-gray-100">{activeCard.radicals.join(', ')}</span></div>}
                                    {activeCard.stroke_count && <div className="rounded-lg bg-violet-50 px-3 py-2 dark:bg-violet-950/50"><span className="block text-[10px] font-black uppercase text-violet-700 dark:text-violet-300">Stroke</span><span className="text-sm font-bold text-gray-800 dark:text-gray-100">{activeCard.stroke_count}</span></div>}
                                </div>
                            )}

                            {isKanjiSession && <StrokeGuideGallery text={activeCard.front_text} />}

                            {(activeCard.example_sentence || activeCard.example_meaning) && (
                                <div className="mx-auto mt-4 max-w-2xl rounded-2xl bg-gray-50 p-4 text-left dark:bg-gray-800">
                                    <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                                        <HighlightedLearningText text={activeCard.example_sentence} term={activeCard.front_text} />
                                    </p>
                                    {activeCard.example_reading && (
                                        <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-300">
                                            <HighlightedLearningText text={activeCard.example_reading} term={activeCard.reading} />
                                        </p>
                                    )}
                                    <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-300">
                                        <HighlightedLearningText text={activeCard.example_meaning} term={activeCard.back_text} />
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <div className="mt-5 grid w-full max-w-2xl grid-cols-2 gap-3">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleReview('learning')}
                            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-gray-950 shadow-[0_5px_0_#C2410C] transition hover:bg-orange-400 active:translate-y-1 active:shadow-none disabled:opacity-60 sm:text-base"
                        >
                            ? Belum Paham
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleReview('known')}
                            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-sm font-black text-gray-950 shadow-[0_5px_0_#65A30D] transition hover:bg-lime-300 active:translate-y-1 active:shadow-none disabled:opacity-60 sm:text-base"
                        >
                            OK Sudah Paham
                        </button>
                    </div>
                </main>
            )}
        </div>
    );
}
