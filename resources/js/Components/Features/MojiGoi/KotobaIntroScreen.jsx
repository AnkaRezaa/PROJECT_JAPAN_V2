import React from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';
import { QuizActionButton, QuizSurface } from '@/Components/UI/QuizUI';

export default function KotobaIntroScreen({ day, cards, backUrl, onStart }) {
    const introTitle = day?.kotoba_intro_title || `Pengantar Kotoba — Hari ${day?.day_number}`;
    const introBody = day?.kotoba_intro_body || day?.description || 'Pelajari arti dan cara baca kosakata tema hari ini. Fokus pada pemahaman kata dan pelafalan tanpa latihan menulis kanji.';

    return (
        <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-pink-50 via-white to-rose-50 px-4 py-6 font-sans dark:from-gray-950 dark:via-gray-950 dark:to-slate-900 sm:px-7 sm:py-8">
            <Head title={`Kotoba — Hari ${day?.day_number}`} />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
                <div className="flex items-center justify-between gap-3">
                    <Link href={backUrl} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                        <ArrowBackIcon sx={{ fontSize: 19 }} /> Kembali ke Roadmap
                    </Link>
                    <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-800 dark:bg-pink-950/60 dark:text-pink-300">
                        言葉 • Kotoba ({cards.length} Kata)
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
                    <QuizActionButton onClick={onStart} className="flex min-h-12 w-full items-center justify-center gap-2 sm:w-auto">
                        Mulai Sesi Kotoba <ArrowForwardIcon sx={{ fontSize: 19 }} />
                    </QuizActionButton>
                </div>
            </div>
        </div>
    );
}
