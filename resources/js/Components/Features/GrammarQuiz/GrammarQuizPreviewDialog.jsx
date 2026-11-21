import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import GrammarQuizRunner from './GrammarQuizRunner';

export default function GrammarQuizPreviewDialog({ open, quiz, onClose, persist = false, onLessonSaved, sequenceProgress, continuation, onRetryNext }) {
    useScrollLock(open);
    const hasHistoryEntry = useRef(false);
    const onHistoryBack = useRef(null);
    const manageHistory = !sequenceProgress;

    useEffect(() => {
        if (!open || !manageHistory) return undefined;
        const url = window.location.href;
        window.history.pushState({ ...window.history.state, grammarQuiz: true }, '');
        hasHistoryEntry.current = true;

        const handleHistoryBack = (event) => {
            if (!hasHistoryEntry.current || window.location.href !== url) return;
            event.stopImmediatePropagation();
            hasHistoryEntry.current = false;
            onHistoryBack.current?.();
        };
        window.addEventListener('popstate', handleHistoryBack, true);

        return () => {
            window.removeEventListener('popstate', handleHistoryBack, true);
            if (!hasHistoryEntry.current || !window.history.state?.grammarQuiz || window.location.href !== url) return;
            hasHistoryEntry.current = false;

            // This pop only removes the dialog entry, not the underlying Inertia page.
            const discardDialogPop = (event) => {
                if (window.location.href === url) event.stopImmediatePropagation();
            };
            window.addEventListener('popstate', discardDialogPop, { capture: true, once: true });
            window.setTimeout(() => window.removeEventListener('popstate', discardDialogPop, true), 500);
            window.history.back();
        };
    }, [open, manageHistory]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={persist ? 'Kuis Grammar' : 'Pratinjau Kuis Grammar'} className="fixed inset-0 z-[10000] flex flex-col bg-[#f5f8f6] text-gray-900 antialiased dark:bg-gray-950 dark:text-white">
            <GrammarQuizRunner key={quiz?.id || 'draft-preview'} quiz={quiz} onClose={onClose} persist={persist}
                hasHistoryEntry={hasHistoryEntry} onHistoryBack={onHistoryBack} manageHistory={manageHistory}
                onLessonSaved={onLessonSaved} sequenceProgress={sequenceProgress}
                continuation={continuation} onRetryNext={onRetryNext} />
        </div>,
        document.body,
    );
}
