import React from 'react';

const INTENSITY_OPTIONS = [
    { value: 'repeat', label: 'Perlu Diulang' },
    { value: 'just_right', label: 'Pas' },
    { value: 'easy', label: 'Terlalu Mudah' },
];

export default function FeedbackIntensitySelector({
    value,
    onChange,
    disabled = false,
    className = '',
}) {
    return (
        <div className={`grid grid-cols-3 gap-2 ${className}`} role="group" aria-label="Pilihan intensitas materi">
            {INTENSITY_OPTIONS.map((opt) => {
                const isSelected = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.value)}
                        aria-pressed={isSelected}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                            isSelected
                                ? 'border-amber-500 bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-400/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-slate-850'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
