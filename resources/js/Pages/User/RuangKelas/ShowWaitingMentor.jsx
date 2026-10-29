import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsVoiceIcon from '@mui/icons-material/SettingsVoice';
import DeviceTestModal from '@/Components/Features/LiveClass/DeviceTestModal';

export default function ShowWaitingMentor({ session = {}, portalUrl = '/user/live-classes' }) {
    const [isChecking, setIsChecking] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [countdown, setCountdown] = useState(session.starts_in_minutes ?? null);

    const checkSessionStatus = async () => {
        setIsChecking(true);
        try {
            // Cek status dengan visit ulang halaman saat ini
            router.reload({
                only: ['session'],
                preserveScroll: true,
                onFinish: () => setIsChecking(false),
            });
        } catch {
            setIsChecking(false);
        }
    };

    // Auto-polling setiap 8 detik untuk mendeteksi kapan mentor mulai
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                preserveScroll: true,
            });
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    // Countdown lokal
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 60000);

        return () => clearInterval(timer);
    }, [countdown]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-white sm:px-6">
            <Head title={`Menunggu Kelas - ${session.topic || 'Sesi Live'}`} />

            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur-md sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 sm:h-20 sm:w-20">
                    <HourglassEmptyIcon sx={{ fontSize: 36 }} className="animate-pulse" />
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Menunggu Mentor Memulai Sesi
                </div>

                <h1 className="mt-4 text-xl font-black text-white sm:text-2xl">
                    {session.topic || 'Sesi Bimbingan Live'}
                </h1>

                <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    Ruang tatap muka interaktif belum dibuka. Sistem akan otomatis memasukkan Anda begitu mentor menekan tombol <strong>Mulai Kelas</strong>.
                </p>

                {/* Auto-Sync Live Indicator */}
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Sinkronisasi otomatis aktif • Memeriksa status sesi...
                </div>

                {/* Info Card */}
                <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-slate-300">
                        <span className="flex items-center gap-2 text-slate-400">
                            <SchoolIcon sx={{ fontSize: 18 }} className="text-brand-400 shrink-0" />
                            Program & Kloter
                        </span>
                        <span className="font-bold text-white truncate text-left sm:text-right">
                            {session.program?.title} • {session.kloter?.nama}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-slate-300">
                        <span className="flex items-center gap-2 text-slate-400">
                            <CalendarMonthIcon sx={{ fontSize: 18 }} className="text-brand-400 shrink-0" />
                            Hari & Tanggal
                        </span>
                        <span className="font-bold text-white">
                            {session.date_formatted || 'Hari Ini'}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-slate-300">
                        <span className="flex items-center gap-2 text-slate-400">
                            <AccessTimeIcon sx={{ fontSize: 18 }} className="text-brand-400 shrink-0" />
                            Waktu Pelaksanaan
                        </span>
                        <span className="font-bold text-white">
                            {session.time_formatted || '-'}
                        </span>
                    </div>

                    {session.mentor?.username && (
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-slate-400">
                            <span>Pengampu Kelas</span>
                            <span className="font-black text-amber-300">
                                Mentor {session.mentor.username}
                            </span>
                        </div>
                    )}
                </div>

                {/* Countdown note or Ready note */}
                {countdown !== null && countdown > 0 ? (
                    <p className="mt-4 text-xs font-semibold text-slate-400">
                        Jadwal dimulai sekitar <strong className="text-white">{countdown} menit lagi</strong>.
                    </p>
                ) : (
                    <p className="mt-4 text-xs font-semibold text-amber-300/90">
                        Waktu kelas telah tiba. Mentor sedang menyiapkan ruang sesi, mohon tetap di halaman ini...
                    </p>
                )}

                {/* Actions & Device Test */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <button
                        type="button"
                        onClick={() => setIsTestModalOpen(true)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 text-xs font-bold text-brand-300 transition hover:bg-brand-500/20"
                    >
                        <SettingsVoiceIcon sx={{ fontSize: 16 }} />
                        Uji Mic & Kamera
                    </button>

                    <button
                        type="button"
                        onClick={checkSessionStatus}
                        disabled={isChecking}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50"
                    >
                        <RefreshIcon sx={{ fontSize: 16 }} className={isChecking ? 'animate-spin' : ''} />
                        {isChecking ? 'Memeriksa...' : 'Cek Status Sekarang'}
                    </button>

                    <Link
                        href={portalUrl}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-transparent px-5 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                        Kembali ke Jadwal
                    </Link>
                </div>
            </div>

            {/* Modal Uji Perangkat */}
            <DeviceTestModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
            />
        </main>
    );
}
