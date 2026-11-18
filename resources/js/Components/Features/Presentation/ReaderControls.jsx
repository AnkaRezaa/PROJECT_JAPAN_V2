import React, { useEffect, useLayoutEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useScrollLock } from '@/lib/scrollLock';

export function useReaderFullscreen(ref, enabled = true) {
    const [native, setNative] = useState(false);
    const [fallback, setFallback] = useState(false);
    useScrollLock(fallback);

    useEffect(() => {
        if (!enabled) return undefined;
        const update = () => setNative(Boolean(ref.current && document.fullscreenElement === ref.current));
        document.addEventListener('fullscreenchange', update);
        return () => document.removeEventListener('fullscreenchange', update);
    }, [enabled, ref]);

    useLayoutEffect(() => {
        const reader = ref.current;
        if (!fallback || !reader) return undefined;

        const opener = document.activeElement;
        if (typeof reader.showPopover === 'function') {
            reader.setAttribute('popover', 'manual');
            reader.showPopover();
        }
        reader.querySelector('[aria-label="Keluar dari layar penuh"]')?.focus({ preventScroll: true });
        const handleKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setFallback(false);
            } else if (event.key === 'Tab') {
                const controls = [...reader.querySelectorAll('button:not(:disabled), a[href], iframe, video[controls], [tabindex="0"]')]
                    .filter((element) => element.getClientRects().length > 0);
                const first = controls[0];
                const last = controls.at(-1);
                if (first && ((!reader.contains(document.activeElement)) || document.activeElement === (event.shiftKey ? first : last))) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                }
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
            reader.removeAttribute('popover');
            opener?.focus({ preventScroll: true });
        };
    }, [fallback, ref]);

    const toggle = async () => {
        const reader = ref.current;
        if (!reader) return;
        if (fallback) {
            setFallback(false);
        } else if (document.fullscreenElement === reader) {
            await document.exitFullscreen().catch(() => {});
        } else {
            if (document.fullscreenEnabled && reader.requestFullscreen) {
                try {
                    await reader.requestFullscreen();
                    return;
                } catch {
                    // Keep the reader usable when the browser denies native fullscreen.
                }
            }
            setFallback(true);
        }
    };

    return { available: enabled, expanded: native || fallback, fallback, toggle };
}

function ToolButton({ label, children, ...props }) {
    return (
        <button type="button" aria-label={label} title={label} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus enabled:active:bg-slate-200 fine-pointer:enabled:hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-100 dark:enabled:active:bg-slate-700 dark:fine-pointer:enabled:hover:bg-slate-800" {...props}>
            {children}
        </button>
    );
}

export default function ReaderControls({
    kind = 'Slide', current, total, onPrevious, onNext, playing, onTogglePlay, canPlay, fullscreen, zoom,
}) {
    const unit = kind.toLowerCase();
    const fitLabel = fullscreen.expanded ? 'Pas layar' : 'Pas lebar layar';
    return (
        <div role="group" aria-label={`Kontrol ${unit}`} className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid min-w-[10.5rem] flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:max-w-64">
                <ToolButton label={`${kind} sebelumnya`} onClick={onPrevious} disabled={current <= 1}><ChevronLeftIcon /></ToolButton>
                <span aria-live={playing ? 'off' : 'polite'} className="text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {kind} {current}/{total}
                </span>
                <ToolButton label={`${kind} berikutnya`} onClick={onNext} disabled={current >= total}><ChevronRightIcon /></ToolButton>
            </div>
            <div className={`ml-auto flex items-center justify-end gap-1.5 ${zoom ? 'max-sm:basis-full' : ''}`}>
                {zoom && (
                    <>
                        <ToolButton label="Perkecil" onClick={zoom.out} disabled={zoom.atMinimum}><RemoveIcon fontSize="small" /></ToolButton>
                        <button type="button" title={fitLabel} aria-label={`${zoom.percent}%. ${fitLabel}`} onClick={zoom.reset} className="min-h-11 min-w-12 rounded-lg px-1 text-center text-xs font-semibold tabular-nums text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus fine-pointer:hover:bg-slate-100 dark:text-slate-200 dark:fine-pointer:hover:bg-slate-800">
                            {zoom.percent}%
                        </button>
                        <ToolButton label="Perbesar" onClick={zoom.in} disabled={zoom.atMaximum}><AddIcon fontSize="small" /></ToolButton>
                    </>
                )}
                {total > 1 && (
                    <ToolButton label={playing ? 'Jeda otomatis' : 'Putar otomatis'} aria-pressed={playing} onClick={onTogglePlay} disabled={!canPlay}>
                        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </ToolButton>
                )}
                {fullscreen.available && (
                    <ToolButton label={fullscreen.expanded ? 'Keluar dari layar penuh' : 'Layar penuh'} onClick={fullscreen.toggle}>
                        {fullscreen.expanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                    </ToolButton>
                )}
            </div>
        </div>
    );
}
