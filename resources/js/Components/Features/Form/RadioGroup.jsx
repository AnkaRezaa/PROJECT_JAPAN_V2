export default function RadioGroup({ label, name, options = [], value, onChange, error, className = '' }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
            <div className="flex flex-wrap gap-3">
                {options.map((opt, i) => (
                    <label key={i} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all ${value === (opt.value ?? opt) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                            type="radio"
                            name={name}
                            value={opt.value ?? opt}
                            checked={value === (opt.value ?? opt)}
                            onChange={onChange}
                            className="hidden"
                        />
                        {opt.label ?? opt}
                    </label>
                ))}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
