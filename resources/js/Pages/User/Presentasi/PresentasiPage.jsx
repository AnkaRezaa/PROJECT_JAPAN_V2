import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PdfCarousel from '@/Components/Features/Presentation/PdfCarousel';
import EmbedFrame, { isEmbeddableUrl, isImageUrl, isVideoUrl } from '@/Components/Features/Presentation/EmbedFrame';
import ReaderControls, { useReaderFullscreen } from '@/Components/Features/Presentation/ReaderControls';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SlideshowIcon from '@mui/icons-material/Slideshow';

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
    const snapshot = slide.snapshot_url || slide.snapshot_data || slide.jamboard_snapshot;
    const visualUrl = snapshot || slide.media_url;
    const isEditableMedia = slide.layout === 'media' && slide.media_url;
    const backdrop = backgroundClass[slide.background] || backgroundClass.light;
    const title = slide.title || 'Slide Presentasi';

    if (!visualUrl) {
        return (
            <article className={`flex min-h-48 flex-col justify-center px-4 py-5 sm:min-h-64 sm:px-8 sm:py-8 ${backdrop}`}>
                <h3 className="text-xl font-bold leading-snug [overflow-wrap:anywhere] sm:text-3xl">{title}</h3>
                <p className="mt-3 max-w-prose whitespace-pre-wrap text-base leading-7 [overflow-wrap:anywhere] sm:text-lg sm:leading-8">{slide.content || 'Konten slide belum tersedia.'}</p>
            </article>
        );
    }

    const mediaUrl = isEditableMedia ? slide.media_url : visualUrl;
    const isExternalLink = (isEditableMedia || !snapshot) && !isImageUrl(mediaUrl) && !isVideoUrl(mediaUrl) && !isEmbeddableUrl(mediaUrl);
    return (
        <figure style={slideAspectStyle(slide)} className={`relative w-full overflow-hidden ${isExternalLink ? 'min-h-[220px]' : ''} ${backdrop}`}>
            <div className="absolute inset-0">
                {snapshot && !isEditableMedia
                    ? <img src={snapshot} alt={title} className="h-full w-full object-contain" />
                    : <EmbedFrame url={mediaUrl} title={title} />}
            </div>
            {isEditableMedia && snapshot && <img src={snapshot} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />}
        </figure>
    );
}

function SlideCarousel({ deck }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [zoom, setZoom] = useState(1);
    const stageRef = useRef(null);
    const slideViewportRef = useRef(null);
    const fullscreen = useReaderFullscreen(stageRef);
    const prefersReducedMotion = useReducedMotion();
    const slides = deck?.slides || [];
    const activeSlide = slides[activeIndex] || null;
    const isInteractiveMediaSlide = Boolean(
        activeSlide?.layout === 'media'
            && (isVideoUrl(activeSlide?.media_url || '') || isEmbeddableUrl(activeSlide?.media_url || '')),
    );
    const hasVisual = Boolean(activeSlide?.snapshot_url || activeSlide?.jamboard_snapshot || activeSlide?.snapshot_data || activeSlide?.media_url);
    const canZoom = Boolean(activeSlide && (
        isImageUrl(activeSlide.media_url || '') ||
        (activeSlide.layout !== 'media' && (activeSlide.snapshot_url || activeSlide.jamboard_snapshot || activeSlide.snapshot_data))
    ));

    useEffect(() => {
        setZoom(1);
        slideViewportRef.current?.scrollTo(0, 0);
    }, [activeIndex]);

    useEffect(() => {
        if (!isPlaying) return undefined;

        if (slides.length <= 1 || isInteractiveMediaSlide) {
            setIsPlaying(false);
            return undefined;
        }

        if (activeIndex >= slides.length - 1) {
            setIsPlaying(false);
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setActiveIndex((current) => {
                if (current >= slides.length - 1) {
                    setIsPlaying(false);
                    return current;
                }
                return current + 1;
            });
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [activeIndex, isInteractiveMediaSlide, isPlaying, slides.length]);

    if (!activeSlide) {
        return (
            <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm font-black text-gray-500">Deck ini belum punya slide published.</p>
            </div>
        );
    }

    const previous = () => {
        setIsPlaying(false);
        setActiveIndex((current) => Math.max(0, current - 1));
    };

    const next = () => {
        setIsPlaying(false);
        setActiveIndex((current) => Math.min(slides.length - 1, current + 1));
    };

    const selectSlide = (index) => {
        setIsPlaying(false);
        setActiveIndex(index);
    };

    const togglePlay = () => {
        if (slides.length <= 1) return;
        setZoom(1);

        if (!isPlaying && activeIndex >= slides.length - 1) {
            setActiveIndex(0);
            setIsPlaying(true);
            return;
        }

        setIsPlaying((current) => !current);
    };
    const changeZoom = (value) => {
        setIsPlaying(false);
        setZoom(value);
        if (value === 1) slideViewportRef.current?.scrollTo(0, 0);
    };
    const slideSize = slideDimensions(activeSlide);
    const fullscreenSlideWidth = `calc(min(100cqw, 100cqh * ${slideSize.width / slideSize.height}) * ${zoom})`;

    return (
        <section ref={stageRef} aria-label="Penampil slide" role={fullscreen.expanded ? 'dialog' : undefined} aria-modal={fullscreen.expanded || undefined} className={`min-w-0 overflow-hidden bg-white dark:bg-slate-900 ${fullscreen.fallback ? 'fixed inset-0 z-[120] h-dvh' : 'rounded-lg border border-slate-200 dark:border-slate-800 fullscreen:rounded-none fullscreen:border-0'}`}>
            <div className={fullscreen.expanded ? 'flex h-full flex-col pb-[env(safe-area-inset-bottom)]' : 'mx-auto max-w-6xl'}>
                <div ref={slideViewportRef} role="region" aria-label="Area slide" tabIndex={fullscreen.expanded || hasVisual ? 0 : undefined} className={fullscreen.expanded ? 'min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 [container-type:size] dark:bg-slate-950' : hasVisual ? 'max-h-[65dvh] overflow-auto overscroll-contain' : undefined}>
                    <div className={fullscreen.expanded ? (
                        hasVisual ? 'grid min-h-full min-w-full w-max place-items-center max-lg:min-h-[100cqh]' : 'max-lg:grid max-lg:min-h-[100cqh] max-lg:place-items-center'
                    ) : undefined}>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={activeSlide.id || `slide-${activeIndex}`}
                                className={fullscreen.expanded && !hasVisual ? 'mx-auto max-w-5xl max-lg:w-full' : undefined}
                                style={fullscreen.expanded && hasVisual ? { width: fullscreenSlideWidth } : canZoom ? { width: `${zoom * 100}%` } : undefined}
                                initial={prefersReducedMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
                            >
                                <SlideFrame slide={activeSlide} />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
                <ReaderControls
                    current={activeIndex + 1}
                    total={slides.length}
                    onPrevious={previous}
                    onNext={next}
                    playing={isPlaying}
                    onTogglePlay={togglePlay}
                    canPlay={!isInteractiveMediaSlide}
                    fullscreen={fullscreen}
                    zoom={canZoom ? {
                        out: () => changeZoom(Math.max(1, zoom - 0.25)),
                        in: () => changeZoom(Math.min(2.5, zoom + 0.25)),
                        reset: () => changeZoom(1),
                        percent: Math.round(zoom * 100),
                        atMinimum: zoom <= 1,
                        atMaximum: zoom >= 2.5,
                    } : null}
                />
                {!fullscreen.expanded && hasVisual && (
                    <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800 sm:px-5">
                        <h3 className="text-base font-bold [overflow-wrap:anywhere]">{activeSlide.title || 'Slide Presentasi'}</h3>
                        {activeSlide.content && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{activeSlide.content}</p>}
                    </div>
                )}
                {!fullscreen.expanded && slides.length > 1 && (
                    <nav aria-label="Daftar slide" className="flex gap-2 overflow-x-auto overscroll-x-contain border-t border-slate-200 p-2 dark:border-slate-800">
                        {slides.map((slide, index) => {
                            const preview = slide.snapshot_url || slide.jamboard_snapshot || slide.snapshot_data || (isImageUrl(slide.media_url || '') ? slide.media_url : null);
                            return (
                                <button
                                    key={slide.id || index}
                                    type="button"
                                    onClick={() => selectSlide(index)}
                                    aria-label={`Slide ${index + 1}: ${slide.title || 'Tanpa judul'}`}
                                    aria-current={activeIndex === index ? 'step' : undefined}
                                    className={`relative grid h-12 w-[76px] shrink-0 place-items-center overflow-hidden rounded-lg border-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${activeIndex === index ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                                >
                                    {preview && <img src={preview} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" />}
                                    <span className={preview ? 'absolute bottom-0.5 left-0.5 rounded bg-slate-950 px-1 text-xs text-white' : ''}>{index + 1}</span>
                                </button>
                            );
                        })}
                    </nav>
                )}
            </div>
        </section>
    );
}

const selectClass = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function PresentasiPage({ program = {}, decks = [], modules = [], selected_module_id = null }) {
    const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || null);

    useEffect(() => {
        if (!decks.some((deck) => deck.id === selectedDeckId)) {
            setSelectedDeckId(decks[0]?.id || null);
        }
    }, [decks, selectedDeckId]);

    const selectedDeck = useMemo(
        () => decks.find((deck) => deck.id === selectedDeckId) || decks[0] || null,
        [decks, selectedDeckId],
    );
    const selectedModule = selected_module_id ? String(selected_module_id) : '';
    const changeWeek = (event) => {
        const { value } = event.target;
        router.get(route('user.modul.program.presentasi', { program: program.slug }), value ? { module: value } : {});
    };
    const moduleLabel = selectedDeck?.module?.week_number != null ? `Minggu ${selectedDeck.module.week_number}` : null;
    const showFilters = modules.length > 0 || decks.length > 1;

    return (
        <AuthenticatedLayout>
            <Head title={`Presentasi ${program.title || 'Kelas'} - TOKU-UP`} />
            <section aria-labelledby="presentation-heading" className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 text-slate-900 dark:text-slate-100 sm:px-5 lg:px-6">
                <header className="mb-4 flex items-start gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                    <Link href={program.roadmap_url || route('user.kelas.index')} aria-label="Kembali ke Roadmap" title="Kembali ke Roadmap" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-200 fine-pointer:hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-700 dark:fine-pointer:hover:bg-slate-800">
                        <ArrowBackIcon fontSize="small" />
                    </Link>
                    <div className="min-w-0">
                        <h1 id="presentation-heading" className="text-xl font-bold sm:text-2xl">Presentasi</h1>
                        <p className="mt-1 text-sm leading-5 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{[program.title, program.level].filter(Boolean).join(' · ')}</p>
                    </div>
                </header>

                <div className={`grid min-w-0 items-start gap-4 lg:gap-6 ${showFilters ? 'lg:grid-cols-[216px_minmax(0,1fr)]' : ''}`}>
                    {showFilters && <aside aria-label="Pilih materi presentasi" className={`grid min-w-0 gap-2 lg:sticky lg:top-[76px] lg:grid-cols-1 lg:border-r lg:border-slate-200 lg:pr-4 dark:lg:border-slate-800 ${modules.length > 0 && decks.length > 1 ? 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'grid-cols-1'}`}>
                        {modules.length > 0 && (
                            <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Minggu</span>
                                <select className={selectClass} value={selectedModule} onChange={changeWeek}>
                                    <option value="">Semua</option>
                                    {modules.map((module) => <option key={module.id} value={String(module.id)}>Minggu {module.week_number}</option>)}
                                </select>
                            </label>
                        )}

                        {decks.length > 1 && (
                            <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Materi</span>
                                <select className={selectClass} value={String(selectedDeck?.id || '')} onChange={(event) => setSelectedDeckId(decks.find((deck) => String(deck.id) === event.target.value)?.id || null)}>
                                    {decks.map((deck) => <option key={deck.id} value={String(deck.id)}>{deck.title}</option>)}
                                </select>
                            </label>
                        )}
                    </aside>}

                    <div className="min-w-0">
                        {selectedDeck ? (
                            <>
                                <header className="mb-3">
                                    {moduleLabel && <p className="mb-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">{moduleLabel}</p>}
                                    <h2 className="text-lg font-bold leading-snug [overflow-wrap:anywhere] sm:text-xl">{selectedDeck.title}</h2>
                                </header>
                                {selectedDeck.source_file_url
                                    ? <PdfCarousel key={selectedDeck.id} url={selectedDeck.source_file_url} title={selectedDeck.title} studentReader />
                                    : <SlideCarousel key={selectedDeck.id} deck={selectedDeck} />}
                                {selectedDeck.description && (
                                    <p className="mt-4 max-w-prose whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{selectedDeck.description}</p>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700">
                                <SlideshowIcon className="text-slate-500 dark:text-slate-400" />
                                <p className="text-sm font-semibold">Belum ada presentasi untuk pilihan ini.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}
