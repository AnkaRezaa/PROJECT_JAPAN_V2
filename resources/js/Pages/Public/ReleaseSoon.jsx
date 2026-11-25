import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import InstagramIcon from '@mui/icons-material/Instagram';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SeoHead from '@/Components/SEO/SeoHead';
import BetaPage, { betaButton } from '@/Components/Features/Beta/BetaPage';

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/toku.up/';
const PAGE_SIZE = 12;

export default function ReleaseSoon({ seo = {}, beta = {} }) {
    const { socialLinks = {}, instagramFeed = [] } = usePage().props;
    const instagramUrl = socialLinks.instagram || DEFAULT_INSTAGRAM_URL;
    const available = beta.enabled && !beta.released && beta.registration_open && beta.participants < beta.limit;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const visiblePosts = instagramFeed.slice(0, visibleCount);
    const remaining = Math.max(0, instagramFeed.length - visiblePosts.length);

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

            {/* Instagram Feed Section di Halaman Depan (Container Lebar) */}
            <section className="mt-10 w-full rounded-2xl border border-gray-200 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 text-left shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-sm">
                            <InstagramIcon />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-[#172b24]">
                                @toku.up
                                {instagramFeed.length > 0 && (
                                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-[#167b3c]">
                                        {instagramFeed.length} Postingan
                                    </span>
                                )}
                            </p>
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

                {visiblePosts.length > 0 && (
                    <>
                        <div
                            className={`mt-6 grid gap-4 ${
                                visiblePosts.length === 1
                                    ? 'mx-auto max-w-sm grid-cols-1'
                                    : visiblePosts.length === 2
                                        ? 'mx-auto max-w-3xl grid-cols-1 sm:grid-cols-2'
                                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                            }`}
                        >
                            {visiblePosts.map((post) => (
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

                        {remaining > 0 && (
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                                    className="inline-flex min-h-[42px] items-center rounded-xl border border-[#167b3c] bg-white px-5 py-2 text-xs font-bold text-[#167b3c] transition hover:bg-emerald-50"
                                >
                                    Tampilkan {Math.min(PAGE_SIZE, remaining)} Postingan Lagi ({remaining} tersisa)
                                </button>
                                {remaining > PAGE_SIZE && (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount(instagramFeed.length)}
                                        className="inline-flex min-h-[42px] items-center rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
                                    >
                                        Tampilkan Semua ({instagramFeed.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
        </BetaPage>
    );
}
