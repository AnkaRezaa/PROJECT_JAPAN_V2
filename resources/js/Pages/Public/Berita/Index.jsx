import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import GuestFooter from '@/Components/Layout/GuestFooter';
import SeoHead from '@/Components/SEO/SeoHead';
import NewsPreview from '@/Components/Features/News/NewsPreview';
import Pagination from '@/Components/Features/Table/Pagination';
import SearchIcon from '@mui/icons-material/Search';

export default function Index({ news, filters = {}, categories = [], seo }) {
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || '');
    const [busy, setBusy] = useState(false);
    const submit = event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        router.get(route('public.news.index'), { search: search.trim(), category }, {
            preserveScroll: true, onFinish: () => setBusy(false),
        });
    };
    const inputClass = 'mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-emerald-600 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-900 dark:text-white';

    return <>
        <SeoHead seo={seo} />
        <GuestNavbar />
        <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold">Berita</h1>
                <form onSubmit={submit} className="mt-8 grid items-end gap-4 border-b border-gray-200 pb-6 dark:border-gray-700 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <label className="min-w-0 text-sm font-semibold">Cari berita
                        <input type="search" maxLength={150} value={search} onChange={e => setSearch(e.target.value)} className={inputClass} />
                    </label>
                    <label className="text-sm font-semibold">Kategori
                        <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Semua kategori</option>
                            {categories.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}
                        </select>
                    </label>
                    <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60">
                        <SearchIcon aria-hidden="true" sx={{ fontSize: 18 }} />{busy ? 'Mencari...' : 'Cari'}
                    </button>
                </form>
                <section aria-label="Daftar berita" aria-busy={busy} className="mt-8">
                    {news.data.length ? <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                        {news.data.map(item => <NewsPreview key={item.id} item={item} />)}
                    </div> : <p role="status" className="py-16 text-center text-gray-600 dark:text-gray-300">{filters.search || filters.category ? 'Tidak ada berita yang sesuai.' : 'Belum ada berita.'}</p>}
                    <Pagination links={news.links} className="flex-wrap [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center dark:[&_a]:!text-gray-200 dark:[&_a.pointer-events-none]:!text-gray-500" />
                </section>
            </div>
        </main>
        <GuestFooter />
    </>;
}
