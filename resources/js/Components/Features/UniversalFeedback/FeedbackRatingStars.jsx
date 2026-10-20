import React from 'react';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

export default function FeedbackRatingStars({
    rating,
    onRatingChange,
    reason,
    onReasonChange,
    reasons = [],
    message,
    onMessageChange,
    placeholder = 'Komentar tambahan (opsional)...',
    disabled = false,
    className = '',
}) {
    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center gap-1.5" role="group" aria-label="Rating 1 sampai 5 bintang">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = rating >= star;
                    return (
                        <button
                            key={star}
                            type="button"
                            disabled={disabled}
                            onClick={() => onRatingChange(star)}
                            aria-label={`${star} bintang`}
                            className={`p-1 rounded-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                                isFilled
                                    ? 'text-amber-400 dark:text-amber-300'
                                    : 'text-slate-300 hover:text-amber-200 dark:text-slate-700 dark:hover:text-amber-500/50'
                            }`}
                        >
                            {isFilled ? <StarIcon sx={{ fontSize: 28 }} /> : <StarBorderIcon sx={{ fontSize: 28 }} />}
                        </button>
                    );
                })}
            </div>

            {reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label="Pilihan alasan">
                    {reasons.map(([val, label]) => {
                        const isSelected = reason === val;
                        return (
                            <button
                                key={val}
                                type="button"
                                disabled={disabled}
                                onClick={() => onReasonChange(isSelected ? '' : val)}
                                aria-pressed={isSelected}
                                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                                    isSelected
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {typeof onMessageChange === 'function' && (
                <textarea
                    value={message || ''}
                    onChange={(e) => onMessageChange(e.target.value)}
                    disabled={disabled}
                    maxLength={1000}
                    rows={3}
                    placeholder={placeholder}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
                />
            )}
        </div>
    );
}
