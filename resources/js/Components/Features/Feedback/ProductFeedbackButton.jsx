import React, { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import CloseIcon from '@mui/icons-material/Close';

const categories = [
    { value: 'bug', label: 'Ada kendala' },
    { value: 'suggestion', label: 'Saran fitur' },
    { value: 'content', label: 'Materi belajar' },
    { value: 'payment', label: 'Pembayaran' },
    { value: 'other', label: 'Lainnya' },
];

export default function ProductFeedbackButton() {
    const [open, setOpen] = useState(false);
    const closeButtonRef = useRef(null);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        category: 'bug',
        message: '',
        page_url: '',
    });

    useEffect(() => {
        if (!open) return undefined;
        setData('page_url', `${window.location.pathname}${window.location.search}`);
        closeButtonRef.current?.focus();

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [open]);

    const submit = (event) => {
        event.preventDefault();
        post(route('product-feedback.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    const close = () => {
        clearErrors();
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-black text-emerald-700 shadow-lg shadow-gray-900/10 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-900/60 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 sm:bottom-5 sm:right-5"
                aria-label="Kirim feedback"
            >
                <FeedbackOutlinedIcon sx={{ fontSize: 19 }} />
                <span className="hidden sm:inline">Feedback</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center bg-gray-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
                    <section role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">Bantu TOKU-UP</p>
                                <h2 id="feedback-title" className="mt-1 text-xl font-black text-gray-900 dark:text-white">Kirim feedback</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">Ceritakan kendala atau saran secara singkat. Halaman ini akan ikut tercatat.</p>
                            </div>
                            <button ref={closeButtonRef} type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Tutup form feedback">
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>

                        <form onSubmit={submit} className="mt-5 space-y-4">
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Kategori</span>
                                <select value={data.category} onChange={(event) => setData('category', event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                    {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Pesan</span>
                                <textarea
                                    value={data.message}
                                    onChange={(event) => setData('message', event.target.value)}
                                    rows={5}
                                    maxLength={3000}
                                    placeholder="Contoh: tombol tidak merespons setelah saya menyelesaikan kuis..."
                                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-6 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                                <span className="mt-1 flex justify-between gap-3 text-xs text-gray-400">
                                    <span>{errors.message || errors.category || ''}</span>
                                    <span>{data.message.length}/3000</span>
                                </span>
                            </label>
                            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                <button type="button" onClick={close} className="min-h-11 rounded-xl px-4 text-sm font-black text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
                                <button disabled={processing || data.message.trim().length < 10} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                                    {processing ? 'Mengirim...' : 'Kirim'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
