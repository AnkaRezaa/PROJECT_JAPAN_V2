import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmActionDialog from '@/Components/UI/ConfirmActionDialog';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const emptyForm = {
    curriculum_track_id: '',
    level_id: '',
    title: '',
    description: '',
    instructor_name: '',
    thumbnail_url: '',
    thumbnail_file: null,
    status: 'draft',
    sort_order: 1,
};

const inputClass = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-focus focus:ring-4 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/30';

function StatusBadge({ status }) {
    const isPublished = status === 'published';

    return (
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${isPublished ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
            {isPublished ? 'Terbit' : 'Draf'}
        </span>
    );
}

function Field({ label, children, wide = false }) {
    return (
        <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-400">{label}</span>
            {children}
        </label>
    );
}

const optionCardTones = {
    orange: {
        card: 'hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-800 dark:hover:bg-orange-950/20',
        icon: 'bg-orange-600',
    },
    charcoal: {
        card: 'hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-800',
        icon: 'bg-gray-900 dark:bg-gray-700',
    },
    sky: {
        card: 'hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-800 dark:hover:bg-sky-950/20',
        icon: 'bg-sky-600',
    },
    teal: {
        card: 'hover:border-teal-300 hover:bg-teal-50 dark:hover:border-teal-800 dark:hover:bg-teal-950/20',
        icon: 'bg-teal-600',
    },
};

function OptionCard({ href, icon, label, description, tone = 'orange' }) {
    const colors = optionCardTones[tone] || optionCardTones.orange;
    const className = `group flex min-h-16 w-full cursor-pointer items-center justify-start rounded-lg border border-gray-200 bg-white p-3 text-left transition duration-200 dark:border-gray-700 dark:bg-gray-900 sm:p-4 ${colors.card}`;
    const content = (
        <>
            <span className={`mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${colors.icon}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-gray-900 dark:text-white">{label}</span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">{description}</span>
            </span>
            <ChevronRightIcon className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-600 dark:text-gray-600" sx={{ fontSize: 20 }} />
        </>
    );

    return (
        <Link href={href} className={className}>{content}</Link>
    );
}

export default function ManajemenKelas({ programs = {}, tracks = [], levels = [], filters = {} }) {
    const { auth } = usePage().props;
    const isAdminGlobal = auth?.user?.admin_scope !== 'kloter';
    const rows = programs.data || [];
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [managingProgram, setManagingProgram] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
    const thumbnailFileInputRef = useRef(null);
    const form = useForm(emptyForm);
    const availableLevels = levels.filter((level) => (
        String(level.curriculum_track_id) === String(form.data.curriculum_track_id)
    ));

    const openCreate = () => {
        setEditing(null);
        setThumbnailPreviewUrl('');
        form.setData(emptyForm);
        setShowForm(true);
    };

    const openEdit = (program) => {
        setEditing(program);
        form.setData({
            curriculum_track_id: program.curriculum_track_id || '',
            level_id: program.level_id || '',
            title: program.title || '',
            description: program.description || '',
            instructor_name: program.instructor_name || '',
            thumbnail_url: program.thumbnail_url || '',
            thumbnail_file: null,
            status: program.status || 'published',
            sort_order: program.sort_order || 1,
        });
        setThumbnailPreviewUrl(program.thumbnail_url || '');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        setThumbnailPreviewUrl('');
        form.reset();
    };

    useEffect(() => () => {
        if (thumbnailPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(thumbnailPreviewUrl);
        }
    }, [thumbnailPreviewUrl]);

    const selectThumbnailFile = (event) => {
        const file = event.target.files?.[0] || null;

        form.setData((current) => ({
            ...current,
            thumbnail_file: file,
            thumbnail_url: '',
        }));
        setThumbnailPreviewUrl(file ? URL.createObjectURL(file) : '');
    };

    const setThumbnailUrl = (event) => {
        const thumbnailUrl = event.target.value;

        form.setData((current) => ({
            ...current,
            thumbnail_file: null,
            thumbnail_url: thumbnailUrl,
        }));
        if (thumbnailFileInputRef.current) {
            thumbnailFileInputRef.current.value = '';
        }
        setThumbnailPreviewUrl(thumbnailUrl);
    };

    const submitFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.programs.index'), { search, status }, { preserveState: true, replace: true });
    };

    const submitForm = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, forceFormData: true, onSuccess: closeForm };

        if (editing) {
            form.transform((data) => ({ ...data, _method: 'put' })).post(route('admin.programs.update', editing.id), options);
            return;
        }

        form.transform((data) => data).post(route('admin.programs.store'), options);
    };

    const confirmDelete = () => {
        router.delete(route('admin.programs.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Kelas" />

            <div className="min-h-screen bg-surface-muted">
                <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-[1.5rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm dark:border-orange-900/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
                                    <SchoolIcon sx={{ fontSize: 25 }} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-700">Pengelolaan Kelas</p>
                                    <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">Manajemen Kelas</h1>
                                    <p className="mt-2 max-w-2xl text-sm font-semibold text-gray-500 dark:text-gray-400">
                                        Atur thumbnail, judul, pengajar, status, dan urutan kelas yang tampil di halaman user.
                                    </p>
                                </div>
                            </div>

                            <button onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-black text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-700">
                                <AddIcon sx={{ fontSize: 18 }} />
                                Tambah Kelas
                            </button>
                        </div>
                    </section>

                    <section className="rounded-[1.35rem] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                            <label className="flex h-11 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-950">
                                <SearchIcon sx={{ fontSize: 18 }} className="text-gray-400" />
                                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kelas atau pengajar..." className="w-full border-0 bg-transparent text-sm font-semibold outline-none focus:ring-0 dark:text-white" />
                            </label>
                            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                <option value="all">Semua Status</option>
                                <option value="published">Terbit</option>
                                <option value="draft">Draf</option>
                            </select>
                            <button className="h-11 rounded-2xl bg-gray-950 px-5 text-sm font-black text-white dark:bg-white dark:text-gray-950">Filter</button>
                        </form>
                    </section>

                    <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                        {rows.map((program) => (
                            <article key={program.id} className="overflow-hidden rounded-[1.4rem] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600">
                                    {program.thumbnail_url ? (
                                        <img src={program.thumbnail_url} alt={program.title} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-white/80">
                                            <ImageOutlinedIcon sx={{ fontSize: 54 }} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/25 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            <StatusBadge status={program.status} />
                                            {program.curriculum_track && <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black text-white backdrop-blur">{program.curriculum_track.name}</span>}
                                            {program.level && <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black text-white backdrop-blur">{program.level.level_name}</span>}
                                        </div>
                                        <h2 className="text-2xl font-black text-white">{program.title}</h2>
                                    </div>
                                </div>

                                <div className="space-y-4 p-5">
                                    <p className="line-clamp-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{program.description || 'Belum ada deskripsi.'}</p>
                                    <div className="grid gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <GroupsIcon sx={{ fontSize: 18 }} className="text-gray-400" />
                                            {program.instructor_name || 'Pengajar belum diisi'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MenuBookIcon sx={{ fontSize: 18 }} className="text-gray-400" />
                                            {program.modules_count || 0} minggu terbit
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setManagingProgram(program)}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-700"
                                    >
                                        <MenuBookIcon sx={{ fontSize: 18 }} />
                                        Kelola Isi
                                    </button>
                                </div>
                            </article>
                        ))}
                    </section>

                    {rows.length === 0 && (
                        <section className="rounded-[1.4rem] border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
                            <SchoolIcon sx={{ fontSize: 44 }} className="text-gray-300" />
                            <h2 className="mt-4 text-lg font-black text-gray-900 dark:text-white">Belum ada kelas</h2>
                            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Buat kelas pertama sebagai wadah roadmap mingguan.</p>
                        </section>
                    )}

                    {programs.links && programs.links.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {programs.links.map((link, index) => (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${link.active ? 'bg-brand-600 text-white shadow-md' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'} ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <AnimatePresence>
                {managingProgram && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-x-0 bottom-0 top-16 z-[75] flex items-stretch justify-end bg-gray-950/55 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setManagingProgram(null);
                        }
                    }}
                >
                    <motion.section
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="manage-class-title"
                        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-6"
                    >
                        <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:-mx-6 sm:-mt-6 sm:px-6">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Kelola Isi Kelas</p>
                                <h2 id="manage-class-title" className="mt-1 truncate text-xl font-black text-gray-900 dark:text-white">
                                    {managingProgram.title}
                                </h2>
                                <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Pilih bagian yang ingin dikerjakan.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setManagingProgram(null)}
                                aria-label="Tutup panel kelola kelas"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <CloseIcon sx={{ fontSize: 19 }} />
                            </button>
                        </div>

                        <div className="mt-6 space-y-2">
                            <OptionCard
                                href={route('admin.modules.index', { program_id: managingProgram.id, focus: 'roadmap' })}
                                icon={<AccountTreeIcon sx={{ fontSize: 20 }} />}
                                label="Roadmap Kelas"
                                description="Susun Week, Day, urutan belajar, dan ujian."
                                tone="orange"
                            />

                            <OptionCard
                                href={route('admin.live-classes.create', { program_id: managingProgram.id })}
                                icon={<VideoCameraFrontIcon sx={{ fontSize: 20 }} />}
                                label="Ruang Kelas"
                                description="Jadwalkan atau mulai sesi live bersama kloter."
                                tone="charcoal"
                            />

                            {isAdminGlobal && <OptionCard
                                href={route('admin.modules.index', { program_id: managingProgram.id, focus: 'presentation' })}
                                icon={<SlideshowIcon sx={{ fontSize: 20 }} />}
                                label="Materi Presentasi"
                                description="Kelola PPT resmi yang tampil pada materi kelas."
                                tone="sky"
                            />}

                            <OptionCard
                                href={route('admin.modules.index', { program_id: managingProgram.id, focus: 'flashcard' })}
                                icon={<QuizOutlinedIcon sx={{ fontSize: 20 }} />}
                                label="Kuis & Repetisi"
                                description="Kelola soal, repetisi, dan latihan menulis kanji."
                                tone="teal"
                            />
                        </div>

                        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 bg-white/95 px-5 pb-5 pt-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
                            <button
                                type="button"
                                onClick={() => {
                                    const program = managingProgram;
                                    setManagingProgram(null);
                                    openEdit(program);
                                }}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                Edit Info
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const program = managingProgram;
                                    setManagingProgram(null);
                                    setDeleteTarget(program);
                                }}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-100 px-3 py-2 text-xs font-black text-brand-600 transition hover:bg-brand-50 dark:border-brand-900/40 dark:hover:bg-brand-950/20"
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                Hapus Kelas
                            </button>
                        </div>
                    </motion.section>
                </motion.div>
                )}
            </AnimatePresence>

            {showForm && (
                <div className="fixed inset-0 z-[110] overflow-y-auto bg-gray-950/60 p-3 backdrop-blur-sm sm:p-5">
                    <div className="mx-auto my-6 max-w-6xl overflow-hidden rounded-[1.6rem] bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                            <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Pengaturan Kelas</p>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">{editing ? 'Edit Kelas' : 'Tambah Kelas'}</h2>
                            </div>
                            <button onClick={closeForm} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        <form onSubmit={submitForm} className="grid gap-0 lg:grid-cols-[380px_minmax(0,1fr)]">
                            <aside className="bg-gradient-to-br from-orange-500 to-rose-600 p-6 text-white">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">Preview Kelas</p>
                                <div className="mt-6 overflow-hidden rounded-[1.4rem] bg-white/15 shadow-xl backdrop-blur">
                                    <div className="relative h-48 bg-white/10">
                                        {thumbnailPreviewUrl ? (
                                            <img src={thumbnailPreviewUrl} alt={form.data.title || 'Preview kelas'} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <ImageOutlinedIcon sx={{ fontSize: 54 }} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h3 className="text-2xl font-black">{form.data.title || 'Judul Kelas'}</h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm font-bold text-white/75">{form.data.instructor_name || 'Nama pengajar'}</p>
                                        <p className="mt-2 line-clamp-3 text-sm font-semibold text-white/70">{form.data.description || 'Deskripsi kelas akan tampil di sini.'}</p>
                                    </div>
                                </div>
                            </aside>

                            <div className="max-h-[78vh] overflow-y-auto p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Judul Kelas" wide>
                                <input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} placeholder="Contoh: JLPT N4 Mingguan atau SSW Careworker" className={inputClass} />
                                    </Field>
                                    <Field label="Nama Pengajar">
                                        <input value={form.data.instructor_name} onChange={(event) => form.setData('instructor_name', event.target.value)} placeholder="Masukkan nama pengajar" className={inputClass} />
                                    </Field>
                                    <Field label="Jalur Kurikulum">
                                        <select
                                            value={form.data.curriculum_track_id}
                                            onChange={(event) => {
                                                form.setData((current) => ({
                                                    ...current,
                                                    curriculum_track_id: event.target.value,
                                                    level_id: '',
                                                }));
                                            }}
                                            className={inputClass}
                                        >
                                            <option value="">Pilih jalur</option>
                                            {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Level">
                                        <select value={form.data.level_id} onChange={(event) => form.setData('level_id', event.target.value)} disabled={!form.data.curriculum_track_id} className={inputClass}>
                                            <option value="">Tanpa Level</option>
                                            {availableLevels.map((level) => <option key={level.id} value={level.id}>{level.level_name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Thumbnail Kelas" wide>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label className="block rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3 transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-orange-800 dark:hover:bg-orange-950/20">
                                                <span className="mb-2 flex items-center gap-2 text-sm font-black text-gray-800 dark:text-gray-100">
                                                    <ImageOutlinedIcon sx={{ fontSize: 18 }} /> Unggah Gambar
                                                </span>
                                                <input
                                                    ref={thumbnailFileInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    onChange={selectThumbnailFile}
                                                    className="block w-full text-xs font-semibold text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:text-xs file:font-black file:text-orange-700 hover:file:bg-orange-200 dark:text-gray-300 dark:file:bg-orange-900/30 dark:file:text-orange-300"
                                                />
                                                <span className="mt-2 block text-xs font-medium text-gray-500 dark:text-gray-400">PNG, JPG, JPEG, atau WebP. Maks. 5 MB.</span>
                                            </label>
                                            <label className="block">
                                                <span className="mb-2 block text-sm font-black text-gray-800 dark:text-gray-100">URL Gambar Eksternal</span>
                                                <input type="text" inputMode="url" value={form.data.thumbnail_url} onChange={setThumbnailUrl} placeholder="https://contoh.com/thumbnail-kelas.webp" className={inputClass} />
                                                <span className="mt-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Gunakan URL file gambar langsung, bukan halaman Google Drive atau Canva.</span>
                                            </label>
                                        </div>
                                    </Field>
                                    <Field label="Deskripsi" wide>
                                        <textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} placeholder="Ringkasan kelas" className={`${inputClass} min-h-28`} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.data.status} onChange={(event) => form.setData('status', event.target.value)} className={inputClass}>
                                            <option value="published">Terbit</option>
                                            <option value="draft">Draf</option>
                                        </select>
                                    </Field>
                                    <Field label="Urutan Tampil">
                                        <input type="number" min="1" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value)} className={inputClass} />
                                    </Field>
                                </div>

                                {Object.values(form.errors).length > 0 && <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-600 dark:bg-brand-950/30">{Object.values(form.errors)[0]}</p>}

                                <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-gray-100 bg-white/95 pt-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
                                    <button type="button" onClick={closeForm} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                                    <button disabled={form.processing} className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{form.processing ? 'Menyimpan...' : 'Simpan Kelas'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmActionDialog
                show={Boolean(deleteTarget)}
                variant="danger"
                title="Hapus Kelas?"
                message="Kelas hanya bisa dihapus jika belum memiliki modul atau konten terkait."
                details={[
                    { label: 'Kelas', value: deleteTarget?.title },
                    { label: 'Pengajar', value: deleteTarget?.instructor_name || deleteTarget?.instructor || '-' },
                ]}
                confirmLabel="Hapus"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </AuthenticatedLayout>
    );
}
