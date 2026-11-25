import React from 'react';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import CheckIcon from '@mui/icons-material/Check';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BetaPage from '@/Components/Features/Beta/BetaPage';

const sparkles = [
    { x: -34, y: -22, delay: 0.15, size: 7 },
    { x: 36, y: -20, delay: 0.25, size: 6 },
    { x: -38, y: 18, delay: 0.35, size: 5 },
    { x: 34, y: 20, delay: 0.2, size: 7 },
];

export default function Waiting({ beta }) {
    const date = beta.opens_at
        ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(beta.opens_at))
        : null;

    const steps = [
        { label: 'Daftar Beta', done: true },
        { label: 'Email Aktif', done: true },
        { label: 'Akses Dibuka', done: false, active: true },
    ];

    return (
        <BetaPage animateLogo>
            <Head title="Anda Telah Terdaftar pada Beta" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 via-white to-white p-6 shadow-[0_18px_50px_-30px_rgba(22,123,60,0.35)] sm:p-8"
            >
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                    <motion.span
                        aria-hidden="true"
                        initial={{ scale: 0.8, opacity: 0.55 }}
                        animate={{ scale: [0.95, 1.38, 1.5], opacity: [0.45, 0.15, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border-2 border-emerald-500"
                    />
                    {sparkles.map((dot, idx) => (
                        <motion.span
                            key={idx}
                            aria-hidden="true"
                            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.4], x: dot.x, y: dot.y }}
                            transition={{ duration: 1.1, delay: dot.delay, ease: 'easeOut' }}
                            style={{ width: dot.size, height: dot.size }}
                            className="absolute rounded-full bg-emerald-500"
                        />
                    ))}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1b9349] to-[#136832] text-white shadow-lg shadow-emerald-600/25"
                    >
                        <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <motion.path
                                d="M5 13l4 4L19 7"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.55, delay: 0.18, ease: 'easeOut' }}
                            />
                        </svg>
                    </motion.div>
                </div>

                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#167b3c]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#167b3c]" />
                    Peserta Beta Terkonfirmasi
                </span>

                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#172b24] sm:text-3xl">
                    Anda telah terdaftar pada Beta!
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#486052]">
                    Akun kamu sudah resmi tercatat sebagai peserta Beta TOKU-UP. Akses belajar akan terbuka otomatis sesuai jadwal pembukaan.
                </p>

                <ol className="mt-5 grid grid-cols-3 gap-2">
                    {steps.map((step, index) => (
                        <li
                            key={step.label}
                            className={`rounded-xl border px-2.5 py-2 text-center ${
                                step.done
                                    ? 'border-emerald-200 bg-emerald-50/70 text-[#167b3c]'
                                    : 'border-emerald-300 bg-white text-[#172b24] ring-1 ring-emerald-200'
                            }`}
                        >
                            <span
                                className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                    step.done ? 'bg-[#167b3c] text-white' : 'bg-emerald-100 text-[#167b3c]'
                                }`}
                            >
                                {step.done ? <CheckIcon sx={{ fontSize: 13 }} /> : index + 1}
                            </span>
                            <span className="mt-1.5 block text-[11px] font-bold leading-tight">{step.label}</span>
                        </li>
                    ))}
                </ol>

                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-[#167b3c]">
                    <ScheduleIcon fontSize="small" />
                    <span>{date ? `Dibuka ${date} WIB` : 'Jadwal pembukaan segera diumumkan.'}</span>
                </div>
            </motion.div>
        </BetaPage>
    );
}
