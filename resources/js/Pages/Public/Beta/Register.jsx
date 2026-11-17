import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

const fieldClass = 'min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20';

export default function Register({ beta = {}, referralsEnabled = false, referralCode = '' }) {
    const [showPasswords, setShowPasswords] = useState(false);
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '', referral_code: referralCode, terms_accepted: false });
    const available = beta.enabled && !beta.released && beta.registration_open && beta.participants < beta.limit;
    const fields = [
        { name: 'name', label: 'Nama', type: 'text', autoComplete: 'name', maxLength: 255 },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 255 },
        { name: 'password', label: 'Kata sandi', type: showPasswords ? 'text' : 'password', autoComplete: 'new-password' },
        { name: 'password_confirmation', label: 'Ulangi kata sandi', type: showPasswords ? 'text' : 'password', autoComplete: 'new-password' },
    ];
    const submit = (event) => {
        event.preventDefault();
        form.post(route('public.beta.register.store'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return <BetaPage compact showAccountAccess={false}>
        <Head title="Daftar Beta"><meta name="robots" content="noindex, nofollow" /></Head>
        <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold">Daftar Beta TOKU-UP</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">Buat akun lebih awal. Kami akan mengabari melalui email saat akses beta dibuka.</p>
            {!available ? <div role="status" className="mt-6 border-y border-gray-200 py-6 text-sm font-semibold">
                {beta.participants >= beta.limit ? 'Kuota beta penuh.' : 'Pendaftaran beta ditutup.'}
            </div> : <form onSubmit={submit} className="mt-7 space-y-5 text-left" aria-label="Pendaftaran beta">
                {form.errors.beta && <p role="alert" className="text-sm text-red-700">{form.errors.beta}</p>}
                {fields.map(field => <div key={field.name}>
                    <label htmlFor={`beta-${field.name}`} className="mb-2 block text-sm font-semibold">{field.label}</label>
                    <div className="relative">
                        <input id={`beta-${field.name}`} name={field.name} type={field.type} autoComplete={field.autoComplete}
                            required maxLength={field.maxLength} minLength={field.name.startsWith('password') ? 8 : undefined}
                            value={form.data[field.name]} onChange={event => form.setData(field.name, event.target.value)}
                            aria-invalid={Boolean(form.errors[field.name])} aria-describedby={form.errors[field.name] ? `beta-${field.name}-error` : undefined}
                            className={`${fieldClass} ${field.name === 'password' ? 'pr-12' : ''}`} />
                        {field.name === 'password' && <button type="button" onClick={() => setShowPasswords(value => !value)}
                            aria-label={showPasswords ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPasswords}
                            title={showPasswords ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
                            {showPasswords ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </button>}
                    </div>
                    {field.name === 'password' && <p className="mt-1 text-xs text-gray-500">Minimal 8 karakter.</p>}
                    {form.errors[field.name] && <p id={`beta-${field.name}-error`} role="alert" className="mt-1 text-sm text-red-700">{form.errors[field.name]}</p>}
                </div>)}
                {referralsEnabled && <div>
                    <label htmlFor="beta-referral" className="mb-2 block text-sm font-semibold">Kode referral <span className="font-normal text-gray-500">(opsional)</span></label>
                    <input id="beta-referral" name="referral_code" autoCapitalize="characters" spellCheck={false} maxLength={32}
                        value={form.data.referral_code} onChange={event => form.setData('referral_code', event.target.value.toUpperCase())}
                        aria-invalid={Boolean(form.errors.referral_code)} aria-describedby={form.errors.referral_code ? 'beta-referral-error' : undefined} className={fieldClass} />
                    {form.errors.referral_code && <p id="beta-referral-error" role="alert" className="mt-1 text-sm text-red-700">{form.errors.referral_code}</p>}
                </div>}
                <div>
                    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm leading-6">
                        <input type="checkbox" required checked={form.data.terms_accepted} onChange={event => form.setData('terms_accepted', event.target.checked)}
                            aria-invalid={Boolean(form.errors.terms_accepted)} aria-describedby={form.errors.terms_accepted ? 'beta-terms-error' : undefined}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-green-700 focus:ring-green-700" />
                        <span>Saya menyetujui <Link href={route('terms')} target="_blank" className="underline underline-offset-2">Ketentuan</Link> dan <Link href={route('privacy-policy')} target="_blank" className="underline underline-offset-2">Kebijakan Privasi</Link>.</span>
                    </label>
                    {form.errors.terms_accepted && <p id="beta-terms-error" role="alert" className="text-sm text-red-700">{form.errors.terms_accepted}</p>}
                </div>
                <button type="submit" disabled={form.processing} className={`${betaButton} w-full bg-[#167b3c] text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60`}>
                    {form.processing ? 'Mendaftarkan...' : 'Daftar Beta'}
                </button>
                <p className="text-center text-xs leading-5 text-gray-500">Pendaftaran belum membuka akses belajar.</p>
            </form>}
        </div>
    </BetaPage>;
}
