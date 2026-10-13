import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import theme from '@/Components/theme/themes';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExploreIcon from '@mui/icons-material/Explore';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchoolIcon from '@mui/icons-material/School';

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

    return {
        key: 'active',
        label: 'Kelas aktif',
        icon: CheckCircleIcon,
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300',
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

function OwnedCourseCard({ item }) {
    const meta = accessMeta(item);
    const MetaIcon = meta.icon;

    return (
        <article className="relative grid gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center">
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-4 hidden text-7xl font-black leading-none text-rose-900/[0.04] dark:text-white/[0.03] sm:block">学</span>
            <div className="relative z-10"><CourseThumbnail item={item} compact /></div>
            <div className="relative z-10 min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                        <MetaIcon sx={{ fontSize: 14 }} />
                        {meta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.type || item.level || 'Kelas'}</span>
                    {item.access_mode_label && (
                        <span className="text-xs text-slate-400 dark:text-gray-500">• {item.access_mode_label}</span>
                    )}
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

export default function KelasPage({ programs = [] }) {
    const ownedCourses = useMemo(
        () => programs.filter((item) => item.has_class_access || item.waiting_for_approval || item.refund_required),
        [programs],
    );

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

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Kelas Saya - TOKU-UP" />

            <main className="relative min-h-screen overflow-hidden bg-slate-50 pb-14 text-slate-900 dark:bg-gray-950 dark:text-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(245,158,11,0.12)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.08)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(190,24,93,0.035)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(190,24,93,0.028)_0_1px,transparent_1px_74px)] dark:bg-[linear-gradient(140deg,rgba(245,158,11,0.09)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.1)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(255,255,255,0.024)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0_1px,transparent_1px_74px)]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute left-8 top-56 hidden text-[11rem] font-black leading-none text-amber-900/[0.045] dark:text-white/[0.03] xl:block">学</span>
                <span aria-hidden="true" className="pointer-events-none absolute right-8 top-[660px] hidden text-[11rem] font-black leading-none text-rose-900/[0.04] dark:text-white/[0.03] xl:block">習</span>

                <section className="relative z-10 border-b border-slate-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">Pusat Belajar Siswa</p>
                                <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl dark:text-white">Kelas Saya</h1>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
                                    {ownedCourses.length > 0
                                        ? `Kelola dan lanjutkan progres dari ${ownedCourses.length} kelas aktif di akun Anda.`
                                        : 'Ruang belajar pribadi Anda untuk mengikuti roadmap dan materi terstruktur.'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {primaryCourse && (
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                                        <div className="min-w-0 max-w-[200px]">
                                            <p className="truncate text-xs font-black text-slate-900 dark:text-white">{primaryCourse.title}</p>
                                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{clampProgress(primaryCourse.progress)}% selesai</p>
                                        </div>
                                        <Link
                                            href={primaryCourse.href}
                                            className={`inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-3 text-xs font-black text-white shadow-sm transition hover:brightness-95`}
                                        >
                                            Lanjut
                                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                                        </Link>
                                    </div>
                                )}

                                <Link
                                    href={route('katalog')}
                                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.ctaBg} px-5 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600`}
                                >
                                    <ExploreIcon sx={{ fontSize: 18 }} />
                                    + Cari Kelas Baru
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <section aria-labelledby="kelas-saya-title">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 id="kelas-saya-title" className="text-xl font-black text-slate-950 dark:text-white">Program Pembelajaran Terdaftar</h2>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Pilih program untuk membuka bab harian dan evaluasi kuis.</p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{ownedCourses.length} kelas</span>
                        </div>

                        {ownedCourses.length > 0 ? (
                            <div className="space-y-4">
                                {activeCourses.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                                {waitingCourses.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                    <SchoolIcon sx={{ fontSize: 32 }} />
                                </div>
                                <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Belum Ada Kelas Terdaftar</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-gray-400">
                                    Mulai langkah belajar bahasa Jepang Anda dengan memilih kelas mandiri fleksibel atau bimbingan mentor intensif di katalog.
                                </p>
                                <Link
                                    href={route('katalog')}
                                    className={`mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.ctaBg} px-6 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600`}
                                >
                                    <ExploreIcon sx={{ fontSize: 18 }} />
                                    Buka Katalog Program
                                </Link>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}
