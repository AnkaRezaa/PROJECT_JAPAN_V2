import React from 'react';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ContextualFeedbackPrompt from '@/Components/Features/Feedback/ContextualFeedbackPrompt';

export default function ExamResultView({ result, totalQuestions, onExit, exitLabel = 'Kembali ke kumpulan ujian' }) {
    const sections = result.sections || [];
    const reviewItems = result.review || [];
    const totalCorrect = sections.reduce((total, section) => total + Number(section.correct_count || 0), 0);
    const totalAnswered = sections.reduce((total, section) => total + Number(section.answered_count || 0), 0);
    const questionCount = Number(totalQuestions ?? result.question_count ?? totalAnswered);
    const totalIncorrect = Math.max(0, totalAnswered - totalCorrect);
    const totalUnanswered = Math.max(0, questionCount - totalAnswered);
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const passed = result.status === 'passed';

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
            {result.pending ? (
                <section className="border border-[#dbe5df] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#142019] sm:p-8">
                    <p className="text-xs font-black uppercase text-brand-700">Ujian selesai</p>
                    <h1 className="mt-2 text-2xl font-black">Hasil sedang menunggu rilis</h1>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Jawaban sudah tersimpan. Hasil akan muncul di riwayat setelah admin merilisnya.</p>
                </section>
            ) : (
                <>
                    <section className={`border p-6 shadow-sm dark:bg-[#142019] sm:p-8 ${passed ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900' : 'border-rose-200 bg-rose-50/50 dark:border-rose-900'}`}>
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                                    {passed ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                                </span>
                                <div>
                                    <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">{result.label}</p>
                                    <h1 className="mt-1 text-2xl font-black leading-tight text-gray-950 dark:text-white">{result.exam_title}</h1>
                                    <p className={`mt-2 text-sm font-bold ${passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                        {passed ? 'Memenuhi estimasi kelulusan' : result.status === 'failed' ? 'Belum memenuhi estimasi kelulusan' : 'Ujian selesai'}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                        {passed ? 'Pertahankan hasilmu dan tinjau kembali jawaban di bawah.' : 'Pelajari jawaban yang perlu diperbaiki di bawah.'}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 sm:text-right">
                                <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Nilai akhir</p>
                                <p className="mt-1 text-4xl font-black text-gray-950 dark:text-white">
                                    {result.score}<span className="ml-1 text-lg text-gray-400">/{result.max_score}</span>
                                </p>
                            </div>
                        </div>

                        <dl className="mt-7 grid grid-cols-2 border-t border-gray-200 pt-5 dark:border-white/10 sm:grid-cols-4">
                            {[
                                ['Benar', totalCorrect],
                                ['Salah', totalIncorrect],
                                ['Tidak dijawab', totalUnanswered],
                                ['Akurasi', `${accuracy}%`],
                            ].map(([label, value], index) => (
                                <div key={label} className={`px-3 py-2 first:pl-0 sm:px-5 ${index > 0 ? 'border-l border-gray-200 dark:border-white/10' : ''}`}>
                                    <dt className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</dt>
                                    <dd className="mt-1 text-xl font-black text-gray-950 dark:text-white">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <section className="mt-8">
                        <p className="text-xs font-black uppercase text-brand-700">Ringkasan nilai</p>
                        <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">Hasil per bagian</h2>
                        <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200 dark:divide-white/10 dark:border-white/10">
                            {sections.map((section) => {
                                const progress = Number(section.max_score) > 0
                                    ? Math.min(100, Math.max(0, (Number(section.score) / Number(section.max_score)) * 100))
                                    : 0;

                                return (
                                    <div key={section.key} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                                        <div className="min-w-0">
                                            <h3 className="font-black leading-6 text-gray-950 dark:text-white">{section.title}</h3>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                <strong className="text-gray-950 dark:text-white">{section.correct_count} benar</strong> dari {section.answered_count} soal yang dijawab
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Skor bagian</span>
                                                <strong className="text-gray-950 dark:text-white">{section.score}/{section.max_score}</strong>
                                            </div>
                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                                                <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {reviewItems.length > 0 && (
                        <section className="mt-10">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase text-brand-700">Pembahasan</p>
                                    <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">Tinjauan jawaban</h2>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Bandingkan jawabanmu dengan jawaban yang benar dan baca alasannya.</p>
                                </div>
                                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                    {reviewItems.filter((item) => item.is_correct !== true).length} perlu diperbaiki
                                </span>
                            </div>

                            <div className="mt-5 space-y-4">
                                {reviewItems.map((item, index) => {
                                    const isCorrect = item.is_correct === true;

                                    return (
                                        <article key={item.question_id} className="border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#142019]">
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-6">
                                                <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Soal yang ditinjau {index + 1}</p>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                                                    {isCorrect ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : <CancelRoundedIcon sx={{ fontSize: 16 }} />}
                                                    {isCorrect ? 'Benar' : 'Perlu diperbaiki'}
                                                </span>
                                            </div>
                                            <div className="p-5 sm:p-6">
                                                <p className="break-words text-base font-bold leading-7 text-gray-950 dark:text-white">{item.question_text}</p>
                                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                    <div className={`border p-4 ${isCorrect ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'}`}>
                                                        <p className={`flex items-center gap-2 text-xs font-black uppercase ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                                            {isCorrect ? <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> : <CancelRoundedIcon sx={{ fontSize: 18 }} />}
                                                            Jawaban kamu
                                                        </p>
                                                        <p className="mt-3 whitespace-pre-wrap break-words font-bold leading-6 text-gray-950 dark:text-white">{item.answer_text || 'Tidak dijawab'}</p>
                                                    </div>
                                                    <div className="border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                                                        <p className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                                                            <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                                                            Jawaban yang benar
                                                        </p>
                                                        <p className="mt-3 whitespace-pre-wrap break-words font-bold leading-6 text-gray-950 dark:text-white">{item.correct_answer}</p>
                                                    </div>
                                                </div>
                                                {item.explanation && (
                                                    <div className="mt-4 flex items-start gap-3 border-l-4 border-brand-500 bg-brand-50 px-4 py-3 dark:bg-green-950/25">
                                                        <LightbulbOutlinedIcon className="mt-0.5 shrink-0 text-brand-700 dark:text-green-300" sx={{ fontSize: 20 }} />
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-brand-700 dark:text-green-300">Penjelasan</p>
                                                            <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-200">{item.explanation}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </>
            )}

            {result.id && (
                <ContextualFeedbackPrompt feature="exam" contextId={result.id} className="mt-8" />
            )}

            {onExit && (
                <button type="button" onClick={onExit} className="mt-8 h-11 rounded-md bg-brand-600 px-5 text-sm font-black text-white hover:bg-brand-700">
                    {exitLabel}
                </button>
            )}
        </div>
    );
}
