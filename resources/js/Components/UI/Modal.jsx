import { useEffect } from 'react';
import { useScrollLock } from '@/lib/scrollLock';

export default function Modal({ show = false, onClose, title, children, maxWidth = 'md' }) {
    const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };

    useScrollLock(show);

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-end overflow-y-auto p-0 sm:items-center sm:p-5">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl transition-all dark:bg-gray-900 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.5rem] ${widths[maxWidth]}`}>
                {title && (
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                        <button onClick={onClose} className="text-xl text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
            </div>
        </div>
    );
}
