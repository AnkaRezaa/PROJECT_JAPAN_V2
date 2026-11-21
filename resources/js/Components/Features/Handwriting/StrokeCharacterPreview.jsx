import React, { useState } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KanjiHandwritingCanvas from './KanjiHandwritingCanvas';

export default function StrokeCharacterPreview({ character, characters = [], title, open, onClose }) {
    const [selected, setSelected] = useState(null);
    const choices = [...new Set(characters)];
    const activeCharacter = choices.includes(selected) ? selected : (choices[0] || character);
    if (!open || !character) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div role="dialog" aria-modal="true" aria-label="Pratinjau guratan" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Cara Menulis</p>
                        <h2 className="mt-1 break-words text-xl font-black text-gray-900 dark:text-white">{title || character}</h2>
                    </div>
                    <button type="button" onClick={onClose} title="Tutup" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300">
                        <CloseRoundedIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>
                {choices.length > 1 && (
                    <div role="group" aria-label="Karakter kanji" className="mb-4 flex flex-wrap gap-2">
                        {choices.map((item) => (
                            <button key={item} type="button" lang="ja" aria-pressed={activeCharacter === item} onClick={() => setSelected(item)}
                                className="h-11 w-11 rounded-lg border border-gray-300 text-lg font-semibold text-gray-900 aria-pressed:border-brand-600 aria-pressed:bg-brand-100 dark:border-gray-700 dark:text-gray-100 dark:aria-pressed:bg-gray-700">
                                {item}
                            </button>
                        ))}
                    </div>
                )}
                <KanjiHandwritingCanvas key={activeCharacter} character={activeCharacter} mode="preview" />
            </div>
        </div>
    );
}
