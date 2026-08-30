import React from 'react';
import { Link } from '@inertiajs/react';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import Footer from '@/Components/Layout/GuestFooter';
import SeoHead from '@/Components/SEO/SeoHead';

export default function LegalPage({ title, updatedAt, intro, sections = [], seo = {} }) {
    return (
        <>
            <SeoHead seo={seo} />
            <GuestNavbar />

            <main className="bg-slate-50">
                <section className="border-b border-slate-200 bg-white px-5 py-12 sm:px-6 lg:px-20">
                    <div className="mx-auto max-w-4xl">
                        <Link href="/" className="text-sm font-bold text-brand-700 no-underline hover:text-brand-600">
                            Kembali ke beranda
                        </Link>
                        <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-brand-700">
                            Dokumen Legal
                        </p>
                        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                            {intro}
                        </p>
                        <p className="mt-5 text-xs font-bold text-slate-400">
                            Terakhir diperbarui: {updatedAt}
                        </p>
                    </div>
                </section>

                <section className="px-5 py-10 sm:px-6 sm:py-14 lg:px-20">
                    <div className="mx-auto max-w-4xl space-y-4">
                        {sections.map((section) => (
                            <article key={section.heading} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="text-lg font-black text-slate-950">
                                    {section.heading}
                                </h2>
                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    {section.body}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
