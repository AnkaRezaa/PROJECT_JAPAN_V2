import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerVite from 'pdfjs-dist/build/pdf.worker.mjs?url';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReaderControls, { useReaderFullscreen } from './ReaderControls';

if (typeof window !== 'undefined') {
    // Prioritaskan file worker berekstensi .js statis agar Nginx/Apache selalu mengirimkan
    // header Content-Type: application/javascript (menghindari penolakan modul .mjs oleh browser).
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
}

const debug = (...args) => console.log('[PdfCarousel]', ...args);
const transportKey = new TextEncoder().encode('toku-up-pdf-viewer');

const normalizePdfUrl = (value) => {
    if (!value) return value;

    const storageMatch = String(value).match(/\/storage\/presentations\/assets\/(\d+)\/pdf\//);
    if (storageMatch?.[1]) {
        return `/presentations/${storageMatch[1]}/content-stream`;
    }

    const oldInlineMatch = String(value).match(/\/presentations\/(\d+)\/pdf(?:$|[?#])/);
    if (oldInlineMatch?.[1]) {
        return `/presentations/${oldInlineMatch[1]}/content-stream`;
    }

    const oldContentMatch = String(value).match(/\/presentations\/(\d+)\/pdf-content(?:$|[?#])/);
    if (oldContentMatch?.[1]) {
        return `/presentations/${oldContentMatch[1]}/content-stream`;
    }

    return value;
};

const userLabel = (auth) => {
    const user = auth?.user || auth || {};
    const name = user.username || user.name || 'Pengguna TOKU-UP';
    const email = user.email || 'verified account';

    return `${name} - ${email}`;
};

const decodeTransport = (buffer, transport) => {
    const bytes = new Uint8Array(buffer);

    if (transport !== 'xor-v1') {
        return bytes;
    }

    const decoded = new Uint8Array(bytes.length);

    for (let index = 0; index < bytes.length; index += 1) {
        decoded[index] = bytes[index] ^ transportKey[index % transportKey.length];
    }

    return decoded;
};

export default function PdfCarousel({ url, title = 'PDF Presentasi', studentReader = false }) {
    const canvasRef = useRef(null);
    const frameRef = useRef(null);
    const readerRef = useRef(null);
    const viewportRef = useRef(null);
    const renderTaskRef = useRef(null);
    const lastRenderedPageRef = useRef(null);
    const { props } = usePage();
    const pdfUrl = normalizePdfUrl(url);
    const watermark = useMemo(() => userLabel(props.auth), [props.auth]);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(studentReader ? 1 : 1.25);
    const [readerSize, setReaderSize] = useState({ width: 0, height: 0 });
    const [status, setStatus] = useState(pdfUrl ? 'loading' : 'empty');
    const [error, setError] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPageTransitioning, setIsPageTransitioning] = useState(false);
    const readerFullscreen = useReaderFullscreen(readerRef, studentReader);
    const expanded = readerFullscreen.expanded;

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!studentReader || status !== 'ready' || !viewport) return undefined;
        const measure = () => {
            const width = viewport.clientWidth;
            const height = expanded ? viewport.clientHeight : 0;
            setReaderSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
        };
        measure();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [status, studentReader, expanded]);

    useEffect(() => {
        let cancelled = false;
        let loadingTask;
        const controller = new AbortController();

        const loadPdf = async () => {
            if (!pdfUrl) {
                setStatus('empty');
                return;
            }

            setStatus('loading');
            setError('');
            setPdfDocument(null);
            setPageNumber(1);
            setTotalPages(0);
            setIsPlaying(false);
            setIsPageTransitioning(false);
            lastRenderedPageRef.current = null;
            debug('load:start', { url: pdfUrl });

            try {
                const response = await fetch(pdfUrl, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/octet-stream' },
                    signal: controller.signal,
                });
                const contentType = response.headers.get('content-type') || '';
                const transport = response.headers.get('x-toku-up-pdf-transport') || '';
                debug('load:response', { status: response.status, contentType, transport });

                if (!response.ok) {
                    throw new Error(`PDF request failed: ${response.status}`);
                }

                if (transport !== 'xor-v1') {
                    throw new Error(`PDF transport tidak valid: ${transport || 'none'}`);
                }

                const encodedBytes = await response.arrayBuffer();
                const bytes = decodeTransport(encodedBytes, transport);
                const signature = Array.from(bytes.slice(0, 8))
                    .map((value) => String.fromCharCode(value))
                    .join('');
                debug('load:bytes', { encodedByteLength: encodedBytes.byteLength, decodedByteLength: bytes.byteLength, signature });

                if (cancelled) return;

                loadingTask = pdfjsLib.getDocument({ data: bytes });
                const document = await loadingTask.promise;
                debug('load:ready', { pages: document.numPages });

                if (cancelled) {
                    return;
                }

                setPdfDocument(document);
                setTotalPages(document.numPages);
                setStatus('ready');
            } catch (exception) {
                if (cancelled) return;
                debug('load:error', exception);
                setError(exception.message || 'PDF tidak bisa ditampilkan.');
                setStatus('error');
            }
        };

        loadPdf();

        return () => {
            cancelled = true;
            controller.abort();
            renderTaskRef.current?.cancel?.();
            loadingTask?.destroy().catch(() => {});
        };
    }, [pdfUrl]);

    useEffect(() => {
        let cancelled = false;
        let fadeTimer = null;

        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current || (studentReader && (!readerSize.width || (expanded && !readerSize.height)))) return;

            renderTaskRef.current?.cancel?.();
            const isPageChange = lastRenderedPageRef.current !== null && lastRenderedPageRef.current !== pageNumber;
            if (isPageChange) {
                setIsPageTransitioning(true);
                await new Promise((resolve) => {
                    fadeTimer = window.setTimeout(resolve, 140);
                });
                if (cancelled || !canvasRef.current) return;
            }

            debug('render:start', { page: pageNumber, zoom });

            try {
                const page = await pdfDocument.getPage(pageNumber);
                if (cancelled) return;

                const base = studentReader ? page.getViewport({ scale: 1 }) : null;
                const scale = base ? Math.min(readerSize.width / base.width, expanded ? readerSize.height / base.height : Infinity) * zoom : zoom;
                const viewport = page.getViewport({ scale });
                const deviceRatio = window.devicePixelRatio || 1;
                const pixelRatio = studentReader
                    ? Math.min(deviceRatio, 2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)))
                    : deviceRatio;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                canvas.width = Math.floor(viewport.width * pixelRatio);
                canvas.height = Math.floor(viewport.height * pixelRatio);
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;

                context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                context.clearRect(0, 0, viewport.width, viewport.height);

                const task = page.render({ canvasContext: context, viewport });
                renderTaskRef.current = task;
                await task.promise;

                if (cancelled) return;

                context.save();
                context.globalAlpha = 0.14;
                context.translate(viewport.width / 2, viewport.height / 2);
                context.rotate(-Math.PI / 8);
                context.font = `700 ${studentReader ? Math.min(22, Math.max(12, viewport.width / 24)) : 22}px Arial, sans-serif`;
                context.fillStyle = '#111827';
                context.textAlign = 'center';
                if (studentReader) context.fillText(watermark, 0, 0, viewport.width * 0.9);
                else context.fillText(watermark, 0, 0);
                context.restore();

                lastRenderedPageRef.current = pageNumber;
                setIsPageTransitioning(false);
                debug('render:done', { page: pageNumber });
            } catch (exception) {
                if (exception?.name === 'RenderingCancelledException') return;
                if (cancelled) return;
                setIsPageTransitioning(false);
                debug('render:error', exception);
                setError(exception.message || 'Halaman PDF gagal dirender.');
                setStatus('error');
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (fadeTimer) {
                window.clearTimeout(fadeTimer);
            }
            renderTaskRef.current?.cancel?.();
        };
    }, [pdfDocument, pageNumber, watermark, zoom, studentReader, readerSize, expanded]);

    useEffect(() => {
        if (!isPlaying) return undefined;

        if (status !== 'ready' || totalPages <= 1) {
            setIsPlaying(false);
            return undefined;
        }

        if (isPageTransitioning) return undefined;

        if (pageNumber >= totalPages) {
            setIsPlaying(false);
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setPageNumber((current) => {
                if (current >= totalPages) {
                    setIsPlaying(false);
                    return current;
                }
                return current + 1;
            });
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [isPageTransitioning, isPlaying, pageNumber, status, totalPages]);

    const previous = () => {
        setIsPlaying(false);
        setPageNumber((current) => Math.max(1, current - 1));
    };

    const next = () => {
        setIsPlaying(false);
        setPageNumber((current) => Math.min(totalPages, current + 1));
    };

    const togglePlay = () => {
        if (status !== 'ready' || totalPages <= 1) return;

        if (!isPlaying && pageNumber >= totalPages) {
            setPageNumber(1);
            setIsPlaying(true);
            return;
        }

        setIsPlaying((current) => !current);
    };

    const zoomOut = () => setZoom((current) => Math.max(0.75, Number((current - 0.15).toFixed(2))));
    const zoomIn = () => setZoom((current) => Math.min(2.5, Number((current + 0.15).toFixed(2))));
    const fullscreen = () => frameRef.current?.requestFullscreen?.();

    if (studentReader) {
        return (
            <section ref={readerRef} aria-label={`Penampil PDF: ${title}`} role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} className={`min-w-0 overflow-hidden bg-white dark:bg-slate-900 ${readerFullscreen.fallback ? 'fixed inset-0 z-[120] m-0 h-dvh w-full max-h-none max-w-none border-0 p-0' : 'rounded-lg border border-slate-200 dark:border-slate-800 fullscreen:rounded-none fullscreen:border-0'}`}>
                <div className={expanded ? 'flex h-full flex-col pb-[env(safe-area-inset-bottom)]' : 'mx-auto max-w-6xl'}>
                    {status === 'ready' ? (
                            <div ref={viewportRef} onContextMenu={(event) => event.preventDefault()} className={`w-full overflow-auto overscroll-contain bg-slate-100 [scrollbar-gutter:stable] dark:bg-slate-950 ${expanded ? 'min-h-0 flex-1 [container-type:size]' : 'max-h-[65dvh]'}`} tabIndex={0} aria-label="Halaman PDF">
                                <div className={`grid w-max min-w-full justify-items-center ${expanded ? 'min-h-[100cqh] content-center' : ''}`}>
                                    <canvas
                                        ref={canvasRef}
                                        aria-label={`${title}, halaman ${pageNumber}`}
                                        className={`block max-w-none bg-white transition-opacity motion-reduce:transition-none ${isPageTransitioning ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                </div>
                            </div>
                    ) : (
                        <div role={status === 'error' ? 'alert' : 'status'} className={`flex min-h-44 items-center justify-center bg-slate-50 px-5 py-6 text-center text-sm font-medium text-slate-800 dark:bg-slate-950 dark:text-slate-200 ${expanded ? 'flex-1' : ''}`}>
                            {status === 'loading' ? 'Memuat PDF...' : status === 'error' ? 'PDF tidak dapat ditampilkan. Muat ulang halaman untuk mencoba lagi.' : 'PDF belum tersedia.'}
                        </div>
                    )}
                    {(status === 'ready' || expanded) && (
                        <ReaderControls
                            kind="Halaman"
                            current={pageNumber}
                            total={totalPages}
                            onPrevious={previous}
                            onNext={next}
                            playing={isPlaying}
                            onTogglePlay={togglePlay}
                            canPlay={status === 'ready'}
                            fullscreen={readerFullscreen}
                            zoom={status === 'ready' ? { out: zoomOut, in: zoomIn, reset: () => setZoom(1), percent: Math.round(zoom * 100), atMinimum: zoom <= 0.75, atMaximum: zoom >= 2.5 } : null}
                        />
                    )}
                </div>
            </section>
        );
    }

    return (
        <div className="overflow-hidden rounded-[1.35rem] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">PDF Canvas Viewer</p>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{title}</h3>
                    {totalPages > 0 && <p className="mt-1 text-xs font-bold text-gray-500">Halaman {pageNumber} dari {totalPages}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={togglePlay}
                        disabled={status !== 'ready' || totalPages <= 1}
                        aria-pressed={isPlaying}
                        title={isPlaying ? 'Jeda putar otomatis' : 'Putar halaman otomatis'}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-40 ${
                            isPlaying
                                ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'
                                : 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300'
                        }`}
                    >
                        {isPlaying ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                        <span>{isPlaying ? 'Jeda' : 'Play'}</span>
                    </button>
                    <button type="button" onClick={zoomOut} disabled={status !== 'ready'} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">-</button>
                    <span className="min-w-12 text-center text-xs font-black text-gray-500">{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={zoomIn} disabled={status !== 'ready'} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">+</button>
                    <button type="button" onClick={fullscreen} className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-gray-950">Fullscreen</button>
                </div>
            </div>

            <div ref={frameRef} onContextMenu={(event) => event.preventDefault()} className="bg-gray-100 p-4 dark:bg-gray-950">
                {status === 'empty' && (
                    <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-black text-gray-500">PDF belum tersedia untuk deck ini.</p>
                    </div>
                )}
                {status === 'loading' && (
                    <div className="grid aspect-video place-items-center rounded-xl bg-white p-6 text-center shadow-xl dark:bg-gray-900">
                        <div>
                            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />
                            <p className="text-sm font-black text-gray-600 dark:text-gray-300">Memuat PDF...</p>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="grid aspect-video place-items-center rounded-xl border border-red-100 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
                        <div>
                            <p className="text-sm font-black text-red-700 dark:text-red-300">PDF tidak bisa ditampilkan.</p>
                            <p className="mt-2 text-xs font-bold text-red-500 dark:text-red-200">{error}</p>
                        </div>
                    </div>
                )}
                {status === 'ready' && (
                    <div className="mx-auto max-h-[72vh] overflow-auto rounded-xl bg-gray-200 p-3 shadow-inner dark:bg-gray-950">
                        <canvas
                            ref={canvasRef}
                            className={`mx-auto block max-w-none rounded-lg bg-white shadow-xl transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
                                isPageTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    </div>
                )}
            </div>

            {status === 'ready' && (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={previous} disabled={pageNumber <= 1} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 sm:px-4 dark:border-gray-700 dark:text-gray-200">Prev</button>
                        <button
                            type="button"
                            onClick={togglePlay}
                            disabled={totalPages <= 1}
                            aria-pressed={isPlaying}
                            title={isPlaying ? 'Jeda putar otomatis' : 'Putar halaman otomatis'}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-40 ${
                                isPlaying
                                    ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'
                                    : 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300'
                            }`}
                        >
                            {isPlaying ? <PauseIcon sx={{ fontSize: 15 }} /> : <PlayArrowIcon sx={{ fontSize: 15 }} />}
                            <span>{isPlaying ? 'Jeda' : 'Play'}</span>
                        </button>
                    </div>
                    <p className="min-w-0 text-center text-[10px] font-black leading-4 text-gray-500 sm:text-xs">Canvas render - tanpa link download langsung</p>
                    <button type="button" onClick={next} disabled={pageNumber >= totalPages} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 sm:px-4 dark:border-gray-700 dark:text-gray-200">Next</button>
                </div>
            )}
        </div>
    );
}
