import { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchableSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Cari...',
    disabled = false,
    className = '',
    emptyMessage = 'Data tidak ditemukan.',
    allowClear = false,
    clearLabel = 'Semua opsi',
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef(null);
    const selected = options.find((option) => String(option.value) === String(value));
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('id');

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) => `${option.label} ${option.description || ''}`
            .toLocaleLowerCase('id')
            .includes(normalizedQuery));
    }, [options, query]);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);

    const selectOption = (option) => {
        onChange(option.value);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 text-left text-sm outline-none transition hover:border-brand-300 focus:border-focus focus:ring-2 focus:ring-focus/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                aria-expanded={open}
            >
                <span className={selected ? 'truncate font-bold text-gray-900 dark:text-white' : 'truncate text-gray-400'}>
                    {selected?.label || placeholder}
                </span>
                <span className="text-xs font-black text-gray-400">{open ? 'Tutup' : 'Cari'}</span>
            </button>

            {open && (
                <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-100 p-3 dark:border-gray-800">
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900 outline-none focus:border-focus focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                        {allowClear && value && <button type="button" onClick={() => selectOption({ value: '', label: clearLabel })} className="mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold text-gray-500 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800">{clearLabel}</button>}
                        {filteredOptions.length === 0 && <p className="px-3 py-4 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">{emptyMessage}</p>}
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => selectOption(option)}
                                className={`w-full rounded-lg px-3 py-2.5 text-left transition ${String(option.value) === String(value)
                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'}`}
                            >
                                <span className="block text-sm font-bold">{option.label}</span>
                                {option.description && <span className="mt-0.5 block text-xs font-medium text-gray-500 dark:text-gray-400">{option.description}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
