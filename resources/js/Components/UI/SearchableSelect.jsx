import { useEffect, useMemo, useRef, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchableSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Cari...',
    disabled = false,
    className = '',
    triggerClassName = '',
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
                className={triggerClassName || "flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 text-left text-sm outline-none transition hover:border-brand-300 focus:border-focus focus:ring-2 focus:ring-focus/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-gray-700 dark:bg-gray-900 dark:text-white"}
                aria-expanded={open}
            >
                <span className={selected ? 'truncate font-bold text-gray-900 dark:text-white' : 'truncate text-gray-400'}>
                    {selected?.label || placeholder}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <SearchIcon sx={{ fontSize: 14 }} />
                    <span>{open ? 'Tutup' : 'Cari'}</span>
                    <ExpandMoreIcon className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} sx={{ fontSize: 16 }} />
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-100 p-2.5 dark:border-gray-800">
                        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
                            <SearchIcon sx={{ fontSize: 16 }} className="text-gray-400 shrink-0" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full border-0 bg-transparent p-0 text-xs font-semibold text-gray-900 outline-none focus:ring-0 dark:text-white"
                            />
                        </label>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                        {allowClear && value && <button type="button" onClick={() => selectOption({ value: '', label: clearLabel })} className="mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-gray-500 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800">{clearLabel}</button>}
                        {filteredOptions.length === 0 && <p className="px-3 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">{emptyMessage}</p>}
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => selectOption(option)}
                                className={`w-full rounded-xl px-3 py-2 text-left transition ${String(option.value) === String(value)
                                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 font-bold'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'}`}
                            >
                                <span className="block text-xs font-bold">{option.label}</span>
                                {option.description && <span className="mt-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">{option.description}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
