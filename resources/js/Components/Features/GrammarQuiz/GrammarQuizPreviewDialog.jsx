import React from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import GrammarQuizRunner from './GrammarQuizRunner';

export default function GrammarQuizPreviewDialog({ open, quiz, onClose, persist = false }) {
    useScrollLock(open);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={persist ? 'Kuis Grammar' : 'Pratinjau Kuis Grammar'} className="fixed inset-0 z-[10000] flex flex-col bg-[#f5f8f6] text-gray-900 antialiased dark:bg-gray-950 dark:text-white">
            <GrammarQuizRunner key={quiz?.id || 'draft-preview'} quiz={quiz} onClose={onClose} persist={persist} />
        </div>,
        document.body,
    );
}
