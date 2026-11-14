import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import GuestFooter from '@/Components/Layout/GuestFooter';
import FormField, { formInputClass } from '@/Components/UI/FormField';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import FeedbackRatingStars from '@/Components/Features/UniversalFeedback/FeedbackRatingStars';
import Pagination from '@/Components/Features/Table/Pagination';
import StarIcon from '@mui/icons-material/Star';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Ulasan({ program, reviews, summary, filters, ownReview, canReview, reviewBlockedReason, learningContext = false }) {
    const [editing, setEditing] = useState(false);
    const [filtering, setFiltering] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const form = useForm({ rating: ownReview?.rating || 0, comment: ownReview?.comment || '' });
    const listUrl = route(learningContext ? 'user.kelas.reviews.index' : 'public.classes.reviews', program.slug);
    const materialUrl = route(learningContext ? 'user.modul.program' : 'public.classes.show', program.slug);
    const updateFilters = (values) => {
        setFiltering(true);
        router.get(listUrl, { ...filters, ...values }, { preserveState: true, preserveScroll: true, onFinish: () => setFiltering(false) });
    };
    const openEditor = () => {
        form.setData({ rating: ownReview?.rating || 0, comment: ownReview?.comment || '' });
        form.clearErrors();
        setEditing(true);
    };
    const save = (event) => {
        event.preventDefault();
        if (form.processing) return;
        form.put(route('user.kelas.reviews.update', program.slug), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };
    const remove = () => openConfirm({
        title: 'Hapus ulasan?', message: 'Rating dan komentarmu akan dihapus.', confirmLabel: 'Hapus', variant: 'danger',
        onConfirm: () => {
            setConfirmProcessing(true);
            setDeleting(true);
            router.delete(route('user.kelas.reviews.destroy', program.slug), {
                preserveScroll: true, onSuccess: () => setEditing(false), onFinish: () => { setDeleting(false); closeConfirm(); },
            });
        },
    });
    const actionClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800';
    const PageContent = learningContext ? 'div' : 'main';
    const body = <>
        <Head title={`Ulasan - ${program.title}`} />
        <PageContent className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
            <header className="border-b border-gray-200 dark:border-gray-800">
                <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
                    <Link href={learningContext ? route('user.kelas.index') : materialUrl} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 dark:text-gray-300"><ArrowBackIcon sx={{ fontSize: 18 }} />{learningContext ? 'Kelas Saya' : 'Tentang kelas'}</Link>
                    <p className="mt-2 break-words text-sm text-gray-600 dark:text-gray-300">{program.title}</p>
                    <h1 className="mt-1 text-2xl font-bold">Ulasan kelas</h1>
                    <nav aria-label="Navigasi kelas" className="mt-5 flex gap-6 text-sm font-semibold">
                        <Link href={materialUrl} className="inline-flex min-h-[44px] items-center border-b-2 border-transparent text-gray-600 hover:text-emerald-700 dark:text-gray-300">{learningContext ? 'Materi' : 'Tentang kelas'}</Link>
                        <Link href={listUrl} aria-current="page" className="inline-flex min-h-[44px] items-center border-b-2 border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300">Ulasan</Link>
                    </nav>
                </div>
            </header>
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
                <aside aria-label="Ringkasan rating" className="border-b border-gray-200 pb-6 lg:border-b-0 lg:pb-0 dark:border-gray-800">
                    <h2 className="text-base font-semibold">Rating kelas</h2>
                    <p className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-bold">{summary.average === null ? '-' : Number(summary.average).toFixed(1)}</span><span className="text-sm text-gray-500 dark:text-gray-400">/ 5</span></p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{summary.count} penilaian</p>
                    <div className="mt-5 space-y-3">
                        {summary.distribution.map(({ rating, count }) => <div key={rating} className="flex items-center gap-2 text-xs">
                            <span className="inline-flex w-7 shrink-0 items-center gap-1">{rating}<StarIcon sx={{ fontSize: 14 }} className="text-amber-600 dark:text-amber-400" /></span>
                            <div role="meter" aria-label={`${rating} bintang`} aria-valuenow={count} aria-valuemin={0} aria-valuemax={Math.max(summary.count, 1)} className="h-2 flex-1 overflow-hidden rounded bg-gray-100 dark:bg-gray-800"><div className="h-full bg-amber-500" style={{ width: `${summary.count ? count / summary.count * 100 : 0}%` }} /></div>
                            <span className="w-8 shrink-0 text-right text-gray-600 dark:text-gray-300">{count}</span>
                        </div>)}
                    </div>
                </aside>
                <section className="min-w-0" aria-label="Ulasan siswa">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
                        <div>
                            <h2 className="text-lg font-semibold">Semua ulasan</h2>
                            {!canReview && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{reviewBlockedReason}</p>}
                            {ownReview && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Ulasanmu: {ownReview.rating}/5{ownReview.status === 'hidden' ? ' · Disembunyikan' : ''}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {canReview && !editing && <button type="button" onClick={openEditor} className={actionClass}><EditOutlinedIcon sx={{ fontSize: 18 }} />{ownReview ? 'Edit ulasan' : 'Tulis ulasan'}</button>}
                            {ownReview && <button type="button" onClick={remove} disabled={deleting || form.processing} className={actionClass}><DeleteOutlineIcon sx={{ fontSize: 18 }} />Hapus</button>}
                        </div>
                    </div>
                    {editing && canReview && <form onSubmit={save} className="space-y-4 border-b border-gray-200 py-6 dark:border-gray-800">
                        <fieldset disabled={form.processing}>
                            <legend className="mb-2 text-sm font-semibold">Rating</legend>
                            <FeedbackRatingStars rating={form.data.rating} onRatingChange={(value) => { form.setData('rating', value); form.clearErrors('rating'); }} disabled={form.processing} className="[&_button]:min-h-[44px] [&_button]:min-w-[44px] [&_button.text-slate-300]:text-gray-500 dark:[&_button.text-slate-300]:text-gray-400" />
                            {form.errors.rating && <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">{form.errors.rating}</p>}
                        </fieldset>
                        <FormField label="Komentar" error={form.errors.comment}>
                            <textarea aria-label="Komentar" rows={4} maxLength={1000} value={form.data.comment} disabled={form.processing} onChange={(event) => form.setData('comment', event.target.value)} className={formInputClass(Boolean(form.errors.comment), 'resize-y')} placeholder="Pengalaman belajarmu (opsional)" />
                        </FormField>
                        <div className="flex gap-3">
                            <button disabled={form.processing || deleting} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"><SaveOutlinedIcon sx={{ fontSize: 18 }} />{form.processing ? 'Menyimpan...' : 'Simpan'}</button>
                            <button type="button" disabled={form.processing} onClick={() => setEditing(false)} className={actionClass}>Batal</button>
                        </div>
                    </form>}
                    <div className="flex flex-wrap gap-4 py-5">
                        <FormField label="Bintang"><select aria-label="Filter bintang" value={filters.rating || ''} disabled={filtering} onChange={(event) => updateFilters({ rating: event.target.value })} className={formInputClass()}><option value="">Semua</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} bintang</option>)}</select></FormField>
                        <FormField label="Urutan"><select aria-label="Urutan" value={filters.sort} disabled={filtering} onChange={(event) => updateFilters({ sort: event.target.value })} className={formInputClass()}><option value="newest">Terbaru</option><option value="highest">Tertinggi</option><option value="lowest">Terendah</option></select></FormField>
                    </div>
                    <div aria-busy={filtering} className="divide-y divide-gray-200 dark:divide-gray-800">
                        {reviews.data.map(review => <article key={review.id} className="py-5">
                            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-sm font-semibold">{review.username}</h3><time dateTime={review.updated_at} className="text-xs text-gray-500 dark:text-gray-400">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(review.updated_at))}</time></div>
                            <p className="mt-2 inline-flex items-center gap-1 text-sm" aria-label={`${review.rating} dari 5 bintang`}><StarIcon sx={{ fontSize: 18 }} className="text-amber-600 dark:text-amber-400" />{review.rating}/5</p>
                            {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-gray-200">{review.comment}</p>}
                        </article>)}
                        {!reviews.data.length && <p className="py-10 text-sm text-gray-600 dark:text-gray-300">{summary.count ? 'Tidak ada ulasan untuk filter ini.' : 'Belum ada ulasan.'}</p>}
                    </div>
                    <Pagination links={reviews.links} className="flex-wrap [&_a]:min-h-[44px] dark:[&_a]:text-gray-200" />
                </section>
            </div>
        </PageContent>
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    </>;

    return learningContext ? <AuthenticatedLayout header={false}>{body}</AuthenticatedLayout> : <><GuestNavbar />{body}<GuestFooter /></>;
}
