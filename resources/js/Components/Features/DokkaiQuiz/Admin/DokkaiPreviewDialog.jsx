import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import DokkaiQuizRunner from '../DokkaiQuizRunner';

export default function DokkaiPreviewDialog({ open, onClose, draft }) {
    useScrollLock(open);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    const passage = draft?.passage || {};
    const rawParagraphs = draft?.paragraphs || [];
    const rawQuestions = draft?.questions || [];
    const rawVocabularies = draft?.vocabularies || [];

    const normalizedParagraphs = useMemo(() => {
        return rawParagraphs.map((p, pIdx) => ({
            ...p,
            id: p.id || pIdx + 1,
            paragraph_number: p.paragraph_number || pIdx + 1,
            label: p.label || `Paragraf ${p.paragraph_number || pIdx + 1}`,
            content_raw: p.content_raw || '',
        }));
    }, [rawParagraphs]);

    const normalizedVocabularies = useMemo(() => {
        return rawVocabularies.map((v, vIdx) => ({
            ...v,
            id: v.id || vIdx + 1,
            word: v.word || '',
            furigana: v.furigana || '',
            romaji: v.romaji || '',
            meaning: v.meaning || '',
        }));
    }, [rawVocabularies]);

    const normalizedQuestions = useMemo(() => {
        return rawQuestions.map((q, qIdx) => ({
            id: q.id || qIdx + 1,
            question_number: q.question_number || qIdx + 1,
            question_text: q.question_text || '',
            question_translation: q.question_translation || '',
            evidence_paragraph_number: q.evidence_paragraph_number || 1,
            evidence_quote: q.evidence_quote || '',
            explanation_correct: q.explanation_correct || '',
            explanation_distractors: q.explanation_distractors || {},
            options: (q.options || []).map((opt, oIdx) => ({
                id: opt.id || oIdx + 1,
                option_label: opt.option_label || String.fromCharCode(65 + oIdx),
                option_text: opt.option_text || '',
                is_correct: Boolean(opt.is_correct),
            })),
        }));
    }, [rawQuestions]);

    const quiz = useMemo(() => ({
        id: draft?.id || 'draft-preview',
        title: passage.title || 'Pratinjau Wacana Dokkai',
        passing_score: draft?.passing_score || draft?.passingScore || 70,
        time_limit: draft?.time_limit || draft?.timeLimit || null,
        xp_reward: passage.xp_reward || 0,
        dokkaiPassage: {
            title: passage.title || 'Pratinjau Wacana Dokkai',
            sub_title: passage.sub_title,
            theme_category: passage.theme_category,
            jlpt_level: passage.jlpt_level || 'N3',
            audio_url: passage.audio_url,
            paragraphs: normalizedParagraphs,
            vocabularies: normalizedVocabularies,
            questions: normalizedQuestions,
        },
    }), [draft?.id, draft?.passing_score, draft?.passingScore, draft?.time_limit, draft?.timeLimit, passage, normalizedParagraphs, normalizedVocabularies, normalizedQuestions]);

    if (!open || !draft || typeof document === 'undefined') return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau Kuis Dokkai"
            className="fixed inset-0 z-[10000] flex flex-col bg-[#f5f8f6] text-gray-900 antialiased dark:bg-gray-950 dark:text-white"
        >
            <DokkaiQuizRunner
                key={draft?.id || 'draft-preview'}
                quiz={quiz}
                paragraphs={normalizedParagraphs}
                vocabularies={normalizedVocabularies}
                questions={normalizedQuestions}
                onClose={onClose}
                persist={false}
            />
        </div>,
        document.body
    );
}
