import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function DokkaiBankPickerDialog({ open, onClose, onSelect, initialLevel = 'all' }) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [level, setLevel] = useState(initialLevel);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
        if (level && level !== 'all') params.append('level', level);

        window.axios
            .get(`/admin/dokkai-quizzes/picker?${params.toString()}`)
            .then(({ data }) => {
                if (!active) return;
                setItems(data.data || []);
            })
            .catch(() => {
                if (!active) return;
                setError('Gagal memuat katalog wacana Dokkai.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [open, debouncedSearch, level]);

    if (!open) return null;

    const levels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dokkai-bank-picker-title"
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            <MenuBookIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <h3 id="dokkai-bank-picker-title" className="text-sm font-black text-gray-900 dark:text-white">
                                Salin Wacana dari Bank / Kelas Lain
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Pilih wacana bacaan yang sudah ada untuk disalin langsung ke Hari ini tanpa mengetik ulang.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                            placeholder="Cari judul wacana atau tema..."
                            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 py-2 text-xs font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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
                                        ? 'bg-indigo-600 text-white shadow-2xs'
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
                            Memuat daftar wacana Dokkai...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-8 text-center text-xs font-bold text-rose-500">
                            {error}
                        </div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="py-12 text-center text-xs text-gray-400">
                            Tidak ada wacana Dokkai yang cocok dengan pencarian.
                        </div>
                    )}

                    {!loading && items.map((item, idx) => {
                        const passage = item.passage || {};
                        const pCount = item.paragraphs?.length || 0;
                        const vCount = item.vocabularies?.length || 0;
                        const qCount = item.questions?.length || 0;
                        return (
                            <div
                                key={item.id || idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-indigo-300 hover:shadow-xs dark:border-gray-800 dark:bg-gray-950"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                            JLPT {passage.jlpt_level || 'N3'}
                                        </span>
                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            {passage.theme_category || 'Umum'}
                                        </span>
                                    </div>
                                    <p className="font-japanese text-sm font-black text-gray-900 dark:text-white line-clamp-1">
                                        {passage.title || 'Tanpa Judul'}
                                    </p>
                                    <p className="text-[11px] text-gray-500 line-clamp-1">
                                        {pCount} paragraf • {vCount} kosakata • {qCount} butir soal
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelect(item);
                                        onClose();
                                    }}
                                    className="shrink-0 flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition shadow-2xs"
                                >
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    <span>Salin Wacana</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
