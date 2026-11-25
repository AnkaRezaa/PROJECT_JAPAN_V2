import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import InstagramIcon from '@mui/icons-material/Instagram';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SeoHead from '@/Components/SEO/SeoHead';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/toku.up/';

export default function ReleaseSoon({ seo = {}, beta = {} }) {
    const { socialLinks = {}, instagramFeed = [] } = usePage().props;
    const instagramUrl = socialLinks.instagram || DEFAULT_INSTAGRAM_URL;
    const available = beta.enabled && !beta.released && beta.registration_open && beta.participants < beta.limit;

    return (
        <BetaPage>
            <SeoHead seo={seo} />
            <h1 className="text-4xl font-bold sm:text-5xl">Release soon.</h1>
            <p className="mt-4 text-xl font-semibold">Belajar bahasa Jepang bersama TOKU-UP</p>
            <p className="mt-3 text-sm text-[#486052]">Pendaftaran beta untuk <strong>50 peserta.</strong></p>
            {available ? (
                <Link href={route('public.beta.register')} data-registration-button className={`${betaButton} mt-6 bg-[#167b3c] text-white`}>
                    Daftar Beta
                </Link>
            ) : (
                <button disabled data-registration-button className={`${betaButton} mt-6 cursor-not-allowed opacity-50`}>
                    Daftar Beta
                </button>
            )}
            <p id="beta-registration-status" className="mt-3 text-sm text-[#486052]">
                {available
                    ? 'Pendaftaran dibuka.'
                    : beta.released
                        ? 'Prapendaftaran beta sudah ditutup.'
                        : beta.enabled && beta.participants >= beta.limit
                            ? 'Kuota beta penuh.'
                            : 'Pendaftaran segera dibuka.'}
            </p>

            {/* Instagram Feed Section di Halaman Depan */}
            <section className="mt-10 w-full rounded-2xl border border-gray-200 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 text-left shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-sm">
                            <InstagramIcon />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-[#172b24]">@toku.up</p>
                            <p className="text-xs text-[#486052]">Update kosakata, tips bahasa Jepang & kabar terbaru TOKU-UP</p>
                        </div>
                    </div>
                    <a
                        data-instagram-action
                        aria-label="Instagram TOKU-UP (tab baru)"
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#167b3c] px-4 py-2 text-xs font-bold text-white transition hover:bg-green-800"
                    >
                        <span>Ikuti @toku.up</span>
                        <OpenInNewIcon sx={{ fontSize: 15 }} />
                    </a>
                </div>

                {instagramFeed.length > 0 && (
                    <div className={`mt-5 grid gap-4 ${instagramFeed.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : instagramFeed.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                        {instagramFeed.map((post) => (
                            <div key={post.code} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                                <iframe
                                    src={post.embed_url}
                                    title={`Instagram ${post.code}`}
                                    loading="lazy"
                                    className="h-[430px] w-full border-0"
                                    allowTransparency
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </BetaPage>
    );
}
