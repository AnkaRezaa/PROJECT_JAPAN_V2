import React, { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export function useReaderFullscreen(ref, enabled = true) {
    const [available, setAvailable] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;
        const update = () => setExpanded(document.fullscreenElement === ref.current);
        setAvailable(Boolean(document.fullscreenEnabled));
        document.addEventListener('fullscreenchange', update);
        return () => document.removeEventListener('fullscreenchange', update);
    }, [enabled, ref]);

    const toggle = async () => {
        const reader = ref.current;
        if (!reader) return;
        try {
            if (document.fullscreenElement === reader) {
                await document.exitFullscreen();
            } else {
                await reader.requestFullscreen?.();
            }
        } catch {
            // Browser or embedding policy may decline fullscreen.
        }
    };

    return { available, expanded, toggle };
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
    return (
        <div role="group" aria-label={`Kontrol ${unit}`} className="flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
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
                        <button type="button" title="Pas lebar layar" aria-label={`${zoom.percent}%. Pas lebar layar`} onClick={zoom.reset} className="min-h-11 min-w-12 rounded-lg px-1 text-center text-xs font-semibold tabular-nums text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus fine-pointer:hover:bg-slate-100 dark:text-slate-200 dark:fine-pointer:hover:bg-slate-800">
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
