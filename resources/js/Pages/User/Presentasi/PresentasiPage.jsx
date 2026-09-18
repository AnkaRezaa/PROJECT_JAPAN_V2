import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import theme from '@/Components/theme/themes';
import PdfCarousel from '@/Components/Features/Presentation/PdfCarousel';
import EmbedFrame, { isImageUrl } from '@/Components/Features/Presentation/EmbedFrame';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';

const backgroundClass = {
    light: 'bg-white text-gray-950',
    dark: 'bg-gray-950 text-white',
    sunrise: 'bg-gradient-to-br from-orange-100 via-amber-50 to-white text-gray-950',
    sakura: 'bg-gradient-to-br from-pink-100 via-white to-rose-50 text-gray-950',
    ocean: 'bg-gradient-to-br from-cyan-100 via-white to-brand-100 text-gray-950',
    forest: 'bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-gray-950',
    paper: 'bg-[linear-gradient(#ffffff,#fff7ed)] text-gray-950',
    grid: 'bg-white text-gray-950 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]',
    indigo: 'bg-gradient-to-br from-indigo-950 via-gray-950 to-brand-950 text-white',
    matcha: 'bg-gradient-to-br from-lime-100 via-white to-emerald-100 text-gray-950',
    rose: 'bg-gradient-to-br from-rose-100 via-white to-orange-50 text-gray-950',
};

const slideDimensions = (slide = {}) => {
    const sourceWidth = Number(slide.canvas_width);
    const sourceHeight = Number(slide.canvas_height);

    if (sourceWidth > 0 && sourceHeight > 0) {
        return {
            width: sourceWidth,
            height: sourceHeight,
        };
    }

    return {
        width: 16,
        height: 9,
    };
};

const slideAspectStyle = (slide) => {
    const size = slideDimensions(slide);

    return { aspectRatio: `${size.width} / ${size.height}` };
};

function SlideFrame({ slide }) {
    const hasBoardSnapshot = slide.jamboard_snapshot || slide.snapshot_data;
    const visualUrl = slide.snapshot_url || slide.snapshot_data || slide.media_url;
    const isEditableMedia = slide.layout === 'media' && slide.media_url;

    return (
        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div style={slideAspectStyle(slide)} className={`flex items-center justify-center ${backgroundClass[slide.background] || `bg-gradient-to-br ${theme.ctaBg} text-white`} p-3 text-center sm:p-4`}>
                {isEditableMedia ? (
                    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gray-950 shadow-lg">
                        <EmbedFrame url={slide.media_url} title={slide.title || 'Media'} />
                        {(slide.snapshot_url || slide.snapshot_data) && (
                            <img src={slide.snapshot_url || slide.snapshot_data} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
                        )}
                    </div>
                ) : hasBoardSnapshot ? (
                    <img src={slide.jamboard_snapshot || slide.snapshot_data} alt={slide.title || 'Board'} className="max-h-full max-w-full rounded-xl bg-white object-contain shadow-lg" />
                ) : visualUrl ? (
                    <div className="h-full w-full overflow-hidden rounded-xl bg-gray-950 shadow-lg">
                        <EmbedFrame url={visualUrl} title={slide.title || 'Media'} />
                    </div>
                ) : (
                    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center text-center">
                        <p className="shrink-0 text-xs font-black uppercase tracking-[0.2em] text-white/70">{slide.layout}</p>
                        <h2 className="mt-2 shrink-0 break-words text-xl font-black sm:mt-3 sm:text-2xl">{slide.title || 'Slide Presentasi'}</h2>
                        <div className="mt-3 max-h-[55%] w-full overflow-y-auto overscroll-contain px-2">
                            <p className="mx-auto max-w-xl whitespace-pre-line break-words text-xs font-semibold leading-6 text-white/85 sm:text-sm sm:leading-7">{slide.content || 'Konten slide belum diisi.'}</p>
                        </div>
                    </div>
                )}
            </div>
            {(hasBoardSnapshot || visualUrl || slide.content) && (
                <div className="p-3 sm:p-4">
                    <h3 className="truncate text-sm font-black text-gray-900 dark:text-white">{slide.title || 'Slide Presentasi'}</h3>
                    {slide.content && <p className="mt-1 max-h-12 overflow-hidden whitespace-pre-line text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">{slide.content}</p>}
                </div>
            )}
        </article>
    );
}

function SlideCarousel({ deck }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const slides = deck?.slides || [];
    const activeSlide = slides[activeIndex] || null;

    if (!activeSlide) {
        return (
            <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm font-black text-gray-500">Deck ini belum punya slide published.</p>
            </div>
        );
    }

    const previous = () => setActiveIndex((current) => Math.max(0, current - 1));
    const next = () => setActiveIndex((current) => Math.min(slides.length - 1, current + 1));

    return (
        <div className="space-y-2.5">
            <SlideFrame slide={activeSlide} />
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white p-2 sm:p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <button type="button" onClick={previous} disabled={activeIndex === 0} className="shrink-0 rounded-xl border border-gray-200 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">Prev</button>
                <div className="min-w-0 flex-1 px-1 text-center">
                    <p className="text-[11px] sm:text-xs font-black text-gray-500">Slide {activeIndex + 1} dari {slides.length}</p>
                    <p className="mt-0.5 max-w-full truncate text-xs sm:text-sm font-black text-gray-900 dark:text-white">{activeSlide.title || 'Slide Presentasi'}</p>
                </div>
                <button type="button" onClick={next} disabled={activeIndex >= slides.length - 1} className="shrink-0 rounded-xl border border-gray-200 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">Next</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {slides.map((slide, index) => (
                    <button
                        key={slide.id || index}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`h-12 w-20 shrink-0 overflow-hidden rounded-xl border text-[10px] font-black ${activeIndex === index ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-900'}`}
                    >
                        {slide.snapshot_url || slide.jamboard_snapshot || isImageUrl(slide.media_url || '') ? (
                            <img src={slide.snapshot_url || slide.jamboard_snapshot || slide.media_url} alt={slide.title || 'Thumbnail'} className="h-full w-full object-cover" />
                        ) : (
                            <span>{slide.media_url ? 'Embed' : index + 1}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function PresentasiPage({ program = {}, decks = [], modules = [], selected_module_id = null }) {
    const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || null);
    const selectedDeck = useMemo(
        () => decks.find((deck) => deck.id === selectedDeckId) || decks[0] || null,
        [decks, selectedDeckId],
    );
    const selectedModuleId = selected_module_id ? Number(selected_module_id) : null;

    return (
        <AuthenticatedLayout header={false}>
            <Head title={`PPT ${program.title || 'Kelas'} - TOKU-UP`} />

            <div className={`min-h-screen ${theme.sectionBg} px-3 py-4 text-gray-900 dark:bg-gray-950 dark:text-white sm:px-5 lg:px-6`}>
                <main className="mx-auto max-w-7xl space-y-4">
                    <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.ctaBg} px-4 py-4 text-white shadow-sm sm:px-5`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14px_14px,rgba(255,255,255,0.18)_2px,transparent_3px)] bg-[length:24px_24px]" />
                        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">PPT & Board Kelas</p>
                                <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{program.title || 'Presentasi Kelas'}</h1>
                                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-white/80">
                                    Materi penunjang dari admin. User hanya melihat, tidak mengedit.
                                </p>
                            </div>
                            <Link href={program.roadmap_url || route('user.kelas.index')} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white/85 backdrop-blur transition hover:bg-white/20">
                                <ArrowBackIcon sx={{ fontSize: 16 }} />
                                Kembali ke Roadmap
                            </Link>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                            {modules.length > 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                    <h2 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-gray-500">Filter Week</h2>
                                    <div className="space-y-1.5">
                                        <Link
                                            href={route('user.modul.program.presentasi', program.slug)}
                                            className={`block rounded-xl px-3 py-2 text-xs font-black transition ${!selectedModuleId ? `bg-gradient-to-r ${theme.ctaBg} text-white` : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            Semua Week
                                        </Link>
                                        {modules.map((module) => (
                                            <Link
                                                key={module.id}
                                                href={route('user.modul.program.presentasi', { program: program.slug, module: module.id })}
                                                className={`block rounded-xl px-3 py-2 text-xs font-black transition ${selectedModuleId === Number(module.id) ? `bg-gradient-to-r ${theme.ctaBg} text-white` : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                                            >
                                                Week {module.week_number ?? '-'} - {module.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <div className="mb-3 flex items-center gap-2">
                                    <SlideshowIcon className={theme.heroAccent} />
                                    <h2 className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Deck</h2>
                                </div>
                                <div className="space-y-1.5">
                                    {decks.map((deck) => (
                                        <button
                                            key={deck.id}
                                            type="button"
                                            onClick={() => setSelectedDeckId(deck.id)}
                                            className={`w-full rounded-xl px-3 py-2.5 text-left transition ${selectedDeck?.id === deck.id ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                                        >
                                            <p className="truncate text-sm font-black">{deck.title}</p>
                                            <p className="mt-1 text-xs opacity-70">Week {deck.module?.week_number ?? '-'} - {deck.module?.title || 'Kelas'} · {deck.slides_count ?? deck.slides?.length ?? 0} slide</p>
                                        </button>
                                    ))}
                                    {decks.length === 0 && (
                                        <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            Belum ada PPT published untuk kelas ini.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </aside>

                        <div className="space-y-3">
                            {selectedDeck && (
                                <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.ctaBg} text-white`}>
                                            <ViewCarouselIcon />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-base font-black text-gray-900 dark:text-white">{selectedDeck.title}</h2>
                                            <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">{selectedDeck.description || 'Materi presentasi penunjang kelas.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedDeck?.source_file_url ? (
                                <PdfCarousel url={selectedDeck.source_file_url} title={selectedDeck.title} />
                            ) : (
                                <SlideCarousel key={selectedDeck?.id || 'empty'} deck={selectedDeck} />
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </AuthenticatedLayout>
    );
}
