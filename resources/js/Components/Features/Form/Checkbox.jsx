export default function Checkbox({ label, error, className = '', ...props }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                className={`h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-focus/20 ${className}`}
                {...props}
            />
            {label && <span className="text-sm text-gray-700">{label}</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </label>
    );
}
