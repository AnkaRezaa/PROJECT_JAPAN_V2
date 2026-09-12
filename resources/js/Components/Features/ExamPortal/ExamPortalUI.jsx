import React from 'react';
import { Link } from '@inertiajs/react';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

export const PrototypeBadge = () => (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        Data pratinjau
    </span>
);

export function PageHeading({ eyebrow, title, description, action = null }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
                {eyebrow && <p className="text-xs font-black uppercase text-brand-700 dark:text-green-300">{eyebrow}</p>}
                <h1 className="mt-2 text-2xl font-black text-[#17231d] dark:text-white sm:text-3xl">{title}</h1>
                {description && <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">{description}</p>}
            </div>
            {action}
        </div>
    );
}

const statusConfig = {
    available: { label: 'Tersedia', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' },
    completed: { label: 'Pernah dikerjakan', className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200' },
    locked: { label: 'Belum tersedia', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export function ExamCard({ exam }) {
    const status = statusConfig[exam.status] || statusConfig.available;
    const isLocked = exam.status === 'locked';

    return (
        <article className="flex min-h-[260px] flex-col overflow-hidden rounded-lg border border-[#dbe5df] bg-white shadow-[0_10px_24px_-20px_rgba(23,35,29,0.5)] dark:border-white/10 dark:bg-[#142019]">
            <div className={`h-1.5 ${exam.type === 'simulation' ? 'bg-[#f5bd32]' : 'bg-[#67cdea]'}`} />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${exam.type === 'simulation' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>
                        {exam.type === 'simulation' ? 'Simulasi JLPT' : 'Latihan Ujian'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>
                </div>
                <h2 className="mt-4 text-base font-black leading-6 text-gray-950 dark:text-white">{exam.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{exam.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><AccessTimeRoundedIcon sx={{ fontSize: 16 }} />{exam.duration_minutes} mnt</span>
                    <span className="flex items-center gap-1.5"><QuizOutlinedIcon sx={{ fontSize: 16 }} />{exam.question_count} soal</span>
                    <span className="flex items-center gap-1.5"><LayersOutlinedIcon sx={{ fontSize: 16 }} />{exam.section_count} bagian</span>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Level</p>
                        <p className="mt-0.5 text-sm font-black text-brand-800 dark:text-green-200">JLPT {exam.level}</p>
                    </div>
                    {isLocked ? (
                        <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-4 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <LockOutlinedIcon sx={{ fontSize: 17 }} /> Terkunci
                        </span>
                    ) : (
                        <a
                            href={route('user.exams.show', exam.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-xs font-black text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                        >
                            Lihat detail <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

export function EmptyState({ title = 'Data belum tersedia', description = 'Ubah filter atau kembali lagi nanti.' }) {
    return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-[#142019]">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                <Inventory2OutlinedIcon />
            </span>
            <h2 className="mt-4 text-base font-black text-gray-900 dark:text-white">{title}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
    );
}

export const FieldLabel = ({ children }) => (
    <span className="mb-1.5 block text-xs font-black uppercase text-gray-500 dark:text-gray-400">{children}</span>
);

export const inputClassName = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-focus focus:ring-focus dark:border-gray-700 dark:bg-[#101914] dark:text-white';
