import React, { useState, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import BankSoalNavbar from '@/Components/Features/BankSoal/BankSoalNavbar';

import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30';

const levelBadgeStyles = {
    N1: 'bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
    N2: 'bg-purple-50 text-purple-700 ring-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-800',
    N3: 'bg-blue-50 text-blue-700 ring-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
    N4: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
    N5: 'bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
};

export default function PusatBankSoalKonten({
    activeTab = 'grammar',
    grammarItems,
    filters = {},
    levels = [],
    stats = {},
    moduleDays = [],
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedLevel, setSelectedLevel] = useState(filters.level || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingPattern, setEditingPattern] = useState(null);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null);
    const [selectedDayId, setSelectedDayId] = useState('');
    const [daySearch, setDaySearch] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [assignSuccess, setAssignSuccess] = useState('');

    const filteredDays = useMemo(() => {
        if (!daySearch.trim()) return moduleDays;
        const q = daySearch.toLowerCase();
        return moduleDays.filter((d) => {
            const program = (d.program_title || '').toLowerCase();
            const moduleTitle = (d.module_title || '').toLowerCase();
            const week = `minggu ${d.week_number}`.toLowerCase();
            const dayNum = `hari ${d.day_number}`.toLowerCase();
            const dayTitle = (d.title || '').toLowerCase();
            return (
                program.includes(q) ||
                moduleTitle.includes(q) ||
                week.includes(q) ||
                dayNum.includes(q) ||
                dayTitle.includes(q)
            );
        });
    }, [moduleDays, daySearch]);

    const selectedDay = useMemo(() => {
        return moduleDays.find((d) => String(d.id) === String(selectedDayId));
    }, [moduleDays, selectedDayId]);

    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const { data: formData, setData: setFormData, post, put, processing, errors, reset } = useForm({
        jlpt_level: 'N3',
        pattern: '',
        title: '',
        meaning: '',
        formula: '',
        explanation: '',
        examples: [
            { japanese: '', reading: '', translation: '' }
        ],
        category: 'bunpo',
        status: 'published',
    });

    const handleFilterChange = (newLevel, newSearch, newStatus = selectedStatus) => {
        router.get(
            route('admin.bank-soal-konten.index'),
            {
                tab: 'grammar',
                level: newLevel,
                search: newSearch,
                status: newStatus,
            },
            { preserveState: true, replace: true }
        );
    };

    const clearSearch = () => {
        setSearch('');
        handleFilterChange(selectedLevel, '', selectedStatus);
    };

    const openCreateModal = () => {
        setEditingPattern(null);
        reset();
        setFormData({
            jlpt_level: 'N3',
            pattern: '',
            title: '',
            meaning: '',
            formula: '',
            explanation: '',
            examples: [
                { japanese: '', reading: '', translation: '' }
            ],
            category: 'bunpo',
            status: 'published',
        });
        setFormModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingPattern(item);
        setFormData({
            jlpt_level: item.jlpt_level || 'N3',
            pattern: item.pattern || '',
            title: item.title || '',
            meaning: item.meaning || '',
            formula: item.formula || '',
            explanation: item.explanation || '',
            examples: Array.isArray(item.examples) && item.examples.length > 0
                ? item.examples
                : [{ japanese: '', reading: '', translation: '' }],
            category: item.category || 'bunpo',
            status: item.status || 'published',
        });
        setFormModalOpen(true);
    };

    const handleExampleChange = (index, field, value) => {
        const next = [...formData.examples];
        next[index] = { ...next[index], [field]: value };
        setFormData('examples', next);
    };

    const addExampleRow = () => {
        setFormData('examples', [
            ...formData.examples,
            { japanese: '', reading: '', translation: '' }
        ]);
    };

    const removeExampleRow = (index) => {
        if (formData.examples.length <= 1) return;
        setFormData('examples', formData.examples.filter((_, i) => i !== index));
    };

    const submitForm = (e) => {
        e.preventDefault();
        if (editingPattern) {
            put(route('admin.grammar-banks.update', editingPattern.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    reset();
                }
            });
        } else {
            post(route('admin.grammar-banks.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setFormModalOpen(false);
                    reset();
                }
            });
        }
    };

    const confirmDelete = (item) => {
        openConfirm({
            variant: 'danger',
            title: `Hapus pola ${item.pattern}?`,
            message: 'Pola ini akan dihapus dari Bank Grammar. Kuis yang sudah ditugaskan ke modul tidak akan terhapus otomatis.',
            confirmLabel: 'Hapus Pola',
            onConfirm: () => {
                router.delete(route('admin.grammar-banks.destroy', item.id), { preserveScroll: true });
            }
        });
    };

    const handleAssignToDay = async (e) => {
        e.preventDefault();
        if (!selectedDayId || !assignTarget) return;

        setAssigning(true);
        setAssignError('');
        setAssignSuccess('');

        try {
            const res = await window.axios.post(route('admin.grammar-banks.assign-day', assignTarget.id), {
                module_day_id: selectedDayId,
            });
            setAssignSuccess(res.data.message || 'Pola grammar berhasil ditugaskan!');
            setTimeout(() => {
                setAssignModalOpen(false);
                setAssignSuccess('');
                setSelectedDayId('');
                setDaySearch('');
            }, 1200);
        } catch (err) {
            setAssignError(err.response?.data?.message || 'Gagal menugaskan ke Hari Modul.');
        } finally {
            setAssigning(false);
        }
    };

    const availableLevels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

    return (
        <AuthenticatedLayout>
            <Head title="Pusat Bank Konten & Soal" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* Unified Sub-Navbar across all 3 Banks */}
                <BankSoalNavbar
                    activeTab="grammar"
                    stats={stats}
                    action={
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-brand-700 active:translate-y-0.5"
                        >
                            <AddIcon sx={{ fontSize: 17 }} />
                            Tambah Pola Grammar
                        </button>
                    }
                />

                {/* Hero Header Section */}
                <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-emerald-50/70 via-white to-brand-50/40 p-6 sm:p-7 shadow-xs dark:border-brand-900/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-3 py-1 text-xs font-black text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                                    <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                                    Pusat Repositori Master Kurikulum
                                </span>
                            </div>
                            <h1 className="mt-2.5 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                                Pusat Bank Konten & Soal
                            </h1>
                            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                                Repositori terpusat untuk memelihara master pola tata bahasa (grammar), perbendaharaan kosakata & kanji, serta paket bank soal ujian evaluasi CBT.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3 Domain Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Card 1: Bank Grammar */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                <AutoStoriesIcon sx={{ fontSize: 16 }} />
                                Bank Pola Grammar
                            </span>
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                Tab Aktif
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-black tabular-nums text-emerald-950 dark:text-white">
                            {stats.total_grammar ?? 0}
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-700/80 dark:text-emerald-400/80">
                            Pola tata bahasa siap ditugaskan ke modul
                        </p>
                    </div>

                    {/* Card 2: Bank Kosakata & Kanji */}
                    <Link
                        href={route('admin.vocabulary.index')}
                        className="group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/20 dark:via-gray-900 dark:to-gray-900"
                    >
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                <LibraryBooksIcon sx={{ fontSize: 16 }} />
                                Bank Kosakata & Kanji
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/80 text-amber-700 transition group-hover:translate-x-0.5 dark:bg-amber-950/60 dark:text-amber-400">
                                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-black tabular-nums text-gray-900 dark:text-white">
                            {stats.total_vocabulary ?? 0}
                        </p>
                        <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:underline">
                            Buka Bank Kosakata & Kanji &rarr;
                        </p>
                    </Link>

                    {/* Card 3: Bank Soal Ujian (CBT) */}
                    <Link
                        href={route('admin.exams.question-banks.index')}
                        className="group relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/50 via-white to-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-sky-900/40 dark:from-sky-950/20 dark:via-gray-900 dark:to-gray-900"
                    >
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300">
                                <FactCheckOutlinedIcon sx={{ fontSize: 16 }} />
                                Bank Soal Ujian (CBT)
                            </span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100/80 text-sky-700 transition group-hover:translate-x-0.5 dark:bg-sky-950/60 dark:text-sky-400">
                                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                            </span>
                        </div>
                        <p className="mt-3 text-3xl font-black tabular-nums text-gray-900 dark:text-white">
                            {stats.total_exam_banks ?? 0}
                        </p>
                        <p className="mt-1 text-xs font-bold text-sky-700 dark:text-sky-400 group-hover:underline">
                            Buka Bank Soal Ujian CBT &rarr;
                        </p>
                    </Link>
                </div>

                {/* Filter & Search Bar */}
                <div className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange(selectedLevel, e.target.value);
                                }}
                                placeholder="Cari pola, rumus, arti..."
                                className={`${inputClass} pl-10 pr-9`}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Hapus pencarian"
                                >
                                    <ClearRoundedIcon sx={{ fontSize: 18 }} />
                                </button>
                            )}
                        </div>

                        {/* JLPT Level Pills & Status Filter */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 rounded-xl bg-gray-100/90 p-1 dark:bg-gray-800">
                                {availableLevels.map((lvl) => {
                                    const isCurrent = selectedLevel === lvl;
                                    return (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => {
                                                setSelectedLevel(lvl);
                                                handleFilterChange(lvl, search);
                                            }}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                                isCurrent
                                                    ? 'bg-white text-gray-950 shadow-xs dark:bg-gray-900 dark:text-white'
                                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            {lvl === 'all' ? 'Semua' : lvl}
                                        </button>
                                    );
                                })}
                            </div>

                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    handleFilterChange(selectedLevel, search, e.target.value);
                                }}
                                className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none transition focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                            >
                                <option value="all">Semua Status</option>
                                <option value="published">Terbit</option>
                                <option value="draft">Draf</option>
                            </select>
                        </div>
                    </div>

                    {/* Result count indicator */}
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <span>
                            Total: <strong>{grammarItems?.total ?? (grammarItems?.data?.length || 0)}</strong> pola tata bahasa
                        </span>
                        {(selectedLevel !== 'all' || search || selectedStatus !== 'all') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedLevel('all');
                                    setSelectedStatus('all');
                                    clearSearch();
                                }}
                                className="font-bold text-brand-600 hover:underline dark:text-brand-400"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Grammar Patterns Table */}
                <div className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-5 py-4">Level</th>
                                    <th className="px-5 py-4">Pola & Judul</th>
                                    <th className="px-5 py-4">Rumus Formulasi</th>
                                    <th className="px-5 py-4">Arti Indonesia</th>
                                    <th className="px-5 py-4 text-center">Contoh</th>
                                    <th className="px-5 py-4 text-center">Terpasang di Kuis</th>
                                    <th className="px-5 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {(grammarItems?.data || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-16 text-center">
                                            <div className="mx-auto max-w-sm">
                                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                                                    <AutoStoriesIcon sx={{ fontSize: 24 }} />
                                                </span>
                                                <p className="mt-3 font-black text-gray-900 dark:text-white">
                                                    Belum ada pola grammar yang sesuai
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    Coba ubah kata kunci pencarian atau klik tombol di bawah untuk menambah pola baru.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={openCreateModal}
                                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white hover:bg-brand-700"
                                                >
                                                    <AddIcon sx={{ fontSize: 16 }} /> Tambah Pola Pertama
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    grammarItems.data.map((item) => (
                                        <tr key={item.id} className="transition hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black ring-1 ring-inset ${
                                                    levelBadgeStyles[item.jlpt_level] || levelBadgeStyles.N3
                                                }`}>
                                                    {item.jlpt_level || 'N3'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="min-w-40">
                                                    <p lang="ja" className="text-base font-black text-gray-950 dark:text-white">
                                                        {item.pattern}
                                                    </p>
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        {item.title}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-block rounded-lg border border-violet-100 bg-violet-50/80 px-2.5 py-1 font-mono text-xs font-bold text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300">
                                                    {item.formula}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="line-clamp-2 max-w-xs text-xs font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                                                    {item.meaning}
                                                </p>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-center">
                                                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {Array.isArray(item.examples) ? item.examples.length : 0} contoh
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-center">
                                                <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-black text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                                                    {item.lessons_count ?? 0} Day
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        title="Tugaskan ke Hari Modul"
                                                        onClick={() => {
                                                            setAssignTarget(item);
                                                            setSelectedDayId('');
                                                            setDaySearch('');
                                                            setAssignError('');
                                                            setAssignSuccess('');
                                                            setAssignModalOpen(true);
                                                        }}
                                                        className="flex h-8 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-xs font-black text-brand-700 transition hover:bg-brand-100 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-300"
                                                    >
                                                        <SendIcon sx={{ fontSize: 13 }} />
                                                        Tugaskan
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Edit Pola"
                                                        onClick={() => openEditModal(item)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                                                    >
                                                        <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Hapus Pola"
                                                        onClick={() => confirmDelete(item)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    >
                                                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {grammarItems?.links && grammarItems.links.length > 3 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Menampilkan {grammarItems.from ?? 0}–{grammarItems.to ?? 0} dari {grammarItems.total ?? 0} pola
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                {grammarItems.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition ${
                                            link.active
                                                ? 'bg-brand-600 text-white font-black'
                                                : !link.url
                                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL FORM TAMBAH / EDIT POLA GRAMMAR */}
            {formModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-gray-950/60 p-4 backdrop-blur-xs">
                    <div className="my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                    {editingPattern ? 'Perbarui Pola' : 'Pola Baru'}
                                </p>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                    {editingPattern ? `Edit Pola: ${editingPattern.pattern}` : 'Tambah ke Bank Grammar'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormModalOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <CloseIcon sx={{ fontSize: 19 }} />
                            </button>
                        </div>

                        <form onSubmit={submitForm} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Level JLPT</label>
                                    <select
                                        value={formData.jlpt_level}
                                        onChange={(e) => setFormData('jlpt_level', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="N5">N5</option>
                                        <option value="N4">N4</option>
                                        <option value="N3">N3</option>
                                        <option value="N2">N2</option>
                                        <option value="N1">N1</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Pola Grammar *</label>
                                    <input
                                        type="text"
                                        value={formData.pattern}
                                        onChange={(e) => setFormData('pattern', e.target.value)}
                                        placeholder="Contoh: ～ば～ほど"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Judul Singkat *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData('title', e.target.value)}
                                        placeholder="Contoh: Semakin..., semakin..."
                                        required
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Rumus Pembentukan *</label>
                                    <input
                                        type="text"
                                        value={formData.formula}
                                        onChange={(e) => setFormData('formula', e.target.value)}
                                        placeholder="Contoh: Vば + V辞書形 + ほど"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Arti Lengkap (Indonesia) *</label>
                                <textarea
                                    value={formData.meaning}
                                    onChange={(e) => setFormData('meaning', e.target.value)}
                                    placeholder="Jelaskan makna pola ini..."
                                    required
                                    rows={2}
                                    className={`${inputClass} resize-y`}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-black text-gray-700 dark:text-gray-300">Penjelasan Kaidah (Opsional)</label>
                                <textarea
                                    value={formData.explanation}
                                    onChange={(e) => setFormData('explanation', e.target.value)}
                                    placeholder="Catatan gramatikal atau situasi penggunaan..."
                                    rows={2}
                                    className={`${inputClass} resize-y`}
                                />
                            </div>

                            {/* Contoh Kalimat */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-900 dark:text-white">Daftar Kalimat Contoh</span>
                                    <button
                                        type="button"
                                        onClick={addExampleRow}
                                        className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-black text-brand-700 hover:bg-brand-50 dark:border-brand-900 dark:text-brand-300"
                                    >
                                        <AddIcon sx={{ fontSize: 15 }} /> Tambah Contoh
                                    </button>
                                </div>

                                {formData.examples.map((ex, idx) => (
                                    <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50/75 p-3.5 dark:border-gray-800 dark:bg-gray-950/40">
                                        <div className="mb-2 flex items-center justify-between text-[11px] font-black text-gray-400">
                                            <span>Contoh {idx + 1}</span>
                                            {formData.examples.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeExampleRow(idx)}
                                                    className="text-rose-500 hover:underline"
                                                >
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={ex.japanese}
                                                onChange={(e) => handleExampleChange(idx, 'japanese', e.target.value)}
                                                placeholder="Kalimat Jepang (e.g. 勉強すればするほど、上手になります。)"
                                                required
                                                className={inputClass}
                                            />
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <input
                                                    type="text"
                                                    value={ex.reading}
                                                    onChange={(e) => handleExampleChange(idx, 'reading', e.target.value)}
                                                    placeholder="Cara baca (furigana/hiragana)"
                                                    className={inputClass}
                                                />
                                                <input
                                                    type="text"
                                                    value={ex.translation}
                                                    onChange={(e) => handleExampleChange(idx, 'translation', e.target.value)}
                                                    placeholder="Arti terjemahan Indonesia"
                                                    required
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setFormModalOpen(false)}
                                    className="min-h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="min-h-10 rounded-xl bg-brand-600 px-5 text-xs font-black text-white shadow-[0_3px_0_#15803d] hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : (editingPattern ? 'Simpan Perubahan' : 'Simpan ke Bank')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TUGASKAN KE MODUL DAY */}
            {assignModalOpen && assignTarget && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-gray-950/60 p-4 backdrop-blur-xs">
                    <div className="my-8 flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">Tugaskan ke Modul</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                                        {assignTarget.pattern}
                                    </h3>
                                    {assignTarget.title && (
                                        <span className="text-xs font-bold text-gray-500">
                                            &bull; {assignTarget.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setAssignModalOpen(false);
                                    setSelectedDayId('');
                                    setDaySearch('');
                                    setAssignError('');
                                    setAssignSuccess('');
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignToDay} className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                            <div className="mb-3">
                                <label className="mb-1.5 block text-xs font-black text-gray-700 dark:text-gray-300">
                                    Pilih Hari Modul Tujuan
                                </label>
                                <div className="relative">
                                    <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                                    <input
                                        type="text"
                                        value={daySearch}
                                        onChange={(e) => setDaySearch(e.target.value)}
                                        placeholder="Cari kelas, minggu, atau nomor hari..."
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-8 text-xs font-bold text-gray-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30"
                                    />
                                    {daySearch && (
                                        <button
                                            type="button"
                                            onClick={() => setDaySearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            <ClearRoundedIcon sx={{ fontSize: 15 }} />
                                        </button>
                                    )}
                                </div>
                                <span className="mt-1 block text-[11px] text-gray-400">
                                    Pilih hari modul yang akan dibuatkan kuis grammar otomatis dari pola ini.
                                </span>
                            </div>

                            <div className="min-h-44 max-h-60 flex-1 space-y-2 overflow-y-auto pr-1">
                                {filteredDays.length === 0 ? (
                                    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-4 text-center dark:border-gray-800">
                                        <FactCheckOutlinedIcon className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 32 }} />
                                        <p className="mt-2 text-xs font-bold text-gray-500">
                                            {moduleDays.length === 0 ? 'Belum ada hari modul terdaftar.' : `Tidak ditemukan hari modul yang cocok dengan "${daySearch}".`}
                                        </p>
                                    </div>
                                ) : (
                                    filteredDays.map((d) => {
                                        const isSelected = String(selectedDayId) === String(d.id);
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() => setSelectedDayId(d.id)}
                                                className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                                                    isSelected
                                                        ? 'border-brand-500 bg-brand-50/70 shadow-xs dark:border-brand-500 dark:bg-brand-950/40'
                                                        : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50/80 dark:border-gray-800 dark:bg-gray-950/60 dark:hover:border-gray-700'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-black text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            {d.program_title || 'Kelas'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                            Minggu {d.week_number}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 truncate text-xs font-black text-gray-900 dark:text-white">
                                                        Hari {d.day_number}{d.title ? `: ${d.title}` : ''}
                                                    </p>
                                                </div>
                                                <div className="shrink-0">
                                                    {isSelected ? (
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                                                            <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
                                                        </div>
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 group-hover:border-brand-400 dark:border-gray-600" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {selectedDay && (
                                <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/60 p-2.5 text-xs font-bold text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-200">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
                                        Lokasi Ditugaskan:
                                    </span>
                                    <div className="mt-0.5 truncate">
                                        {selectedDay.program_title} &bull; Minggu {selectedDay.week_number} &bull; Hari {selectedDay.day_number}
                                        {selectedDay.title ? ` (${selectedDay.title})` : ''}
                                    </div>
                                </div>
                            )}

                            {assignError && (
                                <p className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                    {assignError}
                                </p>
                            )}

                            {assignSuccess && (
                                <p className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    {assignSuccess}
                                </p>
                            )}

                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignModalOpen(false);
                                        setSelectedDayId('');
                                        setDaySearch('');
                                        setAssignError('');
                                        setAssignSuccess('');
                                    }}
                                    className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedDayId || assigning}
                                    className="h-10 rounded-xl bg-brand-600 px-5 text-xs font-black text-white shadow-[0_3px_0_#15803d] hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {assigning ? 'Menugaskan...' : 'Tugaskan Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
