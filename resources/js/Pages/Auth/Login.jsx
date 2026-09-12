import GuestAuthLayout from '@/Components/Layout/GuestAuthLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestAuthLayout>
            <Head title="Masuk" />

            <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_-40px_rgba(48,192,96,0.32)] backdrop-blur-md sm:p-8">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button className="flex-1 pb-3 text-sm font-bold text-brand-600 border-b-2 border-brand-600">
                        Masuk ログイン
                    </button>
                    <Link href={route('register')} className="flex-1 pb-3 text-sm font-medium text-gray-400 text-center no-underline hover:text-gray-600 transition-colors">
                        Daftar 登録
                    </Link>
                </div>

                <h2 className="mb-1 text-xl font-extrabold text-[#2D3742]">Selamat Datang Kembali!</h2>
                <p className="mb-6 text-sm text-[#55616D]">Siap melanjutkan perjalanan belajar Anda?</p>

                {status && <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-lg">{status}</div>}

                <form onSubmit={submit} className="space-y-4">
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

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700">Kata Sandi</label>
                            {canResetPassword && (
                                <Link href={route('password.request')} className="text-xs text-brand-600 font-semibold no-underline hover:underline">
                                    Lupa kata sandi?
                                </Link>
                            )}
                        </div>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="toku-input w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-11 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-focus/20"
                            >
                                {showPassword ? <VisibilityOffIcon sx={{ fontSize: 19 }} /> : <VisibilityIcon sx={{ fontSize: 19 }} />}
                            </button>
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-focus/20" />
                        <span className="text-sm text-gray-600">Ingat saya</span>
                    </label>

                    <button type="submit" disabled={processing} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-700 hover:text-white disabled:opacity-50">
                        Mulai Belajar (始める)
                    </button>

                    <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-gray-200 w-full" />
                        <span className="absolute bg-white px-3 text-xs text-gray-400">Atau lanjutkan dengan</span>
                    </div>

                    <div>
                        <a href={route('auth.google.redirect')} className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-700 no-underline transition-all hover:bg-gray-50">
                            <img src="https://img.icons8.com/?size=100&id=V5cGWnc9R4xj&format=png&color=000000" className="w-5 h-5" alt="" />
                            <span>Masuk dengan Google</span>
                        </a>
                    </div>
                    <p className="text-center text-xs text-gray-400">Akun Google menggunakan tombol Google dan tidak memakai OTP kata sandi.</p>
                </form>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
                Belum punya akun? <Link href={route('register')} className="text-brand-600 font-semibold no-underline hover:underline">Daftar gratis</Link>
            </p>
        </GuestAuthLayout>
    );
}
