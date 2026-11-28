import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
import ExploreIcon from '@mui/icons-material/Explore';

const USER_STEPS = [
    {
        id: 'welcome',
        title: 'Selamat Datang di TokuUp!',
        description: 'Mari kenali menu utama agar belajar bahasa Jepang harian kamu lebih terarah. Kamu bisa melewati panduan ini kapan saja.',
        selector: null,
    },
    {
        id: 'classes',
        title: 'Kelas Saya & Roadmap Harian',
        description: 'Buka menu Kelas Saya untuk memilih program belajar, melihat jadwal mingguan, dan mengerjakan materi per hari (Moji-Goi, Grammar, Kuis Campuran).',
        selector: 'a[href*="/user/kelas"]',
    },
    {
        id: 'review',
        title: 'Review & Penguatan',
        description: 'Gunakan menu Review untuk mengulang kosakata, kanji, dan soal yang masih perlu diperkuat dengan sistem pengulangan berkala.',
        selector: 'a[href*="/user/review"]',
    },
    {
        id: 'exams',
        title: 'Simulasi & Latihan Ujian',
        description: 'Uji kesiapan JLPT atau SSW kamu lewat menu Ujian dengan format simulasi waktu nyata.',
        selector: 'a[href*="/user/exams"]',
    },
    {
        id: 'progress',
        title: 'Pantau Progres & Peringkat',
        description: 'Lihat XP harian, streak belajar, dan posisi kamu di papan peringkat. Panduan ini dapat dibuka kembali kapan saja lewat menu Profil.',
        selector: 'a[href*="/user/progress"]',
    },
];

const ADMIN_STEPS = [
    {
        id: 'welcome',
        title: 'Selamat Datang di Panel Admin TokuUp',
        description: 'Panduan singkat ini memperkenalkan alur kerja utama pengajar dan admin. Kamu bisa melewati panduan ini kapan saja.',
        selector: null,
    },
    {
        id: 'programs',
        title: 'Kelola Kelas & Roadmap',
        description: 'Atur program pembelajaran, modul mingguan, dan aktivitas per hari (Flashcard, Kuis, Grammar, Dokkai, Presentasi) dari menu Kelas.',
        selector: 'a[href*="/admin/programs"]',
    },
    {
        id: 'content-bank',
        title: 'Pusat Bank Konten & Soal',
        description: 'Kelola bank kosakata, kanji, tata bahasa, dan soal ujian CBT secara terpusat agar mudah digunakan ulang di berbagai kelas.',
        selector: 'a[href*="/admin/bank-soal-konten"], a[href*="/admin/vocabulary"]',
    },
    {
        id: 'cohorts',
        title: 'Kloter & Pemantauan Siswa',
        description: 'Pantau progres siswa, jadwal kloter belajar, serta sesi kelas live dari panel manajemen siswa dan analitik.',
        selector: 'a[href*="/admin/kloters"], a[href*="/admin/users"]',
    },
];

const storageKey = (role, userId) => `tokuup:tour:v1:${role}:${userId || 'anon'}`;

export default function GuidedTour({ role = 'user', userId = null }) {
    const steps = useMemo(() => (role === 'admin' ? ADMIN_STEPS : USER_STEPS), [role]);
    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightRect, setHighlightRect] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !userId) return;

        try {
            const seen = window.localStorage.getItem(storageKey(role, userId));
            if (!seen) {
                const timer = window.setTimeout(() => {
                    setStepIndex(0);
                    setOpen(true);
                }, 600);
                return () => window.clearTimeout(timer);
            }
        } catch {
            // Ignore storage access errors in restricted browsers.
        }
    }, [role, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleRestart = () => {
            setStepIndex(0);
            setOpen(true);
        };

        window.addEventListener('tokuup:restart-tour', handleRestart);
        return () => window.removeEventListener('tokuup:restart-tour', handleRestart);
    }, []);

    const currentStep = steps[stepIndex] || steps[0];

    useEffect(() => {
        if (!open || typeof window === 'undefined') {
            setHighlightRect(null);
            return undefined;
        }

        const updateHighlight = () => {
            if (!currentStep?.selector) {
                setHighlightRect(null);
                return;
            }

            const candidates = Array.from(document.querySelectorAll(currentStep.selector));
            const target = candidates.find((el) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0;
            });

            if (!target) {
                setHighlightRect(null);
                return;
            }

            const rect = target.getBoundingClientRect();
            setHighlightRect({
                top: Math.max(4, rect.top - 4),
                left: Math.max(4, rect.left - 4),
                width: rect.width + 8,
                height: rect.height + 8,
            });
        };

        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        window.addEventListener('scroll', updateHighlight, true);

        return () => {
            window.removeEventListener('resize', updateHighlight);
            window.removeEventListener('scroll', updateHighlight, true);
        };
    }, [open, currentStep]);

    const finishTour = () => {
        setOpen(false);
        setHighlightRect(null);
        if (typeof window !== 'undefined' && userId) {
            try {
                window.localStorage.setItem(storageKey(role, userId), 'done');
            } catch {
                // Ignore storage errors.
            }
        }
    };

    useEffect(() => {
        if (!open || typeof window === 'undefined') return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                finishTour();
            } else if (event.key === 'ArrowRight') {
                if (stepIndex < steps.length - 1) {
                    setStepIndex((i) => i + 1);
                } else {
                    finishTour();
                }
            } else if (event.key === 'ArrowLeft' && stepIndex > 0) {
                setStepIndex((i) => i - 1);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, stepIndex, steps.length]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    const isLast = stepIndex === steps.length - 1;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-title"
            className="fixed inset-0 z-[10050] flex items-end justify-center p-4 sm:items-center"
        >
            <div
                className="fixed inset-0 bg-gray-950/60 backdrop-blur-[2px]"
                onClick={finishTour}
                aria-hidden="true"
            />

            {highlightRect && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed z-[10051] rounded-xl ring-4 ring-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all duration-200"
                    style={{
                        top: highlightRect.top,
                        left: highlightRect.left,
                        width: highlightRect.width,
                        height: highlightRect.height,
                    }}
                />
            )}

            <div className="relative z-[10052] w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                            <ExploreIcon sx={{ fontSize: 20 }} />
                        </span>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-brand-700 dark:text-brand-300">
                                Panduan {role === 'admin' ? 'Admin' : 'Belajar'} · {stepIndex + 1}/{steps.length}
                            </p>
                            <h2 id="guided-tour-title" className="text-base font-black text-gray-900 dark:text-white">
                                {currentStep.title}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={finishTour}
                        aria-label="Tutup panduan"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                <p className="mt-3 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
                    {currentStep.description}
                </p>

                <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
                    {steps.map((step, idx) => (
                        <span
                            key={step.id}
                            className={`h-1.5 rounded-full transition-all ${
                                idx === stepIndex
                                    ? 'w-6 bg-brand-600 dark:bg-brand-400'
                                    : idx < stepIndex
                                        ? 'w-2 bg-brand-300 dark:bg-brand-700'
                                        : 'w-2 bg-gray-200 dark:bg-gray-700'
                            }`}
                        />
                    ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={finishTour}
                        className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        Lewati
                    </button>

                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <ChevronLeftIcon sx={{ fontSize: 16 }} />
                                Sebelumnya
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (isLast) {
                                    finishTour();
                                } else {
                                    setStepIndex((i) => i + 1);
                                }
                            }}
                            className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            {isLast ? (
                                <>
                                    <CheckIcon sx={{ fontSize: 16 }} />
                                    Selesai
                                </>
                            ) : (
                                <>
                                    Lanjut
                                    <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
