import React from 'react';
import { TooltipHelp } from './QuizField';

export { TooltipHelp };

export function formInputClass(error = false, extra = '') {
    const base = 'w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none transition dark:bg-gray-950 dark:text-white';
    const state = error
        ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 bg-rose-50/20 dark:border-rose-800 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100'
        : 'border-gray-200 focus:border-focus focus:ring-4 focus:ring-focus/15 dark:border-gray-700 dark:focus:border-focus';
    return `${base} ${state} ${extra}`.trim();
}

export default function FormField({
    label,
    tooltip,
    hint,
    error,
    required = false,
    wide = false,
    children,
    className = '',
    labelClassName = 'mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300',
}) {
    const rootClass = `${wide ? 'md:col-span-2' : ''} ${className}`.trim() || 'block';

    return (
        <label className={rootClass}>
            {label && (
                <span className={labelClassName}>
                    <span>{label}</span>
                    {required && <span className="text-rose-500 font-black" aria-hidden="true">*</span>}
                    {tooltip && <TooltipHelp text={tooltip} />}
                </span>
            )}
            {children}
            {error && (
                <span className="mt-1.5 block text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
                    {error}
                </span>
            )}
            {!error && hint && (
                <span className="mt-1.5 block text-[11px] font-medium leading-4 text-gray-400">
                    {hint}
                </span>
            )}
        </label>
    );
}

FormField.Tooltip = TooltipHelp;
FormField.inputClass = formInputClass;
