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
            <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
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
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850 text-left">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span>Posisi Terakhir:</span>
                            <span className="font-bold text-slate-950 dark:text-white">
                                {displayStep}
                            </span>
                        </div>
                        {displayTime && (
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span>Waktu Tersimpan:</span>
                                <span>{displayTime}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onRestart}
                        className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition"
                    >
                        <RefreshIcon sx={{ fontSize: 18 }} />
                        <span>Mulai dari Awal</span>
                    </button>

                    <button
                        type="button"
                        onClick={onResume}
                        className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition"
                    >
                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                        <span>Lanjutkan</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
