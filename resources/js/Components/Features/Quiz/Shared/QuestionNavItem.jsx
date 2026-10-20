import React from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';

export default function QuestionNavItem({
    index = 0,
    isSelected = false,
    isReady = false,
    title = '',
    subtitle = '',
    typeLabel = '',
    canMoveUp = false,
    canMoveDown = false,
    canDelete = true,
    canDuplicate = true,
    onSelect,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    className = '',
}) {
    const qNum = index + 1;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.();
                }
            }}
            aria-label={`Pilih soal nomor ${qNum}: ${title || 'Pertanyaan belum diisi'}`}
            className={`group relative cursor-pointer rounded-xl border p-3 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40'
                    : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:bg-gray-950/40 dark:hover:bg-gray-900'
            } ${className}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors ${
                            isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                        {qNum}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Q{qNum}
                    </span>
                    {typeLabel && (
                        <span className="truncate rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {typeLabel}
                        </span>
                    )}
                </div>

                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black transition-colors ${
                        isReady
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                >
                    {isReady ? (
                        <CheckCircleOutlinedIcon sx={{ fontSize: 11 }} />
                    ) : (
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 11 }} />
                    )}
                    {isReady ? 'Siap' : 'Belum'}
                </span>
            </div>

            <p className="mt-2 line-clamp-2 text-sm font-japanese font-medium text-gray-900 dark:text-white leading-snug">
                {title?.trim() || <span className="italic font-sans text-gray-400 text-xs">Pertanyaan belum diisi</span>}
            </p>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
                <span className="truncate max-w-[130px] font-medium text-gray-500 dark:text-gray-400">
                    {subtitle || '-'}
                </span>

                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    {onMoveUp && (
                        <button
                            type="button"
                            disabled={!canMoveUp}
                            title="Geser ke atas"
                            aria-label={`Geser Q${qNum} ke atas`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveUp();
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded p-1 text-gray-400 transition hover:text-emerald-600 disabled:opacity-20 dark:hover:text-emerald-400"
                        >
                            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                        </button>
                    )}
                    {onMoveDown && (
                        <button
                            type="button"
                            disabled={!canMoveDown}
                            title="Geser ke bawah"
                            aria-label={`Geser Q${qNum} ke bawah`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveDown();
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded p-1 text-gray-400 transition hover:text-emerald-600 disabled:opacity-20 dark:hover:text-emerald-400"
                        >
                            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                        </button>
                    )}
                    {canDuplicate && onDuplicate && (
                        <button
                            type="button"
                            title="Duplikat soal ini"
                            aria-label={`Duplikat Q${qNum}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate();
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded p-1 text-gray-400 transition hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </button>
                    )}
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            title="Hapus soal ini"
                            aria-label={`Hapus Q${qNum}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded p-1 text-gray-400 transition hover:text-rose-600 dark:hover:text-rose-400"
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
