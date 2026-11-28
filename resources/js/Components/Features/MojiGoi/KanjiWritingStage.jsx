import React from 'react';
import { Head, Link } from '@inertiajs/react';
import CloseIcon from '@mui/icons-material/Close';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import QuizSoundToggle from '@/Components/UI/QuizNarration';
import KanjiHandwritingCanvas from '@/Components/Features/Handwriting/KanjiHandwritingCanvas';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';

export default function KanjiWritingStage({
    practice,
    handwritingMode,
    strokeWidth,
    onStrokeWidthChange,
    soundEnabled,
    onToggleSound,
    backUrl,
    onJumpToBlank,
    onSkip,
    onComplete,
}) {
    const activeChar = practice.characters[practice.character_index];
    const isBlankPhase = practice.phase === 'blank';

    return (
        <div className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-4 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-slate-900 sm:py-6">
            <Head title={isBlankPhase ? 'Uji Menulis Kanji dari Ingatan' : `Latihan Menulis ${activeChar.character}`} />
            <header className="mb-4 flex w-full max-w-4xl items-center gap-3">
                <Link href={backUrl} aria-label="Kembali ke roadmap" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800">
                    <CloseIcon />
                </Link>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
                        {isBlankPhase ? 'Uji Menulis dari Ingatan' : 'Latihan Menulis Kanji'}
                    </p>
                    <h1 className="truncate text-lg font-black text-gray-900 dark:text-white">
                        {isBlankPhase ? 'Tulis Kanji dari Ingatan' : `Tulis ${activeChar.character}`}
                    </h1>
                </div>
                <QuizSoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
            </header>
            <main className="w-full max-w-4xl rounded-3xl border border-violet-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6 md:grid md:grid-cols-[minmax(200px,0.72fr)_minmax(0,1fr)] md:items-start md:gap-6">
                <div className="mb-4 text-center md:mb-0 md:text-left">
                    {isBlankPhase ? (
                        practice.reading && (
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{practice.reading}</p>
                        )
                    ) : (
                        <JapaneseReading japanese={practice.title} reading={practice.reading} className="items-center text-3xl font-black text-gray-900 dark:text-white md:items-start" />
                    )}
                    {practice.meaning && <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">{practice.meaning}</p>}
                    <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {isBlankPhase
                            ? 'Karakter kanji disembunyikan. Tulis bentuk kanji dari ingatan menggunakan garis bantu kotak.'
                            : 'Ikuti panduan transparan terlebih dahulu, lalu lanjut ke uji menulis dari ingatan.'}
                    </p>
                    <JapaneseSpeechButton
                        text={practice.audio_reading_override || practice.reading || practice.title}
                        audioUrl={practice.audio_url}
                        autoPlay
                        autoPlayEnabled={soundEnabled}
                        playbackKey={`moji-hw-${practice.flashcard_id}-${practice.character_index}-${practice.phase}`}
                        className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 md:mx-0 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                    />
                </div>
                <KanjiHandwritingCanvas
                    key={`moji-hw-${practice.flashcard_id}-${practice.character_index}-${practice.phase}-${activeChar.character}`}
                    character={activeChar.character}
                    mode="quiz"
                    selfEvaluation
                    forcedBlankMode={isBlankPhase}
                    onJumpToBlank={handwritingMode === 'guided_then_blank' && !isBlankPhase ? onJumpToBlank : null}
                    strokeWidth={strokeWidth}
                    onStrokeWidthChange={onStrokeWidthChange}
                    onSkip={onSkip}
                    onComplete={onComplete}
                />
            </main>
        </div>
    );
}
