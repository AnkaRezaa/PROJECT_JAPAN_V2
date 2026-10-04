import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CloseIcon from '@mui/icons-material/Close';

export default function DokkaiIndex({
    dokkais = [],
    levels = ['N5', 'N4', 'N3', 'N2', 'N1'],
    paywallAlert = null,
}) {
    const [selectedLevel, setSelectedLevel] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [paywallModal, setPaywallModal] = useState(paywallAlert);

    const safeDokkais = useMemo(() => {
        if (Array.isArray(dokkais)) return dokkais;
        if (dokkais && typeof dokkais === 'object') return Object.values(dokkais);
        return [];
    }, [dokkais]);

    const safeLevels = useMemo(() => {
        if (Array.isArray(levels)) return levels;
        if (levels && typeof levels === 'object') return Object.values(levels);
        return ['N5', 'N4', 'N3', 'N2', 'N1'];
    }, [levels]);

    const filteredDokkais = useMemo(() => {
        return safeDokkais.filter((item) => {
            const matchesLevel = selectedLevel === 'ALL' || item.jlpt_level === selectedLevel;
            const matchesSearch =
                !searchQuery ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sub_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.theme_category?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesLevel && matchesSearch;
        });
    }, [safeDokkais, selectedLevel, searchQuery]);

    return (
        <AuthenticatedLayout>
            <Head title="Katalog Dokkai - Pemahaman Membaca" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Back to Kelas Breadcrumb Navigation */}
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <Link
                        href="/user/kelas"
                        className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                        <span>Kelas</span>
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white font-bold">Koleksi Wacana Dokkai</span>
                </div>

                {/* Hero Banner Header */}
                <div className="rounded-3xl border border-gray-200/90 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-10 text-white shadow-sm dark:border-gray-800">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold mb-3">
                            <AutoStoriesIcon sx={{ fontSize: 16 }} />
                            <span>Reading Comprehension · 読解</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                            Koleksi Wacana Dokkai
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
                            Latih pemahaman teks bahasa Jepang dari tingkat pemula hingga mahir dengan furigana interaktif, kamus klik popover, dan bedah eviden jawaban.
                        </p>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Level Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 border border-gray-200/90 dark:border-gray-800 dark:bg-gray-900 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setSelectedLevel('ALL')}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                                selectedLevel === 'ALL'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            Semua Level
                        </button>
                        {safeLevels.map((lvl) => (
                            <button
                                key={lvl}
                                type="button"
                                onClick={() => setSelectedLevel(lvl)}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                                    selectedLevel === lvl
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <SearchIcon
                            sx={{ fontSize: 18 }}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari tema atau judul wacana..."
                            className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Grid of Wacana Cards */}
                {filteredDokkais.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredDokkais.map((dokkai) => (
                            <div
                                key={dokkai.id}
                                className="rounded-3xl border border-gray-200/90 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-1.5">
                                            <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                {dokkai.jlpt_level || 'N3'}
                                            </span>
                                            {dokkai.is_locked && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                                    <LockOutlinedIcon sx={{ fontSize: 12 }} />
                                                    <span>Premium</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <TimerOutlinedIcon sx={{ fontSize: 14 }} />
                                                <span>{dokkai.estimated_reading_time || 5} Min</span>
                                            </span>
                                            {dokkai.is_completed && (
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                                                    <span>Selesai ({dokkai.score}%)</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1">
                                        {dokkai.theme_category || 'Budaya & Bahasa'}
                                    </span>

                                    <h3 className="text-lg font-bold font-japanese text-gray-900 dark:text-white leading-snug mb-1.5">
                                        {dokkai.title}
                                    </h3>
                                    {dokkai.sub_title && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {dokkai.sub_title}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-xs font-black text-amber-500">
                                        +{dokkai.xp_reward || 80} XP
                                    </span>

                                    {dokkai.is_locked ? (
                                        <button
                                            type="button"
                                            onClick={() => setPaywallModal(dokkai)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                                        >
                                            <LockOutlinedIcon sx={{ fontSize: 14 }} />
                                            <span>Buka Akses</span>
                                        </button>
                                    ) : (
                                        <Link
                                            href={dokkai.start_url || `/user/dokkai/${dokkai.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 dark:bg-white dark:text-gray-900 dark:hover:bg-emerald-500 dark:hover:text-white transition"
                                        >
                                            <span>Mulai Baca</span>
                                            <ArrowForwardIcon sx={{ fontSize: 15 }} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                        <AutoStoriesIcon sx={{ fontSize: 40 }} className="mb-2 opacity-40" />
                        <p className="text-sm font-semibold">Tidak ada wacana yang sesuai dengan kriteria filter.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedLevel('ALL');
                                setSearchQuery('');
                            }}
                            className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                        >
                            Reset Filter
                        </button>
                    </div>
                )}
            </div>

            {/* SOFT PAYWALL MODAL */}
            {paywallModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                                <WorkspacePremiumIcon sx={{ fontSize: 28 }} />
                            </div>
                            <button
                                type="button"
                                onClick={() => setPaywallModal(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                    {paywallModal.jlpt_level || paywallModal.level || 'Premium'}
                                </span>
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Materi Dokkai Eksklusif
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                {paywallModal.title || 'Wacana Dokkai'}
                            </h3>
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                {paywallModal.lock_message || paywallModal.message || 'Wacana pemahaman membaca tingkat menengah dan lanjut ini tersedia eksklusif untuk siswa kelas terdaftar atau paket langganan aktif.'}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-950/40 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                <span>✨ Keuntungan Akses Lengkap:</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                                <li>Akses seluruh bank wacana JLPT N5 hingga N1</li>
                                <li>Narator audio berkecepatan 0.8x - 1.2x</li>
                                <li>Penjelasan teknik parafrasa & bedah eviden jawaban</li>
                                <li>Drill glosarium kartu flashcard interaktif</li>
                            </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                            <Link
                                href="/pricing"
                                className="w-full sm:flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 transition hover:from-amber-600 hover:to-orange-700"
                            >
                                Lihat Paket Belajar
                            </Link>
                            <button
                                type="button"
                                onClick={() => setPaywallModal(null)}
                                className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Nanti Dulu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
