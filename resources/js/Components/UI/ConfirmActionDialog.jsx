import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { playSoundEffect } from '@/Components/UI/SoundEffects';

const VARIANT = {
    danger: {
        icon: ErrorOutlineIcon,
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
        panel: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30',
        confirm: 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20',
        title: 'text-red-700 dark:text-red-200',
    },
    warning: {
        icon: WarningAmberIcon,
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
        panel: 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30',
        confirm: 'bg-amber-400 text-gray-950 hover:bg-amber-500 shadow-amber-500/20',
        title: 'text-amber-700 dark:text-amber-200',
    },
    success: {
        icon: CheckCircleIcon,
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
        panel: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30',
        confirm: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20',
        title: 'text-emerald-700 dark:text-emerald-200',
    },
    info: {
        icon: InfoIcon,
        badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
        panel: 'border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30',
        confirm: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-500/20',
        title: 'text-sky-700 dark:text-sky-200',
    },
};

const defaultState = {
    show: false,
    variant: 'warning',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Iya',
    cancelLabel: 'Batal',
    processing: false,
    presentation: 'default',
    zIndex: null,
    onConfirm: null,
};

export function useConfirmAction() {
    const [confirmState, setConfirmState] = useState(defaultState);

    const closeConfirm = useCallback(() => {
        setConfirmState(defaultState);
    }, []);

    const openConfirm = useCallback((config) => {
        setConfirmState({
            ...defaultState,
            ...config,
            show: true,
        });
    }, []);

    const setConfirmProcessing = useCallback((processing) => {
        setConfirmState((current) => ({ ...current, processing }));
    }, []);

    return {
        confirmState,
        openConfirm,
        closeConfirm,
        setConfirmProcessing,
    };
}

export default function ConfirmActionDialog({
    show = false,
    variant = 'warning',
    title,
    message,
    details = [],
    confirmLabel = 'Iya',
    cancelLabel = 'Batal',
    processing = false,
    presentation = 'default',
    zIndex = null,
    onConfirm,
    onCancel,
    children,
}) {
    const style = VARIANT[variant] || VARIANT.warning;
    const Icon = style.icon;
    const detailItems = Array.isArray(details) ? details.filter(Boolean) : [];
    const cancelButtonRef = useRef(null);
    const previousFocusRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const isQuizExit = presentation === 'quiz-exit';

    useEffect(() => {
        if (!show) return undefined;

        previousFocusRef.current = document.activeElement;
        if (isQuizExit) playSoundEffect('warning');
        const focusTimer = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape' || processing) return;

            event.preventDefault();
            onCancel?.();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus?.();
        };
    }, [isQuizExit, onCancel, processing, show]);

    if (!show || typeof document === 'undefined') return null;

    const overlayZIndex = zIndex || (isQuizExit ? 'z-[10050]' : 'z-[200]');

    return createPortal(
        <div
            className={`fixed inset-0 ${overlayZIndex} flex items-end justify-center bg-gray-950/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-6`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onCancel?.();
            }}
        >
            <motion.section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={message ? descriptionId : undefined}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-28px_rgba(15,23,42,0.72)] dark:border-gray-700 dark:bg-gray-900 sm:rounded-3xl ${isQuizExit ? 'ring-1 ring-orange-300/60 dark:ring-orange-700/60' : ''}`}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {isQuizExit && (
                    <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />
                )}
                <div className={`relative flex items-start gap-3 px-5 pb-4 pt-5 sm:gap-4 sm:px-6 sm:pb-5 sm:pt-6 ${isQuizExit ? 'bg-gradient-to-br from-orange-600 via-red-600 to-rose-600 text-white' : ''}`}>
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-4 ${isQuizExit ? 'bg-white/15 text-amber-100 ring-white/20' : `ring-white/50 dark:ring-gray-900 ${style.badge}`}`}>
                        <Icon sx={{ fontSize: 25 }} />
                    </span>
                    <div className="min-w-0 flex-1">
                        {isQuizExit && <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100"><AutoAwesomeIcon sx={{ fontSize: 13 }} /> Checkpoint belajar</p>}
                        <h3 id={titleId} className={`text-lg font-black leading-6 ${isQuizExit ? 'text-white' : style.title}`}>{title || 'Konfirmasi Aksi'}</h3>
                        {message && <p id={descriptionId} className={`mt-1.5 text-sm font-semibold leading-6 ${isQuizExit ? 'text-white/85' : 'text-gray-600 dark:text-gray-300'}`}>{message}</p>}
                    </div>
                    <button
                        type="button"
                        data-sound="close"
                        onClick={onCancel}
                        disabled={processing}
                        aria-label="Tutup konfirmasi"
                        className={`-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-4 disabled:opacity-40 ${isQuizExit ? 'text-white/75 hover:bg-white/15 hover:text-white focus-visible:ring-white/30' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus-visible:ring-gray-700'}`}
                    >
                        <CloseIcon sx={{ fontSize: 19 }} />
                    </button>
                </div>

                {detailItems.length > 0 && (
                    <dl className={`mx-5 divide-y rounded-xl border px-4 dark:divide-gray-800 sm:mx-6 ${isQuizExit ? 'border-orange-100 bg-orange-50/70 dark:border-orange-900/50 dark:bg-orange-950/25' : style.panel}`}>
                        {detailItems.map((item, index) => {
                            const isObject = item && typeof item === 'object';
                            const label = isObject ? item.label : null;
                            const value = isObject && 'value' in item ? item.value : item;

                            return (
                                <div key={`${label || 'detail'}-${index}`} className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] gap-3 py-3 text-sm">
                                    <dt className="font-bold text-gray-500 dark:text-gray-400">{label || 'Informasi'}</dt>
                                    <dd className="break-words text-right font-black text-gray-900 dark:text-gray-100">{value}</dd>
                                </div>
                            );
                        })}
                    </dl>
                )}

                {children && <div className="px-5 pt-4 sm:px-6">{children}</div>}

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50/75 p-4 dark:border-gray-800 dark:bg-gray-950/35 sm:gap-3 sm:p-5 sm:px-6">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        data-sound={isQuizExit ? 'confirm' : 'close'}
                        onClick={onCancel}
                        disabled={processing}
                        className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${isQuizExit ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:bg-emerald-400 focus-visible:ring-emerald-300/60' : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-700'}`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        data-sound={isQuizExit ? 'warning' : 'confirm'}
                        onClick={onConfirm}
                        disabled={processing}
                        className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black shadow-lg transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${isQuizExit ? 'border border-orange-200 bg-white text-orange-700 shadow-orange-500/10 hover:border-orange-300 hover:bg-orange-50 focus-visible:ring-orange-300/60 dark:border-orange-800 dark:bg-gray-900 dark:text-orange-300 dark:hover:bg-orange-950/40' : style.confirm}`}
                    >
                        {processing ? 'Memproses...' : confirmLabel}
                    </button>
                </div>
            </motion.section>
        </div>,
        document.body,
    );
}
