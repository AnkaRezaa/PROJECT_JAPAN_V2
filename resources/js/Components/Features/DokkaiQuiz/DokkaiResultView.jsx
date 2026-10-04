import React from 'react';
import Badge from '@/Components/UI/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReplayIcon from '@mui/icons-material/Replay';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export default function DokkaiResultView({
    quiz,
    result = {},
    onReviewAnswers,
    onProceedToGlossary,
    onRetry,
    preview = false,
}) {
    const score = Number(result?.score ?? 0);
    const correctCount = Number(result?.correct_count ?? 0);
    const totalQuestions = Number(result?.total_questions ?? 0);
    const xpEarned = Number(result?.xp_earned ?? quiz?.xp_reward ?? 0);
    const isPassed = result?.is_passed ?? score >= 70;

    return (
        <div className="mx-auto max-w-2xl w-full">
            <div className="rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center transition-all animate-in fade-in duration-300">
                {/* Trophy or Badge Icon with Celebratory Animation */}
                <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl shadow-md transition-transform animate-in zoom-in-75 duration-300 ${
                    isPassed
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white ring-8 ring-emerald-100 dark:ring-emerald-950/60'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                    <EmojiEventsIcon sx={{ fontSize: 52 }} className={isPassed ? 'animate-bounce' : ''} />
                </div>

                <div className="mb-2 inline-flex items-center gap-2">
                    <Badge color={isPassed ? 'green' : 'gray'} className="text-xs font-bold py-1 px-3">
                        {preview ? 'Pratinjau selesai' : isPassed ? '🎉 Selesai & Lulus' : 'Selesai'}
                    </Badge>
                    {quiz?.jlpt_level && (
                        <Badge color="brand" className="text-xs font-bold py-1 px-3">
                            {quiz.jlpt_level}
                        </Badge>
                    )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight mb-2">
                    {isPassed ? 'Luar Biasa! Pemahaman Sangat Baik' : 'Tetap Semangat! Pelajari Eviden Jawaban'}
                </h2>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-md mx-auto mb-8 font-normal leading-relaxed">
                    Kamu telah menyelesaikan seluruh pertanyaan untuk wacana <span className="font-bold font-japanese text-gray-950 dark:text-white">{quiz?.title}</span>.
                </p>

                {/* Main Score Board with Staggered Visual Feel */}
                <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-2xl bg-gray-50/90 p-4 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                            Skor Akhir
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white">
                            {score}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50/90 p-4 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                            Akurasi
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                            {correctCount}/{totalQuestions}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50/90 p-4 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                            {preview ? 'Penyimpanan' : 'XP Reward'}
                        </div>
                        <div className={preview ? 'text-sm font-bold text-gray-700 dark:text-gray-200' : 'text-3xl font-black text-amber-500 dark:text-amber-400 sm:text-4xl'}>
                            {preview ? 'Tidak disimpan' : `+${xpEarned}`}
                        </div>
                    </div>
                </div>

                {/* Action CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onReviewAnswers}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                    >
                        <span>Lihat Pembahasan & Eviden</span>
                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </button>

                    <button
                        type="button"
                        onClick={onProceedToGlossary}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        <MenuBookIcon sx={{ fontSize: 16 }} />
                        <span>Glosarium Kosakata</span>
                    </button>

                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3.5 text-xs font-bold transition cursor-pointer ${
                                !isPassed
                                    ? 'border-2 border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs active:scale-[0.99]'
                                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            <ReplayIcon sx={{ fontSize: 16 }} />
                            <span>Ulangi Kuis</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
