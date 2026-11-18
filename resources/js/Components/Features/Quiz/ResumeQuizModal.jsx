import React from 'react';
import RestoreIcon from '@mui/icons-material/Restore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Modal dialog konfirmasi untuk melanjutkan sesi pengerjaan kuis yang tersimpan (Save & Resume Checkpoint).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Status buka/tutup modal
 * @param {string} props.title - Judul kuis (misal: "Kuis Kosakata Hari 1")
 * @param {number|string} props.savedQuestionNumber - Nomor soal terakhir yang tersimpan
 * @param {number|string} [props.totalQuestions] - Total jumlah soal
 * @param {string} [props.savedTimeText] - Keterangan waktu simpan (misal: "15 menit lalu", "kemarin")
 * @param {Function} props.onResume - Callback saat user memilih lanjutkan
 * @param {Function} props.onRestart - Callback saat user memilih mulai baru
 */
export default function ResumeQuizModal({
    isOpen,
    title = 'Kuis Latihan',
    quizTitle,
    savedQuestionNumber = 1,
    totalQuestions = null,
    currentStepDescription = null,
    savedTimeText = 'beberapa saat lalu',
    savedTimeFormatted,
    onResume,
    onRestart,
}) {
    if (!isOpen) return null;

    const displayTitle = quizTitle || title;
    const displayTime = savedTimeFormatted || savedTimeText;
    const displayStep = currentStepDescription || `Soal ${savedQuestionNumber}${totalQuestions ? ` dari ${totalQuestions}` : ''}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 text-slate-950 shadow-2xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 sm:rounded-3xl sm:p-7">
                {/* Header Icon */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-8 ring-amber-50 dark:ring-amber-950/30">
                    <RestoreIcon sx={{ fontSize: 30 }} />
                </div>

                <div className="text-center">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        Sesi Tersimpan
                    </span>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">
                        Lanjutkan Latihan?
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Kami menemukan progres yang belum selesai untuk <span className="font-bold text-slate-900 dark:text-white">{displayTitle}</span>.
                    </p>

                    {/* Checkpoint Detail Card */}
                    <dl className="mt-4 space-y-2 rounded-lg border border-slate-300 bg-slate-100 p-3 text-left text-sm dark:border-slate-600 dark:bg-slate-800">
                        <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-2">
                            <dt className="font-medium text-slate-700 dark:text-slate-200">Posisi terakhir</dt>
                            <dd className="text-right font-bold text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                                {displayStep}
                            </dd>
                        </div>
                        {displayTime && (
                            <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-2">
                                <dt className="font-medium text-slate-700 dark:text-slate-200">Disimpan</dt>
                                <dd className="text-right font-semibold text-slate-800 [overflow-wrap:anywhere] dark:text-slate-100">{displayTime}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onRestart}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-slate-200 fine-pointer:hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:active:bg-slate-600 dark:fine-pointer:hover:bg-slate-700 sm:w-1/2"
                    >
                        <RefreshIcon sx={{ fontSize: 18 }} />
                        <span>Mulai dari Awal</span>
                    </button>

                    <button
                        type="button"
                        onClick={onResume}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-emerald-900 fine-pointer:hover:bg-emerald-800 sm:w-1/2"
                    >
                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                        <span>Lanjutkan</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
