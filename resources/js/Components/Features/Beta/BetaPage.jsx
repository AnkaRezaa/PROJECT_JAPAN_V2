import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import InstagramIcon from '@mui/icons-material/Instagram';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import BrandWordmark from '@/Components/Navigation/BrandWordmark';

export const betaButton = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#167b3c] px-5 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700';

export default function BetaPage({ children }) {
    const { socialLinks = {}, auth = {} } = usePage().props;
    return <div className="flex min-h-[100svh] flex-col bg-white text-[#172b24] [color-scheme:light]">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-8">
            <Link href={route('public.release-soon')} aria-label="TokuUp - Beranda" className="inline-flex min-h-[44px] items-center"><BrandWordmark adaptive={false} className="h-7" /></Link>
            {auth.user ? <details className="relative"><summary className="cursor-pointer py-3 text-sm font-semibold">Akun</summary><div className="absolute right-0 z-10 w-40 rounded-md border bg-white p-2 shadow-sm"><Link href={route('profile.edit')} className="block px-3 py-3 text-sm">Profil</Link><Link href={route('logout')} method="post" as="button" className="w-full px-3 py-3 text-left text-sm">Keluar</Link></div></details> : <Link href={route('login')} className="py-3 text-sm font-semibold underline underline-offset-4">Masuk</Link>}
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 pb-10 text-center sm:px-8">
            <img data-brand-logo src="/images/logos/tokuup-full.png" alt="TokuUp" width="640" height="816" fetchpriority="high" className="my-7 h-[240px] w-[190px] max-w-full object-contain sm:h-[280px] sm:w-[220px]" />
            {children}
            <Link href={route('roadmap')} className={`${betaButton} mt-6`}><MapOutlinedIcon fontSize="small" />Lihat Roadmap</Link>
        </main>
        <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-[#486052] sm:px-8">
            <span>&copy; {new Date().getFullYear()} TokuUp</span>
            {socialLinks.instagram ? <a data-instagram-action aria-label="Instagram TOKU-UP (tab baru)" href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2"><InstagramIcon fontSize="small" />Instagram</a> : <span data-instagram-action aria-label="Instagram belum tersedia" aria-disabled="true" className="inline-flex min-h-[44px] items-center gap-2 text-gray-400"><InstagramIcon fontSize="small" />Instagram</span>}
        </footer>
    </div>;
}
