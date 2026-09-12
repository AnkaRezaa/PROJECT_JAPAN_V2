import GuestAuthLayout from '@/Components/Layout/GuestAuthLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms_accepted: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <GuestAuthLayout>
            <Head title="Daftar" />

            <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_-40px_rgba(48,192,96,0.32)] backdrop-blur-md sm:p-8">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <Link href={route('login')} className="flex-1 pb-3 text-sm font-medium text-gray-400 text-center no-underline hover:text-gray-600 transition-colors">
                        Masuk ログイン
                    </Link>
                    <button className="flex-1 pb-3 text-sm font-bold text-brand-600 border-b-2 border-brand-600">
                        Daftar 登録
                    </button>
                </div>

                <h2 className="mb-1 text-xl font-extrabold text-[#2D3742]">Buat akun baru</h2>
                <p className="mb-6 text-sm text-[#55616D]">Mulai perjalanan belajar bahasa Jepang Anda hari ini.</p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                        <div className="relative">
                            <PersonIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Nama Anda"
                                className="toku-input w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                        </div>
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Email</label>
                        <div className="relative">
                            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="name@example.com"
                                className="toku-input w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Kata Sandi</label>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="toku-input w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Kata Sandi</label>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                            <input
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                                className="toku-input w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                        </div>
                        {errors.password_confirmation && <p className="mt-1 text-xs text-red-600">{errors.password_confirmation}</p>}
                    </div>
                    </div>

                    <div>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.terms_accepted}
                                onChange={(e) => setData('terms_accepted', e.target.checked)}
                                className="mt-1 w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-focus focus:ring-2"
                                required
                            />
                            <span className="text-sm text-gray-500">
                                Saya menyetujui <Link href="/terms" className="font-medium text-brand-600 hover:underline">Syarat & Ketentuan</Link> dan <Link href="/privacy-policy" className="font-medium text-brand-600 hover:underline">Kebijakan Privasi</Link>.
                            </span>
                        </label>
                        {errors.terms_accepted && <p className="mt-1 text-xs text-red-600">{errors.terms_accepted}</p>}
                    </div>

                    <button type="submit" disabled={processing || !data.terms_accepted} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-700 hover:text-white disabled:opacity-50">
                        Daftar Akun (登録する)
                    </button>

                    <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-gray-200 w-full" />
                        <span className="absolute bg-white px-3 text-xs text-gray-400">Atau lanjutkan dengan</span>
                    </div>

                   <div>
                        <a href={route('auth.google.redirect')} className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-700 no-underline transition-all hover:bg-gray-50">
                            <img src="https://img.icons8.com/?size=100&id=V5cGWnc9R4xj&format=png&color=000000" className="w-5 h-5" alt="" />
                            <span>Daftar dengan Google</span>
                        </a>
                    </div>  
                </form>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
                Sudah punya akun? <Link href={route('login')} className="text-brand-600 font-semibold no-underline hover:underline">Masuk</Link>
            </p>
        </GuestAuthLayout>
    );
}
