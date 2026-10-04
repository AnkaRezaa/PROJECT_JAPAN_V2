import React from 'react';

export function TooltipHelp({ text, className = '' }) {
    if (!text) return null;
    return (
        <span
            className={`group relative inline-flex cursor-help items-center ${className}`}
            tabIndex={0}
            aria-label={text}
        >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[9px] font-black text-gray-500 shadow-2xs transition group-hover:border-emerald-500 group-hover:bg-emerald-600 group-hover:!text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:border-emerald-400 dark:group-hover:bg-emerald-500">
                ?
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 hidden w-52 -translate-x-1/2 rounded-xl bg-gray-950 px-3 py-2 text-center text-[11px] font-medium leading-relaxed !text-white shadow-xl group-hover:block group-focus:block dark:bg-gray-800 border border-white/10 normal-case tracking-normal">
                {text}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-950 dark:border-t-gray-800" />
            </span>
        </span>
    );
}

export default function QuizField({
    label,
    tooltip,
    hint,
    error,
    required = false,
    children,
    className = 'block',
    labelClassName = 'mb-1.5 flex items-center gap-1.5 text-xs font-black text-gray-700 dark:text-gray-300',
}) {
    return (
        <label className={className}>
            {label && (
                <span className={labelClassName}>
                    <span>{label}</span>
                    {required && <span className="text-rose-500 font-black">*</span>}
                    {tooltip && <TooltipHelp text={tooltip} />}
                </span>
            )}
            {children}
            {error && <span className="mt-1.5 block text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</span>}
            {!error && hint && <span className="mt-1.5 block text-[11px] font-medium leading-4 text-gray-400">{hint}</span>}
        </label>
    );
}

QuizField.Tooltip = TooltipHelp;
