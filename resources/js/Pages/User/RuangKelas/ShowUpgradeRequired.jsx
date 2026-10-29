import React from 'react';
import { Head, Link } from '@inertiajs/react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function ShowUpgradeRequired({ session = {}, pricingUrl = '/katalog', portalUrl = '/user/live-classes' }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-white sm:px-6">
            <Head title="Akses Kelas Live Memerlukan Akun Premium - TOKU-UP" />

            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-md sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 sm:h-20 sm:w-20">
                    <LockOutlinedIcon sx={{ fontSize: 36 }} />
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
                    <StarIcon sx={{ fontSize: 14 }} />
                    Fitur Eksklusif Member Premium
                </div>

                <h1 className="mt-4 text-xl font-black text-white sm:text-2xl">
                    Buka Akses Sesi Tatap Muka Live
                </h1>

                <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    Sesi live bimbingan bersama mentor untuk program{' '}
                    <strong className="text-white">{session.program?.title || 'ini'}</strong>{' '}
                    merupakan fasilitas intensif bagi siswa berstatus langganan aktif.
                </p>

                {/* Keuntungan Fitur Live */}
                <div className="mt-6 space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left text-xs sm:text-sm">
                    <p className="font-bold text-slate-300">Manfaat yang Anda Dapatkan:</p>
                    <ul className="space-y-2 text-slate-400">
                        <li className="flex items-start gap-2">
                            <CheckCircleIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-emerald-400" />
                            <span>Tatap muka interaktif dan tanya jawab langsung dengan mentor.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircleIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-emerald-400" />
                            <span>Bedah materi PPT dan papan tulis kanji secara real-time.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircleIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-emerald-400" />
                            <span>Latihan percakapan (*kaiwa*) dan koreksi pelafalan langsung.</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Link
                        href={pricingUrl}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 px-6 text-sm font-black text-white shadow-lg shadow-brand-950/40 transition hover:brightness-110"
                    >
                        Buka Paket Berlangganan
                    </Link>

                    <Link
                        href={portalUrl}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-transparent px-5 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowBackIcon sx={{ fontSize: 16 }} />
                        Kembali ke Jadwal Live
                    </Link>
                </div>
            </div>
        </main>
    );
}
