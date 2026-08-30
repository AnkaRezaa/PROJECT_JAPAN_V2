import React from 'react';
import BoardCanvas from '@/Components/Features/Board/BoardCanvas';
import EmbedFrame from '@/Components/Features/Presentation/EmbedFrame';

const backgrounds = {
    light: 'bg-white text-gray-950',
    dark: 'bg-gray-950 text-white',
    sunrise: 'bg-gradient-to-br from-orange-100 via-amber-50 to-white text-gray-950',
    sakura: 'bg-gradient-to-br from-pink-100 via-white to-rose-50 text-gray-950',
    ocean: 'bg-gradient-to-br from-cyan-100 via-white to-red-100 text-gray-950',
    forest: 'bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-gray-950',
    paper: 'bg-[linear-gradient(#ffffff,#fff7ed)] text-gray-950',
    grid: 'bg-white text-gray-950 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]',
    indigo: 'bg-gradient-to-br from-indigo-950 via-gray-950 to-red-950 text-white',
    matcha: 'bg-gradient-to-br from-lime-100 via-white to-emerald-100 text-gray-950',
    rose: 'bg-gradient-to-br from-rose-100 via-white to-orange-50 text-gray-950',
};

export default function PresentationStage({ slide, contained = false, className = '' }) {
    if (!slide) {
        return (
            <section className={`${contained ? 'h-full' : 'min-h-screen'} grid place-items-center bg-gray-950 text-white ${className}`}>
                <p className="text-base font-black sm:text-xl">Belum ada slide.</p>
            </section>
        );
    }

    const lines = String(slide.content || '').split('\n').filter(Boolean);
    const accent = slide.accent_color || '#22C55E';
    const canvasSnapshot = slide.snapshot_url || slide.snapshot_data;
    const rootSize = contained ? 'h-full min-h-0 p-4 sm:p-6' : 'min-h-screen p-8 sm:p-12 lg:p-16';
    const titleSize = contained ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-6xl sm:text-8xl';
    const sectionTitle = contained ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-7xl';
    const bodySize = contained ? 'text-base sm:text-xl' : 'text-2xl';

    if (canvasSnapshot && slide.layout !== 'media') {
        return (
            <section className={`${rootSize} flex items-center justify-center overflow-hidden bg-gray-950 ${className}`}>
                <img src={canvasSnapshot} alt={slide.title || 'Slide presentasi'} className={contained ? 'h-full max-h-full w-full object-contain' : 'max-h-[92vh] max-w-full object-contain'} />
            </section>
        );
    }

    return (
        <section className={`${backgrounds[slide.background] || backgrounds.light} ${rootSize} relative flex overflow-hidden ${className}`}>
            <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-col">
                {slide.layout === 'title' && (
                    <div className="my-auto">
                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] sm:mb-6 sm:text-sm" style={{ color: accent }}>TOKU-UP</p>
                        <h1 className={`${titleSize} font-black tracking-tight`}>{slide.title || 'Untitled'}</h1>
                        <p className={`mt-4 max-w-3xl font-bold leading-relaxed opacity-70 sm:mt-8 ${bodySize}`}>{slide.content}</p>
                    </div>
                )}

                {slide.layout === 'content' && (
                    <div className="my-auto">
                        <h1 className={`${sectionTitle} font-black`}>{slide.title || 'Poin Utama'}</h1>
                        <div className="mt-5 grid gap-2 sm:mt-8 sm:gap-3">
                            {(lines.length ? lines : ['Tulis poin materi di sini.']).map((line, index) => (
                                <div key={`${line}-${index}`} className={`rounded-2xl bg-white/75 p-3 font-black shadow-lg backdrop-blur dark:bg-gray-900/60 sm:p-5 ${bodySize}`}>
                                    {line}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {slide.layout === 'vocabulary' && (
                    <div className="my-auto text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] sm:text-sm" style={{ color: accent }}>Vocabulary</p>
                        <h1 className={`${contained ? 'mt-4 text-6xl sm:text-8xl' : 'mt-8 text-9xl'} font-black`}>{slide.title || 'Vocabulary'}</h1>
                        <p className={`${contained ? 'mt-4 text-2xl sm:text-4xl' : 'mt-8 text-5xl'} font-bold opacity-70`}>{lines[0] || 'reading'}</p>
                        <p className={`${contained ? 'mt-5 text-3xl sm:text-5xl' : 'mt-10 text-6xl'} font-black`}>{lines[1] || 'arti'}</p>
                        <p className={`mx-auto mt-5 max-w-4xl italic opacity-70 ${bodySize}`}>{lines[2] || 'Contoh kalimat akan tampil di sini.'}</p>
                    </div>
                )}

                {slide.layout === 'kanji' && (
                    <div className={`my-auto grid items-center gap-6 ${contained ? 'sm:grid-cols-[180px_1fr]' : 'lg:grid-cols-[320px_1fr]'}`}>
                        <div className={`${contained ? 'h-36 w-36 text-6xl sm:h-44 sm:w-44' : 'h-72 w-72 text-9xl'} grid place-items-center rounded-[2rem] bg-white/70 font-black shadow-2xl dark:bg-gray-900/60`}>
                            {slide.title || 'Kanji'}
                        </div>
                        <div className="space-y-3 sm:space-y-5">
                            {(lines.length ? lines : ['Arti: ...', 'Reading: ...', 'Contoh: ...']).map((line, index) => (
                                <p key={`${line}-${index}`} className={`${contained ? 'text-lg sm:text-2xl' : 'text-4xl'} font-black opacity-80`}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {slide.layout === 'media' && (
                    <div className="my-auto min-h-0">
                        <h1 className={`${contained ? 'mb-4 text-3xl sm:text-5xl' : 'mb-8 text-6xl'} font-black`}>{slide.title || 'Media'}</h1>
                        {slide.media_url ? (
                            <div className={`${contained ? 'h-[55vh] max-h-[70%]' : 'h-[62vh]'} relative overflow-hidden rounded-2xl bg-gray-950 shadow-2xl`}>
                                <EmbedFrame url={slide.media_url} title={slide.title || 'Media'} />
                                {(slide.snapshot_url || slide.snapshot_data) && <img src={slide.snapshot_url || slide.snapshot_data} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />}
                            </div>
                        ) : (
                            <div className={`${contained ? 'h-[45vh]' : 'h-[55vh]'} grid place-items-center rounded-2xl border-4 border-dashed border-gray-300 text-2xl font-black opacity-40`}>Media URL</div>
                        )}
                        <p className={`mt-4 font-bold opacity-70 ${bodySize}`}>{slide.content}</p>
                    </div>
                )}

                {slide.layout === 'question' && (
                    <div className="my-auto text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] sm:text-sm" style={{ color: accent }}>Question</p>
                        <h1 className={`${titleSize} mt-5 font-black`}>{slide.title || 'Pertanyaan'}</h1>
                        <p className={`mx-auto mt-6 max-w-5xl font-bold leading-relaxed opacity-70 ${contained ? 'text-xl sm:text-3xl' : 'text-4xl'}`}>{slide.content}</p>
                    </div>
                )}

                {slide.layout === 'board' && (
                    <div className="my-auto min-h-0">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] sm:text-sm" style={{ color: accent }}>Board</p>
                                <h1 className={`${contained ? 'mt-2 text-3xl sm:text-4xl' : 'mt-3 text-5xl sm:text-6xl'} font-black`}>{slide.title || 'Board Presentasi'}</h1>
                            </div>
                            <p className="max-w-xl text-sm font-bold opacity-70 sm:text-base">{slide.content}</p>
                        </div>
                        <BoardCanvas strokes={slide.jamboard_data?.strokes || slide.board_data?.strokes || []} className="max-h-[60vh] rounded-2xl border-4 border-white/70 shadow-2xl" />
                    </div>
                )}

                {slide.layout === 'canvas' && (
                    <div className="my-auto min-h-0">
                        <h1 className={`${contained ? 'mb-4 text-3xl sm:text-5xl' : 'mb-8 text-6xl'} font-black`}>{slide.title || 'Canvas Slide'}</h1>
                        {slide.snapshot_url || slide.snapshot_data || slide.media_url ? (
                            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                                <img src={slide.snapshot_url || slide.snapshot_data || slide.media_url} alt={slide.title || 'Canvas'} className={`${contained ? 'h-[55vh]' : 'h-[65vh]'} w-full object-contain`} />
                            </div>
                        ) : (
                            <div className={`${contained ? 'h-[50vh]' : 'h-[65vh]'} grid place-items-center rounded-2xl border-4 border-dashed border-gray-300 text-2xl font-black opacity-40`}>Canvas belum disimpan</div>
                        )}
                    </div>
                )}

                {slide.layout === 'pdf' && (
                    <div className="my-auto text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] sm:text-sm" style={{ color: accent }}>PDF</p>
                        <h1 className={`${titleSize} mt-5 font-black`}>{slide.title || 'PDF Presentasi'}</h1>
                        <p className={`mx-auto mt-6 max-w-4xl font-bold leading-relaxed opacity-70 ${contained ? 'text-lg sm:text-2xl' : 'text-3xl'}`}>Buka halaman user untuk viewer PDF carousel penuh.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
