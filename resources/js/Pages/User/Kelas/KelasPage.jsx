import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import theme from '@/Components/theme/themes';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';

const catalogFilters = [
    { value: 'all', label: 'Semua kelas' },
    { value: 'locked', label: 'Buka akses' },
    { value: 'preview', label: 'Preview' },
];

const clampProgress = (value) => Math.max(0, Math.min(100, Number(value ?? 0)));

const accessMeta = (item) => {
    if (item.refund_required) {
        return {
            key: 'waiting',
            label: 'Refund sedang diproses',
            icon: HourglassTopIcon,
            className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300',
        };
    }

    if (item.waiting_for_approval) {
        return {
            key: 'waiting',
            label: 'Menunggu persetujuan mentor',
            icon: HourglassTopIcon,
            className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
        };
    }

    if (item.waiting_for_kloter) {
        return {
            key: 'waiting',
            label: 'Menunggu kloter',
            icon: HourglassTopIcon,
            className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300',
        };
    }

    if (item.has_class_access) {
        return {
            key: 'active',
            label: 'Kelas aktif',
            icon: CheckCircleIcon,
            className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300',
        };
    }

    if (item.payment_plan) {
        return {
            key: 'locked',
            label: 'Perlu akses',
            icon: LockIcon,
            className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300',
        };
    }

    return {
        key: 'preview',
        label: 'Preview tersedia',
        icon: PlayArrowIcon,
        className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
    };
};

function CourseThumbnail({ item, eager = false, compact = false }) {
    const [imageFailed, setImageFailed] = useState(false);
    const thumbnailUrl = item.thumbnail_url && !imageFailed ? item.thumbnail_url : null;

    return (
        <div className={`relative overflow-hidden bg-slate-100 dark:bg-gray-800 ${compact ? 'aspect-[4/3] rounded-xl' : 'aspect-[16/9]'}`}>
            {thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading={eager ? 'eager' : 'lazy'}
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${theme.ctaBg} text-white`}>
                    <SchoolIcon sx={{ fontSize: compact ? 28 : 42 }} />
                </div>
            )}
        </div>
    );
}

function ProgressBar({ value }) {
    const progress = clampProgress(value);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-gray-400">
                <span>Progres kelas</span>
                <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: theme.doneColor }} />
            </div>
        </div>
    );
}

function CourseFacts({ item, showProgress = false }) {
    return (
        <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
            {item.instructor_name && (
                <p className="flex items-center gap-2">
                    <GroupsIcon sx={{ fontSize: 17 }} className="text-slate-400" />
                    <span className="truncate">{item.instructor_name}</span>
                </p>
            )}
            <p className="flex items-center gap-2">
                <MenuBookIcon sx={{ fontSize: 17 }} className="text-slate-400" />
                <span>{item.lessons ?? 0} pelajaran</span>
                {showProgress && <span className="text-slate-400">- {item.completed_lessons ?? 0} selesai</span>}
            </p>
        </div>
    );
}

function ResourceSummary({ item }) {
    const resources = [
        ['PPT', item.resource_summary?.presentations],
        ['Kosakata', item.resource_summary?.vocabulary],
        ['Flashcard', item.resource_summary?.flashcards],
        ['Kuis', item.resource_summary?.quizzes],
    ].filter(([, count]) => Number(count) > 0);

    if (resources.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {resources.map(([label, count]) => (
                <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                    {count} {label}
                </span>
            ))}
        </div>
    );
}

function OwnedCourseCard({ item }) {
    const meta = accessMeta(item);
    const MetaIcon = meta.icon;

    return (
        <article className="relative grid gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(244,63,94,0.05)_0%,transparent_38%),repeating-linear-gradient(90deg,rgba(190,24,93,0.045)_0_1px,transparent_1px_58px),repeating-linear-gradient(0deg,rgba(190,24,93,0.035)_0_1px,transparent_1px_58px)] dark:bg-[linear-gradient(135deg,rgba(244,63,94,0.1)_0%,transparent_38%),repeating-linear-gradient(90deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_58px),repeating-linear-gradient(0deg,rgba(255,255,255,0.02)_0_1px,transparent_1px_58px)]"
            />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-4 hidden text-7xl font-black leading-none text-rose-900/[0.055] dark:text-white/[0.035] sm:block">学</span>
            <div className="relative z-10"><CourseThumbnail item={item} compact /></div>
            <div className="relative z-10 min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                        <MetaIcon sx={{ fontSize: 14 }} />
                        {meta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.type || item.level || 'Kelas'}</span>
                </div>
                <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
                {item.refund_required ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">
                        Pendaftaran mentor ditolak. Tim TOKU-UP sedang menindaklanjuti refund pembayaran.
                    </p>
                ) : item.waiting_for_approval ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">
                        Pembayaran berhasil. Kamu dapat membuka roadmap setelah mentor menyetujui pendaftaran.
                    </p>
                ) : (
                    <div className="mt-3 max-w-md">
                        <ProgressBar value={item.progress} />
                    </div>
                )}
                {item.kloter && (
                    <p className="mt-3 text-xs font-bold text-slate-500 dark:text-gray-400">
                        {item.kloter.nama} - Minggu {item.kloter.minggu_aktif || 0}
                    </p>
                )}
            </div>
            {!item.waiting_for_approval && !item.refund_required && (
                <Link
                    href={item.href}
                    className={`relative z-10 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-4 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600`}
                >
                    Lanjutkan
                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                </Link>
            )}
        </article>
    );
}

function CatalogCourseCard({ item, index }) {
    const meta = accessMeta(item);
    const MetaIcon = meta.icon;

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
            <CourseThumbnail item={item} eager={index === 0} />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                        <MetaIcon sx={{ fontSize: 14 }} />
                        {meta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.type || item.level || 'Kelas'}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                        {item.access_mode_label}
                    </span>
                    {!item.has_class_access && !item.waiting_for_approval && !item.refund_required && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                            Preview Week 1 Gratis
                        </span>
                    )}
                </div>
                <h2 className="mt-4 text-xl font-black leading-snug text-slate-950 dark:text-white">{item.title}</h2>
                {item.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-gray-400">{item.description}</p>}

                <div className="mt-4">
                    <CourseFacts item={item} />
                </div>
                <div className="mt-4">
                    <ResourceSummary item={item} />
                </div>

                <div className="mt-auto pt-5">
                    {item.payment_plan && (
                        <div className="mb-4 border-t border-slate-100 pt-4 dark:border-gray-800">
                            <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Mulai dari</p>
                            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{item.payment_plan.price_formatted}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                {Number(item.payment_plan.duration_days) > 0
                                    ? `Akses ${item.payment_plan.duration_days} hari`
                                    : 'Masa akses mengikuti paket'}
                            </p>
                        </div>
                    )}
                    <Link
                        href={item.href}
                        className={`flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-4 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600`}
                    >
                        Lihat Kelas
                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default function KelasPage({ programs = [] }) {
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('all');

    const ownedCourses = useMemo(
        () => programs.filter((item) => item.has_class_access || item.waiting_for_approval || item.refund_required),
        [programs],
    );
    const [mobileSection, setMobileSection] = useState(ownedCourses.length > 0 ? 'owned' : 'catalog');
    const activeCourses = useMemo(
        () => ownedCourses.filter((item) => !item.waiting_for_approval && !item.refund_required),
        [ownedCourses],
    );
    const waitingCourses = useMemo(
        () => ownedCourses.filter((item) => item.waiting_for_approval || item.refund_required),
        [ownedCourses],
    );
    const primaryCourse = useMemo(
        () => [...activeCourses].sort((left, right) => clampProgress(right.progress) - clampProgress(left.progress))[0] ?? null,
        [activeCourses],
    );
    const catalogCourses = useMemo(
        () => programs.filter((item) => !item.has_class_access && !item.waiting_for_approval && !item.refund_required),
        [programs],
    );
    const filteredCatalog = useMemo(() => {
        const normalized = keyword.trim().toLowerCase();

        return catalogCourses.filter((item) => {
            const title = (item.title ?? '').toLowerCase();
            const instructor = (item.instructor_name ?? '').toLowerCase();
            const matchesKeyword = !normalized || title.includes(normalized) || instructor.includes(normalized);
            const matchesStatus = status === 'all' || accessMeta(item).key === status;

            return matchesKeyword && matchesStatus;
        });
    }, [catalogCourses, keyword, status]);

    const resetCatalog = () => {
        setKeyword('');
        setStatus('all');
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Kelas - TOKU-UP" />

            <main className="relative min-h-screen overflow-hidden bg-slate-50 pb-14 text-slate-900 dark:bg-gray-950 dark:text-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(245,158,11,0.12)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.08)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(190,24,93,0.035)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(190,24,93,0.028)_0_1px,transparent_1px_74px)] dark:bg-[linear-gradient(140deg,rgba(245,158,11,0.09)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.1)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(255,255,255,0.024)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0_1px,transparent_1px_74px)]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute left-8 top-56 hidden text-[11rem] font-black leading-none text-amber-900/[0.045] dark:text-white/[0.03] xl:block">学</span>
                <span aria-hidden="true" className="pointer-events-none absolute right-8 top-[660px] hidden text-[11rem] font-black leading-none text-rose-900/[0.04] dark:text-white/[0.03] xl:block">習</span>
                <section className="relative z-10 border-b border-slate-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                        {primaryCourse ? (
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Lanjutkan belajar</p>
                                    <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl dark:text-white">{primaryCourse.title}</h1>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-300">
                                        {primaryCourse.kloter ? `${primaryCourse.kloter.nama}, minggu ${primaryCourse.kloter.minggu_aktif || 0}. ` : ''}
                                        {primaryCourse.completed_lessons ?? 0} dari {primaryCourse.lessons ?? 0} pelajaran telah selesai.
                                    </p>
                                    <div className="mt-5 max-w-xl"><ProgressBar value={primaryCourse.progress} /></div>
                                </div>
                                <Link
                                    href={primaryCourse.href}
                                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-5 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600`}
                                >
                                    Lanjutkan belajar
                                    <PlayArrowIcon sx={{ fontSize: 19 }} />
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Kelas TOKU-UP</p>
                                    <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl dark:text-white">Temukan kelas yang sesuai dengan tujuan belajarmu</h1>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-300">Bandingkan materi, durasi akses, dan pilih kelas untuk mulai mengikuti roadmap belajar.</p>
                                </div>
                                <a href="#jelajahi-kelas" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Jelajahi kelas</a>
                            </div>
                        )}
                    </div>
                </section>

                <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 rounded-lg bg-slate-200/80 p-1 dark:bg-gray-900 lg:hidden" role="tablist" aria-label="Tampilan kelas">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mobileSection === 'owned'}
                            onClick={() => setMobileSection('owned')}
                            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${mobileSection === 'owned' ? 'bg-white text-slate-950 shadow-sm dark:bg-gray-800 dark:text-white' : 'text-slate-600 dark:text-gray-300'}`}
                        >
                            Kelas Saya{ownedCourses.length > 0 ? ` (${ownedCourses.length})` : ''}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mobileSection === 'catalog'}
                            onClick={() => setMobileSection('catalog')}
                            className={`min-h-11 rounded-md px-3 text-sm font-black transition-colors ${mobileSection === 'catalog' ? 'bg-white text-slate-950 shadow-sm dark:bg-gray-800 dark:text-white' : 'text-slate-600 dark:text-gray-300'}`}
                        >
                            Jelajahi{catalogCourses.length > 0 ? ` (${catalogCourses.length})` : ''}
                        </button>
                    </div>

                    <section
                        aria-labelledby="kelas-saya-title"
                        className={`${mobileSection === 'owned' ? 'block' : 'hidden'} ${ownedCourses.length > 0 ? 'lg:block' : 'lg:hidden'}`}
                    >
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Pembelajaran saya</p>
                                    <h2 id="kelas-saya-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Kelas Saya</h2>
                                </div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{ownedCourses.length} kelas di akun Anda</p>
                            </div>
                            <div className="space-y-4">
                                {activeCourses.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                                {waitingCourses.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                                {ownedCourses.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
                                        <SchoolIcon sx={{ fontSize: 34 }} className="text-rose-500" />
                                        <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">Belum ada kelas di akunmu</h3>
                                        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-600 dark:text-gray-300">Pilih kelas yang sesuai untuk mulai mengikuti roadmap belajar.</p>
                                        <button type="button" onClick={() => setMobileSection('catalog')} className="mt-4 min-h-10 rounded-lg bg-rose-600 px-4 text-sm font-black text-white">Jelajahi kelas</button>
                                    </div>
                                )}
                            </div>
                    </section>

                    <section id="jelajahi-kelas" aria-labelledby="jelajahi-kelas-title" className={`${mobileSection === 'catalog' ? 'block' : 'hidden'} lg:block`}>
                        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Katalog kelas</p>
                                <h2 id="jelajahi-kelas-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Jelajahi Kelas</h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">Pilih kelas, lihat materi yang tersedia, lalu buka akses saat siap belajar.</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{filteredCatalog.length} dari {catalogCourses.length} kelas tampil</p>
                        </div>

                        {catalogCourses.length > 0 && (
                            <div className="mt-5 border-b border-slate-200 pb-5 dark:border-gray-800">
                                <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-rose-500 dark:focus-within:ring-rose-950">
                                    <SearchIcon sx={{ fontSize: 19 }} className="text-slate-400" />
                                    <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-gray-200" placeholder="Cari kelas atau pengajar" />
                                </label>
                                <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filter katalog kelas">
                                    {catalogFilters.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={status === option.value}
                                            onClick={() => setStatus(option.value)}
                                            className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${status === option.value ? `bg-gradient-to-r ${theme.ctaBg} text-white shadow-sm` : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {(keyword || status !== 'all') && (
                                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-gray-400">
                                        <span>Filter aktif{keyword ? `: “${keyword}”` : ''}</span>
                                        <button type="button" onClick={resetCatalog} className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:text-rose-300 dark:hover:text-rose-200"><RestartAltIcon sx={{ fontSize: 17 }} />Reset</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {filteredCatalog.length > 0 ? (
                            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredCatalog.map((item, index) => <CatalogCourseCard key={item.id} item={item} index={index} />)}
                            </div>
                        ) : (
                            <div className="mt-6 border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
                                <SearchIcon sx={{ fontSize: 34 }} className="mx-auto text-slate-400" />
                                <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{catalogCourses.length === 0 ? 'Semua kelas sudah ada di akun Anda' : 'Kelas tidak ditemukan'}</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-gray-400">{catalogCourses.length === 0 ? 'Lanjutkan kelas yang sudah aktif atau periksa status persetujuan kelas mentor Anda.' : 'Coba gunakan kata kunci atau filter yang berbeda.'}</p>
                                {catalogCourses.length > 0 && <button type="button" onClick={resetCatalog} className="mt-4 text-sm font-black text-rose-700 hover:text-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:text-rose-300">Reset pencarian</button>}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}
