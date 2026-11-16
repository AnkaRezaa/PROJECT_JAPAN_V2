import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ReferralIndex({ code, inviteUrl, summary }) {
    const form = useForm({});
    const requested = useRef(false);
    const [notice, setNotice] = useState('');
    const createCode = () => form.post(route('user.referrals.code'), { preserveScroll: true });
    useEffect(() => {
        if (!code && !requested.current) {
            requested.current = true;
            createCode();
        }
    }, []);

    const copy = async (value) => {
        try {
            await navigator.clipboard.writeText(value);
            setNotice('Berhasil disalin.');
        } catch {
            setNotice('Tidak dapat menyalin. Pilih dan salin teks secara manual.');
        }
    };
    const share = async () => {
        if (!navigator.share) return copy(inviteUrl);
        try {
            await navigator.share({ title: 'Belajar bersama di TokuUp', url: inviteUrl });
        } catch (error) {
            if (error.name !== 'AbortError') setNotice('Tidak dapat membagikan. Gunakan Salin tautan.');
        }
    };
    const buttonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 dark:border-gray-600';

    return <AuthenticatedLayout>
        <Head title="Undang Teman" />
        <main className="mx-auto w-full max-w-3xl px-4 py-8 text-gray-900 dark:text-gray-100 sm:px-6">
            <Link href={route('profile.edit')} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-brand-700 dark:text-brand-300"><ArrowBackIcon fontSize="small" />Profil</Link>
            <h1 className="mt-4 text-2xl font-bold">Undang Teman</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Bagikan undangan untuk bergabung dengan TokuUp.</p>
            <section className="mt-8 border-y border-gray-200 py-6 dark:border-gray-700" aria-label="Undangan Anda">
                {code ? <>
                    <label htmlFor="personal-code" className="block text-sm font-semibold">Kode referral</label>
                    <input id="personal-code" readOnly value={code} onFocus={event => event.target.select()} className="mt-2 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-3 py-3 font-mono text-lg dark:border-gray-600" />
                    <label htmlFor="personal-link" className="mt-5 block text-sm font-semibold">Tautan undangan</label>
                    <input id="personal-link" readOnly value={inviteUrl} onFocus={event => event.target.select()} className="mt-2 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm dark:border-gray-600" />
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button className={buttonClass} onClick={() => copy(code)}><ContentCopyIcon fontSize="small" />Salin kode</button>
                        <button className={buttonClass} onClick={() => copy(inviteUrl)}><ContentCopyIcon fontSize="small" />Salin tautan</button>
                        <button className={buttonClass} onClick={share}><ShareIcon fontSize="small" />Bagikan</button>
                    </div>
                </> : <button onClick={createCode} disabled={form.processing} className={buttonClass}>{form.processing ? 'Menyiapkan kode...' : 'Buat kode'}</button>}
                <p role="status" className="mt-3 min-h-5 text-sm">{notice}</p>
            </section>
            <dl className="grid grid-cols-2 gap-4 py-6">
                <div><dt className="text-sm text-gray-600 dark:text-gray-400">Terdaftar</dt><dd className="mt-1 text-2xl font-bold">{summary.registered}</dd></div>
                <div><dt className="text-sm text-gray-600 dark:text-gray-400">Terverifikasi</dt><dd className="mt-1 text-2xl font-bold">{summary.verified}</dd></div>
            </dl>
        </main>
    </AuthenticatedLayout>;
}
