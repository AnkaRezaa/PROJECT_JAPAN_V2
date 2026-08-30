import { useEffect, useMemo, useRef, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchableMultiSelect({
    value = [],
    onChange,
    options = [],
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Cari opsi...',
    emptyMessage = 'Tidak ada opsi ditemukan.',
    disabled = false,
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const selectedValues = useMemo(() => new Set((value || []).map(String)), [value]);
    const selectedOptions = options.filter((option) => selectedValues.has(String(option.value)));
    const filteredOptions = options.filter((option) => `${option.label} ${option.description || ''}`.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        const close = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };

        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const toggleOption = (optionValue) => {
        const normalized = String(optionValue);
        const next = selectedValues.has(normalized)
            ? (value || []).filter((item) => String(item) !== normalized)
            : [...(value || []), optionValue];

        onChange(next);
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-800 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
                <span className="min-w-0 flex-1 truncate">{selectedOptions.length ? selectedOptions.map((option) => option.label).join(', ') : placeholder}</span>
                <ExpandMoreIcon className={`shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} sx={{ fontSize: 18 }} />
            </button>

            {open && (
                <div className="absolute z-[120] mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                        <SearchIcon sx={{ fontSize: 17 }} className="text-gray-400" />
                        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none focus:ring-0 dark:text-white" />
                    </label>
                    <div className="mt-2 max-h-52 overflow-y-auto">
                        {filteredOptions.length === 0 && <p className="px-3 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{emptyMessage}</p>}
                        {filteredOptions.map((option) => {
                            const selected = selectedValues.has(String(option.value));

                            return (
                                <button key={option.value} type="button" onClick={() => toggleOption(option.value)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-[var(--toku-primary)] bg-[var(--toku-primary)] text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {selected && <CheckIcon sx={{ fontSize: 13 }} />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-gray-800 dark:text-gray-100">{option.label}</span>
                                        {option.description && <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{option.description}</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
