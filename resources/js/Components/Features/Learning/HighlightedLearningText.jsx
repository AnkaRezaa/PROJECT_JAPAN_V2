import React from 'react';
import { questionDisplayText } from '@/lib/questionMarkup';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value) => String(value ?? '').normalize('NFC').trim();

/**
 * Highlights an imported learning term inside its example text without relying
 * on rich-text HTML from the spreadsheet.
 */
export default function HighlightedLearningText({ text, term, className = '', variant = 'learning' }) {
    const isQuestion = variant === 'question';
    const source = isQuestion ? questionDisplayText(text) : normalizeText(text);
    const target = isQuestion ? questionDisplayText(term).trim() : normalizeText(term);

    if (!source || !target) {
        return source || null;
    }

    const parts = source.split(new RegExp(`(${escapeRegExp(target)})`, isQuestion ? 'gu' : 'giu'));

    return parts.map((part, index) => (
        index % 2 === 1 ? (
            <mark
                key={`${part}-${index}`}
                className={`bg-transparent font-black underline decoration-2 underline-offset-4 ${isQuestion ? 'text-red-700 decoration-red-600 dark:text-red-300 dark:decoration-red-300' : 'text-inherit decoration-orange-500 dark:decoration-orange-300'} ${className}`}
            >
                {part}
            </mark>
        ) : part
    ));
}
