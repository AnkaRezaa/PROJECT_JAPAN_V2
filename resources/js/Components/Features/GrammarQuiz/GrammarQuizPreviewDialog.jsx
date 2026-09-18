import React from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import GrammarQuizRunner from './GrammarQuizRunner';

export default function GrammarQuizPreviewDialog({ open, quiz, onClose, persist = false }) {
    useScrollLock(open);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Pratinjau Kuis Grammar" className="fixed inset-0 z-[10000] bg-[#f7faf8] dark:bg-gray-950">
            <GrammarQuizRunner key={quiz.id} quiz={quiz} onClose={onClose} persist={persist} />
        </div>,
        document.body,
    );
}
