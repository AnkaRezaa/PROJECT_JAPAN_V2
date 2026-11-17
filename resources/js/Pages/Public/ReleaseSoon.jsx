import React from 'react';
import { Link } from '@inertiajs/react';
import SeoHead from '@/Components/SEO/SeoHead';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

export default function ReleaseSoon({ seo = {}, beta = {} }) {
    const available = beta.enabled && !beta.released && beta.registration_open && beta.participants < beta.limit;
    return <BetaPage>
        <SeoHead seo={seo} />
        <h1 className="text-4xl font-bold sm:text-5xl">Release soon.</h1>
        <p className="mt-4 text-xl font-semibold">Belajar bahasa Jepang bersama TOKU-UP</p>
        <p className="mt-3 text-sm text-[#486052]">Pendaftaran beta untuk <strong>50 peserta.</strong></p>
        {available ? <Link href={route('public.beta.register')} data-registration-button className={`${betaButton} mt-6 bg-[#167b3c] text-white`}>Daftar Beta</Link> : <button disabled data-registration-button className={`${betaButton} mt-6 cursor-not-allowed opacity-50`}>Daftar Beta</button>}
        <p id="beta-registration-status" className="mt-3 text-sm text-[#486052]">{available ? 'Pendaftaran dibuka.' : beta.released ? 'Prapendaftaran beta sudah ditutup.' : beta.enabled && beta.participants >= beta.limit ? 'Kuota beta penuh.' : 'Pendaftaran segera dibuka.'}</p>
    </BetaPage>;
}
