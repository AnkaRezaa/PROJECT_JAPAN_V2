import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import GrammarQuizRunner from './GrammarQuizRunner';

export default function GrammarQuizPreviewDialog({ open, quiz, onClose, persist = false }) {
    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, open]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Pratinjau Kuis Grammar" className="fixed inset-0 z-[150] bg-[#f7faf8] dark:bg-gray-950">
            <GrammarQuizRunner key={quiz.id} quiz={quiz} onClose={onClose} persist={persist} />
        </div>,
        document.body,
    );
}
