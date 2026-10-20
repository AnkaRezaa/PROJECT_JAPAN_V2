import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

export default function GrammarBankPickerDialog({ open, onClose, onSelect, initialLevel = 'all' }) {
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState(initialLevel);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useScrollLock(open);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (search.trim()) params.append('search', search.trim());
        if (level && level !== 'all') params.append('level', level);

        window.axios.get(`/admin/grammar-banks/picker?${params.toString()}`)
            .then(({ data }) => {
                if (!active) return;
                setItems(data.data || []);
            })
            .catch(() => {
                if (!active) return;
                setError('Gagal memuat bank grammar.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [open, search, level]);

    if (!open) return null;

    const levels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="grammar-bank-picker-title"
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <MenuBookIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <h3 id="grammar-bank-picker-title" className="text-sm font-black text-gray-900 dark:text-white">
                                Pilih dari Bank Grammar
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Muat pola grammar terverifikasi langsung ke materi lesson & generator.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label="Tutup dialog"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="space-y-2.5 border-b border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pola grammar, arti, atau judul..."
                            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-500 mr-1">Level:</span>
                        {levels.map((lvl) => (
                            <button
                                key={lvl}
                                type="button"
                                onClick={() => setLevel(lvl)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                                    level === lvl
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                            >
                                {lvl === 'all' ? 'Semua' : lvl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {loading && (
                        <div className="py-12 text-center text-xs font-semibold text-gray-400">
                            Memuat daftar Bank Grammar...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-8 text-center text-xs font-bold text-rose-500">
                            {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="py-12 text-center text-xs text-gray-400">
                            Pola grammar tidak ditemukan.
                        </div>
                    )}

                    {!loading && items.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-emerald-300 hover:shadow-xs dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        JLPT {item.jlpt_level}
                                    </span>
                                    <span lang="ja" className="font-japanese text-sm font-black text-gray-900 dark:text-white">
                                        {item.pattern}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {item.title}
                                </p>
                                <p className="text-[11px] text-gray-500 line-clamp-1">
                                    {item.meaning}
                                </p>
                                {item.formula && (
                                    <p className="text-[10px] font-japanese text-emerald-700 dark:text-emerald-400 line-clamp-1">
                                        Rumus: {item.formula}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                                className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-2xs"
                            >
                                Gunakan Pola
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
