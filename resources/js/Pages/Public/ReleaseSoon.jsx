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
            <div className="flex min-h-screen min-h-[100svh] flex-col bg-[#f8faf8] text-[#172b24] [color-scheme:light]">
                <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-16">
                    <ApplicationLogo className="!h-11 !w-auto !transform-none !filter-none sm:!h-14" />
                    <span className="border-l border-[#172b24]/20 pl-4 text-xs font-semibold uppercase text-[#486052] sm:pl-6">Pra-rilis</span>
                </header>

                <main className="flex w-full flex-1 flex-col">
                    <section aria-labelledby="release-heading" className="relative isolate flex min-h-[360px] flex-1 overflow-hidden bg-[#286c9a] sm:min-h-[440px] lg:min-h-[480px]">
                        <img
                            src={japanImage}
                            alt=""
                            aria-hidden="true"
                            fetchpriority="high"
                            className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[40%_top] sm:object-top"
                        />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-black/20" />
                        <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 sm:py-12 lg:px-16">
                            <h1 id="release-heading" className="m-0 max-w-3xl text-[68px] font-extrabold leading-[1.02] text-white [text-shadow:0_2px_14px_rgb(0_0_0_/_0.12)] sm:text-[112px] lg:text-[136px]">
                                Release<span className="block">soon.</span>
                            </h1>
                        </div>
                    </section>

                    <div className="mx-auto grid w-full max-w-[1440px] gap-7 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:px-16">
                        <div>
                            <p className="max-w-lg text-xl font-semibold leading-8 sm:text-2xl sm:leading-9">Belajar bahasa Jepang bersama <span className="whitespace-nowrap text-[#147347]">TOKU-UP</span></p>
                            <p className="mt-2 text-sm leading-6 text-[#486052] sm:text-base">
                                Pendaftaran beta untuk <strong className="font-bold text-[#172b24]">50 peserta.</strong>
                            </p>
                        </div>

                        <div className="w-full lg:min-w-[380px]">
                            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3" aria-label="Pendaftaran dan Instagram">
                                <button
                                    type="button"
                                    disabled
                                    data-registration-button
                                    aria-describedby="beta-registration-status"
                                    className="flex min-h-[52px] cursor-not-allowed items-center justify-center gap-3 rounded-md border border-[#b7c9bc] bg-[#e0ebe3] px-3 py-3 text-sm font-bold text-[#4b6254] sm:px-5"
                                >
                                    Daftar Beta
                                    <NorthEastIcon aria-hidden="true" sx={{ fontSize: 18 }} />
                                </button>
                                {instagramUrl ? (
                                    <a
                                        href={instagramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Instagram TOKU-UP (tab baru)"
                                        data-instagram-action
                                        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md border border-[#147347] bg-white px-3 py-3 text-sm font-semibold text-[#147347] transition-colors hover:bg-[#e9f2eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147347] focus-visible:ring-offset-4 sm:px-5"
                                    >
                                        <InstagramIcon aria-hidden="true" sx={{ fontSize: 19 }} />
                                        Instagram
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        data-instagram-action
                                        aria-label="Instagram belum tersedia"
                                        title="Tautan Instagram segera tersedia"
                                        className="inline-flex min-h-[52px] cursor-not-allowed items-center justify-center gap-2 rounded-md border border-[#c8d3cc] bg-transparent px-3 py-3 text-sm font-semibold text-[#627469] sm:px-5"
                                    >
                                        <InstagramIcon aria-hidden="true" sx={{ fontSize: 19 }} />
                                        Instagram
                                    </button>
                                )}
                            </div>
                            <p id="beta-registration-status" className="mt-3 text-sm leading-6 text-[#506557]">
                                Pendaftaran segera dibuka.
                            </p>
                        </div>
                    </div>
                </main>

                <footer className="mx-auto w-full max-w-[1440px] border-t border-[#172b24]/15 px-6 py-5 text-xs text-[#506557] sm:px-10 lg:px-16">
                    <p>&copy; {new Date().getFullYear()} TOKU-UP</p>
                </footer>
            </div>
        </>
    );
}
