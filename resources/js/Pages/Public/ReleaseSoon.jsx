import React from 'react';
import { usePage } from '@inertiajs/react';
import InstagramIcon from '@mui/icons-material/Instagram';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import ApplicationLogo from '@/Components/Navigation/ApplicationLogo';
import SeoHead from '@/Components/SEO/SeoHead';
import japanImage from '@/../Images/Mount-Fuji-New.jpg';

export default function ReleaseSoon({ seo = {} }) {
    const { socialLinks = {} } = usePage().props;
    const instagramUrl = socialLinks.instagram;

    return (
        <>
            <SeoHead seo={seo} />
            <div className="relative isolate flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[#f5f8f7] text-[#172b24] [color-scheme:light]">
                <img
                    src={japanImage}
                    alt=""
                    aria-hidden="true"
                    fetchpriority="high"
                    className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[36%_center] sm:object-center"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-white/85" />

                <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-7 sm:px-10 sm:py-9">
                    <ApplicationLogo className="!h-8 !w-auto !transform-none !filter-none sm:!h-10" />
                    <span className="text-xs font-semibold uppercase text-[#486052]">Pra-rilis</span>
                </header>

                <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:py-20">
                    <p className="mb-6 text-sm font-semibold text-[#476454]">Belajar bahasa Jepang bersama <span className="whitespace-nowrap">TOKU-UP</span></p>
                    <h1 className="m-0 text-[64px] font-extrabold leading-[1.02] sm:text-[100px] lg:text-[120px]">
                        Release<span className="block text-[#147347]">soon.</span>
                    </h1>
                    <p className="mt-7 max-w-sm text-base leading-7 text-[#40594d] sm:text-lg">
                        Pendaftaran beta untuk <strong className="font-bold text-[#172b24]">50 peserta.</strong>
                    </p>

                    <div className="mt-9 w-full max-w-[280px]">
                        <button
                            type="button"
                            disabled
                            aria-describedby="beta-registration-status"
                            className="flex min-h-[52px] w-full cursor-not-allowed items-center justify-center gap-6 rounded-md border border-[#b7c9bc] bg-[#e0ebe3] px-6 py-3 text-base font-bold text-[#4b6254]"
                        >
                            Daftar Beta
                            <NorthEastIcon aria-hidden="true" sx={{ fontSize: 19 }} />
                        </button>
                        <p id="beta-registration-status" className="mt-3 text-sm leading-6 text-[#506557]">
                            Pendaftaran segera dibuka.
                        </p>
                    </div>
                </main>

                <footer className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 border-t border-[#172b24]/15 px-6 py-6 text-sm text-[#40594d] sm:flex-row sm:px-10">
                    <p>&copy; {new Date().getFullYear()} TOKU-UP</p>
                    {instagramUrl && (
                        <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram TOKU-UP (tab baru)"
                            className="inline-flex min-h-11 items-center gap-2 rounded-sm px-1 font-semibold transition-colors hover:text-[#147347] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147347] focus-visible:ring-offset-4"
                        >
                            <InstagramIcon aria-hidden="true" sx={{ fontSize: 20 }} />
                            Instagram
                            <NorthEastIcon aria-hidden="true" sx={{ fontSize: 15 }} />
                        </a>
                    )}
                </footer>
            </div>
        </>
    );
}
