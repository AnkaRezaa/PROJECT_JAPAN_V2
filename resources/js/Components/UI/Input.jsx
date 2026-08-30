import { forwardRef } from 'react';

export default forwardRef(function Input({ type = 'text', label, error, className = '', ...props }, ref) {
    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
            <input
                type={type}
                ref={ref}
                className={`toku-input w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none ${error ? '!border-red-500' : ''} ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
});
