import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import BrandWordmark from '@/Components/Navigation/BrandWordmark';

export const betaButton = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#167b3c] px-5 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700';

export default function BetaPage({ children, compact = false, showAccountAccess = true, animateLogo = false }) {
    const { auth = {} } = usePage().props;
    return <div className="flex min-h-[100svh] flex-col bg-white text-[#172b24] [color-scheme:light]">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-8">
            <Link href={route('public.release-soon')} aria-label="TokuUp - Beranda" className="inline-flex min-h-[44px] items-center"><BrandWordmark adaptive={false} className="h-7" /></Link>
            {!showAccountAccess ? <Link href={route('public.release-soon')} className="py-3 text-sm font-semibold underline underline-offset-4">Kembali</Link> : auth.user ? <details className="relative"><summary className="cursor-pointer py-3 text-sm font-semibold">Akun</summary><div className="absolute right-0 z-10 w-40 rounded-md border bg-white p-2 shadow-sm"><Link href={route('profile.edit')} className="block px-3 py-3 text-sm">Profil</Link><Link href={route('logout')} method="post" as="button" className="w-full px-3 py-3 text-left text-sm">Keluar</Link></div></details> : <Link href={route('login')} className="py-3 text-sm font-semibold underline underline-offset-4">Masuk</Link>}
        </header>
        <main className={`mx-auto flex w-full flex-1 flex-col items-center px-5 pb-12 text-center sm:px-8 ${compact ? 'max-w-2xl' : 'max-w-7xl'}`}>
            {animateLogo ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.86, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="relative my-6 flex items-center justify-center"
                >
                    <motion.div
                        aria-hidden="true"
                        animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.32, 0.18] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="pointer-events-none absolute h-32 w-32 rounded-full bg-emerald-400/40 blur-2xl"
                    />
                    <motion.img
                        data-brand-logo
                        src="/images/logos/tokuup-full.png"
                        alt="TokuUp"
                        width="640"
                        height="816"
                        fetchpriority="high"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className={compact ? 'relative h-[132px] w-[104px] max-w-full object-contain drop-shadow-sm' : 'relative h-[180px] w-[142px] max-w-full object-contain drop-shadow-sm sm:h-[210px] sm:w-[165px]'}
                    />
                </motion.div>
            ) : (
                <img data-brand-logo src="/images/logos/tokuup-full.png" alt="TokuUp" width="640" height="816" fetchpriority="high" className={compact ? 'my-6 h-[140px] w-[110px] max-w-full object-contain' : 'my-7 h-[240px] w-[190px] max-w-full object-contain sm:h-[280px] sm:w-[220px]'} />
            )}
            {children}
            <Link href={route('roadmap')} className={`${betaButton} mt-6`}><MapOutlinedIcon fontSize="small" />Lihat Roadmap</Link>
        </main>
        <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-3 border-t border-gray-100 px-5 py-4 text-sm text-[#486052] sm:px-8">
            <span>&copy; {new Date().getFullYear()} TokuUp</span>
        </footer>
    </div>;
}
