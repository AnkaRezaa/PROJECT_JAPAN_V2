import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import QuizSoundToggle, { useQuizSoundPreference } from '@/Components/UI/QuizNarration';
import { QuizSurface } from '@/Components/UI/QuizUI';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import { resolveAvailableCharacters } from '@/Components/Features/Handwriting/strokeData';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import KanjiStrokeGuide from '@/Components/Features/MojiGoi/KanjiStrokeGuide';
import KanjiWritingStage from '@/Components/Features/MojiGoi/KanjiWritingStage';
import KotobaIntroScreen from '@/Components/Features/MojiGoi/KotobaIntroScreen';

export default function SesiMojiGoi({ focus = 'kanji', day, cards = [], quiz_url = null, quiz_question_count = 0, back_url = '/user/kelas' }) {
    const isKanjiSession = focus === 'kanji';
    const handwritingMode = day?.handwriting_mode || 'guided_then_blank';

    const [soundEnabled, setSoundEnabled] = useQuizSoundPreference();
    const [showIntro, setShowIntro] = useState(!isKanjiSession && cards.length > 0);
    const [queue, setQueue] = useState(() => cards.map((card, idx) => ({ ...card, isRepeat: false, repeatCount: 0, queueKey: `${card.id}-${idx}-0` })));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [knownIds, setKnownIds] = useState(() => new Set(cards.filter((c) => c.is_known).map((c) => c.id)));
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(cards.length === 0);
    const [handwritingPractice, setHandwritingPractice] = useState(null);
    const [handwritingStrokeWidth, setHandwritingStrokeWidth] = useState(5);

    const activeCard = queue[currentIndex] || null;
    const totalUnique = cards.length;
    const masteredCount = knownIds.size;
    const progressPercent = totalUnique > 0 ? Math.min(100, Math.round((masteredCount / totalUnique) * 100)) : 100;

    const resolveInitialWritingPhase = () => (handwritingMode === 'blank_only' ? 'blank' : 'guided');

    const advanceQueue = (targetQueueLength, allMastered = false) => {
        if (currentIndex + 1 >= targetQueueLength) {
            playSoundEffect(allMastered ? 'complete' : 'select');
            setCompleted(true);
            return;
        }
        setCurrentIndex((prev) => prev + 1);
    };

    const persistCardReview = (cardId, finalAction, nextKnownSet, nextQueueLength, onDone) => {
        const isLastStep = currentIndex + 1 >= nextQueueLength && nextKnownSet.size >= totalUnique;
        setSubmitting(true);

        router.post(
            route('user.flashcards.review', cardId),
            {
                action: finalAction,
                skill: 'recognition',
                completed: isLastStep,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setSubmitting(false);
                    onDone?.();
                },
            },
        );
    };

    const handleReview = async (action) => {
        if (!activeCard || submitting) return;

        let nextQueueLength = queue.length;
        if (action === 'learning') {
            playSoundEffect('incorrect');
            const canRepeatInSession = totalUnique > 1 && (activeCard.repeatCount || 0) < 1;
            if (canRepeatInSession) {
                const repeatItem = {
                    ...activeCard,
                    isRepeat: true,
                    repeatCount: (activeCard.repeatCount || 0) + 1,
                    queueKey: `${activeCard.id}-repeat-${Date.now()}`,
                };
                setQueue((prev) => [...prev, repeatItem]);
                nextQueueLength = queue.length + 1;
            }
        } else {
            playSoundEffect('correct');
        }

        // For Kanji sessions with handwriting enabled, defer marking `known` until writing
        // is actually finished without skipping — a skipped kanji must NEVER count as completed.
        if (isKanjiSession && day?.handwriting_enabled) {
            try {
                const chars = await resolveAvailableCharacters(activeCard.front_text, activeCard.reading);
                const kanjiChars = chars.filter(({ character }) => /\p{Script=Han}/u.test(character));
                if (kanjiChars.length > 0) {
                    setHandwritingPractice({
                        characters: kanjiChars,
                        character_index: 0,
                        phase: resolveInitialWritingPhase(),
                        flashcard_id: activeCard.id,
                        intendedAction: action,
                        hasSkipped: false,
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
                // Fall back to direct recognition review when stroke data is unavailable.
            }
        }

        const nextKnown = new Set(knownIds);
        if (action === 'known') {
            nextKnown.add(activeCard.id);
        } else {
            nextKnown.delete(activeCard.id);
        }
        setKnownIds(nextKnown);

        persistCardReview(activeCard.id, action, nextKnown, nextQueueLength, () => {
            advanceQueue(nextQueueLength, nextKnown.size >= totalUnique);
        });
    };

    const finishHandwritingStep = (result = {}) => {
        if (!handwritingPractice) return;
        const isSkipped = result?.outcome === 'skipped';
        const nextHasSkipped = handwritingPractice.hasSkipped || isSkipped;

        if (!isSkipped && handwritingMode === 'guided_then_blank' && handwritingPractice.phase === 'guided') {
            playSoundEffect('correct');
            setHandwritingPractice((prev) => (prev ? { ...prev, phase: 'blank', hasSkipped: nextHasSkipped } : prev));
            return;
        }

        const nextCharIdx = handwritingPractice.character_index + 1;
        if (nextCharIdx < handwritingPractice.characters.length) {
            setHandwritingPractice((prev) => (prev ? {
                ...prev,
                character_index: nextCharIdx,
                phase: resolveInitialWritingPhase(),
                hasSkipped: nextHasSkipped,
            } : prev));
            return;
        }

        // Only count as `known` if the user clicked Sudah Paham AND did NOT skip writing.
        const finalAction = handwritingPractice.intendedAction === 'known' && !nextHasSkipped ? 'known' : 'learning';
        const nextKnown = new Set(knownIds);
        if (finalAction === 'known') {
            nextKnown.add(handwritingPractice.flashcard_id);
        } else {
            nextKnown.delete(handwritingPractice.flashcard_id);
        }
        setKnownIds(nextKnown);

        const cardId = handwritingPractice.flashcard_id;
        const qLen = handwritingPractice.nextQueueLength;
        setHandwritingPractice(null);

        persistCardReview(cardId, finalAction, nextKnown, qLen, () => {
            advanceQueue(qLen, nextKnown.size >= totalUnique);
        });
    };

    if (showIntro && !isKanjiSession) {
        return <KotobaIntroScreen day={day} cards={cards} backUrl={back_url} onStart={() => setShowIntro(false)} />;
    }

    if (completed) {
        const unmasteredCards = cards.filter((card) => !knownIds.has(card.id));
        const hasUnmastered = unmasteredCards.length > 0;
        const restartUnmastered = () => {
            const retryList = hasUnmastered ? unmasteredCards : cards;
            setQueue(retryList.map((card, idx) => ({ ...card, isRepeat: false, repeatCount: 0, queueKey: `${card.id}-retry-${Date.now()}-${idx}` })));
            setCurrentIndex(0);
            setCompleted(false);
        };

        return (
            <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-4 py-8 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-slate-900">
                <Head title={hasUnmastered ? `Sesi ${isKanjiSession ? 'Kanji' : 'Kotoba'} Belum Tuntas` : `Sesi ${isKanjiSession ? 'Kanji' : 'Kotoba'} Selesai`} />
                <QuizSurface className="w-full max-w-md p-6 text-center sm:p-8">
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${hasUnmastered ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                        {hasUnmastered ? <ReplayIcon sx={{ fontSize: 36 }} /> : <CheckCircleIcon sx={{ fontSize: 38 }} />}
                    </div>
                    <h1 className="mt-4 text-2xl font-black text-gray-950 dark:text-white">
                        {hasUnmastered
                            ? `Sesi ${isKanjiSession ? '漢字 Kanji' : '言葉 Kotoba'} Belum Tuntas`
                            : `Sesi ${isKanjiSession ? '漢字 Kanji' : '言葉 Kotoba'} Selesai!`}
                    </h1>
                    <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {totalUnique === 0
                            ? `Belum ada kartu ${isKanjiSession ? 'Kanji' : 'Kotoba'} pada hari ini.`
                            : hasUnmastered
                                ? `${masteredCount} dari ${totalUnique} kartu tuntas • ${unmasteredCards.length} kartu masih perlu diselesaikan (Belum Paham / dilewati).`
                                : `Kamu sudah menuntaskan seluruh ${totalUnique} kartu ${isKanjiSession ? 'Kanji' : 'Kotoba'} Hari ${day?.day_number}.`}
                    </p>
                    <div className="mt-6 space-y-2.5">
                        {unmasteredCards.length > 0 && (
                            <button
                                type="button"
                                onClick={restartUnmastered}
                                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-black text-gray-950 shadow-sm transition hover:bg-orange-400"
                            >
                                Ulangi Kartu Belum Tuntas ({unmasteredCards.length})
                            </button>
                        )}
                        {quiz_url && quiz_question_count > 0 && (
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
                        )}
                        <Link
                            href={back_url}
                            className={`inline-flex w-full items-center justify-center rounded-2xl px-5 text-sm transition ${
                                unmasteredCards.length > 0 || (quiz_url && quiz_question_count > 0)
                                    ? 'min-h-11 border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                                    : 'min-h-12 bg-emerald-600 font-black text-white shadow-sm hover:bg-emerald-700'
                            }`}
                        >
                            Kembali ke Roadmap
                        </Link>
                    </div>
                </QuizSurface>
            </div>
        );
    }

    if (handwritingPractice && isKanjiSession) {
        return (
            <KanjiWritingStage
                practice={handwritingPractice}
                handwritingMode={handwritingMode}
                strokeWidth={handwritingStrokeWidth}
                onStrokeWidthChange={setHandwritingStrokeWidth}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled((v) => !v)}
                backUrl={back_url}
                onJumpToBlank={() => setHandwritingPractice((prev) => (prev ? { ...prev, phase: 'blank' } : prev))}
                onSkip={() => finishHandwritingStep({ outcome: 'skipped' })}
                onComplete={finishHandwritingStep}
            />
        );
    }

    return (
        <div className={`flex min-h-[100dvh] flex-col items-center px-4 pb-8 pt-4 font-sans ${isKanjiSession ? 'bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-950 dark:to-slate-900' : 'bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-950 dark:via-gray-950 dark:to-slate-900'}`}>
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
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full overflow-hidden rounded-[2rem] border-2 border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                    >
                        <div className={`flex items-center justify-between border-b px-6 py-4 dark:border-gray-800 ${isKanjiSession ? 'bg-violet-50/80 dark:bg-violet-950/30' : 'bg-pink-50/80 dark:bg-pink-950/30'}`}>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isKanjiSession ? 'text-violet-700 dark:text-violet-300' : 'text-pink-700 dark:text-pink-300'}`}>
                                    {isKanjiSession ? '漢字 • Sesi Kanji' : '言葉 • Sesi Kotoba'}
                                </p>
                                <h1 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Hari {day?.day_number} — {day?.title}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeCard.isRepeat && (
                                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                        Pengulangan
                                    </span>
                                )}
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 shadow-xs dark:bg-gray-900 dark:text-gray-200">
                                    {currentIndex + 1}/{queue.length}
                                </span>
                            </div>
                        </div>

                        <div className="px-6 py-6 text-center sm:px-8 sm:py-7">
                            <JapaneseReading
                                japanese={activeCard.front_text}
                                reading={activeCard.reading}
                                className="items-center text-5xl font-black leading-tight text-gray-950 dark:text-white sm:text-6xl"
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

                            {isKanjiSession && (activeCard.onyomi || activeCard.kunyomi || activeCard.radicals?.length > 0 || activeCard.stroke_count) && (
                                <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-stretch justify-center gap-2.5 text-left">
                                    {activeCard.onyomi && <div className="min-w-[115px] flex-1 rounded-xl bg-sky-50 px-3.5 py-2.5 dark:bg-sky-950/50"><span className="block text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Onyomi</span><span className="mt-0.5 block text-sm font-bold text-gray-900 dark:text-gray-100">{activeCard.onyomi}</span></div>}
                                    {activeCard.kunyomi && <div className="min-w-[115px] flex-1 rounded-xl bg-orange-50 px-3.5 py-2.5 dark:bg-orange-950/50"><span className="block text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-300">Kunyomi</span><span className="mt-0.5 block text-sm font-bold text-gray-900 dark:text-gray-100">{activeCard.kunyomi}</span></div>}
                                    {activeCard.radicals?.length > 0 && <div className="min-w-[115px] flex-1 rounded-xl bg-lime-50 px-3.5 py-2.5 dark:bg-lime-950/40"><span className="block text-[10px] font-black uppercase tracking-wider text-lime-700 dark:text-lime-300">Radical</span><span className="mt-0.5 block text-sm font-bold text-gray-900 dark:text-gray-100">{activeCard.radicals.join(', ')}</span></div>}
                                    {activeCard.stroke_count && <div className="min-w-[115px] flex-1 rounded-xl bg-violet-50 px-3.5 py-2.5 dark:bg-violet-950/50"><span className="block text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Stroke</span><span className="mt-0.5 block text-sm font-bold text-gray-900 dark:text-gray-100">{activeCard.stroke_count}</span></div>}
                                </div>
                            )}

                            {isKanjiSession && <KanjiStrokeGuide text={activeCard.front_text} />}

                            {(activeCard.example_sentence || activeCard.example_meaning) && (
                                <div className="mx-auto mt-5 max-w-2xl rounded-2xl bg-gray-50 p-4 text-left dark:bg-gray-800">
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
