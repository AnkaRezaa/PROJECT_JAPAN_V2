import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import theme from '@/Components/theme/themes';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExploreIcon from '@mui/icons-material/Explore';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import SchoolIcon from '@mui/icons-material/School';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';

const clampProgress = (value) => Math.max(0, Math.min(100, Number(value ?? 0)));

const accessMeta = (item) => {
    if (item.refund_required) {
        return {
            key: 'waiting',
            label: 'Refund sedang diproses',
            shortLabel: 'Refund diproses',
            icon: HourglassTopIcon,
            className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300',
        };
    }

    if (item.waiting_for_approval) {
        return {
            key: 'waiting',
            label: 'Menunggu persetujuan mentor',
            shortLabel: 'Menunggu mentor',
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

    if (!item.has_class_access) {
        return {
            key: 'trial',
            label: 'Trial Minggu 1',
            icon: PlayArrowIcon,
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
        <div className={`relative overflow-hidden bg-slate-100 dark:bg-gray-800 ${compact ? 'aspect-square rounded-lg sm:aspect-[4/3] sm:rounded-xl' : 'aspect-[16/9]'}`}>
            {thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt=""
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
        <div className="flex items-center gap-2 sm:block" role="progressbar" aria-label="Progres kelas" aria-valuenow={progress}>
            <div className="order-last flex items-center justify-between text-xs font-semibold tabular-nums text-slate-600 dark:text-gray-400 sm:order-none sm:mb-2 sm:font-bold">
                <span className="hidden sm:inline">Progres kelas</span>
                <span>{progress}%</span>
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800 sm:h-2">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: theme.doneColor }} />
            </div>
        </div>
    );
}

function OwnedCourseCard({ item }) {
    const meta = accessMeta(item);
    const MetaIcon = meta.icon;
    const isTrial = !item.has_class_access;
    const liveActionLabel = item.live_session?.is_live ? 'Masuk Kelas Live'
        : item.live_session?.is_today && item.live_session.time_formatted ? `Jadwal Kelas Live: ${item.live_session.time_formatted}` : 'Kelas Live';

    return (
        <article className="relative grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900 min-[380px]:grid-cols-[64px_minmax(0,1fr)] sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:rounded-xl sm:p-4 sm:shadow-sm">
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-4 hidden text-7xl font-black leading-none text-rose-900/[0.04] dark:text-white/[0.03] sm:block">学</span>
            <div className="relative z-10"><CourseThumbnail item={item} compact /></div>
            <div className="relative z-10 min-w-0">
                <div className="flex flex-col">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-950 [overflow-wrap:anywhere] dark:text-white sm:order-2 sm:truncate sm:text-lg sm:font-black">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:order-1 sm:mb-2 sm:mt-0">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:rounded-full sm:px-2.5 sm:py-1 sm:font-bold ${meta.className}`}>
                            <MetaIcon sx={{ fontSize: 14 }} className="hidden sm:inline-block" aria-hidden="true" />
                            <span className="sm:hidden">{meta.shortLabel || meta.label}</span>
                            <span className="hidden sm:inline">{meta.label}</span>
                        </span>
                        <span className="hidden text-xs font-bold text-slate-400 sm:inline">{item.type || item.level || 'Kelas'}</span>
                        {item.access_mode_label && (
                            <span className="text-xs text-slate-600 dark:text-gray-400 sm:text-slate-400 dark:sm:text-gray-500">
                                <span className="sm:hidden">{item.access_mode_label.replace(/^Kelas /, '')}</span>
                                <span className="hidden sm:inline">• {item.access_mode_label}</span>
                            </span>
                        )}
                    </div>
                </div>
                {item.refund_required ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-gray-400 sm:mt-2 sm:text-sm sm:leading-6">
                        <span className="sm:hidden">Pendaftaran ditolak.</span>
                        <span className="hidden sm:inline">Pendaftaran mentor ditolak. Tim TOKU-UP sedang menindaklanjuti refund pembayaran.</span>
                    </p>
                ) : item.waiting_for_approval ? (
                    <p className="mt-2 hidden text-sm leading-6 text-slate-500 dark:text-gray-400 sm:block">
                        Pembayaran berhasil. Kamu dapat membuka roadmap setelah mentor menyetujui pendaftaran.
                    </p>
                ) : (
                    <div className="mt-1.5 max-w-md sm:mt-3">
                        <ProgressBar value={item.progress} />
                    </div>
                )}
                {item.kloter && (
                    <p className="mt-1.5 text-xs font-medium text-slate-600 [overflow-wrap:anywhere] dark:text-gray-400 sm:mt-3 sm:font-bold">
                        {item.kloter.nama} - Minggu {item.kloter.minggu_aktif || 0}
                    </p>
                )}
                {(item.live_session?.is_live || item.live_session?.is_today) && (
                    <div className="mt-2.5 hidden items-center gap-2 sm:flex">
                        {item.live_session.is_live ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                Live Sekarang
                            </span>
                        ) : item.live_session.is_today ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                <AccessTimeIcon sx={{ fontSize: 13 }} />
                                Live Hari Ini: {item.live_session.time_formatted}
                            </span>
                        ) : null}
                    </div>
                )}
            </div>
            {!item.waiting_for_approval && !item.refund_required && (
                <div className="relative z-10 col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-slate-100 pt-1.5 dark:border-gray-800 sm:col-auto sm:flex-col sm:items-stretch sm:justify-center sm:gap-2 sm:border-0 sm:pt-0">
                    <Link
                        href={item.href}
                        className="mr-auto inline-flex min-h-11 max-w-full items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:brightness-90 fine-pointer:hover:brightness-95 sm:mr-0"
                    >
                        <span className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r ${theme.ctaBg} font-semibold text-white sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm sm:font-black sm:shadow-sm ${isTrial ? 'min-h-9 px-2.5 text-xs' : 'min-h-11 px-3 text-sm'}`}>
                            <span className="sm:hidden">{isTrial ? (item.progress > 0 ? 'Lanjut uji coba' : 'Mulai uji coba') : 'Lanjutkan'}</span>
                            <span className="hidden sm:inline">{isTrial ? (item.progress > 0 ? 'Lanjutkan Trial' : 'Mulai Trial Minggu 1') : 'Lanjutkan'}</span>
                            <PlayArrowIcon sx={{ fontSize: isTrial ? 16 : 18 }} aria-hidden="true" />
                        </span>
                    </Link>

                    {item.live_session && (
                        <Link
                            href={item.live_session.is_live && item.live_session.join_url ? item.live_session.join_url : route('user.live-classes.index')}
                            aria-label={liveActionLabel}
                            title={liveActionLabel}
                            className="inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-100 fine-pointer:hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200 dark:active:bg-gray-700 sm:flex-row sm:gap-1.5 sm:border-slate-300 sm:px-3 sm:shadow-sm"
                        >
                            <VideoCameraFrontIcon aria-hidden="true" sx={{ fontSize: 18 }} className={item.live_session.is_live ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'} />
                            {item.live_session.is_live && <span className="text-[10px] leading-none text-emerald-700 dark:text-emerald-300 sm:hidden">Live</span>}
                            <span className="hidden sm:inline">Kelas Live</span>
                        </Link>
                    )}
                    <Link href={route('user.kelas.reviews.index', item.slug)} aria-label={`Ulasan ${item.title}`} title="Ulasan kelas" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-100 fine-pointer:hover:text-emerald-700 dark:border-gray-700 dark:text-gray-200 dark:active:bg-gray-800 sm:border-0 sm:px-3">
                        <span className="sm:hidden"><RateReviewOutlinedIcon aria-hidden="true" sx={{ fontSize: 18 }} /></span>
                        <span className="hidden sm:inline">Ulasan <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 16 }} /></span>
                    </Link>
                </div>
            )}
        </article>
    );
}

export default function KelasPage({ programs = [], activeLiveToday = null }) {
    const enrolledCourses = useMemo(
        () => programs.filter((item) => item.has_class_access || item.waiting_for_approval || item.refund_required),
        [programs],
    );

    const trialCourses = useMemo(
        () => programs.filter((item) => !item.has_class_access && !item.waiting_for_approval && !item.refund_required),
        [programs],
    );

    const activeEnrolled = useMemo(
        () => enrolledCourses.filter((item) => !item.waiting_for_approval && !item.refund_required),
        [enrolledCourses],
    );

    const waitingEnrolled = useMemo(
        () => enrolledCourses.filter((item) => item.waiting_for_approval || item.refund_required),
        [enrolledCourses],
    );

    const primaryCourse = useMemo(() => {
        if (activeEnrolled.length > 0) {
            return [...activeEnrolled].sort((left, right) => clampProgress(right.progress) - clampProgress(left.progress))[0] ?? null;
        }
        return [...trialCourses].sort((left, right) => clampProgress(right.progress) - clampProgress(left.progress))[0] ?? null;
    }, [activeEnrolled, trialCourses]);

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Kelas Saya - TOKU-UP" />

            <div className="relative min-h-screen overflow-hidden bg-slate-50 pb-14 text-slate-900 dark:bg-gray-950 dark:text-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(140deg,rgba(245,158,11,0.12)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.08)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(190,24,93,0.035)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(190,24,93,0.028)_0_1px,transparent_1px_74px)] dark:bg-[linear-gradient(140deg,rgba(245,158,11,0.09)_0%,transparent_28%),linear-gradient(230deg,rgba(244,63,94,0.1)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(255,255,255,0.024)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0_1px,transparent_1px_74px)] sm:block"
                />
                <span aria-hidden="true" className="pointer-events-none absolute left-8 top-56 hidden text-[11rem] font-black leading-none text-amber-900/[0.045] dark:text-white/[0.03] xl:block">学</span>
                <span aria-hidden="true" className="pointer-events-none absolute right-8 top-[660px] hidden text-[11rem] font-black leading-none text-rose-900/[0.04] dark:text-white/[0.03] xl:block">習</span>

                <section className="relative z-10 border-b border-slate-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90">
                    <div className="mx-auto max-w-7xl px-3 py-3 min-[380px]:px-4 sm:px-6 sm:py-10 lg:px-8">
                        <div className="flex flex-col gap-2.5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300 sm:block">Pusat Belajar Siswa</p>
                                <h1 className="text-xl font-semibold leading-tight text-slate-950 dark:text-white sm:mt-2 sm:text-3xl sm:font-black">Kelas Saya</h1>
                                <p className="mt-2 hidden text-sm leading-6 text-slate-600 dark:text-gray-300 sm:block">
                                    {enrolledCourses.length > 0
                                        ? `Kelola dan lanjutkan progres dari ${enrolledCourses.length} kelas aktif di akun Anda.`
                                        : 'Ruang belajar pribadi Anda dengan akses uji coba gratis Week 1 untuk seluruh program.'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {primaryCourse && (
                                    <div className="flex min-w-0 basis-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 dark:border-gray-800 dark:bg-gray-800/60 sm:basis-auto sm:gap-3 sm:rounded-xl sm:p-3">
                                        <div className="min-w-0 sm:max-w-[200px]">
                                            <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 [overflow-wrap:anywhere] dark:text-white sm:truncate sm:font-black">{primaryCourse.title}</p>
                                            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300 sm:mt-0 sm:text-rose-600 dark:sm:text-rose-400">{clampProgress(primaryCourse.progress)}% selesai</p>
                                        </div>
                                        <Link
                                            href={primaryCourse.href}
                                            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-2.5 text-xs font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:brightness-90 fine-pointer:hover:brightness-95 sm:min-h-9 sm:px-3 sm:font-black sm:shadow-sm`}
                                        >
                                            Lanjut
                                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                                        </Link>
                                    </div>
                                )}

                                <Link
                                    href={route('user.live-classes.index')}
                                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-100 fine-pointer:hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:active:bg-gray-700 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm sm:font-bold sm:shadow-sm"
                                >
                                    <VideoCameraFrontIcon sx={{ fontSize: 18 }} className="text-brand-600 dark:text-brand-400" />
                                    <span className="sm:hidden">Jadwal Live</span>
                                    <span className="hidden sm:inline">Jadwal Kelas Live</span>
                                </Link>

                                <Link
                                    href={route('katalog')}
                                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-2.5 text-xs font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:brightness-90 fine-pointer:hover:brightness-95 sm:gap-2 sm:rounded-xl sm:px-5 sm:text-sm sm:font-black sm:shadow-sm`}
                                >
                                    <ExploreIcon sx={{ fontSize: 18 }} />
                                    <span className="sm:hidden">Cari Kelas</span>
                                    <span className="hidden sm:inline">+ Cari Kelas Baru</span>
                                </Link>
                            </div>
                        </div>

                        {activeLiveToday && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50/90 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-950/30 sm:mt-6 sm:gap-4 sm:rounded-2xl sm:p-4 sm:shadow-sm">
                                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                    <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm sm:flex">
                                        <VideoCameraFrontIcon sx={{ fontSize: 22 }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                                                {activeLiveToday.is_live ? 'Live Sekarang' : 'Hari Ini'}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {activeLiveToday.time_formatted || ''}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-900 [overflow-wrap:anywhere] dark:text-white sm:text-sm sm:font-black">
                                            <span className="hidden sm:inline">Sesi Tatap Muka bersama </span>{activeLiveToday.mentor_name ? `Mentor ${activeLiveToday.mentor_name}` : 'Mentor'}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={activeLiveToday.join_url || route('user.live-classes.index')}
                                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 text-xs font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-emerald-800 fine-pointer:hover:bg-emerald-800 sm:rounded-xl sm:bg-emerald-600 sm:px-4 sm:font-black sm:shadow-sm"
                                >
                                    <span className="sm:hidden">{activeLiveToday.is_live ? 'Masuk Live' : 'Lihat Sesi'}</span>
                                    <span className="hidden sm:inline">Buka Ruang Live</span>
                                    <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <div className="relative z-10 mx-auto max-w-7xl space-y-4 px-3 py-3 min-[380px]:px-4 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
                    {enrolledCourses.length === 0 && trialCourses.length > 0 && (
                        <div className="hidden items-center justify-between gap-4 rounded-2xl border border-sky-200/80 bg-sky-50/80 p-5 dark:border-sky-900/60 dark:bg-sky-950/20 sm:flex">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                                    <PlayArrowIcon sx={{ fontSize: 20 }} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-950 dark:text-white">Akses Uji Coba Minggu 1 Aktif</h2>
                                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                        Seluruh materi, latihan flashcard, dan kuis Hari 1–7 (Minggu 1) terbuka penuh untuk dicoba gratis. Selesaikan materi awal atau buka akses penuh kapan saja.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={route('katalog')}
                                className="shrink-0 inline-flex min-h-11 items-center justify-center rounded-lg border border-sky-300 bg-white px-4 text-xs font-bold text-sky-800 shadow-sm transition hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-900/50 dark:text-sky-200 dark:hover:bg-sky-900"
                            >
                                Lihat Paket Berlangganan
                            </Link>
                        </div>
                    )}

                    {enrolledCourses.length > 0 && (
                        <section aria-labelledby="kelas-terdaftar-title">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 sm:mb-4">
                                <div>
                                    <h2 id="kelas-terdaftar-title" className="text-base font-semibold text-slate-950 dark:text-white sm:text-xl sm:font-black">
                                        <span className="sm:hidden">Kelas Terdaftar</span>
                                        <span className="hidden sm:inline">Program Pembelajaran Terdaftar</span>
                                    </h2>
                                    <p className="hidden text-xs text-slate-500 dark:text-gray-400 sm:block">Kelas aktif dan program bimbingan mentor yang Anda ikuti.</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:font-bold sm:text-slate-400">{enrolledCourses.length} kelas</span>
                            </div>

                            <div className="space-y-2 sm:space-y-4">
                                {activeEnrolled.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                                {waitingEnrolled.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}

                    {trialCourses.length > 0 && (
                        <section aria-labelledby="kelas-trial-title">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 sm:mb-4">
                                <div>
                                    <h2 id="kelas-trial-title" className="text-base font-semibold text-slate-950 dark:text-white sm:text-xl sm:font-black">
                                        <span className="sm:hidden">Uji Coba Gratis</span>
                                        <span className="hidden sm:inline">{enrolledCourses.length > 0 ? 'Program Lainnya (Uji Coba Minggu 1)' : 'Program Pembelajaran (Uji Coba Minggu 1)'}</span>
                                    </h2>
                                    <p className="hidden text-xs text-slate-500 dark:text-gray-400 sm:block">
                                        Pilih program untuk membuka materi Hari 1 s.d. 7 dan evaluasi kuis secara gratis.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:font-bold sm:text-slate-400">{trialCourses.length} kelas</span>
                            </div>

                            <div className="space-y-2 sm:space-y-4">
                                {trialCourses.map((item) => <OwnedCourseCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}

                    {programs.length === 0 && (
                        <section aria-labelledby="kelas-kosong-title">
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3.5 py-5 text-center dark:border-gray-800 dark:bg-gray-900 sm:rounded-2xl sm:px-6 sm:py-16">
                                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 sm:size-14 sm:rounded-2xl">
                                    <SchoolIcon sx={{ fontSize: 32 }} />
                                </div>
                                <h2 id="kelas-kosong-title" className="mt-2 text-base font-semibold text-slate-950 dark:text-white sm:mt-4 sm:text-xl sm:font-black">Belum Ada Kelas</h2>
                                <p className="mx-auto mt-2 hidden max-w-md text-sm leading-6 text-slate-500 dark:text-gray-400 sm:block">
                                    Materi kelas sedang disiapkan oleh tim pengajar. Silakan cek kembali nanti atau buka katalog program.
                                </p>
                                <Link
                                    href={route('katalog')}
                                    className={`mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${theme.ctaBg} px-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:brightness-90 fine-pointer:hover:brightness-95 sm:mt-6 sm:rounded-xl sm:px-6 sm:font-black sm:shadow-sm`}
                                >
                                    <ExploreIcon sx={{ fontSize: 18 }} />
                                    <span className="sm:hidden">Buka Katalog</span>
                                    <span className="hidden sm:inline">Buka Katalog Program</span>
                                </Link>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
