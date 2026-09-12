import React from 'react';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value) => String(value ?? '').normalize('NFC').trim();

/**
 * Highlights an imported learning term inside its example text without relying
 * on rich-text HTML from the spreadsheet.
 */
export default function HighlightedLearningText({ text, term, className = '' }) {
    const source = normalizeText(text);
    const target = normalizeText(term);

    if (!source || !target) {
        return source || null;
    }

    const parts = source.split(new RegExp(`(${escapeRegExp(target)})`, 'giu'));

    return parts.map((part, index) => (
        index % 2 === 1 ? (
            <mark
                key={`${part}-${index}`}
                className={`bg-transparent font-black text-inherit underline decoration-2 decoration-orange-500 underline-offset-4 dark:decoration-orange-300 ${className}`}
            >
                {part}
            </mark>
        ) : part
    ));
}
