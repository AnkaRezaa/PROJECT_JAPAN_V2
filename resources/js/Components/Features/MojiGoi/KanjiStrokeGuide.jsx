import React, { useEffect, useState } from 'react';
import StrokeCharacterPreview from '@/Components/Features/Handwriting/StrokeCharacterPreview';
import { loadStrokeCharacter, resolveAvailableCharacters } from '@/Components/Features/Handwriting/strokeData';

export default function KanjiStrokeGuide({ text }) {
    const [characters, setCharacters] = useState([]);
    const [previewCharacter, setPreviewCharacter] = useState(null);

    useEffect(() => {
        let active = true;

        resolveAvailableCharacters(text)
            .then((availableCharacters) => Promise.all(
                availableCharacters
                    .filter(({ character }) => /\p{Script=Han}/u.test(character))
                    .map(({ character }) => loadStrokeCharacter(character)),
            ))
            .then((items) => {
                if (active) setCharacters(items);
            })
            .catch(() => {
                if (active) setCharacters([]);
            });

        return () => {
            active = false;
        };
    }, [text]);

    if (characters.length === 0) return null;

    return (
        <section className="mx-auto mt-5 max-w-2xl text-left sm:mt-7">
            <div className="mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Cara Menulis</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Lihat bentuk dan urutan stroke setiap kanji.</p>
            </div>
            <div className={`grid gap-2.5 sm:gap-3 ${characters.length === 1 ? 'mx-auto max-w-sm grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {characters.map((item) => (
                    <article key={item.character} className="flex min-w-0 items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-2.5 dark:border-violet-900/60 dark:bg-violet-950/25 sm:p-3">
                        <svg viewBox="0 0 109 109" className="h-16 w-16 shrink-0 rounded-xl border border-violet-100 bg-white dark:border-gray-700 dark:bg-gray-950" aria-label={`Panduan menulis ${item.character}`}>
                            <path d="M 54.5 0 V 109 M 0 54.5 H 109 M 0 0 L 109 109 M 109 0 L 0 109" fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="0.7" strokeDasharray="3 3" />
                            {item.paths.map((pathData, index) => (
                                <path key={`${item.character}-${index}`} d={pathData} fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                            ))}
                        </svg>
                        <div className="min-w-0 flex-1">
                            <p className="text-xl font-black text-gray-900 dark:text-white">{item.character}</p>
                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.stroke_count} stroke</p>
                            <button type="button" onClick={() => setPreviewCharacter(item.character)} className="mt-1.5 rounded-lg px-2 py-1 text-xs font-black text-violet-700 transition fine-pointer:hover:bg-violet-100 dark:text-violet-300 dark:fine-pointer:hover:bg-violet-950/70">
                                Lihat Urutan
                            </button>
                        </div>
                    </article>
                ))}
            </div>
            <StrokeCharacterPreview
                character={previewCharacter}
                title={`Urutan stroke ${previewCharacter || ''}`}
                open={Boolean(previewCharacter)}
                onClose={() => setPreviewCharacter(null)}
            />
        </section>
    );
}
