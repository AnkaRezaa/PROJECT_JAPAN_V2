import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';

const CONTENT_TYPES = [
    { value: 'all', label: 'Semua' },
    { value: 'kosakata', label: 'Kosakata' },
    { value: 'kanji', label: 'Kanji' },
    { value: 'bunpo', label: 'Bunpo' },
];

const typeLabels = {
    kosakata: 'Kosakata',
    kanji: 'Kanji',
    bunpo: 'Bunpo',
};

const typeTones = {
    kosakata: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    kanji: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300',
    bunpo: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
};

function MaterialDetail({ item, onClose }) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const [desktopPanel, setDesktopPanel] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
    ));

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 640px)');
        const syncPanelMode = () => setDesktopPanel(mediaQuery.matches);
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };

        syncPanelMode();
        document.body.style.overflow = 'hidden';
        mediaQuery.addEventListener('change', syncPanelMode);
        window.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            mediaQuery.removeEventListener('change', syncPanelMode);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [onClose]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <motion.div
            className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="material-detail-title"
                className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:inset-y-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-none"
                initial={desktopPanel ? { x: '100%' } : { y: '100%' }}
                animate={desktopPanel ? { x: 0 } : { y: 0 }}
                exit={desktopPanel ? { x: '100%' } : { y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
                            {typeLabels[item.content_type] || 'Materi'}
                        </p>
                        <h2 id="material-detail-title" className="mt-0.5 text-base font-black text-gray-900 dark:text-white">
                            Detail Materi
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup detail"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <CloseIcon sx={{ fontSize: 21 }} />
                    </button>
                </div>

                <div className="space-y-6 px-5 py-6 sm:px-6">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${typeTones[item.content_type] || typeTones.kosakata}`}>
                                {typeLabels[item.content_type] || 'Materi'}
                            </span>
                            {item.jlpt_level && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    JLPT {item.jlpt_level}
                                </span>
                            )}
                            {item.category && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    {item.category}
                                </span>
                            )}
                        </div>

                        <div className="mt-5 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <JapaneseReading
                                    japanese={item.word}
                                    reading={item.reading}
                                    className="text-4xl font-black leading-tight text-gray-950 dark:text-white"
                                />
                            </div>
                            <JapaneseSpeechButton
                                text={item.word || item.reading}
                                audioUrl={item.audio_url}
                                title={`Dengarkan ${item.word || 'kata ini'}`}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action-secondary text-white shadow-sm transition hover:bg-action-secondary-hover active:scale-95"
                                iconClassName="text-[21px]"
                            />
                        </div>
                    </div>

                    <section className="border-t border-gray-200 pt-5 dark:border-gray-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Arti</p>
                        <p className="mt-2 text-lg font-black leading-relaxed text-gray-900 dark:text-white">
                            {item.meaning_id || item.meaning_en || 'Arti belum tersedia'}
                        </p>
                        {item.meaning_en && item.meaning_en !== item.meaning_id && (
                            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">{item.meaning_en}</p>
                        )}
                    </section>

                    {(item.example_sentence || item.example_meaning || item.example_reading) && (
                        <section className="border-t border-gray-200 pt-5 dark:border-gray-800">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Contoh penggunaan</p>
                                <JapaneseSpeechButton
                                    text={item.example_sentence || item.example_reading}
                                    title="Dengarkan contoh kalimat"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
                                    iconClassName="text-[19px]"
                                />
                            </div>
                            <JapaneseReading
                                japanese={<HighlightedLearningText text={item.example_sentence || '-'} term={item.word} />}
                                reading={item.example_reading}
                                translation={item.example_meaning}
                                className="mt-2 text-base font-black leading-7 text-gray-900 dark:text-white"
                            />
                        </section>
                    )}

                    {tags.length > 0 && (
                        <section className="flex flex-wrap gap-2 border-t border-gray-200 pt-5 dark:border-gray-800">
                            {tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    {tag}
                                </span>
                            ))}
                        </section>
                    )}
                </div>
            </motion.aside>
        </motion.div>,
        document.body,
    );
}

export default function KosakataPage({
    program = {},
    vocabulary = {},
    filters = {},
    categories = [],
    available_levels = [],
    modules = [],
    selected_module_id = null,
}) {
    const rows = vocabulary.data || [];
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');
    const [jlptLevel, setJlptLevel] = useState(filters.jlpt_level || 'all');
    const [contentType, setContentType] = useState(filters.content_type || 'all');
    const [moduleFilter, setModuleFilter] = useState(selected_module_id || filters.module || 'all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const applyFilters = (overrides = {}) => {
        const selectedModule = overrides.module ?? moduleFilter;
        const nextFilters = {
            search,
            category,
            jlpt_level: jlptLevel,
            content_type: contentType,
            ...overrides,
        };

        if (selectedModule !== 'all' && selectedModule !== '') {
            nextFilters.module = selectedModule;
        } else {
            delete nextFilters.module;
        }

        router.get(route('user.modul.program.kosakata', program.slug), nextFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const submitSearch = (event) => {
        event.preventDefault();
        applyFilters();
    };

    const selectType = (value) => {
        setContentType(value);
        applyFilters({ content_type: value });
    };

    const resetAdvancedFilters = () => {
        setCategory('all');
        setJlptLevel('all');
        setModuleFilter('all');
        applyFilters({ category: 'all', jlpt_level: 'all', module: 'all' });
    };

    const activeAdvancedFilterCount = [
        category !== 'all',
        jlptLevel !== 'all',
        String(moduleFilter) !== 'all',
    ].filter(Boolean).length;

    return (
        <AuthenticatedLayout header={false}>
            <Head title={`Pustaka Materi - ${program.title || 'TOKU-UP'}`} />

            <div className="min-h-[100dvh] bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-white">
                <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                    <header className="flex items-start gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
                        <Link
                            href={program.roadmap_url || route('user.kelas.index')}
                            aria-label="Kembali ke roadmap"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-brand-600 hover:shadow-sm dark:hover:bg-gray-900 dark:hover:text-brand-400"
                        >
                            <ArrowBackIcon sx={{ fontSize: 21 }} />
                        </Link>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-[0_3px_0_#b45309]">
                            <MenuBookIcon sx={{ fontSize: 22 }} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-xl font-black sm:text-2xl">
                                Pustaka Materi
                            </h1>
                            <p className="mt-0.5 truncate text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {program.title || 'Kelas'} · {vocabulary.total ?? rows.length} materi
                            </p>
                        </div>
                    </header>

                    <section className="sticky top-0 z-20 -mx-4 bg-gray-50/95 px-4 pb-3 pt-4 backdrop-blur dark:bg-gray-950/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                        <form onSubmit={submitSearch} className="flex gap-2">
                            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:border-learning-400 focus-within:ring-4 focus-within:ring-learning-100 dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-learning-600 dark:focus-within:ring-learning-950/50">
                                <SearchIcon sx={{ fontSize: 20 }} className="shrink-0 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold outline-none focus:ring-0 dark:text-white"
                                    placeholder="Cari kata, bacaan, atau arti"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => setFiltersOpen((current) => !current)}
                                aria-expanded={filtersOpen}
                                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition ${
                                    filtersOpen || activeAdvancedFilterCount > 0
                                        ? 'border-learning-700 bg-learning-700 text-white'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-learning-300 hover:text-learning-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}
                            >
                                <FilterListIcon sx={{ fontSize: 21 }} />
                                {activeAdvancedFilterCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-gray-50 bg-amber-400 px-1 text-[9px] font-black text-amber-950 dark:border-gray-950">
                                        {activeAdvancedFilterCount}
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-gray-200/70 p-1 dark:bg-gray-900">
                            {CONTENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => selectType(type.value)}
                                    className={`min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-xs font-black transition ${
                                        contentType === type.value
                                            ? 'bg-white text-learning-700 shadow-sm dark:bg-gray-800 dark:text-learning-200'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence initial={false}>
                            {filtersOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-3 grid gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3">
                                        <label className="grid gap-1">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Minggu</span>
                                            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="h-10 rounded-lg border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                                <option value="all">Semua Week</option>
                                                {modules.map((module) => (
                                                    <option key={module.id} value={module.id}>Week {module.week_number ?? '-'} · {module.title}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Kategori</span>
                                            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                                <option value="all">Semua Kategori</option>
                                                {categories.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Level</span>
                                            <select value={jlptLevel} onChange={(event) => setJlptLevel(event.target.value)} className="h-10 rounded-lg border-gray-200 bg-white px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                                <option value="all">Semua Level</option>
                                                {available_levels.map((level) => (
                                                    <option key={level} value={level}>{level}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="flex justify-end gap-2 sm:col-span-3">
                                            <button type="button" onClick={resetAdvancedFilters} className="h-9 rounded-lg px-3 text-xs font-black text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                                                Reset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    applyFilters();
                                                    setFiltersOpen(false);
                                                }}
                                                className="min-h-10 rounded-lg bg-action-secondary px-4 text-xs font-black text-white shadow-sm transition hover:bg-action-secondary-hover"
                                            >
                                                Terapkan
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {rows.length > 0 ? (
                        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {rows.map((item) => (
                                    <article key={item.id} className="flex min-h-[84px] items-center gap-2 px-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/60 sm:px-4">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedItem(item)}
                                            className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,1.2fr)_auto]"
                                        >
                                            <JapaneseReading
                                                japanese={item.word}
                                                reading={item.reading}
                                                className="min-w-0 text-xl font-black leading-tight text-gray-950 dark:text-white sm:text-2xl"
                                            />
                                            <span className="hidden min-w-0 sm:block">
                                                <span className="block truncate text-sm font-bold text-gray-800 dark:text-gray-200">
                                                    {item.meaning_id || item.meaning_en || 'Arti belum tersedia'}
                                                </span>
                                                <span className="mt-1 flex items-center gap-1.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${typeTones[item.content_type] || typeTones.kosakata}`}>
                                                        {typeLabels[item.content_type] || 'Materi'}
                                                    </span>
                                                    {item.category && <span className="truncate text-[10px] font-semibold text-gray-400">{item.category}</span>}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black sm:hidden ${typeTones[item.content_type] || typeTones.kosakata}`}>
                                                    {typeLabels[item.content_type] || 'Materi'}
                                                </span>
                                                <ChevronRightIcon sx={{ fontSize: 21 }} />
                                            </span>
                                            <span className="col-span-2 truncate text-xs font-semibold text-gray-600 dark:text-gray-300 sm:hidden">
                                                {item.meaning_id || item.meaning_en || 'Arti belum tersedia'}
                                            </span>
                                        </button>

                                        <JapaneseSpeechButton
                                            text={item.word || item.reading}
                                            audioUrl={item.audio_url}
                                            title={`Dengarkan ${item.word || 'kata ini'}`}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
                                            iconClassName="text-[20px]"
                                        />
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
                            <MenuBookIcon sx={{ fontSize: 38 }} className="text-gray-300 dark:text-gray-600" />
                            <h2 className="mt-3 text-base font-black">Materi belum ditemukan</h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Ubah pencarian atau filter untuk melihat materi lainnya.
                            </p>
                        </section>
                    )}

                    {vocabulary.links?.length > 3 && (
                        <nav aria-label="Navigasi halaman materi" className="mt-5 flex flex-wrap justify-center gap-1.5">
                            {vocabulary.links.map((link, index) => (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-xs font-black transition ${
                                        link.active
                                            ? 'bg-learning-700 text-white'
                                            : 'border border-gray-200 bg-white text-gray-600 hover:border-learning-300 hover:text-learning-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                    } ${!link.url ? 'pointer-events-none opacity-35' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    )}
                </main>

                <AnimatePresence>
                    {selectedItem && (
                        <MaterialDetail
                            item={selectedItem}
                            onClose={() => setSelectedItem(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </AuthenticatedLayout>
    );
}
