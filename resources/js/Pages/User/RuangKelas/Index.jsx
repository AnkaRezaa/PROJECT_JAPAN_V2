import React, { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeviceTestModal from '@/Components/Features/LiveClass/DeviceTestModal';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchoolIcon from '@mui/icons-material/School';
import SettingsVoiceIcon from '@mui/icons-material/SettingsVoice';
import StarIcon from '@mui/icons-material/Star';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';

function formatIndonesianTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const dayName = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${hours}:${minutes} • ${dayName}, ${dayNumber} ${monthName} ${year}`;
}

export default function Index({
    activeSession = null,
    upcomingSessions = [],
    pastSessions = [],
    hasKloter = false,
    accessStatus = {},
    errors = {},
}) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const isPremium = accessStatus.is_premium ?? false;

    const { data, setData, post, processing } = useForm({
        join_code: '',
    });

    // Update jam real-time setiap detik
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleJoinByCode = (e) => {
        e.preventDefault();
        if (!data.join_code.trim()) return;
        post(route('user.live-classes.join-by-code'));
    };

    const handleCopySessionLink = (session) => {
        const fullUrl = `${window.location.origin}/user/live-classes/${session.join_code}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
            setCopiedId(session.id);
            setTimeout(() => setCopiedId(null), 2500);
        });
    };

    return (
        <AuthenticatedLayout header={false}>
            <Head title="Kelas Live - TOKU-UP" />

            <main className="relative min-h-[calc(100vh-4rem)] bg-slate-50 pb-16 text-slate-900 dark:bg-slate-950 dark:text-white">
                {/* Header Bilah Waktu Real-Time (Google Meet Style) */}
                <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                                <VideoCameraFrontIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div>
                                <h1 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                                    Kelas Live Toku-Up
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Sesi Tatap Muka & Bimbingan Interaktif
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden text-right sm:block">
                                <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                    {formatIndonesianTime(currentTime)}
                                </p>
                                <p className="text-[11px] text-slate-400">Waktu Indonesia Barat (WIB)</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsTestModalOpen(true)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                <SettingsVoiceIcon sx={{ fontSize: 18 }} className="text-brand-600 dark:text-brand-400" />
                                <span className="hidden sm:inline">Uji Perangkat</span>
                                <span className="sm:hidden">Uji Mic</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {errors.session && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                            {errors.session}
                        </div>
                    )}

                    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                        {/* Kolom Kiri: Hero & Aksi Cepat */}
                        <section className="space-y-6 lg:col-span-7">
                            <div>
                                <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                                    Ruang Bimbingan Live
                                </h2>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Sesi tatap muka interaktif bersama mentor sesuai jadwal kloter belajar Anda.
                                </p>
                            </div>

                            {/* Card Sesi Live Hari Ini (Fokus Utama - Ditampilkan Teratas Jika Ada) */}
                            {activeSession ? (
                                <article className={`overflow-hidden rounded-2xl border p-5 shadow-sm transition sm:p-6 ${
                                    activeSession.is_live
                                        ? 'border-emerald-500/40 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                }`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {activeSession.is_live ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                                                    <span className="h-2 w-2 rounded-full bg-white" />
                                                    LIVE SEKARANG
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    <AccessTimeIcon sx={{ fontSize: 14 }} />
                                                    Jadwal Hari Ini: {activeSession.time_formatted}
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {activeSession.program?.title} • {activeSession.kloter?.nama}
                                            </span>
                                        </div>

                                        {activeSession.mentor && (
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Mentor {activeSession.mentor.username}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                                        {activeSession.topic}
                                    </h3>

                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                        {activeSession.is_live
                                            ? 'Mentor sudah membuka ruang kelas. Bergabunglah sekarang untuk mengikuti sesi tatap muka.'
                                            : 'Sesi belum dimulai oleh mentor. Ruang kelas akan terbuka otomatis begitu mentor memulai sesi.'}
                                    </p>

                                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <Link
                                            href={activeSession.join_url}
                                            className={`inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-white shadow-md transition ${
                                                activeSession.is_live
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                                                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
                                            }`}
                                        >
                                            <PlayArrowIcon sx={{ fontSize: 18 }} />
                                            {activeSession.is_live ? 'Masuk Kelas Sekarang' : 'Buka Ruang Tunggu'}
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => handleCopySessionLink(activeSession)}
                                            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                            {copiedId === activeSession.id ? (
                                                <>
                                                    <CheckCircleIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                                                    Tautan Tersalin
                                                </>
                                            ) : (
                                                <>
                                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                    Salin Tautan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </article>
                            ) : null}

                            {/* Form Input Kode Kelas (Google Meet Input Pattern) */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Masuk Melalui Kode atau Tautan
                                </p>

                                <form onSubmit={handleJoinByCode} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                            <KeyboardIcon sx={{ fontSize: 20 }} />
                                        </div>
                                        <input
                                            type="text"
                                            value={data.join_code}
                                            onChange={(e) => setData('join_code', e.target.value)}
                                            placeholder="Masukkan kode kelas (contoh: ABC-1234)"
                                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-brand-400"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing || data.join_code.trim().length < 4}
                                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    >
                                        Gabung
                                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                                    </button>
                                </form>

                                {errors.join_code && (
                                    <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                        {errors.join_code}
                                    </p>
                                )}
                            </div>

                            {/* Status Langganan / Gate Notice */}
                            {isPremium ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                        <CheckCircleIcon sx={{ fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                                            Akses Kelas Live Terbuka Penuh
                                        </p>
                                        <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                            Status member Anda aktif. Anda dapat mengikuti seluruh sesi tatap muka dan bimbingan bersama mentor.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
                                            <StarIcon sx={{ fontSize: 20 }} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-slate-950 dark:text-white">
                                                Khusus Member Kloter Bimbingan
                                            </h3>
                                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                                                {hasKloter
                                                    ? 'Tingkatkan paket untuk bergabung ke sesi tatap muka interaktif ini.'
                                                    : 'Daftar paket belajar ber-kloter untuk mendapatkan bimbingan mentor.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route('katalog')}
                                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-400"
                                    >
                                        <LockOutlinedIcon sx={{ fontSize: 16 }} />
                                        Buka Paket Belajar
                                    </Link>
                                </div>
                            )}
                        </section>

                        {/* Kolom Kanan: Jadwal Sesi Selanjutnya (Google Meet Schedule List) */}
                        <aside className="space-y-4 lg:col-span-5">
                            <div className="flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                                    <CalendarMonthIcon sx={{ fontSize: 20 }} className="text-brand-600 dark:text-brand-400" />
                                    Jadwal Sesi Selanjutnya
                                </h3>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    {upcomingSessions.length} Terjadwal
                                </span>
                            </div>

                            {upcomingSessions.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingSessions.map((session) => (
                                        <article
                                            key={session.id}
                                            className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
                                                    <CalendarMonthIcon sx={{ fontSize: 14 }} />
                                                    {session.date_formatted}
                                                </span>
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {session.time_formatted}
                                                </span>
                                            </div>

                                            <h4 className="mt-2 text-sm font-black text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                                                {session.topic}
                                            </h4>

                                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <SchoolIcon sx={{ fontSize: 15 }} />
                                                    {session.program?.title} • {session.kloter?.nama}
                                                </span>
                                                {session.mentor && (
                                                    <span className="shrink-0 font-bold text-slate-700 dark:text-slate-300">
                                                        Mentor {session.mentor.username}
                                                    </span>
                                                )}
                                            </div>

                                            {session.starts_in_minutes !== null && session.starts_in_minutes > 0 && (
                                                <p className="mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                    Mulai dalam {session.starts_in_minutes} menit lagi
                                                </p>
                                            )}

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800/80">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopySessionLink(session)}
                                                    className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                                >
                                                    {copiedId === session.id ? (
                                                        <>
                                                            <CheckCircleIcon sx={{ fontSize: 15 }} className="text-emerald-500" />
                                                            Tersalin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ContentCopyIcon sx={{ fontSize: 15 }} />
                                                            Salin Jadwal & Link
                                                        </>
                                                    )}
                                                </button>

                                                <Link
                                                    href={session.join_url}
                                                    className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-black text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                                >
                                                    {session.is_live ? 'Masuk Kelas' : 'Buka Ruang Tunggu'}
                                                    <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                        <CalendarMonthIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <h4 className="mt-3 text-sm font-black text-slate-800 dark:text-slate-200">
                                        Belum Ada Jadwal Sesi Live
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                        {hasKloter
                                            ? 'Mentor akan memperbarui jadwal sebelum sesi tatap muka berikutnya dimulai. Cek kembali secara berkala.'
                                            : 'Anda belum terdaftar di kloter aktif. Pilih program pembelajaran untuk mendapatkan alokasi kloter bimbingan.'}
                                    </p>
                                </div>
                            )}

                            {/* Riwayat Sesi Terdahulu */}
                            {pastSessions.length > 0 && (
                                <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <summary className="cursor-pointer text-xs font-black text-slate-700 dark:text-slate-300">
                                        Riwayat Sesi Terdahulu ({pastSessions.length})
                                    </summary>
                                    <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                                        {pastSessions.map((past) => (
                                            <div key={past.id} className="py-2.5 first:pt-0 last:pb-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {past.topic}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {past.date_formatted} • {past.program?.title}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </aside>
                    </div>
                </div>
            </main>

            {/* Modal Uji Kamera & Mic */}
            <DeviceTestModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
