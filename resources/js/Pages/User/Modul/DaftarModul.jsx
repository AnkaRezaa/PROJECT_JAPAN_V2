import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import theme from '@/Components/theme/themes';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import GrammarQuizPreviewDialog from '@/Components/Features/GrammarQuiz/GrammarQuizPreviewDialog';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QuizIcon from '@mui/icons-material/Quiz';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const RESOURCE_COLORS = {
    day: { color: '#58cc02', shadow: '#46a302', foreground: '#2d3742', labelClass: 'text-[#397d08] dark:text-[#8ee34c]' },
    presentation: { color: '#2bc5b4', shadow: '#14998b', foreground: '#2d3742', labelClass: 'text-[#0f766e] dark:text-[#5eead4]' },
    live: { color: '#ff9600', shadow: '#d67800', foreground: '#2d3742', labelClass: 'text-[#c2410c] dark:text-[#fdba74]' },
    quiz: { color: '#ce82ff', shadow: '#a560d1', foreground: '#2d3742', labelClass: 'text-[#7c3aed] dark:text-[#d8b4fe]' },
    exam: { color: '#ffc800', shadow: '#d7a900', foreground: '#2d3742', labelClass: 'text-[#a16207] dark:text-[#fde047]' },
};

const todayInputValue = () => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

const createCheckoutRequestKey = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : ((random & 0x3) | 0x8);

        return value.toString(16);
    });
};

const formatExamDate = (value) => {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
};

const dateInputValue = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

function ExamDatePicker({ value, onChange }) {
    const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
    const [visibleMonth, setVisibleMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const today = new Date();
    const todayValue = todayInputValue();
    const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
    const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const calendarCells = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: dayCount }, (_, index) => index + 1),
    ];
    const canGoPrevious = (
        visibleMonth.getFullYear() > today.getFullYear()
        || (
            visibleMonth.getFullYear() === today.getFullYear()
            && visibleMonth.getMonth() > today.getMonth()
        )
    );
    const monthLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(visibleMonth);

    const moveMonth = (offset) => {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    };

    return (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-700 dark:bg-gray-950/70 min-[360px]:p-3 sm:mt-5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    disabled={!canGoPrevious}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-25 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-300"
                    aria-label="Bulan sebelumnya"
                >
                    <ChevronLeftIcon />
                </button>
                <p className="text-sm font-black capitalize text-gray-900 dark:text-white">{monthLabel}</p>
                <button
                    type="button"
                    onClick={() => moveMonth(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-300"
                    aria-label="Bulan berikutnya"
                >
                    <ChevronRightIcon />
                </button>
            </div>

            <div className="mt-2 grid grid-cols-7 text-center text-xs font-bold text-gray-600 dark:text-gray-300 sm:mt-3">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <span key={day} className="py-1">{day}</span>
                ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-0.5 min-[360px]:gap-1">
                {calendarCells.map((day, index) => {
                    if (!day) return <span key={`empty-${index}`} className="aspect-square" />;

                    const candidate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
                    const candidateValue = dateInputValue(candidate);
                    const isPast = candidateValue < todayValue;
                    const isSelected = candidateValue === value;
                    const isToday = candidateValue === todayValue;

                    return (
                        <button
                            key={candidateValue}
                            type="button"
                            disabled={isPast}
                            onClick={() => onChange(candidateValue)}
                            className={`aspect-square min-h-10 rounded-lg text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                                isSelected
                                    ? 'bg-brand-600 text-ink-900 shadow-[0_3px_0_#15803d]'
                                    : isToday
                                        ? 'border border-brand-300 bg-white text-brand-700 dark:border-green-700 dark:bg-gray-900 dark:text-green-200'
                                        : 'text-gray-700 hover:bg-white hover:text-brand-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-300 dark:disabled:text-gray-700'
                            }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-gray-200 pt-2 text-[11px] dark:border-gray-800 min-[360px]:mt-3 min-[360px]:pt-3 min-[360px]:text-xs">
                <span className="font-semibold text-gray-500 dark:text-gray-400">Tanggal dipilih</span>
                <span className="font-black text-gray-900 dark:text-white">
                    {value ? formatExamDate(value) : 'Belum dipilih'}
                </span>
            </div>
        </div>
    );
}

function ExamTargetCard({ program, completedWeekCount, totalWeeks }) {
    const target = program?.exam_target;
    const [showForm, setShowForm] = useState(false);
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        exam_date: target?.exam_date || '',
    });

    const openForm = () => {
        setData('exam_date', target?.exam_date || '');
        clearErrors();
        setShowForm(true);
    };

    const submit = (event) => {
        event.preventDefault();
        put(route('user.modul.program.exam-target.update', program.slug), {
            preserveScroll: true,
            onSuccess: () => setShowForm(false),
        });
    };

    const requestDelete = () => {
        openConfirm({
            variant: 'danger',
            title: 'Hapus target ujian?',
            message: 'Tanggal target akan dihapus, tetapi progres roadmap tetap tersimpan.',
            confirmLabel: 'Hapus Target',
            onConfirm: () => {
                setConfirmProcessing(true);
                router.delete(route('user.modul.program.exam-target.destroy', program.slug), {
                    preserveScroll: true,
                    onFinish: () => {
                        setConfirmProcessing(false);
                        closeConfirm();
                    },
                });
            },
        });
    };

    const countdownLabel = target
        ? target.days_remaining < 0
            ? 'Tanggal telah lewat'
            : target.days_remaining === 0
                ? 'Hari ujian'
                : `${target.days_remaining} hari lagi`
        : null;

    return (
        <>
            <section className="mt-3 rounded-xl border border-white/80 bg-white/70 p-2.5 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
                {target ? (
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-[#12351f] dark:text-green-200">
                            <CalendarMonthIcon sx={{ fontSize: 19 }} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-1.5">
                                <p className="text-sm font-black text-gray-900 dark:text-white">{countdownLabel}</p>
                                <span className="text-[10px] font-bold text-gray-400">{formatExamDate(target.exam_date)}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-gray-500 dark:text-gray-400">
                                {target.pace_message}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                onClick={openForm}
                                title="Ubah target ujian"
                                aria-label="Ubah target ujian"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-300"
                            >
                                <EditCalendarIcon sx={{ fontSize: 17 }} />
                            </button>
                            <button
                                type="button"
                                onClick={requestDelete}
                                title="Hapus target ujian"
                                aria-label="Hapus target ujian"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={openForm}
                        className="flex w-full items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/50"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-[#12351f] dark:text-green-200">
                            <CalendarMonthIcon sx={{ fontSize: 19 }} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-xs font-black text-gray-800 dark:text-gray-100">Atur target ujian</span>
                            <span className="block truncate text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                Dapatkan hitung mundur dan ritme belajar.
                            </span>
                        </span>
                        <EditCalendarIcon className="shrink-0 text-brand-500" sx={{ fontSize: 18 }} />
                    </button>
                )}
            </section>

            {typeof document !== 'undefined' && createPortal(
                <>
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                        className="fixed inset-0 z-[200] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setShowForm(false);
                        }}
                            >
                                <motion.form
                            onSubmit={submit}
                            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-gray-900 min-[360px]:p-5 sm:max-h-[90dvh] sm:max-w-md sm:rounded-3xl"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                                >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
                                        {program?.level || 'Target Ujian'}
                                    </p>
                                    <h2 className="mt-1 text-xl font-black text-gray-900 dark:text-white">Atur Target Ujian</h2>
                                    <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                        Target ini bersifat pribadi dan tidak mengubah jadwal kelas.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                                    aria-label="Tutup"
                                >
                                    <CloseIcon />
                                </button>
                            </div>

                            <ExamDatePicker
                                value={data.exam_date}
                                onChange={(value) => {
                                    setData('exam_date', value);
                                    clearErrors('exam_date');
                                }}
                            />
                            {errors.exam_date && <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.exam_date}</span>}

                            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                                Progress saat ini: <strong>{completedWeekCount} dari {totalWeeks} Minggu selesai</strong>
                            </div>

                            <div className="sticky -bottom-4 z-10 mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 bg-white/95 pt-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 min-[360px]:-bottom-5 sm:mt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="h-11 rounded-xl border border-gray-200 text-sm font-black text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.exam_date}
                                    className="h-11 rounded-xl bg-brand-600 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan Target'}
                                </button>
                            </div>
                                </motion.form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
                </>,
                document.body,
            )}
        </>
    );
}

function CourseAccessPanel({ program, processing, error, onCheckout }) {
    const plans = program?.payment_plans || [];
    const [selectedPlanId, setSelectedPlanId] = useState(() => plans[0]?.id || '');
    const [selectedKloterId, setSelectedKloterId] = useState('');
    const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId)) || plans[0] || null;
    const isMentored = selectedPlan?.scope_type === 'kloter';
    const availableKloters = program?.available_kloters || [];

    useEffect(() => {
        setSelectedPlanId(plans[0]?.id || '');
    }, [program?.id]);

    useEffect(() => {
        setSelectedKloterId(isMentored ? (availableKloters[0]?.id || '') : '');
    }, [isMentored, program?.id, availableKloters.length]);

    if (program?.has_class_access) {
        return (
            <aside className="rounded-2xl border border-emerald-200 bg-emerald-50/85 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <div className="flex items-center gap-2 text-sm font-black"><CheckCircleIcon sx={{ fontSize: 19 }} />Kelas aktif</div>
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">Roadmap dan materi kelas sudah dapat kamu lanjutkan.</p>
            </aside>
        );
    }

    if (program?.waiting_for_approval) {
        return (
            <aside className="rounded-2xl border border-amber-200 bg-amber-50/85 p-4 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
                <div className="flex items-center gap-2 text-sm font-black"><LockIcon sx={{ fontSize: 18 }} />Menunggu persetujuan mentor</div>
                <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">Pembayaran sudah diterima. Roadmap penuh terbuka setelah mentor menyetujui pendaftaran.</p>
            </aside>
        );
    }

    if (program?.refund_required) {
        return (
            <aside className="rounded-2xl border border-rose-200 bg-rose-50/85 p-4 text-rose-950 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">
                <div className="flex items-center gap-2 text-sm font-black"><LockIcon sx={{ fontSize: 18 }} />Pendaftaran tidak disetujui</div>
                <p className="mt-2 text-sm leading-6 text-rose-800 dark:text-rose-200">Tim TOKU-UP sedang menindaklanjuti refund pembayaran kelas mentor ini.</p>
            </aside>
        );
    }

    if (!selectedPlan) return null;

    const canCheckout = !isMentored || Boolean(selectedKloterId);

    return (
        <aside className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg shadow-brand-950/5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:sticky lg:top-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">Buka akses kelas</p>
                    <p className="mt-1 text-xl font-black text-gray-950 dark:text-white">{selectedPlan.price_formatted}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {Number(selectedPlan.duration_days) > 0 ? `Akses ${selectedPlan.duration_days} hari` : 'Masa akses mengikuti paket'}
                    </p>
                </div>
                <WorkspacePremiumIcon className="text-brand-500 dark:text-brand-300" />
            </div>

            {plans.length > 1 && (
                <label className="mt-4 block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Pilih paket
                    <select value={selectedPlan?.id || ''} onChange={(event) => setSelectedPlanId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {plan.price_formatted}</option>)}
                    </select>
                </label>
            )}

            {isMentored && (
                <label className="mt-4 block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Pilih kloter dan mentor
                    <select value={selectedKloterId} onChange={(event) => setSelectedKloterId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                        {availableKloters.length > 0
                            ? availableKloters.map((kloter) => <option key={kloter.id} value={kloter.id}>{kloter.name} - {kloter.mentor_name || 'Mentor belum ditentukan'} - mulai {kloter.start_date_label}{kloter.remaining_seats !== null ? ` - sisa ${kloter.remaining_seats} kursi` : ''}</option>)
                            : <option value="">Belum ada kloter tersedia</option>}
                    </select>
                </label>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}

            <button type="button" onClick={() => onCheckout(selectedPlan, selectedKloterId || null)} disabled={!canCheckout || processing} className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.ctaBg} px-4 text-sm font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60`}>
                {processing ? 'Membuka pembayaran...' : isMentored ? 'Daftar Kelas Mentor' : 'Buka Akses'}
                <PlayArrowIcon sx={{ fontSize: 18 }} />
            </button>
            <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Kamu tetap dapat mencoba Week 1 sebelum membuka akses penuh.</p>
        </aside>
    );
}

function itemStatusLabel(item) {
    if (item.kind === 'live') return item.status === 'active' ? 'Live sekarang' : 'Terjadwal';
    if (item.status === 'done') return 'Selesai';
    if (item.status === 'active') return 'Lanjutkan';
    if (item.status === 'unavailable') return 'Belum tersedia';
    return 'Terkunci';
}

function nodeColors(item) {
    if (['locked', 'unavailable'].includes(item.status)) {
        return {
            color: item.status === 'unavailable' ? '#f3f4f6' : '#e5e7eb',
            shadow: '#cbd5e1',
            foreground: '#9ca3af',
            labelClass: 'text-gray-500 dark:text-gray-400',
        };
    }

    return RESOURCE_COLORS[item.kind] || RESOURCE_COLORS.day;
}

function iconFor(item, size) {
    const foreground = nodeColors(item).foreground;

    if (item.status === 'done') {
        return <CheckCircleIcon sx={{ fontSize: size, color: foreground }} />;
    }

    if (['locked', 'unavailable'].includes(item.status)) {
        return <LockIcon sx={{ fontSize: size - 5, color: '#9ca3af' }} />;
    }

    if (item.kind === 'presentation') {
        return <SlideshowIcon sx={{ fontSize: size - 3, color: foreground }} />;
    }

    if (item.kind === 'live') {
        return <VideoCameraFrontIcon sx={{ fontSize: size - 3, color: foreground }} />;
    }

    if (item.kind === 'exam') {
        return <QuizIcon sx={{ fontSize: size - 3, color: foreground }} />;
    }

    if (item.kind === 'quiz') {
        return <QuizIcon sx={{ fontSize: size - 3, color: foreground }} />;
    }

    return (
        <span className="text-center" style={{ color: foreground }}>
            <span className="block text-[8px] font-black uppercase">Hari</span>
            <span className="block text-xl font-black leading-none">{item.dayNumber}</span>
        </span>
    );
}

function quizItem(day, available) {
    const checkpoint = day.checkpoint_summary;

    if (!checkpoint) {
        return {
            key: `quiz-empty-${day.id}`,
            kind: 'quiz',
            level: 'child',
            parentDayId: day.id,
            eyebrow: `Evaluasi Hari ${day.day_number}`,
            title: `Kuis Hari ${day.day_number}`,
            detail: 'Admin belum menambahkan kuis checkpoint.',
            status: 'unavailable',
            href: null,
        };
    }

    return {
        key: `quiz-${day.id}`,
        kind: 'quiz',
        level: 'child',
        parentDayId: day.id,
        eyebrow: `Evaluasi Hari ${day.day_number}`,
        title: 'Kuis',
        detail: null,
        status: !available || checkpoint.locked
            ? 'locked'
            : day.status === 'done'
                ? 'done'
                : 'active',
        lockReason: checkpoint.lock_reason || day.quiz_locked_reason || day.lock_reason,
        href: day.quiz_url,
    };
}

function weeklyMainItems(week) {
    const items = [];
    const presentations = week.presentations || [];
    const liveSession = week.live_session;

    if (liveSession) {
        const schedule = liveSession.scheduled_at
            ? new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(liveSession.scheduled_at))
            : 'Menunggu mentor';

        items.push({
            key: `live-${liveSession.id}`,
            kind: 'live',
            level: 'root',
            eyebrow: liveSession.status === 'live' ? 'Sedang berlangsung' : 'Kelas mentor',
            title: liveSession.deck_title || 'Ruang Kelas',
            weekLabel: `Minggu ${week.week_number}`,
            detail: `${schedule}${liveSession.mentor_name ? ` · ${liveSession.mentor_name}` : ''}`,
            status: liveSession.status === 'live' ? 'active' : 'scheduled',
            href: liveSession.join_url,
            mainPosition: 'center',
        });
    }
    const presentationItem = (presentation, eyebrow) => ({
        key: `presentation-${presentation.id}`,
        kind: 'presentation',
        level: 'root',
        eyebrow,
        title: presentation.title,
        detail: `${presentation.slides_count} slide`,
        status: presentation.locked ? 'locked' : 'active',
        lockReason: presentation.placement === 'closing'
            ? 'Selesaikan ujian Mingguan untuk membuka presentasi ini.'
            : presentation.placement === 'after_day'
                ? 'Selesaikan Day terkait untuk membuka presentasi ini.'
                : 'Minggu ini belum terbuka.',
        href: presentation.url,
        mainPosition: items.length % 2 === 0 ? 'left' : 'right',
    });

    presentations
        .filter((presentation) => presentation.placement === 'opening')
        .forEach((presentation) => items.push(presentationItem(
            presentation,
            `Pembuka Minggu ${week.week_number}`,
        )));

    const days = week.days || [];

    days.forEach((day) => {
        items.push({
            key: `day-${day.id}`,
            kind: 'day',
            level: 'root',
            dayId: day.id,
            dayNumber: day.day_number,
            eyebrow: `Hari ${day.day_number}`,
            title: day.title || `Materi Hari ${day.day_number}`,
            detail: null,
            status: day.status,
            lockReason: day.lock_reason,
            day,
            mainPosition: items.length % 2 === 0 ? 'left' : 'right',
        });

        presentations
            .filter((presentation) => (
                presentation.placement === 'after_day'
                && Number(presentation.module_day_id) === Number(day.id)
            ))
            .forEach((presentation) => items.push(presentationItem(
                presentation,
                `Setelah Hari ${day.day_number}`,
            )));
    });

    const exams = week.weekly_exams || [];

    if (exams.length > 0) {
        exams.forEach((exam, examIndex) => {
            const scoreDetail = exam.best_score === null
                ? `Belum dikerjakan · Target ${exam.passing_score}`
                : exam.done
                    ? `Nilai ${exam.best_score} · Lulus`
                    : `Nilai ${exam.best_score} · Target ${exam.passing_score}`;

            items.push({
                key: `exam-${exam.id}`,
                kind: 'exam',
                level: 'root',
                eyebrow: `Evaluasi Minggu ${week.week_number}`,
                title: exam.title || `Ujian ${examIndex + 1}`,
                detail: scoreDetail,
                status: exam.done ? 'done' : exam.locked ? 'locked' : 'active',
                lockReason: exam.lock_reason,
                href: exam.url,
                mainPosition: items.length % 2 === 0 ? 'left' : 'right',
            });
        });
    } else {
        items.push({
            key: `exam-empty-${week.id}`,
            kind: 'exam',
            level: 'root',
            eyebrow: `Evaluasi Minggu ${week.week_number}`,
            title: 'Ujian Mingguan',
            detail: 'Admin belum menambahkan ujian Mingguan.',
            status: 'unavailable',
            href: null,
            mainPosition: 'center',
        });
    }

    presentations
        .filter((presentation) => presentation.placement === 'closing')
        .forEach((presentation) => items.push(presentationItem(
            presentation,
            `Penutup Minggu ${week.week_number}`,
        )));

    return items;
}

function dayChildItems(day) {
    const available = ['active', 'done'].includes(day.status);

    return [quizItem(day, available)];
}

function PathNodeCircle({ item, selected = false, size = 68 }) {
    const colors = nodeColors(item);
    const active = item.status === 'active';
    const locked = ['locked', 'unavailable'].includes(item.status);

    return (
        <span
            className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border-[3px] border-white transition-transform duration-200 group-hover:scale-105 group-active:translate-y-1 dark:border-gray-950 ${
                locked ? 'bg-gray-200 shadow-[0_6px_0_#cbd5e1] dark:bg-gray-800 dark:shadow-[0_6px_0_#374151]' : ''
            }`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: locked ? undefined : colors.color,
                boxShadow: locked ? undefined : `0 6px 0 ${colors.shadow}`,
                outline: selected
                    ? `4px solid ${colors.color}88`
                    : active
                        ? `3px solid ${colors.color}55`
                        : 'none',
            }}
        >
            {active && (
                <motion.span
                    className="absolute -inset-2 rounded-full border-2"
                    style={{ borderColor: `${colors.color}55` }}
                    animate={{ scale: [0.92, 1.12], opacity: [0.75, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    aria-hidden="true"
                />
            )}
            {iconFor(item, size <= 48 ? 23 : 32)}
        </span>
    );
}

function StatusBadge({ item, className = '' }) {
    return (
        <span className={`${className} inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${
            item.status === 'done'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : item.status === 'active'
                    ? 'bg-brand-100 text-brand-700 dark:bg-[#12351f] dark:text-green-200'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
            {itemStatusLabel(item)}
        </span>
    );
}

function PathNode({ item, selected, onDayToggle }) {
    const locked = ['locked', 'unavailable'].includes(item.status);
    const className = `group relative inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
        locked ? 'cursor-not-allowed' : ''
    }`;

    if (item.kind === 'day') {
        return (
            <button
                type="button"
                onClick={() => !locked && onDayToggle(item.dayId)}
                disabled={locked}
                aria-expanded={selected}
                aria-controls={`day-materials-${item.dayId}`}
                aria-current={item.status === 'active' ? 'step' : undefined}
                className={className}
            >
                <PathNodeCircle item={item} selected={selected} />
                {!locked && (
                    <span className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-transform dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 ${selected ? 'rotate-180' : ''}`}>
                        <ExpandMoreIcon sx={{ fontSize: 17 }} />
                    </span>
                )}
            </button>
        );
    }

    if (!locked && item.href) {
        return (
            <Link href={item.href} aria-current={item.status === 'active' ? 'step' : undefined} className={className}>
                <PathNodeCircle item={item} />
            </Link>
        );
    }

    return (
        <div className={className}>
            <PathNodeCircle item={item} />
        </div>
    );
}

function PathNodeLabel({ item, onDayToggle, selected }) {
    const showStatus = item.status !== 'done';
    const hasExtraInfo = showStatus || (item.kind !== 'day' && item.detail);
    const colors = nodeColors(item);
    const locked = ['locked', 'unavailable'].includes(item.status);

    if (item.kind === 'live') {
        const isLive = item.status === 'active';
        const cardClassName = `relative mt-2.5 block w-44 overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-md transition min-[380px]:w-48 sm:mt-3 sm:w-56 sm:px-3 ${
            isLive
                ? 'border-green-300 bg-white shadow-green-900/10 hover:-translate-y-0.5 hover:border-green-400 dark:border-green-800 dark:bg-gray-900'
                : 'border-orange-200 bg-white/95 shadow-orange-900/5 dark:border-orange-900/70 dark:bg-gray-900'
        }`;
        const cardContent = (
            <>
                <span className={`absolute inset-y-0 left-0 w-1 ${isLive ? 'bg-green-500' : 'bg-orange-500'}`} />
                <div className="flex items-center justify-between gap-1.5 pl-1">
                    <span className={`truncate text-[9px] font-black uppercase tracking-[0.12em] ${colors.labelClass}`}>
                        {item.weekLabel} · Live
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase ${
                        isLive
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                    }`}>
                        {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />}
                        {isLive ? 'Live' : 'Terjadwal'}
                    </span>
                </div>
                <h3 className="mt-1 line-clamp-1 pl-1 text-xs font-black text-gray-900 dark:text-white sm:text-sm">
                    {item.title}
                </h3>
                <p className="mt-0.5 line-clamp-1 pl-1 text-[9px] font-semibold text-gray-500 dark:text-gray-400 sm:text-[10px]">
                    {item.detail}
                </p>
            </>
        );

        return item.href ? (
            <Link href={item.href} className={cardClassName}>{cardContent}</Link>
        ) : (
            <div className={cardClassName}>{cardContent}</div>
        );
    }

    const labelInner = (
        <>
            <p className={`text-[11px] font-black sm:text-xs ${colors.labelClass}`}>
                {item.eyebrow}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-xs font-black leading-4 text-gray-900 dark:text-white sm:text-sm sm:leading-5">
                {item.title}
            </h3>

            {hasExtraInfo && (
                <>
                    <div className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-1 sm:hidden">
                        {item.kind !== 'day' && item.detail && (
                            <span className="line-clamp-1 text-[9px] font-semibold text-gray-500 dark:text-gray-400">
                                {item.detail}
                            </span>
                        )}
                        {showStatus && <StatusBadge item={item} />}
                    </div>

                    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden min-w-32 max-w-52 -translate-x-1/2 translate-y-1 rounded-xl border border-white/80 bg-white/95 px-2.5 py-2 text-center opacity-0 shadow-lg shadow-black/10 backdrop-blur-md transition duration-200 group-hover/node:translate-y-0 group-hover/node:opacity-100 group-focus-within/node:translate-y-0 group-focus-within/node:opacity-100 dark:border-gray-700 dark:bg-gray-900/95 sm:block">
                        {item.kind !== 'day' && item.detail && (
                            <p className="whitespace-nowrap text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                {item.detail}
                            </p>
                        )}
                        {showStatus && (
                            <StatusBadge
                                item={item}
                                className={item.kind !== 'day' && item.detail ? 'mt-1.5' : ''}
                            />
                        )}
                    </div>
                </>
            )}
        </>
    );

    const baseClass = "relative mt-2.5 w-32 text-center transition min-[380px]:w-36 sm:mt-3 sm:w-44";

    if (item.kind === 'day') {
        return (
            <button
                type="button"
                onClick={() => !locked && onDayToggle?.(item.dayId)}
                disabled={locked}
                aria-expanded={selected}
                aria-controls={`day-materials-${item.dayId}`}
                className={`${baseClass} rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:opacity-90 active:scale-95'
                }`}
            >
                {labelInner}
            </button>
        );
    }

    if (!locked && item.href) {
        return (
            <Link
                href={item.href}
                className={`${baseClass} block rounded-lg hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400`}
            >
                {labelInner}
            </Link>
        );
    }

    return (
        <div className={baseClass}>
            {labelInner}
        </div>
    );
}

function DayDetailContent({ day, onClose, mobile = false }) {
    const items = dayChildItems(day);
    const completed = day.status === 'done';
    const [grammarQuiz, setGrammarQuiz] = useState(null);
    const [loadingGrammarId, setLoadingGrammarId] = useState(null);
    const openGrammar = async (quizId) => {
        setLoadingGrammarId(quizId);
        try {
            const { data } = await window.axios.get(`/user/grammar-quizzes/${quizId}`);
            setGrammarQuiz(data.lesson);
        } finally {
            setLoadingGrammarId(null);
        }
    };

    return (
        <div
            id={`day-materials-${day.id}`}
            className={`overflow-hidden bg-white shadow-2xl dark:bg-gray-900 ${
                mobile
                    ? 'rounded-t-3xl border-t border-x border-[#dce8df] pb-[max(16px,env(safe-area-inset-bottom))] dark:border-gray-700'
                    : 'rounded-2xl border border-[#dce8df] shadow-[0_18px_50px_-24px_rgba(45,55,66,0.32)] dark:border-gray-700'
            }`}
        >
            {mobile && (
                <div className="flex justify-center bg-[#f1fbe9] pt-2.5 pb-1 dark:bg-gray-900">
                    <span className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
                </div>
            )}
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-5 ${
                completed
                    ? 'border-emerald-200 bg-emerald-50 text-[#2d3742] dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-white'
                    : 'border-[#d7edc8] bg-[#f1fbe9] text-[#2d3742] dark:border-green-900 dark:bg-green-950/25 dark:text-white'
            }`}>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-extrabold ${
                            completed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : 'bg-[#dff6cb] text-[#397d08] dark:bg-green-900/60 dark:text-green-200'
                        }`}>
                            Hari {day.day_number}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-300">
                            {completed ? 'Selesai' : 'Jalur belajar'}
                        </span>
                    </div>
                    <h3 className="mt-1 sm:mt-2 text-base sm:text-lg font-extrabold leading-snug text-[#2d3742] dark:text-white">
                        {day.title || `Hari ${day.day_number}`}
                    </h3>
                    {day.description && (
                        <p className="mt-0.5 sm:mt-1 line-clamp-2 text-xs font-medium leading-4 sm:leading-5 text-gray-600 dark:text-gray-300 sm:text-[13px]">
                            {day.description}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup detail Hari"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-white/75 text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-white/10 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </button>
            </div>

            <div className={`space-y-2.5 sm:space-y-3 bg-[#f8faf8] p-3 sm:p-4 dark:bg-gray-900 ${mobile ? 'max-h-[60dvh] overflow-y-auto' : ''}`}>
                {items.map((item, index) => {
                    const locked = ['locked', 'unavailable'].includes(item.status);
                    const row = (
                        <>
                            <span className={`flex h-10 w-10 min-[380px]:h-11 min-[380px]:w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${
                                locked
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                    : completed
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-[#f1e4ff] text-[#7c3aed] dark:bg-violet-950/60 dark:text-violet-300'
                            }`}>
                                <QuizIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-1.5">
                                    <span className="truncate text-xs min-[380px]:text-[13px] sm:text-[15px] font-extrabold leading-tight text-[#2d3742] dark:text-white">
                                    {item.status === 'done' ? 'Ulangi Kuis & Repetisi' : 'Mulai Kuis & Repetisi'}
                                    </span>
                                    {!locked && (
                                        <span className={`shrink-0 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-bold ${
                                            completed
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                                        }`}>
                                            {completed ? 'Selesai' : 'Siap dimulai'}
                                        </span>
                                    )}
                                </span>
                                {!locked && (
                                    <span className="mt-0.5 sm:mt-1 block line-clamp-2 text-[10px] min-[380px]:text-xs font-medium leading-4 sm:leading-5 text-gray-600 dark:text-gray-300">
                                        Flashcard, soal, dan latihan menulis tersedia dalam satu sesi.
                                    </span>
                                )}
                                {locked && (
                                    <span className="mt-0.5 sm:mt-1 block line-clamp-2 text-[10px] min-[380px]:text-xs font-medium leading-4 sm:leading-5 text-gray-500 dark:text-gray-400">
                                        {item.lockReason || 'Materi belum tersedia.'}
                                    </span>
                                )}
                            </span>
                            <span className={`flex h-7 w-7 min-[380px]:h-8 min-[380px]:w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${
                                locked
                                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-violet-100 text-violet-700 transition group-hover:bg-violet-200 dark:bg-violet-950/60 dark:text-violet-300'
                            }`}>
                                {locked
                                    ? <LockIcon sx={{ fontSize: 16 }} />
                                    : <ChevronRightIcon sx={{ fontSize: 19 }} />}
                            </span>
                        </>
                    );
                    const className = `group flex min-h-[68px] sm:min-h-[88px] w-full items-center gap-2.5 sm:gap-3 rounded-xl border p-2.5 min-[380px]:p-3 sm:px-4 sm:py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200/70 ${
                        locked
                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                            : 'border-violet-200 bg-white shadow-[0_3px_0_#ddd6fe] hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-[0_4px_0_#c4b5fd] active:translate-y-0.5 active:shadow-none dark:border-violet-900/70 dark:bg-gray-800 dark:hover:bg-violet-950/20'
                    }`;

                    return (
                        <motion.div
                            key={item.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ delay: index * 0.06 }}
                        >
                            {!locked && item.href ? (
                                <Link href={item.href} className={className}>{row}</Link>
                            ) : (
                                <div className={className}>{row}</div>
                            )}
                        </motion.div>
                    );
                })}

                {(day.grammar_lessons || []).map((lesson, index) => <motion.button
                    key={lesson.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (items.length + index) * 0.06 }}
                    disabled={loadingGrammarId === lesson.id}
                    onClick={() => openGrammar(lesson.id)}
                    className="group flex min-h-[68px] sm:min-h-[88px] w-full items-center gap-2.5 sm:gap-3 rounded-xl border border-sky-200 bg-white p-2.5 min-[380px]:p-3 sm:px-4 sm:py-3 text-left shadow-[0_3px_0_#bae6fd] transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-[0_4px_0_#7dd3fc] active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/70 disabled:opacity-60 dark:border-sky-900/70 dark:bg-gray-800 dark:hover:bg-sky-950/20"
                >
                    <span className="flex h-10 w-10 min-[380px]:h-11 min-[380px]:w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                        <AutoStoriesIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs min-[380px]:text-[13px] sm:text-[15px] font-extrabold leading-tight text-[#2d3742] dark:text-white">
                                {lesson.pattern} / {lesson.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 sm:px-2 py-0.5 text-[9px] min-[380px]:text-[10px] font-black uppercase text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                {lesson.done ? 'Selesai' : 'Grammar'}
                            </span>
                        </span>
                        <span className="mt-0.5 sm:mt-1 block line-clamp-2 text-[10px] min-[380px]:text-xs font-medium leading-4 sm:leading-5 text-gray-600 dark:text-gray-300">
                            {loadingGrammarId === lesson.id ? 'Memuat lesson...' : 'Intro, transformasi bentuk, susun kalimat, dan pilihan konteks.'}
                        </span>
                    </span>
                    <span className="flex h-7 w-7 min-[380px]:h-8 min-[380px]:w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 transition group-hover:bg-sky-200 dark:bg-sky-950/60 dark:text-sky-300">
                        <ChevronRightIcon sx={{ fontSize: 19 }} />
                    </span>
                </motion.button>)}
            </div>

            <GrammarQuizPreviewDialog
                open={Boolean(grammarQuiz)}
                quiz={grammarQuiz}
                persist
                onClose={() => setGrammarQuiz(null)}
            />
        </div>
    );
}

function DesktopDayPopover({ day, x, onClose }) {
    const openToRight = x <= 50;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, x: openToRight ? -12 : 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: openToRight ? -12 : 12 }}
            transition={{ type: 'spring', stiffness: 330, damping: 27 }}
            className="absolute top-0 z-50 hidden w-[360px] sm:block lg:w-[420px]"
            style={openToRight
                ? { left: `calc(${x}% + 54px)` }
                : { right: `calc(${100 - x}% + 54px)` }}
        >
            <span className={`absolute top-9 h-4 w-4 rotate-45 border bg-[#f1fbe9] dark:bg-gray-900 ${
                openToRight
                    ? '-left-2 border-b-0 border-l border-r-0 border-t border-[#d7edc8] dark:border-gray-700'
                    : '-right-2 border-b border-l-0 border-r border-t-0 border-[#d7edc8] dark:border-gray-700'
            }`} />
            <DayDetailContent day={day} onClose={onClose} />
        </motion.div>
    );
}

function MobileDaySheet({ day, onClose }) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return (
        <motion.div
            className="fixed inset-0 z-[90] sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <button
                type="button"
                aria-label="Tutup detail Hari"
                onClick={onClose}
                className="absolute inset-0 bg-black/55"
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col"
            >
                <DayDetailContent day={day} onClose={onClose} mobile />
            </motion.div>
        </motion.div>
    );
}

const PATH_ROW_HEIGHT = 164;
const PATH_NODE_CENTER_Y = 34;

function pathX(index) {
    return 50 - (Math.sin(index * 1.12) * 16);
}

function connectorColor(previousItem, item) {
    if (previousItem.status === 'done' && item.status === 'done') {
        return '#22c55e';
    }

    if (previousItem.status === 'active' || item.status === 'active') {
        return '#58cc02';
    }

    return '#cbd5e1';
}

function connectorPath(fromIndex, toIndex) {
    const x1 = pathX(fromIndex);
    const x2 = pathX(toIndex);
    const y1 = (fromIndex * PATH_ROW_HEIGHT) + PATH_NODE_CENTER_Y;
    const y2 = (toIndex * PATH_ROW_HEIGHT) + PATH_NODE_CENTER_Y;
    const middleY = (y1 + y2) / 2;

    return `M ${x1} ${y1} C ${x1} ${middleY}, ${x2} ${middleY}, ${x2} ${y2}`;
}

function PathConnector({ items }) {
    if (items.length < 2) {
        return null;
    }

    const height = ((items.length - 1) * PATH_ROW_HEIGHT) + (PATH_NODE_CENTER_Y * 2);

    return (
        <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-4 z-0 h-auto w-full overflow-visible sm:top-6"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            style={{ height: `${height}px` }}
        >
            {items.slice(0, -1).map((item, index) => {
                const nextItem = items[index + 1];
                const locked = ['locked', 'unavailable'].includes(nextItem.status);

                return (
                    <g key={`connector-${item.key}-${nextItem.key}`}>
                        <path
                            d={connectorPath(index, index + 1)}
                            fill="none"
                            stroke="rgba(148, 163, 184, 0.22)"
                            strokeLinecap="round"
                            strokeWidth="10"
                            vectorEffect="non-scaling-stroke"
                        />
                        <motion.path
                            d={connectorPath(index, index + 1)}
                            fill="none"
                            stroke={connectorColor(item, nextItem)}
                            strokeDasharray={locked ? '5 9' : '1 0'}
                            strokeLinecap="round"
                            strokeWidth="4"
                            vectorEffect="non-scaling-stroke"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: locked ? 0.55 : 0.9 }}
                            transition={{ duration: 0.45, delay: index * 0.05 }}
                        />
                    </g>
                );
            })}
        </svg>
    );
}

function DuolingoPath({ week, selectedDayId, onDayToggle }) {
    const items = weeklyMainItems(week);
    const selectedDay = items.find((item) => item.dayId === selectedDayId) || null;

    useEffect(() => {
        if (!selectedDay) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') onDayToggle(selectedDay.dayId);
        };

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onDayToggle, selectedDay]);

    return (
        <div className="relative mx-auto w-full max-w-3xl py-3 sm:py-6">
            <PathConnector items={items} />

            {selectedDay && (
                <button
                    type="button"
                    aria-label="Tutup detail Hari"
                    onClick={() => onDayToggle(selectedDay.dayId)}
                    className="fixed inset-0 z-30 hidden bg-transparent sm:block"
                />
            )}

            {items.map((item, index) => {
                const x = pathX(index);
                const selected = item.dayId === selectedDayId;

                return (
                    <div
                        key={item.key}
                        className={`relative overflow-visible ${selected ? 'z-50' : 'z-10'}`}
                        style={{ height: `${PATH_ROW_HEIGHT}px` }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.035 }}
                            className="group/node absolute top-0 flex -translate-x-1/2 flex-col items-center"
                            style={{ left: `${x}%` }}
                        >
                            <PathNode item={item} selected={selected} onDayToggle={onDayToggle} />
                            <PathNodeLabel item={item} onDayToggle={onDayToggle} selected={selected} />
                        </motion.div>

                        <AnimatePresence initial={false}>
                            {item.kind === 'day' && selected && (
                                <DesktopDayPopover
                                    key={`popover-${item.dayId}`}
                                    day={item.day}
                                    x={x}
                                    onClose={() => onDayToggle(item.dayId)}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            <AnimatePresence initial={false}>
                {selectedDay && (
                    <MobileDaySheet
                        key={`sheet-${selectedDay.dayId}`}
                        day={selectedDay.day}
                        onClose={() => onDayToggle(selectedDay.dayId)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function WeekRoadmapSection({ week, expanded, onToggle }) {
    const days = week.days || [];
    const [selectedDayId, setSelectedDayId] = useState(null);
    const locked = ['locked', 'unavailable'].includes(week.status);
    const canExpand = !locked || Boolean(week.live_session);
    const completedDays = days.filter((day) => day.status === 'done').length;
    const progress = days.length > 0 ? Math.round((completedDays / days.length) * 100) : 0;

    useEffect(() => {
        setSelectedDayId(null);
    }, [week.id]);

    const toggleDay = (dayId) => {
        const isClosing = selectedDayId === dayId;

        playSoundEffect(isClosing ? 'close' : 'open');
        setSelectedDayId(isClosing ? null : dayId);
    };

    return (
        <section className="mx-auto mb-5 max-w-4xl sm:mb-7">
            <button
                type="button"
                onClick={() => {
                    if (!canExpand) return;

                    playSoundEffect(expanded ? 'close' : 'open');
                    onToggle();
                }}
                disabled={!canExpand}
                aria-expanded={expanded}
                className={`relative flex min-h-[76px] w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left shadow-lg shadow-brand-900/5 transition sm:px-5 ${
                    week.status === 'active'
                        ? 'border-brand-300 bg-white hover:border-brand-500 hover:shadow-xl dark:border-green-800 dark:bg-gray-900 dark:hover:border-green-700'
                        : week.status === 'done'
                            ? 'border-emerald-200 bg-white/90 hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-gray-900'
                            : 'border-white/70 bg-white/75 hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900/75'
                } ${!canExpand ? 'cursor-not-allowed opacity-75' : 'hover:-translate-y-0.5'}`}
            >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${
                    week.status === 'done'
                        ? 'bg-emerald-500'
                        : week.status === 'active'
                            ? 'bg-[#58cc02]'
                            : 'bg-gray-300 dark:bg-gray-700'
                }`} />
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    week.status === 'done'
                        ? 'bg-emerald-600 text-white'
                        : week.status === 'active'
                            ? 'bg-[#58cc02] text-[#2d3742] shadow-[0_4px_0_#46a302]'
                            : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                    {week.status === 'done'
                        ? <CheckCircleIcon sx={{ fontSize: 24 }} />
                        : locked
                            ? <LockIcon sx={{ fontSize: 21 }} />
                            : week.week_number}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="block text-xs font-black text-brand-700 dark:text-brand-300">
                            Minggu {week.week_number}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            week.status === 'done'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : week.status === 'active'
                                    ? 'bg-brand-100 text-brand-700 dark:bg-[#12351f] dark:text-green-200'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                            {itemStatusLabel(week)}
                        </span>
                    </span>
                    <span className="block truncate text-sm font-black text-gray-900 sm:text-base dark:text-white">
                        {week.display_title || week.title}
                    </span>
                    {!locked && days.length > 0 ? (
                        <span className="mt-1.5 flex items-center gap-3">
                            <span className="h-1.5 max-w-sm flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <span className={`block h-full rounded-full ${week.status === 'done' ? 'bg-progress-complete' : 'bg-[#58cc02]'}`} style={{ width: `${progress}%` }} />
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-gray-500 dark:text-gray-400">{completedDays}/{days.length} Hari</span>
                        </span>
                    ) : (
                        <span className="mt-1 block line-clamp-2 text-[10px] font-semibold text-gray-400">{week.lock_reason}</span>
                    )}
                </span>
                {canExpand && (
                    <ExpandMoreIcon className={`shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} sx={{ fontSize: 24 }} />
                )}
            </button>

            <AnimatePresence initial={false}>
                {expanded && canExpand && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 rounded-2xl border border-[#cedbd2] bg-[#f1f6f3]/90 px-2 py-3 shadow-[0_18px_44px_-34px_rgba(45,55,66,0.45)] backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/45 min-[380px]:px-3 sm:mt-4 sm:px-6 sm:py-6">
                            <DuolingoPath
                                week={week}
                                selectedDayId={selectedDayId}
                                onDayToggle={toggleDay}
                            />

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

function LibraryShortcut({ program }) {
    if (!program?.resources?.vocabulary_url) return null;

    return (
        <Link
            href={program.resources.vocabulary_url}
            className="group mb-5 flex min-h-14 items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/75 px-2.5 py-2 backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 dark:border-amber-900/60 dark:bg-amber-950/25 dark:hover:border-amber-700 dark:hover:bg-amber-950/40 min-[360px]:gap-3 min-[360px]:px-3 sm:px-3.5 xl:hidden"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-amber-950 shadow-[0_2px_0_#b45309] min-[360px]:h-10 min-[360px]:w-10">
                <AutoStoriesIcon sx={{ fontSize: 21 }} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-gray-900 dark:text-white">
                    Pustaka Materi
                </span>
                <span className="block truncate text-[10px] font-semibold text-gray-600 dark:text-gray-400 min-[360px]:text-[11px]">
                    Kosakata, kanji, dan bunpo
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
                <span className="rounded-lg bg-white/80 px-2 py-1 text-center dark:bg-gray-900/70">
                    <span className="block text-xs font-black leading-none text-gray-800 dark:text-gray-100">
                        {program.resources.vocabulary_count || 0}
                    </span>
                    <span className="mt-0.5 block text-[8px] font-bold uppercase leading-none text-gray-500 dark:text-gray-400">
                        Entri
                    </span>
                </span>
                <ChevronRightIcon
                    className="text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600"
                    sx={{ fontSize: 21 }}
                />
            </span>
        </Link>
    );
}

function DesktopLibraryPanel({ program, open, onToggle }) {
    if (!program?.resources?.vocabulary_url) return null;

    return (
        <aside className="sticky top-20 hidden xl:block">
            <AnimatePresence initial={false} mode="wait">
                {open ? (
                    <motion.div
                        key="library-panel"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white/90 shadow-lg shadow-amber-950/5 backdrop-blur-md dark:border-amber-900/60 dark:bg-gray-900/90"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/35">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-[0_2px_0_#b45309]">
                                <AutoStoriesIcon sx={{ fontSize: 22 }} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-black text-gray-900 dark:text-white">
                                    Pustaka Materi
                                </span>
                                <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-gray-500 dark:text-gray-400">
                                    Referensi pendukung roadmap
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={onToggle}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-amber-300"
                                aria-label="Tutup Pustaka"
                                aria-expanded="true"
                                title="Tutup Pustaka"
                            >
                                <ChevronRightIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-2xl font-black leading-none text-gray-900 dark:text-white">
                                        {program.resources.vocabulary_count || 0}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                                        Entri tersedia
                                    </p>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Pendukung
                                </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Isi Pustaka">
                                {['Kosakata', 'Kanji', 'Bunpo'].map((label) => (
                                    <span
                                        key={label}
                                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>

                            <p className="mt-4 text-xs font-semibold leading-5 text-gray-500 dark:text-gray-400">
                                Gunakan sebagai referensi saat mempelajari materi pada setiap Minggu.
                            </p>

                            <Link
                                href={program.resources.vocabulary_url}
                                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-amber-950 shadow-[0_3px_0_#b45309] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 active:translate-y-0.5 active:shadow-[0_1px_0_#b45309]"
                            >
                                Buka Pustaka
                                <ChevronRightIcon sx={{ fontSize: 18 }} />
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        key="library-rail"
                        type="button"
                        onClick={onToggle}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.16 }}
                        className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-amber-200/80 bg-white/90 px-1 py-3 text-amber-900 shadow-lg shadow-amber-950/5 backdrop-blur-md transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 dark:border-amber-900/60 dark:bg-gray-900/90 dark:text-amber-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/40"
                        aria-label="Buka Pustaka Materi"
                        aria-expanded="false"
                        title="Buka Pustaka Materi"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-[0_2px_0_#b45309] transition-transform group-hover:-translate-y-0.5">
                            <AutoStoriesIcon sx={{ fontSize: 20 }} />
                        </span>
                        <span className="text-[10px] font-black leading-none">
                            {program.resources.vocabulary_count || 0}
                        </span>
                        <span className="[writing-mode:vertical-rl] text-[9px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                            Pustaka
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </aside>
    );
}

export default function DaftarModul({ weeks = [], program = null, back_url = null }) {
    const displayWeeks = weeks.length > 0 ? weeks : [{
        id: 'empty',
        display_title: 'Roadmap belum tersedia',
        week_number: 1,
        status: 'unavailable',
        lock_reason: 'Admin belum menambahkan Minggu.',
        days: [],
    }];
    const defaultExpandedWeekId = displayWeeks.find((week) => week.status === 'active')?.id
        || displayWeeks.find((week) => Boolean(week.live_session))?.id
        || [...displayWeeks].reverse().find((week) => week.status === 'done')?.id
        || null;
    const [expandedWeekId, setExpandedWeekId] = useState(defaultExpandedWeekId);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const completedWeekCount = displayWeeks.filter((week) => week.status === 'done').length;
    const roadmapProgress = displayWeeks.length > 0
        ? Math.round((completedWeekCount / displayWeeks.length) * 100)
        : 0;
    const activeWeek = displayWeeks.find((week) => week.status === 'active');
    const activeDay = activeWeek?.days?.find((day) => day.status === 'active');
    const liveSessionSignature = displayWeeks
        .map((week) => `${week.live_session?.id || ''}:${week.live_session?.status || ''}`)
        .join('|');
    const nextAction = activeWeek
        ? `Lanjutkan Minggu ${activeWeek.week_number}${activeDay ? `, Hari ${activeDay.day_number}` : ''}`
        : completedWeekCount === displayWeeks.length
            ? 'Semua Minggu sudah selesai'
            : 'Belum ada Minggu yang dapat dibuka';

    useEffect(() => {
        setExpandedWeekId(defaultExpandedWeekId);
    }, [defaultExpandedWeekId, program?.id]);

    useEffect(() => {
        setThumbnailFailed(false);
    }, [program?.thumbnail_url]);

    useEffect(() => {
        setLibraryOpen(window.localStorage.getItem('toku-up:roadmap-library-open') === 'true');
    }, []);

    useEffect(() => {
        window.localStorage.setItem('toku-up:roadmap-library-open', String(libraryOpen));
    }, [libraryOpen]);

    useEffect(() => {
        if (!libraryOpen) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setLibraryOpen(false);
        };

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [libraryOpen]);

    useEffect(() => {
        if (!program?.kloter) return undefined;

        const hasVisibleSession = displayWeeks.some((week) => Boolean(week.live_session));

        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            router.reload({ only: ['weeks'], preserveScroll: true, preserveState: true });
        }, hasVisibleSession ? 30000 : 60000);

        return () => window.clearInterval(interval);
    }, [liveSessionSignature, program?.kloter?.id]);

    const startCheckout = async (plan, kloterId = null) => {
        setCheckoutError('');
        setCheckoutProcessing(true);
        const storageKey = `midtrans:checkout-intent:${plan.id}:${kloterId || 'mandiri'}`;

        try {
            const submitCheckout = (requestKey) => window.axios.post(route('payments.midtrans.checkout'), {
                payment_plan_id: plan.id,
                checkout_request_key: requestKey,
                kloter_belajar_id: kloterId,
            });
            let requestKey = window.sessionStorage?.getItem(storageKey) || createCheckoutRequestKey();
            window.sessionStorage?.setItem(storageKey, requestKey);
            let response;

            try {
                response = await submitCheckout(requestKey);
            } catch (error) {
                if (error.response?.status !== 410) throw error;

                requestKey = createCheckoutRequestKey();
                window.sessionStorage?.setItem(storageKey, requestKey);
                response = await submitCheckout(requestKey);
            }

            const transactionCode = response.data?.transaction_code;
            if (!transactionCode) throw new Error('Checkout tidak mengembalikan kode transaksi. Silakan coba lagi.');

            window.sessionStorage?.removeItem(storageKey);
            window.sessionStorage?.setItem(
                `midtrans:${transactionCode}`,
                JSON.stringify({ snapToken: response.data.snap_token, redirectUrl: response.data.redirect_url }),
            );
            window.location.href = route('user.checkout', { transactionCode });
        } catch (error) {
            if ([409, 410].includes(error.response?.status)) window.sessionStorage?.removeItem(storageKey);

            setCheckoutError(error.response?.data?.message || error.message || 'Gagal memulai pembayaran Midtrans.');
        } finally {
            setCheckoutProcessing(false);
        }
    };

    return (
        <MotionConfig reducedMotion="user">
        <AuthenticatedLayout header={false}>
            <Head title={`${program?.title || 'Roadmap'} - TOKU-UP`} />

            <div className="relative min-h-[100dvh] overflow-x-clip bg-[#e7efea] text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(88,204,2,0.07)_0%,transparent_32%),linear-gradient(240deg,rgba(255,200,0,0.055)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(45,55,66,0.045)_0_1px,transparent_1px_82px),repeating-linear-gradient(0deg,rgba(45,55,66,0.04)_0_1px,transparent_1px_82px)] dark:bg-[linear-gradient(120deg,rgba(88,204,2,0.07)_0%,transparent_28%),linear-gradient(240deg,rgba(255,200,0,0.045)_0%,transparent_30%)]" />
                <div className="pointer-events-none absolute left-4 top-40 hidden text-[13rem] font-black leading-none text-brand-900/[0.045] dark:text-white/[0.035] lg:block">道</div>
                <div className="pointer-events-none absolute right-8 top-[560px] hidden text-[12rem] font-black leading-none text-amber-900/[0.05] dark:text-white/[0.03] lg:block">週</div>

                <header className="relative z-10 px-4 pb-3 pt-5 sm:px-6 sm:pb-5 sm:pt-7 lg:px-20">
                    <div className="mx-auto max-w-4xl">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {back_url ? (
                                <Link
                                    href={back_url}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/75 px-3 text-xs font-black text-gray-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900/75 dark:text-gray-300"
                                >
                                    <ArrowBackIcon sx={{ fontSize: 16 }} />
                                    Pilih Program
                                </Link>
                            ) : <span />}
                            <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brand-600/10 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-brand-600">
                                <AutoStoriesIcon sx={{ fontSize: 15 }} />
                                {[program?.curriculum?.name, program?.level].filter(Boolean).join(' ') || 'Program belajar'}
                            </span>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                            <div className="min-w-0">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-amber-500 shadow-lg shadow-brand-950/15 sm:w-56">
                                        {program?.thumbnail_url && !thumbnailFailed ? (
                                            <img src={program.thumbnail_url} alt={program.title} className="h-full w-full object-cover" onError={() => setThumbnailFailed(true)} />
                                        ) : <AutoStoriesIcon className="absolute inset-0 m-auto text-white" sx={{ fontSize: 48 }} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                                {program?.has_class_access ? 'Kelas aktif' : 'Preview Week 1 Gratis'}
                                            </span>
                                            {program?.access_mode_label && <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-600 dark:bg-gray-900/80 dark:text-gray-300">{program.access_mode_label}</span>}
                                        </div>
                                        <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl dark:text-white">{program?.title || 'Roadmap Mingguan'}</h1>
                                        {program?.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">{program.description}</p>}
                                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {program?.instructor_name && <span className="inline-flex items-center gap-1.5"><GroupsIcon sx={{ fontSize: 16 }} />{program.instructor_name}</span>}
                                            <span className="inline-flex items-center gap-1.5"><MenuBookIcon sx={{ fontSize: 16 }} />{program?.lessons || displayWeeks.length} Minggu</span>
                                        </div>
                                        {!program?.has_class_access && <a href="#roadmap" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-brand-200 bg-white/75 px-3.5 text-sm font-black text-brand-700 transition hover:bg-brand-50 dark:border-green-900/70 dark:bg-gray-900/75 dark:text-green-200 dark:hover:bg-[#12351f]"><PlayArrowIcon sx={{ fontSize: 18 }} />Coba Week 1</a>}
                                    </div>
                                </div>

                                {program?.has_class_access && (
                                    <div className="mt-5 max-w-xl">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                                            <span>{completedWeekCount} dari {displayWeeks.length} Minggu selesai</span>
                                            <span>{roadmapProgress}%</span>
                                        </div>
                                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner dark:bg-gray-800">
                                            <motion.div className="h-full rounded-full bg-[#58cc02]" initial={{ width: 0 }} animate={{ width: `${roadmapProgress}%` }} transition={{ duration: 0.45, ease: 'easeOut' }} />
                                        </div>
                                        {program?.id && <ExamTargetCard program={program} completedWeekCount={completedWeekCount} totalWeeks={displayWeeks.length} />}
                                    </div>
                                )}
                            </div>

                            <CourseAccessPanel program={program} processing={checkoutProcessing} error={checkoutError} onCheckout={startCheckout} />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <span className={`h-2 w-2 rounded-full ${program?.kloter ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {program?.kloter ? (
                                <>
                                    <span className="font-black text-gray-700 dark:text-gray-200">{program.kloter.nama}</span>
                                    <span>- Minggu aktif {program.kloter.minggu_aktif || 0}</span>
                                    <span>- Mulai {program.kloter.tanggal_mulai || '-'}</span>
                                </>
                            ) : (
                                <span>Jadwal umum aktif</span>
                            )}
                        </div>

                    </div>
                </header>

                <main id="roadmap" className="relative z-10 px-3 pb-8 pt-3 sm:px-6 sm:pb-14 sm:pt-5">
                    <div
                        className={`mx-auto max-w-7xl xl:grid xl:items-start xl:gap-5 ${
                            program?.resources?.vocabulary_url
                                ? libraryOpen
                                    ? 'xl:grid-cols-[minmax(0,1fr)_280px]'
                                    : 'xl:grid-cols-[minmax(0,1fr)_52px]'
                                : 'xl:grid-cols-1'
                        }`}
                    >
                        <div className="min-w-0">
                            <LibraryShortcut program={program} />

                            {displayWeeks.map((week) => (
                                <WeekRoadmapSection
                                    key={week.id}
                                    week={week}
                                    expanded={expandedWeekId === week.id}
                                    onToggle={() => setExpandedWeekId((current) => current === week.id ? null : week.id)}
                                />
                            ))}
                        </div>

                        <DesktopLibraryPanel
                            program={program}
                            open={libraryOpen}
                            onToggle={() => setLibraryOpen((current) => !current)}
                        />
                    </div>
                </main>
            </div>
        </AuthenticatedLayout>
        </MotionConfig>
    );
}
