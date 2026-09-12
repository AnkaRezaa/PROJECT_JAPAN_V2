import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArticleBody from '@/Components/Features/News/ArticleBody';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';

export default function NewsShow({ newsItem, relatedNews = [] }) {
    const images = newsItem.attachments.filter((item) => item.file_type === 'image');
    const documents = newsItem.attachments.filter((item) => item.file_type === 'document');
    const videos = newsItem.attachments.filter((item) => item.file_type === 'video_embed');
    const cover = newsItem.thumbnail_url || newsItem.cover_url || images[0]?.url;

    return (
        <AuthenticatedLayout>
            <Head title={newsItem.seo_title || `${newsItem.title} - TOKU-UP News`}>
                <meta name="description" content={newsItem.seo_description || newsItem.excerpt || 'Berita terbaru dari TOKU-UP.'} />
            </Head>

            <main className="min-h-screen bg-transparent pb-16 dark:bg-gray-950">
                <article>
                    <header className="border-b border-gray-100 bg-gray-50 py-8 dark:border-gray-800 dark:bg-gray-900/40">
                        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                            <Link href={route('user.news.index')} className="inline-flex items-center gap-2 text-sm font-black text-brand-600 dark:text-brand-400">
                                <ArrowBackIcon sx={{ fontSize: 18 }} />
                                Kembali ke Portal Berita
                            </Link>
                            <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700 dark:bg-[#12351f] dark:text-green-200">{newsItem.category?.replaceAll('-', ' ') || 'platform'}</span>
                                <AccessTimeIcon sx={{ fontSize: 15 }} />
                                {newsItem.published_label || 'TOKU-UP News'}
                                <span aria-hidden="true">·</span>
                                <span>{newsItem.reading_time_minutes || 1} menit baca</span>
                            </div>
                            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-gray-900 dark:text-white md:text-5xl">
                                {newsItem.title}
                            </h1>
                            {newsItem.excerpt && (
                                <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg">
                                    {newsItem.excerpt}
                                </p>
                            )}
                        </div>
                    </header>

                    {cover && (
                        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
                            <figure>
                                <img src={cover} alt={newsItem.cover_image_alt || newsItem.title} className="max-h-[520px] w-full rounded-3xl object-cover shadow-sm" />
                                {newsItem.cover_image_caption && <figcaption className="mt-3 text-sm text-gray-500 dark:text-gray-400">{newsItem.cover_image_caption}</figcaption>}
                            </figure>
                        </div>
                    )}

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
                        <div className="min-w-0">
                            <ArticleBody html={newsItem.body} />

                            {newsItem.reading_blocks?.length > 0 && (
                                <section className="mt-8 space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
                                    <div>
                                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Bantuan Baca</h2>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Romaji dan terjemahan mengikuti pengaturan akun Anda.</p>
                                    </div>
                                    {newsItem.reading_blocks.map((block, index) => (
                                        <div key={`${block.japanese}-${index}`} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
                                            <JapaneseReading {...block} className="text-lg font-bold leading-8 text-gray-900 dark:text-white" />
                                        </div>
                                    ))}
                                </section>
                            )}

                            {images.length > 1 && (
                                <section className="mt-10">
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Galeri</h2>
                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {images.slice(1).map((item) => (
                                            <img key={item.id} src={item.url} alt={item.file_name} className="aspect-[16/10] rounded-2xl object-cover" />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {videos.length > 0 && (
                                <section className="mt-10 space-y-4">
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Video Terkait</h2>
                                    {videos.map((item) => (
                                        <a key={item.id} href={item.video_embed_url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-brand-400">
                                            {item.video_embed_url}
                                        </a>
                                    ))}
                                </section>
                            )}
                        </div>

                        <aside className="space-y-6">
                            {documents.length > 0 && (
                                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Lampiran</h2>
                                    <div className="mt-4 space-y-3">
                                        {documents.map((item) => (
                                            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 text-sm font-bold text-gray-700 hover:text-brand-600 dark:border-gray-800 dark:text-gray-300 dark:hover:text-brand-400">
                                                <AttachFileIcon sx={{ fontSize: 18 }} />
                                                <span className="min-w-0 truncate">{item.file_name}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Ditulis oleh</h2>
                                <p className="mt-3 text-sm font-bold text-gray-700 dark:text-gray-300">{newsItem.author_name || 'TOKU-UP'}</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{newsItem.reading_time_minutes || 1} menit waktu baca</p>
                            </div>

                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Berita Lainnya</h2>
                                <div className="mt-4 space-y-4">
                                    {relatedNews.map((item) => (
                                        <Link key={item.id} href={route('user.news.show', item.slug || item.id)} className="block border-b border-gray-100 pb-4 last:border-0 last:pb-0 dark:border-gray-800">
                                            <p className="text-sm font-black leading-snug text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">{item.title}</p>
                                            <p className="mt-1 text-xs font-bold text-gray-400">{item.published_label}</p>
                                        </Link>
                                    ))}
                                    {relatedNews.length === 0 && (
                                        <p className="text-sm text-gray-400">Belum ada rekomendasi lain.</p>
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                </article>
            </main>
        </AuthenticatedLayout>
    );
}
