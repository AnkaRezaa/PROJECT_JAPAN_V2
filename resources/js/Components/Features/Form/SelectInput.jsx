export default function SelectInput({ label, error, options = [], placeholder, className = '', ...props }) {
    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
            <select
                className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-colors focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 ${error ? 'border-red-500' : 'border-gray-200'} ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt, i) => (
                    <option key={i} value={opt.value ?? opt}>{opt.label ?? opt}</option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
