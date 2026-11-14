import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormField, { formInputClass } from '@/Components/UI/FormField';
import Pagination from '@/Components/Features/Table/Pagination';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Ulasan({ reviews, filters = {}, programs = [] }) {
    const [selected, setSelected] = useState(null);
    const form = useForm({ status: 'hidden', reason: '' });
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const filter = (changes) => router.get(route('superadmin.course-reviews.index'), { ...filters, ...changes }, { preserveScroll: true });
    const select = (review) => {
        setSelected(review);
        form.setData({ status: review.status === 'published' ? 'hidden' : 'published', reason: '' });
        form.clearErrors();
    };
    const submit = (event) => {
        event.preventDefault();
        if (!selected || form.processing) return;
        openConfirm({
            title: form.data.status === 'hidden' ? 'Sembunyikan ulasan?' : 'Pulihkan ulasan?',
            message: 'Perubahan berlaku pada daftar dan rating publik.', confirmLabel: 'Terapkan',
            onConfirm: () => {
                setConfirmProcessing(true);
                form.patch(route('superadmin.course-reviews.update', selected.id), { preserveScroll: true, onSuccess: () => setSelected(null), onFinish: closeConfirm });
            },
        });
    };
    const buttonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800';
    return <AuthenticatedLayout>
        <Head title="Ulasan kelas - Superadmin" />
        <section aria-label="Moderasi ulasan kelas" className="mx-auto max-w-7xl space-y-6 px-4 py-6 text-gray-900 sm:px-6 dark:text-gray-100">
            <header>
                <Link href={route('superadmin.content')} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><ArrowBackIcon sx={{ fontSize: 18 }} />Konten</Link>
                <h1 className="mt-2 text-2xl font-bold">Ulasan kelas</h1>
            </header>
            <div className="flex flex-wrap gap-4">
                <FormField label="Kelas"><select aria-label="Filter kelas" value={filters.program_id || ''} onChange={(event) => filter({ program_id: event.target.value })} className={formInputClass()}><option value="">Semua kelas</option>{programs.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}</select></FormField>
                <FormField label="Status"><select aria-label="Filter status" value={filters.status || ''} onChange={(event) => filter({ status: event.target.value })} className={formInputClass()}><option value="">Semua status</option><option value="published">Tampil</option><option value="hidden">Disembunyikan</option></select></FormField>
            </div>
            {selected && <form onSubmit={submit} className="space-y-4 border-y border-gray-200 py-5 dark:border-gray-800">
                <h2 className="break-words font-semibold">{selected.username} · {selected.program_title}</h2>
                <FormField label="Alasan" required error={form.errors.reason}><textarea aria-label="Alasan moderasi" required maxLength={1000} rows={3} value={form.data.reason} disabled={form.processing} onChange={(event) => form.setData('reason', event.target.value)} className={formInputClass(Boolean(form.errors.reason))} /></FormField>
                {form.errors.status && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{form.errors.status}</p>}
                <div className="flex flex-wrap gap-3"><button disabled={form.processing} className={buttonClass}>{form.data.status === 'hidden' ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}{form.data.status === 'hidden' ? 'Sembunyikan' : 'Pulihkan'}</button><button type="button" disabled={form.processing} onClick={() => setSelected(null)} className={buttonClass}>Batal</button></div>
            </form>}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-b border-gray-300 dark:border-gray-700"><tr>{['Siswa / Kelas', 'Rating', 'Komentar', 'Status', 'Aksi'].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {reviews.data.map(review => <tr key={review.id} className="align-top">
                            <td className="max-w-[220px] break-words px-3 py-4"><span className="font-semibold">{review.username}</span><span className="mt-1 block text-gray-600 dark:text-gray-300">{review.program_title}</span></td>
                            <td className="px-3 py-4">{review.rating}/5</td>
                            <td className="max-w-sm whitespace-pre-wrap break-words px-3 py-4">{review.comment || '-'}{review.moderation_reason && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Alasan: {review.moderation_reason}</p>}</td>
                            <td className="px-3 py-4">{review.status === 'published' ? 'Tampil' : 'Disembunyikan'}</td>
                            <td className="px-3 py-4"><button type="button" disabled={form.processing} onClick={() => select(review)} className={buttonClass}>{review.status === 'published' ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}{review.status === 'published' ? 'Sembunyikan' : 'Pulihkan'}</button></td>
                        </tr>)}
                        {!reviews.data.length && <tr><td colSpan={5} className="py-10 text-center text-gray-600 dark:text-gray-300">Belum ada ulasan.</td></tr>}
                    </tbody>
                </table>
            </div>
            <Pagination links={reviews.links} className="flex-wrap [&_a]:min-h-[44px] dark:[&_a]:text-gray-200" />
        </section>
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    </AuthenticatedLayout>;
}
