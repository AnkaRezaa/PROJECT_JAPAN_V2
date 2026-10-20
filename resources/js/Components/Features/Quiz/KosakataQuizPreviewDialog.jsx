import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import Quiz from '@/Pages/User/Kuis/KerjakanKuis';

export default function KosakataQuizPreviewDialog({
    open,
    onClose,
    quiz,
    questions = [],
    flashcards = [],
}) {
    useScrollLock(open);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    const normalizedQuestions = useMemo(() => {
        return (questions || []).map((q, idx) => ({
            ...q,
            id: q.id || idx + 1,
            question: q.question || q.question_text || '',
            question_text: q.question_text || q.question || '',
            question_reading: q.question_reading || '',
            correct_answer: q.correct_answer || '',
            correct_answer_reading: q.correct_answer_reading || '',
            options: Array.isArray(q.options) ? q.options : [],
            option_readings: Array.isArray(q.option_readings) ? q.option_readings : [],
            explanation: q.explanation || '',
            explanation_reading: q.explanation_reading || '',
            audio_url: q.audio_url || '',
            points: Number(q.points || 1),
        }));
    }, [questions]);

    const previewQuiz = useMemo(() => ({
        id: quiz?.id || 'preview-draft',
        title: quiz?.title || 'Pratinjau Kuis Kosakata',
        passing_score: Number(quiz?.passing_score || 70),
        time_limit: quiz?.time_limit ? Number(quiz.time_limit) : null,
    }), [quiz?.id, quiz?.title, quiz?.passing_score, quiz?.time_limit]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau Kuis Kosakata"
            className="fixed inset-0 z-[10000] flex flex-col overflow-y-auto bg-[#f5f8f6] text-gray-900 antialiased dark:bg-gray-950 dark:text-white"
        >
            <Quiz
                key={previewQuiz.id}
                quiz={previewQuiz}
                questions={normalizedQuestions}
                flashcards={flashcards}
                preview={true}
                onClose={onClose}
            />
        </div>,
        document.body,
    );
}
