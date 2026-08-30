import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import HighlightedLearningText from './HighlightedLearningText';
import { kanaToRomaji, romanizeJapanese } from './JapaneseRomanizer';

export { kanaToRomaji } from './JapaneseRomanizer';

function RomajiLine({ japanese, reading, japaneseHighlightTerm, highlightTerm }) {
    const [content, setContent] = useState(() => kanaToRomaji(reading));
    const [term, setTerm] = useState(() => kanaToRomaji(highlightTerm));

    useEffect(() => {
        let active = true;
        setContent(kanaToRomaji(reading));
        setTerm(kanaToRomaji(highlightTerm));

        Promise.all([
            romanizeJapanese(reading, japanese),
            highlightTerm ? romanizeJapanese(highlightTerm, japaneseHighlightTerm) : Promise.resolve(''),
        ]).then(([nextContent, nextTerm]) => {
            if (!active) return;
            setContent(nextContent);
            setTerm(nextTerm);
        }).catch(() => {
            // The synchronous kana converter remains visible when segmentation fails.
        });

        return () => {
            active = false;
        };
    }, [japanese, reading, japaneseHighlightTerm, highlightTerm]);

    return (
        <span className="mt-0.5 whitespace-pre-wrap break-words text-xs font-semibold text-gray-500 dark:text-gray-400">
            {term ? <HighlightedLearningText text={content} term={term} /> : content}
        </span>
    );
}

export default function JapaneseReading({
    japanese,
    reading,
    translation,
    className = '',
    forcePreferences = null,
    highlightTerms = {},
}) {
    const preferences = usePage().props.auth?.user || {};
    const showRomaji = forcePreferences?.showRomaji ?? Boolean(preferences.show_romaji);
    const showTranslation = forcePreferences?.showTranslation ?? Boolean(preferences.show_indonesian_translation);
    const withHighlight = (text, term) => (
        term ? <HighlightedLearningText text={text} term={term} /> : text
    );

    return (
        <span className={`inline-flex max-w-full flex-col ${className}`}>
            <span lang="ja" className="break-words">
                {withHighlight(japanese, highlightTerms.japanese)}
            </span>
            {reading && (
                <span lang="ja" className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-sky-700 dark:text-sky-300">
                    {withHighlight(reading, highlightTerms.reading)}
                </span>
            )}
            {showRomaji && typeof reading === 'string' && reading && (
                <RomajiLine
                    japanese={typeof japanese === 'string' ? japanese : ''}
                    reading={reading}
                    japaneseHighlightTerm={highlightTerms.japanese}
                    highlightTerm={highlightTerms.reading}
                />
            )}
            {showTranslation && translation && (
                <span lang="id" className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                    {withHighlight(translation, highlightTerms.translation)}
                </span>
            )}
        </span>
    );
}
