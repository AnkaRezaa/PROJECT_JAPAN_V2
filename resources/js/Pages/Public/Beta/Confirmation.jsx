import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

export default function Confirmation({ registration = {}, released = false, status, sentAt = null }) {
    const form = useForm({});
    const [now, setNow] = useState(Date.now());
    const secondsLeft = sentAt ? Math.max(0, Math.ceil((new Date(sentAt).getTime() + 180000 - now) / 1000)) : 0;
    useEffect(() => {
        if (!secondsLeft) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [secondsLeft]);

    return <BetaPage compact showAccountAccess={false}>
        <Head title={registration.verified ? 'Email Terverifikasi' : 'Pendaftaran Tersimpan'}><meta name="robots" content="noindex, nofollow" /></Head>
        <div className="w-full max-w-md" data-beta-confirmation>
            {registration.verified ? <CheckCircleOutlineIcon className="text-green-700" sx={{ fontSize: 36 }} /> : <MailOutlineIcon className="text-green-700" sx={{ fontSize: 36 }} />}
            <h1 className="mt-3 text-2xl font-bold">{registration.verified ? 'Email terverifikasi.' : 'Pendaftaran tersimpan.'}</h1>
            <p className="mt-4 text-sm leading-6 text-gray-600">{registration.verified
                ? released ? 'Akses beta sudah dibuka. Masuk menggunakan akun yang Anda daftarkan.' : 'Akun Anda sudah terdaftar. Kami akan mengabari melalui email saat akses beta dibuka.'
                : 'Verifikasi email Anda untuk menyelesaikan pendaftaran beta. Anda belum masuk ke aplikasi.'}</p>
            <p className="mt-5 break-all border-y border-gray-200 py-4 text-sm font-semibold">{registration.email}</p>
            {form.errors.verification && <p role="alert" className="mt-5 text-sm leading-6 text-red-700">{form.errors.verification}</p>}
            {!registration.verified && <>
                {status === 'verification-link-sent' && <p role="status" className="mt-5 text-sm text-green-800">Tautan verifikasi sudah dikirim. Periksa kotak masuk dan folder spam.</p>}
                <form onSubmit={event => { event.preventDefault(); form.post(route('public.beta.resend'), { preserveScroll: true }); }} className="mt-6">
                    <button type="submit" disabled={form.processing || secondsLeft > 0} className={`${betaButton} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                        {form.processing ? 'Mengirim...' : secondsLeft ? `Kirim ulang dalam ${secondsLeft} detik` : 'Kirim ulang verifikasi'}
                    </button>
                </form>
            </>}
            {registration.verified && released && <Link href={route('login')} className={`${betaButton} mt-6 w-full bg-[#167b3c] text-white`}>Masuk</Link>}
        </div>
    </BetaPage>;
}
