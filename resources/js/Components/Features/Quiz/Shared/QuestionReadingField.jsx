import React, { useId } from 'react';

export default function QuestionReadingField({ value, showReading = false, onReadingChange, onVisibilityChange, error }) {
    const id = useId();
    return (
        <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor={id} className="text-sm font-semibold text-sky-800 dark:text-sky-200">Cara Baca Kana (Yomikata)</label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <input type="checkbox" role="switch" checked={showReading} onChange={(event) => onVisibilityChange(event.target.checked)} className="peer sr-only" />
                    <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 dark:bg-gray-600 dark:peer-checked:bg-emerald-500 dark:peer-focus-visible:ring-offset-gray-900" />
                    Tampilkan bantuan baca
                </label>
            </div>
            <input id={id} type="text" value={value || ''} onChange={(event) => onReadingChange(event.target.value)} placeholder="Cara baca kana (opsional), contoh: けいざい" lang="ja" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-11 w-full rounded-lg border border-sky-200 bg-sky-50/60 px-4 text-sm font-japanese font-medium text-sky-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200" />
            {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        </div>
    );
}
