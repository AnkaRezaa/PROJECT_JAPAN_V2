import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import ChartCard from '@/Components/Features/Dashboard/ChartCard';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import NewsEditor from '@/Components/Features/Editor/NewsEditor';
import ArticleBody from '@/Components/Features/News/ArticleBody';
import JapaneseReading from '@/Components/Features/Learning/JapaneseReading';
import PopupManager from '@/Components/Features/Marketing/PopupManager';
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartEmpty, ChartTooltip, ChartTooltipContent } from '@/Components/UI/Chart';

const emptyNews = {
    title: '',
    excerpt: '',
    body: '',
    reading_blocks: [],
    slug: '',
    category: 'platform',
    status: 'draft',
    audience: 'students',
    is_pinned: false,
    scheduled_at: '',
    starts_at: '',
    ends_at: '',
    cover_image: null,
    cover_image_alt: '',
    cover_image_caption: '',
    seo_title: '',
    seo_description: '',
};

function statusClass(status) {
    if (status === 'Pinned') return 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400';
    if (status === 'Published') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
    if (status === 'Scheduled') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
    if (status === 'Archived') return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    return 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400';
}

export default function Konten({
    stats = [],
    news = { data: [], links: [] },
    popups = [],
    categories = [],
    updates = [],
    filters = {},
    contentStatusByType = [],
}) {
    const [activeTab, setActiveTab] = useState('news');
    const [editingNews, setEditingNews] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [attachmentType, setAttachmentType] = useState('image');
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const items = news?.data || [];

    const { data, setData, post, processing, errors, reset, transform } = useForm({ ...emptyNews });
    const filterForm = useForm({
        search: filters.search || '',
        status: filters.status || 'all',
        audience: filters.audience || 'all',
        pinned: filters.pinned || 'all',
    });

    const selectedNewsAttachments = useMemo(() => editingNews?.attachments || [], [editingNews]);

    useEffect(() => {
        return () => {
            if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
        };
    }, [coverPreviewUrl]);

    const handleCoverImageChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
        }
        if (file) {
            setCoverPreviewUrl(URL.createObjectURL(file));
            setData('cover_image', file);
        } else {
            setCoverPreviewUrl(null);
            setData('cover_image', null);
        }
    };

    const clearCoverImage = () => {
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
            setCoverPreviewUrl(null);
        }
        setData('cover_image', null);
    };

    const openCreate = () => {
        setEditingNews(null);
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
            setCoverPreviewUrl(null);
        }
        transform((values) => values);
        reset();
        setShowForm(true);
        setAttachmentFile(null);
        setVideoEmbedUrl('');
        setShowPreview(false);
    };

    const openEdit = (item) => {
        setEditingNews(item);
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
            setCoverPreviewUrl(null);
        }
        transform((values) => values);
        setData({
            title: item.title || '',
            excerpt: item.excerpt || '',
            body: item.body || '',
            reading_blocks: item.reading_blocks || [],
            slug: item.slug || '',
            category: item.category || 'platform',
            status: item.raw_status || 'draft',
            audience: item.raw_audience || 'students',
            is_pinned: Boolean(item.is_pinned),
            scheduled_at: item.scheduled_at || '',
            starts_at: item.starts_at || '',
            ends_at: item.ends_at || '',
            cover_image: null,
            cover_image_alt: item.cover_image_alt || '',
            cover_image_caption: item.cover_image_caption || '',
            seo_title: item.seo_title || '',
            seo_description: item.seo_description || '',
        });
        setShowForm(true);
        setAttachmentFile(null);
        setVideoEmbedUrl('');
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingNews(null);
        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
            setCoverPreviewUrl(null);
        }
        transform((values) => values);
        reset();
        setAttachmentFile(null);
        setVideoEmbedUrl('');
    };

    const submitNews = (e) => {
        e.preventDefault();

        const cleanReadingBlocks = (data.reading_blocks || []).filter(
            (b) => (b.japanese && b.japanese.trim()) || (b.reading && b.reading.trim())
        );

        const cleanScheduledAt = data.status === 'scheduled' ? data.scheduled_at : '';

        transform((values) => ({
            ...values,
            reading_blocks: cleanReadingBlocks,
            scheduled_at: cleanScheduledAt,
            ...(editingNews ? { _method: 'put' } : {}),
        }));

        const submitRoute = editingNews
            ? route('superadmin.content.news.update', editingNews.id)
            : route('superadmin.content.news.store');

        post(submitRoute, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                transform((values) => values);
                closeForm();
            },
            onError: () => {
                const modalBody = document.getElementById('news-form-scrollable');
                if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    const addReadingBlock = () => {
        setData('reading_blocks', [
            ...(data.reading_blocks || []),
            { japanese: '', reading: '', translation: '' },
        ]);
    };

    const updateReadingBlock = (index, field, value) => {
        setData('reading_blocks', data.reading_blocks.map((block, blockIndex) => (
            blockIndex === index ? { ...block, [field]: value } : block
        )));
    };

    const removeReadingBlock = (index) => {
        setData('reading_blocks', data.reading_blocks.filter((_, blockIndex) => blockIndex !== index));
    };

    const deleteNews = () => {
        router.delete(route('superadmin.content.news.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('superadmin.content'), filterForm.data, { preserveState: true, preserveScroll: true });
    };

    const uploadAttachment = async () => {
        if (!editingNews) return;
        if (attachmentType === 'video_embed' && !videoEmbedUrl.trim()) return;
        if (attachmentType !== 'video_embed' && !attachmentFile) return;

        try {
            const formData = new FormData();
            formData.append('type', attachmentType);

            if (attachmentType === 'video_embed') {
                formData.append('video_embed_url', videoEmbedUrl.trim());
            } else if (attachmentFile) {
                formData.append('file', attachmentFile);
            }

            await window.axios.post(route('superadmin.content.news.attachments.store', editingNews.id), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            router.reload({ only: ['news', 'updates'] });
            setAttachmentFile(null);
            setVideoEmbedUrl('');
        } catch (error) {
            alert(error.response?.data?.message || 'Gagal menambahkan attachment. Pastikan file valid.');
        }
    };

    const deleteAttachment = (attachment) => {
        if (!editingNews) return;

        openConfirm({
            variant: 'danger',
            title: 'Hapus Attachment?',
            message: 'File atau embed ini akan dilepas dari news yang sedang diedit.',
            details: [
                { label: 'News', value: editingNews.title },
                { label: 'Attachment', value: attachment.file_name || attachment.video_embed_url || `#${attachment.id}` },
            ],
            confirmLabel: 'Hapus',
            onConfirm: () => router.delete(route('superadmin.content.news.attachments.destroy', { news: editingNews.id, attachment: attachment.id }), {
                preserveScroll: true,
                onSuccess: () => router.reload({ only: ['news', 'updates'] }),
                onFinish: closeConfirm,
            }),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Konten" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Konten & News Maker</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Portal berita, review status publish, dan attachment dasar untuk dashboard student.
                        </p>
                    </div>
                    {activeTab === 'news' && (
                        <button
                            onClick={openCreate}
                            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700"
                        >
                            Buat News
                        </button>
                    )}
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('news')}
                        className={`border-b-2 px-4 py-3 text-sm font-black transition ${
                            activeTab === 'news'
                                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        News & Artikel
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('popups')}
                        className={`border-b-2 px-4 py-3 text-sm font-black transition ${
                            activeTab === 'popups'
                                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        Broadcast & Pop-up Iklan
                        {popups?.length > 0 && (
                            <span className="ml-2 rounded-full bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-400">
                                {popups.length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'news' ? (
                    <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                </div>

                <ChartCard title="Kesiapan Konten" subtitle="Status publish dan draft per jenis konten">
                    {contentStatusByType.some((item) => item.published || item.draft) ? (
                        <ChartContainer config={{ published: { label: 'Published', theme: { light: '#10b981', dark: '#34d399' } }, draft: { label: 'Draft / belum publish', theme: { light: '#f59e0b', dark: '#fbbf24' } } }}>
                            <BarChart data={contentStatusByType} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="fill-gray-400 text-xs" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                <Bar dataKey="published" name="Published" stackId="content" fill="var(--color-published)" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="draft" name="Draft / belum publish" stackId="content" fill="var(--color-draft)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    ) : <ChartEmpty>Belum ada konten yang dapat diringkas.</ChartEmpty>}
                </ChartCard>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                        <div className="flex flex-col gap-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">News Maker</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Simpan draf, jadwalkan, terbitkan, dan arsipkan berita platform.</p>
                            </div>

                            <form onSubmit={submitFilters} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <input
                                    value={filterForm.data.search}
                                    onChange={(e) => filterForm.setData('search', e.target.value)}
                                    placeholder="Cari judul..."
                                    className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white"
                                />
                                <select value={filterForm.data.status} onChange={(e) => filterForm.setData('status', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                    <option value="all">Semua status</option>
                                    <option value="draft">Draft</option>
                                    <option value="scheduled">Terjadwal</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                                <select value={filterForm.data.audience} onChange={(e) => filterForm.setData('audience', e.target.value)} className="h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                    <option value="all">Semua audience</option>
                                    <option value="students">Students</option>
                                    <option value="admins">Admins</option>
                                    <option value="all">All</option>
                                </select>
                                <div className="flex gap-3">
                                    <select value={filterForm.data.pinned} onChange={(e) => filterForm.setData('pinned', e.target.value)} className="h-11 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                        <option value="all">Pinned/all</option>
                                        <option value="yes">Pinned</option>
                                        <option value="no">Non pinned</option>
                                    </select>
                                    <button className="rounded-xl bg-gray-900 px-4 text-sm font-black text-white dark:bg-white dark:text-gray-900">Filter</button>
                                </div>
                            </form>
                        </div>

                        <div className="mt-5 space-y-4">
                            {items.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-10 text-center text-sm font-bold text-gray-400">
                                    Belum ada news.
                                </div>
                            )}

                            {items.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <div className="h-28 w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 sm:w-40 sm:shrink-0">
                                            {item.thumbnail_url ? (
                                            <img src={item.thumbnail_url} alt={item.cover_image_alt || item.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-2xl font-black text-brand-200 dark:from-gray-800 dark:to-gray-900 dark:text-gray-700">
                                                    JP
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white">{item.title}</h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.excerpt || item.audience}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>
                                            {item.status}
                                        </span>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">{item.category?.replaceAll('-', ' ')}</span>
                                                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-400">{item.audience}</span>
                                                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-400">{item.attachments.length} attachment</span>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{item.schedule}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-black text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="rounded-lg border border-brand-100 dark:border-brand-900/30 px-3 py-2 text-xs font-black text-brand-600 dark:text-brand-400 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {news?.links && news.links.length > 3 && (
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {news.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-xl px-4 py-2 text-sm font-bold ${link.active ? 'bg-brand-600 text-white' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Status Konten</h2>
                            <div className="mt-4 space-y-3">
                                {[
                                    'Draf tidak terlihat oleh user sampai diterbitkan.',
                                    'Berita terjadwal akan dipublikasikan otomatis oleh scheduler server.',
                                    'Gambar utama memakai alt text agar lebih ramah aksesibilitas.',
                                ].map((item) => (
                                    <div key={item} className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Update Terbaru</h2>
                            <div className="mt-4 space-y-3">
                                {updates.length === 0 && (
                                    <p className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-sm font-medium text-gray-400">
                                        Belum ada aktivitas konten.
                                    </p>
                                )}

                                {updates.map((item, index) => (
                                    <div key={item.id || `${item.item}-${item.by}-${item.created_at || index}`} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{item.item}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold text-gray-600 dark:text-gray-400">{item.by}</span>
                                            <span className="rounded-full bg-brand-50 dark:bg-brand-900/20 px-3 py-1 text-xs font-black text-brand-700 dark:text-brand-400">{item.state}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
                    </>
                ) : (
                    <PopupManager popups={popups} />
                )}
            </div>

            {showForm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[1000] bg-gray-950/60">
                    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950">
                        <div className="shrink-0 border-b border-gray-100 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:p-6">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">{editingNews ? 'Edit News' : 'Buat News Baru'}</h3>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Workspace fullscreen untuk menulis, mengatur publikasi, dan mengelola media berita.</p>
                        </div>

                        <form onSubmit={submitNews} className="flex min-h-0 flex-1 flex-col">
                            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px]">
                                <div id="news-form-scrollable" className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6 lg:p-8">
                                    {Object.keys(errors).length > 0 && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">!</span>
                                                <h4 className="text-sm font-black text-red-800 dark:text-red-300">
                                                    Terdapat {Object.keys(errors).length} kesalahan pada formulir, mohon periksa bidang berikut:
                                                </h4>
                                            </div>
                                            <ul className="mt-2 list-inside list-disc space-y-1 text-xs font-bold text-red-700 dark:text-red-400">
                                                {Object.entries(errors).map(([field, msg]) => (
                                                    <li key={field}>{msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">
                                            Judul <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Masukkan judul berita"
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        />
                                        {errors.title && <p className="mt-1 text-xs font-bold text-red-500">{errors.title}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Ringkasan</label>
                                        <input
                                            value={data.excerpt}
                                            onChange={(e) => setData('excerpt', e.target.value)}
                                            placeholder="Ringkasan singkat isi berita (opsional)"
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.excerpt ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        />
                                        {errors.excerpt && <p className="mt-1 text-xs font-bold text-red-500">{errors.excerpt}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Isi Berita</label>
                                        <NewsEditor
                                            value={data.body}
                                            onChange={(value) => setData('body', value)}
                                            uploadImageUrl={route('superadmin.content.news.editor-images.store')}
                                        />
                                        {errors.body && <p className="mt-1 text-xs font-bold text-red-500">{errors.body}</p>}
                                    </div>
                                    <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20 sm:p-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white">Bantuan Baca Jepang</h4>
                                                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Tambahkan reading kana dan terjemahan per bagian. Bagian yang kosong akan dibersihkan otomatis.</p>
                                            </div>
                                            <button type="button" onClick={addReadingBlock} className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black text-white hover:bg-sky-700">Tambah Bagian</button>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {(data.reading_blocks || []).map((block, index) => {
                                                const japError = errors[`reading_blocks.${index}.japanese`];
                                                const readError = errors[`reading_blocks.${index}.reading`];
                                                const transError = errors[`reading_blocks.${index}.translation`];

                                                return (
                                                    <div key={index} className="rounded-xl border border-sky-100 bg-white p-4 dark:border-sky-900/40 dark:bg-gray-900">
                                                        <div className="grid gap-3 lg:grid-cols-2">
                                                            <label className="space-y-1.5">
                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                    Teks Jepang <span className="text-red-500">*</span>
                                                                </span>
                                                                <textarea
                                                                    rows={2}
                                                                    value={block.japanese}
                                                                    onChange={(event) => updateReadingBlock(index, 'japanese', event.target.value)}
                                                                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-950 dark:text-white ${
                                                                        japError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                />
                                                                {japError && <p className="text-xs font-bold text-red-500">{japError}</p>}
                                                            </label>
                                                            <label className="space-y-1.5">
                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                    Reading kana <span className="text-red-500">*</span>
                                                                </span>
                                                                <textarea
                                                                    rows={2}
                                                                    value={block.reading}
                                                                    onChange={(event) => updateReadingBlock(index, 'reading', event.target.value)}
                                                                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-950 dark:text-white ${
                                                                        readError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                />
                                                                {readError && <p className="text-xs font-bold text-red-500">{readError}</p>}
                                                            </label>
                                                            <label className="space-y-1.5 lg:col-span-2">
                                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Terjemahan Indonesia</span>
                                                                <textarea
                                                                    rows={2}
                                                                    value={block.translation}
                                                                    onChange={(event) => updateReadingBlock(index, 'translation', event.target.value)}
                                                                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-950 dark:text-white ${
                                                                        transError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                />
                                                                {transError && <p className="text-xs font-bold text-red-500">{transError}</p>}
                                                            </label>
                                                        </div>
                                                        <button type="button" onClick={() => removeReadingBlock(index)} className="mt-3 text-xs font-black text-rose-600 hover:text-rose-700">Hapus bagian</button>
                                                    </div>
                                                );
                                            })}
                                            {(data.reading_blocks || []).length === 0 && <p className="rounded-xl border border-dashed border-sky-200 px-4 py-6 text-center text-xs font-bold text-sky-700 dark:border-sky-900/50 dark:text-sky-300">Belum ada bantuan baca.</p>}
                                        </div>
                                        {errors.reading_blocks && <p className="mt-2 text-xs font-bold text-red-500">{errors.reading_blocks}</p>}
                                    </section>
                                </div>

                                <div className="min-h-0 space-y-4 overflow-y-auto border-t border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:p-6 xl:border-l xl:border-t-0">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Kategori</label>
                                        <select
                                            value={data.category}
                                            onChange={(e) => setData('category', e.target.value)}
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.category ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            {categories.map((category) => (
                                                <option key={category} value={category}>{category.replaceAll('-', ' ')}</option>
                                            ))}
                                        </select>
                                        {errors.category && <p className="mt-1 text-xs font-bold text-red-500">{errors.category}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
                                        <select
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.status ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="scheduled">Terjadwal</option>
                                            <option value="published">Terbitkan sekarang</option>
                                            <option value="archived">Arsip</option>
                                        </select>
                                        {errors.status && <p className="mt-1 text-xs font-bold text-red-500">{errors.status}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Audience</label>
                                        <select
                                            value={data.audience}
                                            onChange={(e) => setData('audience', e.target.value)}
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-bold text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.audience ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            <option value="students">Students</option>
                                            <option value="admins">Admins</option>
                                            <option value="all">All</option>
                                        </select>
                                        {errors.audience && <p className="mt-1 text-xs font-bold text-red-500">{errors.audience}</p>}
                                    </div>
                                    {data.status === 'scheduled' && (
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">
                                                Jadwalkan Terbit <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={data.scheduled_at}
                                                onChange={(e) => setData('scheduled_at', e.target.value)}
                                                className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                    errors.scheduled_at ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.scheduled_at && <p className="mt-1 text-xs font-bold text-red-500">{errors.scheduled_at}</p>}
                                        </div>
                                    )}
                                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Gambar Utama</label>
                                            {coverPreviewUrl ? (
                                                <div className="mb-3 space-y-2">
                                                    <img src={coverPreviewUrl} alt="Preview baru" className="aspect-[16/9] w-full rounded-lg object-cover ring-2 ring-brand-500" />
                                                    <div className="flex items-center justify-between">
                                                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Preview Gambar Baru</span>
                                                        <button type="button" onClick={clearCoverImage} className="text-xs font-bold text-red-500 hover:underline">Hapus pilihan</button>
                                                    </div>
                                                </div>
                                            ) : editingNews?.cover_url && (
                                                <div className="mb-3">
                                                    <img src={editingNews.cover_url} alt={editingNews.cover_image_alt || editingNews.title} className="aspect-[16/9] w-full rounded-lg object-cover" />
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                onChange={handleCoverImageChange}
                                                className={`block w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-bold file:text-brand-700 dark:file:bg-brand-900/30 dark:file:text-brand-300 ${
                                                    errors.cover_image ? 'border border-red-500 rounded-lg p-1' : ''
                                                }`}
                                            />
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">JPG, PNG, atau WebP. Maksimum 4 MB.</p>
                                            {errors.cover_image && <p className="mt-1 text-xs font-bold text-red-500">{errors.cover_image}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">
                                                Alt gambar {Boolean(data.cover_image || editingNews?.cover_url) && <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                value={data.cover_image_alt}
                                                onChange={(e) => setData('cover_image_alt', e.target.value)}
                                                placeholder="Deskripsi gambar untuk aksesibilitas"
                                                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 dark:bg-gray-950 dark:text-white ${
                                                    errors.cover_image_alt ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.cover_image_alt && <p className="mt-1 text-xs font-bold text-red-500">{errors.cover_image_alt}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Keterangan gambar</label>
                                            <input
                                                value={data.cover_image_caption}
                                                onChange={(e) => setData('cover_image_caption', e.target.value)}
                                                placeholder="Opsional"
                                                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 dark:bg-gray-950 dark:text-white ${
                                                    errors.cover_image_caption ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.cover_image_caption && <p className="mt-1 text-xs font-bold text-red-500">{errors.cover_image_caption}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">URL & pencarian</p>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Slug URL</label>
                                            <input
                                                value={data.slug}
                                                onChange={(e) => setData('slug', e.target.value)}
                                                placeholder="Dibuat otomatis dari judul"
                                                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 dark:bg-gray-950 dark:text-white ${
                                                    errors.slug ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.slug && <p className="mt-1 text-xs font-bold text-red-500">{errors.slug}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Judul SEO</label>
                                            <input
                                                value={data.seo_title}
                                                onChange={(e) => setData('seo_title', e.target.value)}
                                                maxLength={70}
                                                placeholder="Opsional, maksimal 70 karakter"
                                                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 dark:bg-gray-950 dark:text-white ${
                                                    errors.seo_title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.seo_title && <p className="mt-1 text-xs font-bold text-red-500">{errors.seo_title}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Deskripsi SEO</label>
                                            <textarea
                                                value={data.seo_description}
                                                onChange={(e) => setData('seo_description', e.target.value)}
                                                maxLength={160}
                                                rows={3}
                                                placeholder="Opsional, maksimal 160 karakter"
                                                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-950 dark:text-white ${
                                                    errors.seo_description ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            />
                                            {errors.seo_description && <p className="mt-1 text-xs font-bold text-red-500">{errors.seo_description}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Mulai tampil</label>
                                        <input
                                            type="datetime-local"
                                            value={data.starts_at}
                                            onChange={(e) => setData('starts_at', e.target.value)}
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.starts_at ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        />
                                        {errors.starts_at && <p className="mt-1 text-xs font-bold text-red-500">{errors.starts_at}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">Berhenti tampil</label>
                                        <input
                                            type="datetime-local"
                                            value={data.ends_at}
                                            onChange={(e) => setData('ends_at', e.target.value)}
                                            className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-white ${
                                                errors.ends_at ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        />
                                        {errors.ends_at && <p className="mt-1 text-xs font-bold text-red-500">{errors.ends_at}</p>}
                                    </div>
                                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                                        <input type="checkbox" checked={data.is_pinned} onChange={(e) => setData('is_pinned', e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-focus" />
                                        Pin di dashboard
                                    </label>

                                    {editingNews && (
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white">Attachments</h4>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Attachment hanya bisa ditambah setelah news tersimpan.</p>
                                            <div className="mt-4 space-y-3">
                                                {selectedNewsAttachments.map((attachment) => (
                                                    <div key={attachment.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-sm">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-bold text-gray-900 dark:text-white">{attachment.file_name}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{attachment.file_type}</p>
                                                            </div>
                                                            <button type="button" onClick={() => deleteAttachment(attachment)} className="text-xs font-black text-red-600 dark:text-red-400">Hapus</button>
                                                        </div>
                                                        {attachment.url && <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand-600 dark:text-brand-400">Buka file</a>}
                                                        {attachment.video_embed_url && <a href={attachment.video_embed_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand-600 dark:text-brand-400">Buka video</a>}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                <select value={attachmentType} onChange={(e) => setAttachmentType(e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-bold text-gray-900 dark:text-white">
                                                    <option value="image">Image</option>
                                                    <option value="document">Document</option>
                                                    <option value="video_embed">Video Embed</option>
                                                </select>
                                                {attachmentType === 'video_embed' ? (
                                                    <input value={videoEmbedUrl} onChange={(e) => setVideoEmbedUrl(e.target.value)} placeholder="https://youtube.com/..." className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-gray-900 dark:text-white" />
                                                ) : (
                                                    <input type="file" onChange={(e) => setAttachmentFile(e.target.files[0] || null)} accept={attachmentType === 'image' ? '.jpg,.jpeg,.png,.webp' : '.pdf,.doc,.docx'} className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-3 file:text-sm file:font-black file:text-brand-600" />
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={attachmentType === 'video_embed' ? !videoEmbedUrl.trim() : !attachmentFile}
                                                    onClick={uploadAttachment}
                                                    className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white transition disabled:opacity-50 dark:bg-white dark:text-gray-900"
                                                >
                                                    Tambah Attachment
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:p-6">
                                <button type="button" onClick={closeForm} className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300">Batal</button>
                                <button type="button" onClick={() => setShowPreview(true)} className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-black text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300">
                                    Preview
                                </button>
                                <button disabled={processing} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700 disabled:opacity-60">
                                    {processing ? 'Menyimpan...' : editingNews ? 'Simpan News' : 'Buat News'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {showPreview && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[1100] overflow-y-auto bg-gray-950/70 p-4 sm:p-6">
                    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-950">
                        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Preview News</p>
                                <h3 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Tampilan sebelum publish</h3>
                            </div>
                            <button type="button" onClick={() => setShowPreview(false)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                Tutup Preview
                            </button>
                        </div>

                        <article>
                            <header className="bg-gray-50 px-5 py-8 dark:bg-gray-900/40 sm:px-8">
                                <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider">
                                    <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">{data.category?.replaceAll('-', ' ') || 'platform'}</span>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{data.status || 'draft'}</span>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{data.audience || 'students'}</span>
                                    {data.is_pinned && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Pinned</span>}
                                </div>
                                <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-gray-900 dark:text-white md:text-5xl">
                                    {data.title || 'Judul berita belum diisi'}
                                </h1>
                                {data.excerpt && (
                                    <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg">
                                        {data.excerpt}
                                    </p>
                                )}
                            </header>

                            {(coverPreviewUrl || editingNews?.cover_url) && (
                                <div className="px-5 pt-6 sm:px-8">
                                    <figure>
                                        <img
                                            src={coverPreviewUrl || editingNews?.cover_url}
                                            alt={data.cover_image_alt || data.title || 'Cover image'}
                                            className="max-h-[420px] w-full rounded-2xl object-cover shadow-sm"
                                        />
                                        {data.cover_image_caption && (
                                            <figcaption className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {data.cover_image_caption}
                                            </figcaption>
                                        )}
                                    </figure>
                                </div>
                            )}

                            <div className="px-5 py-8 sm:px-8">
                                <ArticleBody html={data.body} className="prose-lg" />

                                {data.reading_blocks?.filter((b) => b.japanese?.trim() || b.reading?.trim()).length > 0 && (
                                    <section className="mt-8 space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
                                        <div>
                                            <h4 className="text-base font-black text-gray-900 dark:text-white">Bantuan Baca</h4>
                                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Pratinjau pembacaan kanji, romaji, dan terjemahan bahasa Indonesia.</p>
                                        </div>
                                        {data.reading_blocks
                                            .filter((b) => b.japanese?.trim() || b.reading?.trim())
                                            .map((block, idx) => (
                                                <div key={idx} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                                                    <JapaneseReading
                                                        japanese={block.japanese}
                                                        reading={block.reading}
                                                        translation={block.translation}
                                                        forcePreferences={{ showRomaji: true, showTranslation: true }}
                                                        className="text-base font-bold leading-7 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            ))}
                                    </section>
                                )}
                            </div>
                        </article>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmActionDialog
                show={Boolean(deleteTarget)}
                variant="danger"
                title="Hapus News?"
                message="News akan dihapus dari portal berita dan dashboard student."
                details={[
                    { label: 'Judul', value: deleteTarget?.title },
                    { label: 'Attachment', value: deleteTarget?.attachments?.length || 0 },
                ]}
                confirmLabel="Hapus"
                onConfirm={deleteNews}
                onCancel={() => setDeleteTarget(null)}
            />
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
