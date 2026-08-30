import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import LiveClassRoom from '@/Components/Features/Presentation/LiveClassRoom';
import PresentationStage from '@/Components/Features/Presentation/PresentationStage';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

export default function ModePresentasi({ deck }) {
    const page = usePage();
    const slides = deck.slides || [];
    const [index, setIndex] = useState(0);
    const [notesOpen, setNotesOpen] = useState(false);
    const activeSlide = slides[index] || null;
    const progress = slides.length > 0 ? ((index + 1) / slides.length) * 100 : 0;
    const classroomQuery = useMemo(() => {
        const query = String(page.url || '').split('?')[1] || '';
        return new URLSearchParams(query);
    }, [page.url]);
    const classroomPreview = classroomQuery.get('classroom') === '1';
    const classroomExitUrl = route('admin.programs.index');

    useEffect(() => {
        if (classroomPreview) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'ArrowRight' || event.key === ' ') {
                setIndex((value) => Math.min(slides.length - 1, value + 1));
            }

            if (event.key === 'ArrowLeft') {
                setIndex((value) => Math.max(0, value - 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [classroomPreview, slides.length]);

    if (classroomPreview) {
        return (
            <>
                <Head title={`Ruang Kelas - ${deck.title}`} />
                <LiveClassRoom deck={deck} exitUrl={classroomExitUrl} />
            </>
        );
    }

    return (
        <>
            <Head title={`Presentasi - ${deck.title}`} />

            <div className="min-h-screen bg-gray-950">
                <PresentationStage slide={activeSlide} />

                <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-white/20">
                    <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>

                <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-white/10 bg-gray-950/90 p-2 text-white shadow-2xl backdrop-blur-xl sm:inset-x-5 sm:bottom-5">
                    <div className="hidden min-w-0 flex-1 px-2 md:block">
                        <p className="truncate text-sm font-black">{deck.title}</p>
                        <p className="text-[11px] font-bold text-gray-400">{activeSlide?.title || 'Slide presentasi'}</p>
                    </div>

                    <div className="flex flex-1 items-center justify-center gap-1.5 md:flex-none">
                        <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 transition hover:bg-white/10 disabled:opacity-35" disabled={index <= 0} aria-label="Slide sebelumnya"><ChevronLeftIcon /></button>
                        <span className="min-w-16 text-center text-xs font-black">{slides.length > 0 ? index + 1 : 0} / {slides.length}</span>
                        <button type="button" onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 transition hover:bg-white/10 disabled:opacity-35" disabled={index >= slides.length - 1} aria-label="Slide berikutnya"><ChevronRightIcon /></button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {activeSlide?.speaker_notes && (
                            <button type="button" onClick={() => setNotesOpen((value) => !value)} className={`grid h-10 w-10 place-items-center rounded-xl transition ${notesOpen ? 'bg-orange-500 text-white' : 'bg-white/5 hover:bg-white/10'}`} aria-label="Catatan pembicara" aria-pressed={notesOpen}><DescriptionOutlinedIcon sx={{ fontSize: 19 }} /></button>
                        )}
                        <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="hidden h-10 w-10 place-items-center rounded-xl bg-white/5 transition hover:bg-white/10 sm:grid" aria-label="Layar penuh"><FullscreenIcon sx={{ fontSize: 19 }} /></button>
                        <Link href={route('admin.presentations.builder', deck.id)} className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition hover:bg-brand-500/25" aria-label="Keluar dari presentasi" title="Keluar"><ArrowBackIcon sx={{ fontSize: 19 }} /></Link>
                    </div>

                    {notesOpen && activeSlide?.speaker_notes && (
                        <aside className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 rounded-xl border border-white/10 bg-gray-950/95 p-4 text-sm font-medium leading-6 text-gray-200 shadow-2xl backdrop-blur-xl sm:left-auto sm:w-96">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">Catatan pembicara</p>
                            {activeSlide.speaker_notes}
                        </aside>
                    )}
                </div>
            </div>
        </>
    );
}
