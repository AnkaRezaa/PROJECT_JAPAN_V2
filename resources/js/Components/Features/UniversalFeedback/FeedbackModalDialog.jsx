import React, { useEffect, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';

export default function FeedbackModalDialog({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    className = '',
}) {
    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Auto-focus ke tombol tutup saat modal terbuka
        closeBtnRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key === 'Tab' && dialogRef.current) {
                const focusables = dialogRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusables.length === 0) return;

                const firstEl = focusables[0];
                const lastEl = focusables[focusables.length - 1];

                if (event.shiftKey && document.activeElement === firstEl) {
                    event.preventDefault();
                    lastEl.focus();
                } else if (!event.shiftKey && document.activeElement === lastEl) {
                    event.preventDefault();
                    firstEl.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-xs sm:items-center sm:p-4 animate-in fade-in duration-200"
            role="presentation"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-dialog-title"
                className={`w-full rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl sm:p-6 animate-in slide-in-from-bottom-4 duration-200 ${className}`}
            >
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h2 id="feedback-dialog-title" className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup dialog"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                    >
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>

                {children}
            </section>
        </div>
    );
}
