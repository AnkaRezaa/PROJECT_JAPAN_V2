import React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

export default function QuizBuilderHeader({
    title = 'Builder Kuis',
    subtitle = '',
    categoryBadge = '',
    status = 'draft',
    savedAt = '',
    saving = false,
    hasUnsavedChanges = false,
    onBack,
    onSave,
    onToggleStatus,
    onPreview,
    onImport,
    importLabel = 'Import XLSX / CSV',
    centerContent,
    extraActions,
    className = '',
}) {
    const isPublished = status === 'published';

    return (
        <header
            className={`shrink-0 border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900 sm:px-5 sm:py-3 ${className}`}
        >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                {/* Sisi Kiri: Kembali & Info Modul */}
                <div className="flex min-w-0 items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            title="Kembali"
                            aria-label="Kembali"
                            className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <ArrowBackIcon sx={{ fontSize: 18 }} />
                            <span className="hidden sm:inline">Kembali</span>
                        </button>
                    )}

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            {categoryBadge && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    {categoryBadge}
                                </span>
                            )}
                            {subtitle && (
                                <p className="truncate text-[11px] font-bold text-gray-400 dark:text-gray-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <h1 className="truncate text-sm font-black text-gray-900 dark:text-white sm:text-base">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Sisi Tengah: Selector Lesson/Wacana (Jika Diberikan) */}
                {centerContent && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {centerContent}
                    </div>
                )}

                {/* Sisi Kanan: Status & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {hasUnsavedChanges && (
                        <span className="hidden text-xs font-bold text-amber-600 dark:text-amber-400 sm:inline">
                            Belum disimpan
                        </span>
                    )}
                    {savedAt && (
                        <span className="hidden text-xs font-bold text-emerald-600 dark:text-emerald-400 md:inline">
                            Tersimpan {savedAt}
                        </span>
                    )}

                    {onImport && (
                        <button
                            type="button"
                            onClick={onImport}
                            className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-emerald-700"
                        >
                            <UploadFileIcon sx={{ fontSize: 16 }} />
                            <span>{importLabel}</span>
                        </button>
                    )}

                    {onPreview && (
                        <button
                            type="button"
                            onClick={onPreview}
                            className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                            <span>Preview Siswa</span>
                        </button>
                    )}

                    {onToggleStatus && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onToggleStatus}
                            className={`flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-black transition disabled:opacity-50 ${
                                isPublished
                                    ? 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 hover:bg-amber-100'
                                    : 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            {isPublished ? 'Jadikan Draf' : 'Terbitkan'}
                        </button>
                    )}

                    {extraActions}

                    {onSave && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onSave}
                            className="flex h-9 items-center gap-1.5 rounded-xl bg-gray-900 px-4 text-xs font-black text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        >
                            <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                            <span>{saving ? 'Menyimpan...' : 'Simpan Draf'}</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
