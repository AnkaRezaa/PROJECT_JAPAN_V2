import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import CheckIcon from '@mui/icons-material/Check';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

const sparkles = [
    { x: -34, y: -22, delay: 0.15, size: 7 },
    { x: 36, y: -20, delay: 0.25, size: 6 },
    { x: -38, y: 18, delay: 0.35, size: 5 },
    { x: 34, y: 20, delay: 0.2, size: 7 },
];

function StatusEmblem({ verified }) {
    if (verified) {
        return (
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
        );
    }

    return (
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <motion.span
                aria-hidden="true"
                animate={{ scale: [1, 1.24, 1], opacity: [0.35, 0.1, 0.35] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-1 rounded-full bg-emerald-100"
            />
            <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -4, 0] }}
                transition={{
                    scale: { type: 'spring', stiffness: 240, damping: 18 },
                    y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#167b3c] ring-2 ring-emerald-200"
            >
                <MailOutlineIcon sx={{ fontSize: 32 }} />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-[#167b3c] ring-2 ring-white" />
                </span>
            </motion.div>
        </div>
    );
}

export default function Confirmation({ registration = {}, released = false, status, sentAt = null }) {
    const form = useForm({});
    const [now, setNow] = useState(Date.now());
    const secondsLeft = sentAt ? Math.max(0, Math.ceil((new Date(sentAt).getTime() + 180000 - now) / 1000)) : 0;

    useEffect(() => {
        if (!secondsLeft) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [secondsLeft]);

    const steps = [
        { label: 'Daftar Beta', done: true },
        { label: 'Verifikasi Email', done: Boolean(registration.verified), active: !registration.verified },
        { label: 'Akses Dibuka', done: Boolean(registration.verified && released), active: Boolean(registration.verified && !released) },
    ];

    return (
        <BetaPage compact animateLogo showAccountAccess={false}>
            <Head title={registration.verified ? 'Anda Telah Terdaftar pada Beta' : 'Pendaftaran Beta Tersimpan'}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 via-white to-white p-6 shadow-[0_18px_50px_-30px_rgba(22,123,60,0.35)] sm:p-8"
                data-beta-confirmation
            >
                <StatusEmblem verified={Boolean(registration.verified)} />

                <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                        registration.verified
                            ? 'bg-emerald-100 text-[#167b3c]'
                            : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                    }`}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${registration.verified ? 'bg-[#167b3c]' : 'bg-amber-500 animate-pulse'}`} />
                    {registration.verified ? 'Email Terverifikasi' : 'Menunggu Verifikasi Email'}
                </motion.span>

                <motion.h1
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 text-2xl font-extrabold tracking-tight text-[#172b24]"
                >
                    Anda telah terdaftar pada Beta!
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.28 }}
                    className="mt-3 text-sm leading-6 text-[#486052]"
                >
                    {registration.verified
                        ? released
                            ? 'Akses beta sudah dibuka. Silakan masuk menggunakan akun yang telah Anda daftarkan.'
                            : 'Slot beta Anda sudah diamankan. Kami akan mengabari melalui email begitu akses belajar TOKU-UP resmi dibuka.'
                        : 'Akun Anda sudah tercatat pada kuota Beta. Buka kotak masuk email Anda untuk menyelesaikan verifikasi.'}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.34 }}
                    className="mt-5 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-[#172b24] shadow-2xs"
                >
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Email Terdaftar</span>
                    <span className="mt-0.5 block break-all">{registration.email}</span>
                </motion.div>

                <motion.ol
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-5 grid grid-cols-3 gap-2 text-left"
                >
                    {steps.map((step, index) => (
                        <li
                            key={step.label}
                            className={`rounded-xl border px-2.5 py-2 text-center transition ${
                                step.done
                                    ? 'border-emerald-200 bg-emerald-50/70 text-[#167b3c]'
                                    : step.active
                                        ? 'border-emerald-300 bg-white text-[#172b24] ring-1 ring-emerald-200'
                                        : 'border-gray-100 bg-gray-50/70 text-gray-400'
                            }`}
                        >
                            <span
                                className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                    step.done
                                        ? 'bg-[#167b3c] text-white'
                                        : step.active
                                            ? 'bg-emerald-100 text-[#167b3c]'
                                            : 'bg-gray-200 text-gray-500'
                                }`}
                            >
                                {step.done ? <CheckIcon sx={{ fontSize: 13 }} /> : index + 1}
                            </span>
                            <span className="mt-1.5 block text-[11px] font-bold leading-tight">{step.label}</span>
                        </li>
                    ))}
                </motion.ol>

                {form.errors.verification && (
                    <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                        {form.errors.verification}
                    </p>
                )}

                {!registration.verified && (
                    <>
                        {status === 'verification-link-sent' && (
                            <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-green-800">
                                Tautan verifikasi sudah dikirim. Periksa kotak masuk dan folder spam.
                            </p>
                        )}
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(route('public.beta.resend'), { preserveScroll: true });
                            }}
                            className="mt-5"
                        >
                            <button
                                type="submit"
                                disabled={form.processing || secondsLeft > 0}
                                className={`${betaButton} w-full bg-[#167b3c] text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {form.processing ? 'Mengirim...' : secondsLeft ? `Kirim ulang dalam ${secondsLeft} detik` : 'Kirim ulang verifikasi'}
                            </button>
                        </form>
                    </>
                )}

                {registration.verified && released && (
                    <Link href={route('login')} className={`${betaButton} mt-6 w-full bg-[#167b3c] text-white transition hover:bg-green-800`}>
                        Masuk ke TOKU-UP
                    </Link>
                )}
            </motion.div>
        </BetaPage>
    );
}
