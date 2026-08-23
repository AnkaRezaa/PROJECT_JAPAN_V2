import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import LearningResourceCreateDialog from '@/Components/Admin/LearningResourceCreateDialog';
import ModuleDayDialog from '@/Components/Admin/ModuleDayDialog';
import SearchableSelect from '@/Components/UI/SearchableSelect';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SlideshowIcon from '@mui/icons-material/Slideshow';

const focusLabels = {
    roadmap: 'Roadmap',
    flashcard: 'Kuis & Repetisi',
    presentation: 'Presentasi Mingguan',
};

const focusPageCopy = {
    roadmap: {
        title: 'Roadmap',
        description: 'Susun Minggu, Hari, dan urutan belajar dalam satu kelas.',
        emptyProgram: 'Buka workspace roadmap kelas.',
    },
    presentation: {
        title: 'Presentasi',
        description: 'Kelola presentasi pembuka, sela Hari, dan penutup pada setiap Minggu.',
        emptyProgram: 'Kelola presentasi mingguan kelas ini.',
    },
    flashcard: {
        title: 'Kuis & Repetisi',
        description: 'Kelola materi repetisi, kuis, dan latihan menulis untuk setiap Hari.',
        emptyProgram: 'Kelola latihan harian kelas ini.',
    },
};

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-orange-900/30';

function StatusBadge({ status = 'draft' }) {
    const published = status === 'published';

    return (
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
            published
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
        }`}>
            {published ? 'Terbit' : 'Draf'}
        </span>
    );
}

function ResourceStatus({ resources = [], emptyLabel = 'Belum dibuat' }) {
    if (resources.length === 0) {
        return <span className="text-xs font-bold text-gray-400">{emptyLabel}</span>;
    }

    const published = resources.filter((item) => item.status === 'published').length;
    const totalItems = resources.reduce((total, item) => total + Number(item.item_count || 0), 0);

    return (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {resources.length} materi / {totalItems} butir / {published} terbit
        </span>
    );
}

function ResourceRow({
    type,
    label,
    icon,
    tone,
    module,
    day,
    resources = [],
    focused = false,
    onCreate,
    createOptions = {},
    allowMultiple = false,
}) {
    const routeNames = {
        flashcard: 'admin.flashcards.builder',
        quiz: 'admin.quizzes.builder',
        presentation: 'admin.presentations.builder',
    };
    const toneClasses = {
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
        teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
        red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
        orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
    };

    return (
        <div className={`rounded-xl border transition ${
            focused ? 'border-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30' : 'border-gray-200 dark:border-gray-800'
        }`}>
            <div className="flex min-h-16 items-center gap-3 px-3 py-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-gray-900 dark:text-white">{label}</span>
                    <ResourceStatus resources={resources} />
                </span>
                {allowMultiple ? (
                    <button type="button" onClick={() => onCreate(type, module, day, createOptions)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900">
                        <AddIcon sx={{ fontSize: 15 }} />
                        Tambah
                    </button>
                ) : resources.length === 0 ? (
                    <button type="button" onClick={() => onCreate(type, module, day, createOptions)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900">
                        <AddIcon sx={{ fontSize: 15 }} />
                        Buat
                    </button>
                ) : resources.length === 1 ? (
                    <Link href={route(routeNames[type], resources[0].id)} className="inline-flex h-9 shrink-0 items-center rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900">
                        Buka Editor
                    </Link>
                ) : (
                    <span className="shrink-0 text-xs font-black text-gray-500 dark:text-gray-300">Pilih di bawah</span>
                )}
            </div>

            {(resources.length > 1 || (allowMultiple && resources.length > 0)) && (
                <div className="space-y-1 border-t border-gray-100 p-2 dark:border-gray-800">
                    {resources.map((resource) => (
                        <Link key={resource.id} href={route(routeNames[type], resource.id)} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800">
                            <span className="min-w-0">
                                <span className="block truncate font-bold text-gray-700 dark:text-gray-200">{resource.title}</span>
                                {allowMultiple && (
                                    <span className="mt-0.5 block text-[11px] font-semibold text-gray-400">
                                        {resource.item_count || 0} soal / {resource.attempt_count || 0} pengerjaan
                                    </span>
                                )}
                            </span>
                            <span className="shrink-0 text-xs font-black text-orange-600">Buka Editor</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function DailyPracticeRow({ module, day, onCreate, focused = false }) {
    const flashcardSets = day.flashcard_sets || [];
    const quizzes = day.quizzes || [];
    const primaryQuiz = quizzes[0] || null;
    const flashcardCount = flashcardSets.reduce(
        (total, set) => total + Number(set.item_count || 0),
        0,
    );
    const questionCount = quizzes.reduce(
        (total, quiz) => total + Number(quiz.item_count || 0),
        0,
    );
    const hasMaterial = flashcardSets.length > 0;
    const hasQuiz = quizzes.length > 0;
    const setupNextStep = () => {
        if (!hasMaterial) {
            onCreate('flashcard', module, day);
            return;
        }

        onCreate('quiz', module, day);
    };

    return (
        <div
            data-content-focus={focused ? 'flashcard' : undefined}
            className={`rounded-xl border p-3 transition ${
                focused
                    ? 'border-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30'
                    : 'border-gray-200 dark:border-gray-800'
            }`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    <QuizOutlinedIcon sx={{ fontSize: 19 }} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-gray-900 dark:text-white">Kuis & Repetisi</span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {flashcardCount} kartu repetisi / {questionCount} soal
                    </span>
                </span>
                <div className="flex flex-wrap gap-2">
                    {(!hasMaterial || !hasQuiz) && (
                        <button
                            type="button"
                            onClick={setupNextStep}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-teal-200 px-3 text-xs font-black text-teal-700 dark:border-teal-900/50 dark:text-teal-300"
                        >
                            <AddIcon sx={{ fontSize: 15 }} />
                            {!hasMaterial ? 'Siapkan Materi' : 'Buat Kuis'}
                        </button>
                    )}
                    {primaryQuiz && (
                        <Link
                            href={route('admin.quizzes.builder', primaryQuiz.id)}
                            className="inline-flex h-9 items-center rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900"
                        >
                            Buka Builder
                        </Link>
                    )}
                </div>
            </div>
            {(!hasMaterial || !hasQuiz || quizzes.length > 1) && (
                <p className="mt-2 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-400 dark:border-gray-800">
                    {!hasMaterial
                        ? 'Langkah 1 dari 2: siapkan materi repetisi, lalu buat kuis untuk Hari ini.'
                        : !hasQuiz
                            ? 'Langkah 2 dari 2: buat kuis agar latihan Hari ini dapat digunakan siswa.'
                            : `${quizzes.length} kuis tersedia; builder membuka kuis utama Hari ini.`}
                </p>
            )}
        </div>
    );
}

function WeeklyPresentationRow({ module, focused = false }) {
    const presentations = Array.isArray(module.weekly_presentations)
        ? module.weekly_presentations
        : Object.values(module.weekly_presentations || {}).filter(Boolean);
    const slots = [
        ['opening', 'Awal'],
        ['after_day', 'Antar Day'],
        ['closing', 'Akhir'],
    ];

    return (
        <div
            data-content-focus={focused ? 'presentation' : undefined}
            className={`rounded-xl border transition ${
                focused
                    ? 'border-sky-400 ring-2 ring-sky-100 dark:ring-sky-900/30'
                    : 'border-gray-200 dark:border-gray-800'
            }`}
        >
            <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                    <SlideshowIcon sx={{ fontSize: 19 }} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-gray-900 dark:text-white">Presentasi Mingguan</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                        {slots.map(([slot, label]) => {
                            const count = presentations.filter((deck) => deck.week_slot === slot).length;

                            return (
                                <span
                                    key={slot}
                                    className="rounded-md bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                >
                                    {label}: {count}
                                </span>
                            );
                        })}
                    </span>
                </span>
                <Link
                    href={route('admin.modules.presentations.builder', module.id)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900"
                >
                    Kelola Presentasi
                </Link>
            </div>
        </div>
    );
}

export default function ModulesIndex({ modules, levels = [], programs = [], filters = {} }) {
    const moduleItems = modules?.data || modules || [];
    const [selectedProgramId, setSelectedProgramId] = useState(filters.program_id || '');
    const [openModuleId, setOpenModuleId] = useState(filters.week_id ? Number(filters.week_id) : null);
    const [openDayId, setOpenDayId] = useState(filters.day_id ? Number(filters.day_id) : null);
    const [showModuleDialog, setShowModuleDialog] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [dayDialog, setDayDialog] = useState(null);
    const [resourceDialog, setResourceDialog] = useState(null);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const selectedProgram = programs.find((program) => String(program.id) === String(selectedProgramId));
    const focus = filters.focus || 'roadmap';
    const pageCopy = focusPageCopy[focus] || focusPageCopy.roadmap;
    const isRoadmapFocus = focus === 'roadmap';
    const isPresentationFocus = focus === 'presentation';
    const isPracticeFocus = focus === 'flashcard';

    const moduleForm = useForm({
        program_pembelajaran_id: selectedProgramId || '',
        level_id: selectedProgram?.level_id || selectedProgram?.level?.id || '',
        title: '',
        week_number: '',
        description: '',
        status: 'draft',
    });

    useEffect(() => {
        if (moduleItems.length === 0) {
            setOpenModuleId(null);
            setOpenDayId(null);
            return;
        }

        const targetModule = moduleItems.find((module) => module.id === Number(filters.week_id))
            || moduleItems.find((module) => (module.days || []).some((day) => day.id === Number(filters.day_id)))
            || moduleItems[0];
        setOpenModuleId((current) => {
            if (filters.week_id || filters.day_id) return targetModule.id;

            return current && moduleItems.some((module) => module.id === current) ? current : targetModule.id;
        });

        const targetDay = (targetModule.days || []).find((day) => day.id === Number(filters.day_id))
            || targetModule.days?.[0];
        setOpenDayId((current) => filters.day_id ? targetDay?.id || null : current || targetDay?.id || null);
    }, [filters.day_id, filters.week_id, moduleItems.length]);

    const currentModules = useMemo(
        () => selectedProgramId ? moduleItems : [],
        [moduleItems, selectedProgramId],
    );

    const chooseProgram = (programId) => {
        setSelectedProgramId(programId);
        router.get(route('admin.modules.index'), {
            program_id: programId || undefined,
            focus,
        }, {
            preserveState: false,
            replace: true,
        });
    };

    const openCreateModule = () => {
        const program = programs.find((item) => String(item.id) === String(selectedProgramId));
        setEditingModule(null);
        moduleForm.setData({
            program_pembelajaran_id: selectedProgramId,
            level_id: program?.level_id || program?.level?.id || '',
            title: '',
            week_number: currentModules.length ? Math.max(...currentModules.map((module) => Number(module.week_number))) + 1 : 1,
            description: '',
            status: 'draft',
        });
        moduleForm.clearErrors();
        setShowModuleDialog(true);
    };

    const openEditModule = (module) => {
        setEditingModule(module);
        moduleForm.setData({
            program_pembelajaran_id: module.program?.id || '',
            level_id: module.level?.id || '',
            title: module.title,
            week_number: module.week_number,
            description: module.description || '',
            status: module.status || 'published',
        });
        moduleForm.clearErrors();
        setShowModuleDialog(true);
    };

    const submitModule = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setShowModuleDialog(false);
                moduleForm.reset();
            },
        };

        if (editingModule) {
            moduleForm.put(route('admin.modules.update', editingModule.id), options);
            return;
        }

        moduleForm.post(route('admin.modules.store'), options);
    };

    const deleteModule = (module) => {
        const contentCount = Number(module.flashcard_count || 0)
            + Number(module.quiz_count || 0)
            + Number(module.presentation_count || 0);

        if (contentCount > 0 || Number(module.days_count || 0) > 0) {
            openConfirm({
                variant: 'warning',
                title: 'Minggu Masih Berisi Materi',
                message: 'Hapus atau pindahkan seluruh Hari dan materi sebelum menghapus Minggu.',
                confirmLabel: 'Mengerti',
                cancelLabel: 'Tutup',
                onConfirm: closeConfirm,
            });
            return;
        }

        openConfirm({
            variant: 'danger',
            title: `Hapus Minggu ${module.week_number}?`,
            message: 'Minggu ini akan dihapus dari roadmap kelas.',
            confirmLabel: 'Hapus Minggu',
            onConfirm: () => router.delete(route('admin.modules.destroy', module.id), {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const deleteDay = (module, day) => {
        const contentCount = Number(day.vocabulary_count || 0)
            + (day.flashcard_sets?.length || 0)
            + (day.quizzes?.length || 0)
            + (day.presentation_decks?.length || 0);

        if (contentCount > 0) {
            openConfirm({
                variant: 'warning',
                title: `Hari ${day.day_number} Masih Berisi Materi`,
                message: 'Hapus atau pindahkan seluruh materi sebelum menghapus Hari.',
                confirmLabel: 'Mengerti',
                cancelLabel: 'Tutup',
                onConfirm: closeConfirm,
            });
            return;
        }

        openConfirm({
            variant: 'danger',
            title: `Hapus Hari ${day.day_number}?`,
            message: `${day.title} akan dihapus dari Minggu ${module.week_number}.`,
            confirmLabel: 'Hapus Hari',
            onConfirm: () => router.delete(route('admin.module-days.destroy', day.id), {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const openResourceCreate = (type, module, day, options = {}) => {
        setResourceDialog({ type, module, day, ...options });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${pageCopy.title} Kelas - Japanlingo`} />

            <div className="min-h-screen bg-[#F8F9FB] dark:bg-gray-950">
                <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
                    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <Link href={route('admin.programs.index')} title="Kembali ke daftar kelas" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300">
                                    <ArrowBackIcon sx={{ fontSize: 18 }} />
                                </Link>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                                        Kelas / {focusLabels[focus]}
                                    </p>
                                    <h1 className="mt-1 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
                                        {selectedProgram ? `${pageCopy.title} ${selectedProgram.title}` : 'Pilih Kelas'}
                                    </h1>
                                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {pageCopy.description}
                                    </p>
                                </div>
                            </div>

                            <div className={`grid w-full gap-2 lg:w-auto ${isRoadmapFocus ? 'sm:grid-cols-[minmax(0,260px)_auto]' : 'sm:w-[300px]'}`}>
                                <SearchableSelect
                                    value={selectedProgramId}
                                    onChange={chooseProgram}
                                    placeholder="Pilih kelas"
                                    searchPlaceholder="Cari kelas..."
                                    options={programs.map((program) => ({ value: program.id, label: program.title }))}
                                />
                                {isRoadmapFocus && (
                                    <button type="button" onClick={openCreateModule} disabled={!selectedProgramId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                                        <AddIcon sx={{ fontSize: 18 }} />
                                        Tambah Minggu
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {!selectedProgramId && (
                        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {programs.map((program) => (
                                <button key={program.id} type="button" onClick={() => chooseProgram(String(program.id))} className="flex min-h-28 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                                        <MenuBookIcon sx={{ fontSize: 21 }} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-black text-gray-900 dark:text-white">{program.title}</span>
                                        <span className="mt-1 block text-sm font-medium text-gray-500 dark:text-gray-400">{program.description || pageCopy.emptyProgram}</span>
                                    </span>
                                </button>
                            ))}
                        </section>
                    )}

                    {selectedProgramId && (
                        <section className="space-y-3">
                            {currentModules.map((module) => {
                                const moduleOpen = openModuleId === module.id;
                                const moduleSummary = isPresentationFocus
                                    ? `${module.presentation_count || 0} presentasi`
                                    : isPracticeFocus
                                        ? `${module.days_count || 0} Hari / ${module.flashcard_count || 0} kartu / ${module.quiz_count || 0} kuis`
                                        : `${module.days_count || 0} Hari / ${module.flashcard_count || 0} kartu / ${module.quiz_count || 0} kuis / ${module.presentation_count || 0} presentasi`;

                                return (
                                    <article key={module.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                        <div className="flex items-center gap-3 p-3 sm:p-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpenModuleId(moduleOpen ? null : module.id);
                                                    if (!moduleOpen) setOpenDayId(module.days?.[0]?.id || null);
                                                }}
                                                aria-expanded={moduleOpen}
                                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-xs font-black text-white">
                                                    M{module.week_number}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <span className="text-base font-black text-gray-900 dark:text-white">Minggu {module.week_number}: {module.title}</span>
                                                        <StatusBadge status={module.status} />
                                                    </span>
                                                    <span className="mt-1 block text-xs font-bold text-gray-400">
                                                        {moduleSummary}
                                                    </span>
                                                </span>
                                                <ExpandMoreIcon className={`shrink-0 text-gray-400 transition-transform ${moduleOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isRoadmapFocus && (
                                                <div className="hidden items-center gap-2 sm:flex">
                                                    <button type="button" onClick={() => openEditModule(module)} title="Edit Minggu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300">
                                                        <EditOutlinedIcon sx={{ fontSize: 17 }} />
                                                    </button>
                                                    <button type="button" onClick={() => deleteModule(module)} title="Hapus Minggu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 dark:border-red-900/40">
                                                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                         {moduleOpen && (
                                             <div className="border-t border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 sm:p-4">
                                                 {isRoadmapFocus && (
                                                     <>
                                                 <div className="mb-3 flex items-center justify-between gap-3">
                                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Susunan Hari</p>
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={() => openEditModule(module)} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-black text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:hidden">Edit Minggu</button>
                                                        <button type="button" onClick={() => deleteModule(module)} title="Hapus Minggu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 dark:border-red-900/40 dark:bg-gray-900 sm:hidden">
                                                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                        </button>
                                                        <button type="button" onClick={() => setDayDialog({ module, day: null })} className="inline-flex h-9 items-center gap-1 rounded-lg bg-gray-900 px-3 text-xs font-black text-white dark:bg-white dark:text-gray-900">
                                                            <AddIcon sx={{ fontSize: 15 }} />
                                                            Tambah Hari
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mb-3 grid gap-2 lg:grid-cols-2">
                                                    <WeeklyPresentationRow module={module} focused={focus === 'presentation'} />
                                                    <ResourceRow
                                                        type="quiz"
                                                        label="Ujian Mingguan"
                                                        icon={<QuizOutlinedIcon sx={{ fontSize: 19 }} />}
                                                        tone="red"
                                                        module={module}
                                                        day={null}
                                                        resources={module.weekly_exams || []}
                                                        onCreate={openResourceCreate}
                                                        allowMultiple
                                                    />
                                                </div>

                                                <Link
                                                    href={route('admin.vocabulary.index', {
                                                        program_id: module.program?.id,
                                                        module_id: module.id,
                                                    })}
                                                    className="mb-3 flex min-h-11 items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-black text-blue-700 transition hover:border-blue-300 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"
                                                >
                                                    <span>Bank Kosakata Minggu Ini</span>
                                                    <span>Buka Bank</span>
                                                </Link>

                                                 <div className="space-y-2">
                                                    {(module.days || []).map((day) => {
                                                        const dayOpen = openDayId === day.id;
                                                        return (
                                                            <div key={day.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                                                                <div className="flex items-center gap-3 p-3">
                                                                    <button type="button" onClick={() => setOpenDayId(dayOpen ? null : day.id)} aria-expanded={dayOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xs font-black text-white dark:bg-white dark:text-gray-900">H{day.day_number}</span>
                                                                     <span className="min-w-0 flex-1">
                                                                         <span className="flex flex-wrap items-center gap-2">
                                                                             <span className="truncate text-sm font-black text-gray-900 dark:text-white">{day.title}</span>
                                                                             <StatusBadge status={day.status} />
                                                                             {!day.is_ready && (
                                                                                 <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                                                     Belum siap
                                                                                 </span>
                                                                             )}
                                                                         </span>
                                                                     </span>
                                                                        <ExpandMoreIcon className={`shrink-0 text-gray-400 transition-transform ${dayOpen ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                    <button type="button" onClick={() => setDayDialog({ module, day })} title="Edit Hari" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300">
                                                                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                                                    </button>
                                                                    <button type="button" onClick={() => deleteDay(module, day)} title="Hapus Hari" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-600 dark:border-red-900/40 sm:flex">
                                                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                                    </button>
                                                                </div>

                                                                 {dayOpen && (
                                                                     <div className="space-y-2 border-t border-gray-100 p-3 dark:border-gray-800">
                                                                         {day.description && <p className="pb-1 text-sm font-medium text-gray-500 dark:text-gray-400">{day.description}</p>}
                                                                         {!day.is_ready && (
                                                                             <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                                                                                 Day ini belum dapat diselesaikan siswa. Terbitkan flashcard berisi kartu atau pilih kuis checkpoint berisi soal.
                                                                             </div>
                                                                         )}
                                                                        <button type="button" onClick={() => deleteDay(module, day)} className="mb-1 h-9 w-full rounded-lg border border-red-100 text-xs font-black text-red-600 dark:border-red-900/40 sm:hidden">
                                                                            Hapus Hari
                                                                        </button>
                                                                        <DailyPracticeRow
                                                                            module={module}
                                                                            day={day}
                                                                            onCreate={openResourceCreate}
                                                                            focused={focus === 'flashcard'}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {(module.days || []).length === 0 && (
                                                        <button type="button" onClick={() => setDayDialog({ module, day: null })} className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
                                                            <span className="block text-sm font-black text-gray-700 dark:text-gray-200">Minggu ini belum memiliki Hari</span>
                                                            <span className="mt-1 block text-xs font-bold text-orange-600">Tambah Hari pertama</span>
                                                        </button>
                                                    )}
                                                 </div>
                                                     </>
                                                 )}

                                                 {isPresentationFocus && (
                                                     <div className="space-y-3">
                                                         <div>
                                                             <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Materi Presentasi</p>
                                                             <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Atur deck dan posisinya di dalam Minggu ini.</p>
                                                         </div>
                                                         <WeeklyPresentationRow module={module} focused />
                                                     </div>
                                                 )}

                                                 {isPracticeFocus && (
                                                     <div className="space-y-3">
                                                         <div>
                                                             <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Latihan per Hari</p>
                                                             <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Buka builder atau lengkapi materi latihan tanpa masuk ke pengaturan Roadmap.</p>
                                                         </div>

                                                         {(module.days || []).map((day) => (
                                                             <div key={day.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800">
                                                                 <div className="mb-3 flex min-w-0 items-center gap-3">
                                                                     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xs font-black text-white dark:bg-white dark:text-gray-900">H{day.day_number}</span>
                                                                     <span className="min-w-0 flex-1">
                                                                         <span className="block truncate text-sm font-black text-gray-900 dark:text-white">{day.title}</span>
                                                                         {day.description && <span className="mt-0.5 block truncate text-xs font-semibold text-gray-400">{day.description}</span>}
                                                                     </span>
                                                                     <StatusBadge status={day.status} />
                                                                 </div>
                                                                 <DailyPracticeRow
                                                                     module={module}
                                                                     day={day}
                                                                     onCreate={openResourceCreate}
                                                                     focused
                                                                 />
                                                             </div>
                                                         ))}

                                                         {(module.days || []).length === 0 && (
                                                             <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
                                                                 <p className="text-sm font-black text-gray-700 dark:text-gray-200">Minggu ini belum memiliki Hari</p>
                                                                 <Link
                                                                     href={route('admin.modules.index', { program_id: selectedProgramId, focus: 'roadmap', week_id: module.id })}
                                                                     className="mt-2 inline-flex text-xs font-black text-orange-600"
                                                                 >
                                                                     Tambahkan Hari melalui Roadmap
                                                                 </Link>
                                                             </div>
                                                         )}
                                                     </div>
                                                 )}
                                             </div>
                                         )}
                                    </article>
                                );
                            })}

                             {currentModules.length === 0 && (
                                 isRoadmapFocus ? (
                                     <button type="button" onClick={openCreateModule} className="w-full rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                                         <MenuBookIcon sx={{ fontSize: 38 }} className="text-gray-300" />
                                         <span className="mt-3 block text-base font-black text-gray-800 dark:text-gray-100">Kelas ini belum memiliki Minggu</span>
                                         <span className="mt-1 block text-sm font-bold text-orange-600">Tambah Minggu pertama</span>
                                     </button>
                                 ) : (
                                     <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                                         <MenuBookIcon sx={{ fontSize: 38 }} className="text-gray-300" />
                                         <p className="mt-3 text-base font-black text-gray-800 dark:text-gray-100">Kelas ini belum memiliki Minggu</p>
                                         <Link
                                             href={route('admin.modules.index', { program_id: selectedProgramId, focus: 'roadmap' })}
                                             className="mt-2 inline-flex text-sm font-black text-orange-600"
                                         >
                                             Susun Minggu melalui Roadmap
                                         </Link>
                                     </div>
                                 )
                             )}
                        </section>
                    )}

                    {selectedProgramId && modules?.links && modules.links.length > 3 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {modules.links.map((link, index) => (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url || '#'}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`rounded-xl px-4 py-2 text-sm font-bold ${link.active ? 'bg-orange-600 text-white' : 'border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'} ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {showModuleDialog && (
                <div className="fixed inset-0 z-[90] overflow-y-auto bg-gray-950/60 p-3 backdrop-blur-sm sm:p-5">
                    <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 sm:my-8">
                        <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">{selectedProgram?.title || 'Kelas'}</p>
                            <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">{editingModule ? 'Edit Minggu' : 'Tambah Minggu'}</h2>
                        </div>
                        <form onSubmit={submitModule} className="space-y-4 p-5">
                            <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                                <label>
                                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Urutan</span>
                                    <input type="number" min="1" value={moduleForm.data.week_number} onChange={(event) => moduleForm.setData('week_number', event.target.value)} className={inputClass} required />
                                </label>
                                <label>
                                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Judul Minggu</span>
                                <input value={moduleForm.data.title} onChange={(event) => moduleForm.setData('title', event.target.value)} className={inputClass} placeholder="Contoh: Dasar Percakapan" required />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Deskripsi</span>
                                <textarea value={moduleForm.data.description} onChange={(event) => moduleForm.setData('description', event.target.value)} className={`${inputClass} min-h-24`} />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label>
                                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Level</span>
                                    <select value={moduleForm.data.level_id} onChange={(event) => moduleForm.setData('level_id', event.target.value)} className={inputClass} required>
                                        <option value="">Pilih level</option>
                                        {levels.map((level) => <option key={level.id} value={level.id}>{level.level_name}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-400">Status</span>
                                    <select value={moduleForm.data.status} onChange={(event) => moduleForm.setData('status', event.target.value)} className={inputClass}>
                                        <option value="draft">Draf</option>
                                        <option value="published">Terbit</option>
                                    </select>
                                </label>
                            </div>
                            {Object.values(moduleForm.errors).length > 0 && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{Object.values(moduleForm.errors)[0]}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setShowModuleDialog(false)} className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 dark:border-gray-700 dark:text-gray-300">Batal</button>
                                <button disabled={moduleForm.processing} className="h-11 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50">{moduleForm.processing ? 'Menyimpan...' : 'Simpan Minggu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ModuleDayDialog
                open={Boolean(dayDialog)}
                onClose={() => setDayDialog(null)}
                module={dayDialog?.module}
                day={dayDialog?.day}
                nextDayNumber={dayDialog?.module?.days?.length
                    ? Math.max(...dayDialog.module.days.map((day) => Number(day.day_number))) + 1
                    : 1}
            />

            <LearningResourceCreateDialog
                open={Boolean(resourceDialog)}
                onClose={() => setResourceDialog(null)}
                resourceType={resourceDialog?.type}
                module={resourceDialog?.module}
                day={resourceDialog?.day}
                weekSlot={resourceDialog?.weekSlot}
                levels={levels}
                lockContext
            />

            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
