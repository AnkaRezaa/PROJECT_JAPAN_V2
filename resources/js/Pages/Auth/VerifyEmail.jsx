import GuestAuthLayout from '@/Components/Layout/GuestAuthLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useEffect, useMemo, useState } from 'react';

const COOLDOWN_SECONDS = 180;

const remainingSeconds = (sentAt, now) => {
    if (!sentAt) return 0;

    return Math.max(0, Math.ceil((new Date(sentAt).getTime() + (COOLDOWN_SECONDS * 1000) - now) / 1000));
};

export default function VerifyEmail({ status, sentAt = null }) {
    const [now, setNow] = useState(Date.now());
    const { post, processing, errors } = useForm({});
    const sent = status === 'verification-link-sent';
    const secondsLeft = useMemo(() => remainingSeconds(sentAt, now), [sentAt, now]);

    useEffect(() => {
        if (secondsLeft === 0) return undefined;

        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, [secondsLeft]);

    const submit = (event) => {
        event.preventDefault();
        post(route('verification.send'), { preserveScroll: true });
    };

    return (
        <GuestAuthLayout>
            <Head title="Verifikasi Email" />

            <div className="rounded-2xl border border-[var(--toku-border)] bg-white p-5 shadow-sm sm:p-8">
                <div className="mx-auto mb-6 max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <MarkEmailReadOutlinedIcon sx={{ fontSize: 30 }} />
                    </div>
                    <h1 className="text-xl font-extrabold text-gray-900">Verifikasi alamat email</h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        Kami telah mengirim tautan verifikasi ke alamat email Anda. Buka email tersebut untuk mengaktifkan akun.
                    </p>
                </div>

                {sent && (
                    <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700">
                        Tautan verifikasi baru sudah dikirim. Periksa kotak masuk dan folder spam Anda.
                    </div>
                )}

                {errors.verification && (
                    <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-700">
                        {errors.verification}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                    <button
                        type="submit"
                        disabled={processing || secondsLeft > 0}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshOutlinedIcon sx={{ fontSize: 18 }} />
                        {processing
                            ? 'Mengirim ulang...'
                            : secondsLeft > 0
                                ? `Kirim ulang dalam ${secondsLeft} detik`
                                : 'Kirim ulang tautan verifikasi'}
                    </button>
                    <p className="px-2 text-center text-xs leading-relaxed text-gray-500">
                        Tidak menerima email? Pastikan alamat email benar dan periksa folder Spam atau Promosi.
                    </p>
                </form>
            </div>

            <div className="mt-5 text-center">
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-500 no-underline transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                    <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                    Keluar dari akun
                </Link>
            </div>
        </GuestAuthLayout>
    );
}
