import React, { useEffect, useRef, useState } from 'react';

const imagePattern = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const videoPattern = /\.mp4(\?.*)?$/i;
const embeddableHosts = [
    'canva.com',
    'canva.link',
    'canva.me',
    'canva.site',
    'docs.google.com',
    'drive.google.com',
    'onedrive.live.com',
    '1drv.ms',
    'office.com',
    'officeapps.live.com',
    'view.officeapps.live.com',
    'youtube.com',
    'youtu.be',
    'vimeo.com',
];

function safeUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

function getCsrfToken() {
    try {
        const cookie = document.cookie
            .split('; ')
            .find((item) => item.startsWith('XSRF-TOKEN='));
        return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
    } catch {
        return '';
    }
}

export function isImageUrl(value = '') {
    return value.startsWith('data:image/') || imagePattern.test(value);
}

export function isVideoUrl(value = '') {
    return videoPattern.test(value);
}

export function isEmbeddableUrl(value = '') {
    const url = safeUrl(value);
    if (!url) return false;

    return embeddableHosts.some((host) => url.hostname.includes(host));
}

export function toEmbedUrl(value = '') {
    const url = safeUrl(value);
    if (!url) return value;

    if (url.hostname.includes('canva.com') || url.hostname.includes('canva.site')) {
        if (url.pathname.endsWith('/edit')) {
            url.pathname = url.pathname.slice(0, -5) + '/view';
        } else if (url.pathname.endsWith('/watch')) {
            url.pathname = url.pathname.slice(0, -6) + '/view';
        } else if (!url.pathname.includes('/view')) {
            url.pathname = url.pathname.replace(/\/$/, '') + '/view';
        }
        if (!url.searchParams.has('embed')) {
            url.searchParams.set('embed', '');
        }
        // Remove Canva metadata/title banner overlay (&meta)
        url.searchParams.delete('meta');
    }

    if (url.hostname.includes('drive.google.com')) {
        const folderMatch = url.pathname.match(/\/folders\/([^/?#]+)/);
        if (folderMatch?.[1]) {
            return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
        }

        const fileMatch = url.pathname.match(/\/file\/d\/([^/?#]+)/);
        if (fileMatch?.[1]) {
            return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
        }
    }

    if (url.hostname.includes('youtu.be')) {
        const videoId = url.pathname.split('/').filter(Boolean)[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }

    if (url.hostname.includes('youtube.com')) {
        const shortsMatch = url.pathname.match(/\/shorts\/([^/?#]+)/);
        const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/);
        const videoId = url.searchParams.get('v') || shortsMatch?.[1] || embedMatch?.[1];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }

    return url.toString();
}

export default function EmbedFrame({ url, title = 'Media', compact = false }) {
    const iframeRef = useRef(null);
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [resolvedUrl, setResolvedUrl] = useState(url);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateScale = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth || 0;
            const height = containerRef.current.clientHeight || 0;
            if (width > 0 && height > 0) {
                const s = Math.min(width / 1920, height / 1080);
                setScale(s > 0 ? s : 1);
            } else if (width > 0) {
                setScale(width / 1920);
            }
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [url, resolvedUrl]);

    useEffect(() => {
        setResolvedUrl(url);

        const parsed = safeUrl(url);
        if (parsed && (parsed.hostname.includes('canva.link') || parsed.hostname.includes('canva.me'))) {
            setIsResolving(true);
            fetch('/admin/presentations/resolve-canva', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ url }),
            })
                .then((res) => {
                    if (!res.ok) throw new Error('Failed to resolve Canva link');
                    return res.json();
                })
                .then((data) => {
                    if (data && data.embed_url) {
                        setResolvedUrl(data.embed_url);
                    }
                })
                .catch(() => {})
                .finally(() => setIsResolving(false));
        }
    }, [url]);

    if (!url) {
        return (
            <div className="grid h-full min-h-[220px] place-items-center rounded-2xl border-2 border-dashed border-gray-300 text-sm font-black opacity-50">
                Media URL
            </div>
        );
    }

    if (isImageUrl(url)) {
        return (
            <img src={url} alt={title} className="h-full w-full object-contain" />
        );
    }

    if (isVideoUrl(url)) {
        return compact ? (
            <div className="grid h-full place-items-center bg-gray-950 px-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                Video MP4
            </div>
        ) : (
            <video src={url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain">
                Browser tidak mendukung pemutar video.
            </video>
        );
    }

    if (isResolving) {
        return (
            <div className="flex h-full min-h-[220px] items-center justify-center bg-gray-950 px-4 text-center text-xs font-black uppercase tracking-wider text-purple-300">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    Memuat Canva...
                </div>
            </div>
        );
    }

    const currentUrl = resolvedUrl || url;

    if (isEmbeddableUrl(currentUrl)) {
        const isCanva = currentUrl.includes('canva.');
        return compact ? (
            <div className="grid h-full place-items-center bg-gray-950 px-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                {isCanva ? 'Canva' : 'Embed'}
            </div>
        ) : (
            <div
                ref={containerRef}
                className="relative h-full w-full overflow-hidden bg-gray-950 flex items-center justify-center group"
            >
                {isCanva ? (
                    <div
                        style={{
                            width: '1920px',
                            height: '1080px',
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                            flexShrink: 0,
                        }}
                        className="pointer-events-auto"
                    >
                        <iframe
                            ref={iframeRef}
                            src={toEmbedUrl(currentUrl)}
                            title={title}
                            className="h-full w-full border-0 bg-white"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        src={toEmbedUrl(currentUrl)}
                        title={title}
                        className="h-full w-full border-0 bg-white pointer-events-auto"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        allowFullScreen
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-modals"
                    />
                )}
                {isCanva && (
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            type="button"
                            onClick={() => {
                                if (iframeRef.current?.requestFullscreen) {
                                    iframeRef.current.requestFullscreen();
                                }
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-gray-900/80 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur hover:bg-gray-900 transition-colors"
                            title="Putar presentasi Canva layar penuh"
                        >
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            Putar Layar Penuh
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="grid h-full min-h-[220px] place-items-center rounded-2xl bg-gray-950 px-6 text-center text-sm font-bold leading-6 text-white">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Link Media</p>
                <a href={url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-white underline decoration-white/40 underline-offset-4">
                    Buka link eksternal
                </a>
            </div>
        </div>
    );
}
