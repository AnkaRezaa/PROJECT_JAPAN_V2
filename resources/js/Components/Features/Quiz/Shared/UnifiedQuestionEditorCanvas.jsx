import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import JapaneseSpeechButton from '@/Components/UI/JapaneseSpeechButton';

export default function UnifiedQuestionEditorCanvas({
    questionNumber = 1,
    title = '',
    subtitle = '',
    speechText = null,
    typeBadge = null,
    onDuplicate = null,
    onDelete = null,
    canDelete = true,
    extraActions = null,
    children,
    className = '',
}) {
    const displayTitle = title || `Editor Soal #${questionNumber}`;

    return (
        <section
            aria-label={displayTitle}
            className={`rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 ${className}`}
        >
            {/* Header Soal Aktif */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-xs">
                        {questionNumber}
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-gray-900 dark:text-white truncate">
                                {displayTitle}
                            </h2>
                            {Boolean(speechText?.trim()) && (
                                <JapaneseSpeechButton
                                    text={speechText}
                                    title="Dengarkan pelafalan pertanyaan"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                    iconClassName="!text-sm"
                                />
                            )}
                            {typeBadge && (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    {typeBadge}
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Toolbar Aksi Soal */}
                <div className="flex flex-wrap items-center gap-2">
                    {extraActions}

                    {onDuplicate && (
                        <button
                            type="button"
                            title="Duplikat Soal Ini"
                            aria-label="Duplikat Soal Ini"
                            onClick={onDuplicate}
                            className="flex min-h-[44px] sm:min-h-0 sm:h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                            <span>Duplikat</span>
                        </button>
                    )}

                    {onDelete && (
                        <button
                            type="button"
                            disabled={!canDelete}
                            title="Hapus Soal"
                            aria-label="Hapus Soal"
                            onClick={onDelete}
                            className="flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-30 disabled:pointer-events-none dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition"
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </button>
                    )}
                </div>
            </div>

            {/* Kanvas Form Editor */}
            <div className="pt-5 space-y-6">
                {children}
            </div>
        </section>
    );
}
