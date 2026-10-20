import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';

const ACCENT_STYLES = {
    emerald: {
        activeCard: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30',
        activeRadio: 'text-emerald-600 dark:text-emerald-400',
        hoverRadio: 'hover:text-emerald-600 dark:hover:text-emerald-400',
        activeBadge: 'bg-emerald-600 text-white shadow-xs',
        pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
        focusRing: 'focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400',
    },
    indigo: {
        activeCard: 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/30',
        activeRadio: 'text-indigo-600 dark:text-indigo-400',
        hoverRadio: 'hover:text-indigo-600 dark:hover:text-indigo-400',
        activeBadge: 'bg-indigo-600 text-white shadow-xs',
        pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
        focusRing: 'focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400',
    },
};

export default function OptionEditorRow({
    index = 0,
    label,
    value = '',
    reading = '',
    isCorrect = false,
    showReading = false,
    placeholder,
    readingPlaceholder = 'Cara baca kana (opsional)',
    disabled = false,
    accent = 'emerald',
    onTextChange,
    onReadingChange,
    onSelectCorrect,
    onRemove,
    className = '',
}) {
    const optLabel = label || String.fromCharCode(65 + index);
    const resolvedPlaceholder = placeholder || `Pilihan ${optLabel}...`;
    const theme = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald;

    return (
        <div
            className={`group relative flex flex-col rounded-xl border p-2.5 transition-all sm:p-3 ${theme.focusRing} ${
                isCorrect
                    ? theme.activeCard
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
            } ${className}`}
        >
            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    disabled={disabled}
                    title={`Pilih ${optLabel} sebagai kunci jawaban benar`}
                    aria-label={`Pilih ${optLabel} sebagai kunci jawaban benar`}
                    onClick={onSelectCorrect}
                    className={`flex min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCorrect
                            ? theme.activeRadio
                            : `text-gray-300 ${theme.hoverRadio} dark:text-gray-600`
                    }`}
                >
                    {isCorrect ? (
                        <CheckCircleIcon sx={{ fontSize: 24 }} />
                    ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 24 }} />
                    )}
                </button>

                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors ${
                        isCorrect
                            ? theme.activeBadge
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                    }`}
                >
                    {optLabel}
                </span>

                <input
                    type="text"
                    lang="ja"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onTextChange?.(e.target.value)}
                    placeholder={resolvedPlaceholder}
                    className="flex-1 border-0 bg-transparent px-1 py-1 text-sm font-japanese font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-white"
                />

                {Boolean(value?.trim()) && (
                    <JapaneseSpeechButton
                        text={reading?.trim() || value}
                        title={`Dengarkan pelafalan ${optLabel}`}
                        className="flex min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300"
                        iconClassName="!text-sm"
                    />
                )}

                {isCorrect && (
                    <span className={`hidden sm:inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${theme.pill}`}>
                        Kunci Benar
                    </span>
                )}

                {onRemove && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onRemove}
                        title={`Hapus Opsi ${optLabel}`}
                        aria-label={`Hapus Opsi ${optLabel}`}
                        className="flex min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 shrink-0 items-center justify-center rounded-lg text-gray-400 opacity-100 sm:opacity-0 transition hover:bg-rose-50 hover:text-rose-600 sm:group-hover:opacity-100 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </button>
                )}
            </div>

            {showReading && (
                <div className="mt-2 pl-9 sm:pl-10">
                    <input
                        type="text"
                        lang="ja"
                        value={reading}
                        disabled={disabled}
                        onChange={(e) => onReadingChange?.(e.target.value)}
                        placeholder={readingPlaceholder}
                        className="h-8 w-full rounded-lg border border-sky-100 bg-sky-50/60 px-2.5 text-xs font-japanese font-medium text-sky-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-500/10 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
                    />
                </div>
            )}
        </div>
    );
}
