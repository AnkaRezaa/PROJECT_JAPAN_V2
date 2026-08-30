import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { Head, Link, router, usePage } from '@inertiajs/react';

const statusContent = {
    403: {
        eyebrow: 'Akses terbatas',
        title: 'Halaman ini tidak dapat dibuka',
        description: 'Akun Anda tidak memiliki akses untuk membuka halaman atau konten ini.',
        icon: LockOutlinedIcon,
        tone: 'text-amber-600 dark:text-amber-300',
        surface: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
    },
    404: {
        eyebrow: 'Halaman tidak ditemukan',
        title: 'Tujuan yang Anda cari tidak tersedia',
        description: 'Halaman mungkin dipindahkan, dihapus, atau alamatnya tidak lagi berlaku.',
        icon: SearchOffRoundedIcon,
        tone: 'text-red-600 dark:text-red-300',
        surface: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
    },
    429: {
        eyebrow: 'Terlalu banyak permintaan',
        title: 'Tunggu sebentar sebelum mencoba lagi',
        description: 'Sistem membatasi permintaan berulang untuk menjaga akun dan layanan tetap aman.',
        icon: TimerOutlinedIcon,
        tone: 'text-amber-600 dark:text-amber-300',
        surface: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
    },
    503: {
        eyebrow: 'Layanan sementara tidak tersedia',
        title: 'Kami sedang melakukan pembaruan',
        description: 'Silakan kembali beberapa saat lagi. Data belajar Anda tetap tersimpan.',
        icon: CloudOffRoundedIcon,
        tone: 'text-sky-700 dark:text-sky-300',
        surface: 'border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30',
    },
    500: {
        eyebrow: 'Terjadi gangguan',
        title: 'Halaman belum dapat dimuat',
        description: 'Coba muat ulang halaman. Bila masalah berulang, kembali ke dashboard terlebih dahulu.',
        icon: CloudOffRoundedIcon,
        tone: 'text-red-600 dark:text-red-300',
        surface: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
    },
};

export default function Status({ status = 500, home_url: homeUrl = '/' }) {
    const { auth } = usePage().props;
    const details = statusContent[status] || statusContent[500];
    const Icon = details.icon;
    const isServerError = status === 500 || status === 503;
    const primaryLabel = auth?.user ? 'Kembali ke dashboard' : 'Kembali ke beranda';

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        router.visit(homeUrl);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 transition-colors dark:bg-[#0b1121] dark:text-slate-100 sm:px-6">
            <Head title={`${status} - ${details.title}`} />

            <main className="w-full max-w-xl text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${details.surface} ${details.tone}`}>
                    <Icon sx={{ fontSize: 32 }} />
                </div>

                <p className={`mt-7 text-xs font-black uppercase tracking-[0.22em] ${details.tone}`}>
                    {details.eyebrow}
                </p>
                <p className="mt-3 text-7xl font-black tracking-tight text-slate-950 dark:text-white sm:text-8xl">
                    {status}
                </p>
                <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                    {details.title}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {details.description}
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                        href={homeUrl}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700"
                    >
                        <HomeRoundedIcon sx={{ fontSize: 19 }} />
                        {primaryLabel}
                    </Link>
                    {isServerError ? (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <RefreshRoundedIcon sx={{ fontSize: 19 }} />
                            Muat ulang
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goBack}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <ArrowBackRoundedIcon sx={{ fontSize: 19 }} />
                            Halaman sebelumnya
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
