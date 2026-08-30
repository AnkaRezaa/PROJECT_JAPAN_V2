import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

export default function PdfCarousel({ url, title = 'PDF Presentasi' }) {
    const canvasRef = useRef(null);
    const frameRef = useRef(null);
    const renderTaskRef = useRef(null);
    const { props } = usePage();
    const pdfUrl = normalizePdfUrl(url);
    const watermark = useMemo(() => userLabel(props.auth), [props.auth]);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(1.25);
    const [status, setStatus] = useState(pdfUrl ? 'loading' : 'empty');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

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
            debug('load:start', { url: pdfUrl });

            try {
                const response = await fetch(pdfUrl, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/octet-stream' },
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

                const document = await pdfjsLib.getDocument({ data: bytes }).promise;
                debug('load:ready', { pages: document.numPages });

                if (cancelled) {
                    document.destroy();
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
            renderTaskRef.current?.cancel?.();
        };
    }, [pdfUrl]);

    useEffect(() => {
        let cancelled = false;

        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current) return;

            renderTaskRef.current?.cancel?.();
            debug('render:start', { page: pageNumber, zoom });

            try {
                const page = await pdfDocument.getPage(pageNumber);
                if (cancelled) return;

                const pixelRatio = window.devicePixelRatio || 1;
                const viewport = page.getViewport({ scale: zoom });
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
                context.font = '700 22px Arial, sans-serif';
                context.fillStyle = '#111827';
                context.textAlign = 'center';
                context.fillText(watermark, 0, 0);
                context.restore();

                debug('render:done', { page: pageNumber });
            } catch (exception) {
                if (exception?.name === 'RenderingCancelledException') return;
                debug('render:error', exception);
                setError(exception.message || 'Halaman PDF gagal dirender.');
                setStatus('error');
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            renderTaskRef.current?.cancel?.();
        };
    }, [pdfDocument, pageNumber, watermark, zoom]);

    const previous = () => setPageNumber((current) => Math.max(1, current - 1));
    const next = () => setPageNumber((current) => Math.min(totalPages, current + 1));
    const zoomOut = () => setZoom((current) => Math.max(0.75, Number((current - 0.15).toFixed(2))));
    const zoomIn = () => setZoom((current) => Math.min(2.5, Number((current + 0.15).toFixed(2))));
    const fullscreen = () => frameRef.current?.requestFullscreen?.();

    return (
        <div className="overflow-hidden rounded-[1.35rem] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">PDF Canvas Viewer</p>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{title}</h3>
                    {totalPages > 0 && <p className="mt-1 text-xs font-bold text-gray-500">Halaman {pageNumber} dari {totalPages}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                        <canvas ref={canvasRef} className="mx-auto block max-w-none rounded-lg bg-white shadow-xl" />
                    </div>
                )}
            </div>

            {status === 'ready' && (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                    <button type="button" onClick={previous} disabled={pageNumber <= 1} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 sm:px-4 dark:border-gray-700 dark:text-gray-200">Prev</button>
                    <p className="min-w-0 text-center text-[10px] font-black leading-4 text-gray-500 sm:text-xs">Canvas render - tanpa link download langsung</p>
                    <button type="button" onClick={next} disabled={pageNumber >= totalPages} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-40 sm:px-4 dark:border-gray-700 dark:text-gray-200">Next</button>
                </div>
            )}
        </div>
    );
}
