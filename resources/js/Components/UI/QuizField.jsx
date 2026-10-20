import React from 'react';
import Tooltip from '@mui/material/Tooltip';

export function TooltipHelp({ text, className = '' }) {
    if (!text) return null;
    return (
        <Tooltip
            title={text}
            arrow
            placement="top"
            enterTouchDelay={50}
            slotProps={{
                tooltip: {
                    sx: {
                        bgcolor: '#030712',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 500,
                        lineHeight: 1.55,
                        borderRadius: '0.75rem',
                        padding: '6px 12px',
                        maxWidth: '280px',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                    },
                },
                arrow: {
                    sx: {
                        color: '#030712',
                    },
                },
            }}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                className={`inline-flex items-center justify-center cursor-help rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${className}`}
                aria-label={text}
            >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[9px] font-black text-gray-500 shadow-2xs transition hover:border-emerald-500 hover:bg-emerald-600 hover:!text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-emerald-400 dark:hover:bg-emerald-500">
                    ?
                </span>
            </button>
        </Tooltip>
    );
}

export default function QuizField({
    id,
    label,
    tooltip,
    hint,
    error,
    required = false,
    children,
    className = 'block',
    labelClassName = 'mb-1.5 flex items-center gap-1.5 text-xs font-black text-gray-700 dark:text-gray-300',
}) {
    const generatedId = React.useId();
    const fieldId = id || generatedId;

    return (
        <div className={className}>
            {label && (
                <label htmlFor={fieldId} className={labelClassName}>
                    <span>{label}</span>
                    {required && <span className="text-rose-500 font-black">*</span>}
                    {tooltip && <TooltipHelp text={tooltip} />}
                </label>
            )}
            {React.isValidElement(children)
                ? React.cloneElement(children, { id: children.props.id || fieldId })
                : children}
            {error && <span role="alert" className="mt-1.5 block text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</span>}
            {!error && hint && <span className="mt-1.5 block text-[11px] font-medium leading-4 text-gray-400">{hint}</span>}
        </div>
    );
}

QuizField.Tooltip = TooltipHelp;
