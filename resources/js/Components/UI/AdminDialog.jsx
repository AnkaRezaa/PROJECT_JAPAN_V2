import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';

export default function AdminDialog({
    open = false,
    onClose,
    eyebrow,
    title,
    description,
    children,
    footer,
    maxWidth = 'max-w-2xl',
}) {
    useEffect(() => {
        if (!open) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Tutup dialog" onClick={onClose} className="absolute inset-0 cursor-default" />
            <section className={`relative flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl dark:bg-gray-900 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.5rem] ${maxWidth}`}>
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
                    <div className="min-w-0">
                        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">{eyebrow}</p>}
                        {title && <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{title}</h2>}
                        {description && <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                        <CloseIcon sx={{ fontSize: 19 }} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <footer className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">{footer}</footer>}
            </section>
        </div>,
        document.body,
    );
}
