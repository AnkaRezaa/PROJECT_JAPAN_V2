import React, { useEffect, useState } from 'react';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FeedbackIntensitySelector from './FeedbackIntensitySelector';
import FeedbackRatingStars from './FeedbackRatingStars';
import FeedbackModalDialog from './FeedbackModalDialog';

const DEFAULT_REASONS = {
    quiz: [
        ['clear_questions', 'Soal jelas'],
        ['unclear_explanation', 'Penjelasan kurang'],
        ['too_difficult', 'Terlalu sulit'],
        ['too_easy', 'Terlalu mudah'],
        ['technical_issue', 'Kendala teknis'],
    ],
    question: [
        ['typo_kanji', 'Salah ketik / kanji'],
        ['wrong_answer_key', 'Kunci jawaban terbalik'],
        ['unclear_prompt', 'Soal ambigu'],
        ['audio_issue', 'Audio bermasalah'],
        ['other', 'Lainnya'],
    ],
    lesson_day: [
        ['easy_to_understand', 'Mudah dipahami'],
        ['too_dense', 'Terlalu padat'],
        ['needs_examples', 'Butuh contoh kalimat'],
        ['technical_issue', 'Kendala teknis'],
    ],
};

export default function UniversalFeedbackWidget({
    variant = 'inline',
    mode = 'pedagogic',
    contextType = 'quiz',
    contextId = null,
    title,
    subtitle,
    collapsibleLabel = null,
    reasons,
    initialRating = null,
    onSubmitted,
    onRatingSelect,
    disabled = false,
    className = '',
}) {
    const [rating, setRating] = useState(initialRating);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(!collapsibleLabel);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    const activeReasons = reasons || DEFAULT_REASONS[contextType] || DEFAULT_REASONS.quiz;
    const defaultTitle = mode === 'pedagogic'
        ? 'Bagaimana intensitas sesi ini?'
        : mode === 'issue'
        ? 'Laporkan Kendala pada Soal'
        : 'Feedback Belajar';

    const defaultSubtitle = mode === 'pedagogic'
        ? 'Evaluasi ini membantu guru menyesuaikan tingkat kesulitan materi berikutnya.'
        : mode === 'issue'
        ? 'Beri tahu kami jika menemukan salah ketik kanji atau kunci jawaban keliru.'
        : 'Masukan singkatmu sangat berharga untuk peningkatan materi.';

    useEffect(() => {
        if (initialRating !== undefined && initialRating !== null) {
            setRating(initialRating);
        }
    }, [initialRating]);

    const handleRatingSelect = (newRating) => {
        setRating(newRating);
        if (typeof onRatingSelect === 'function') {
            onRatingSelect(newRating);
        }
    };

    const submitFeedback = async () => {
        if (!rating && mode !== 'issue') {
            setStatusMessage({ type: 'error', text: 'Pilih penilaian terlebih dahulu.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage({ type: '', text: '' });

        try {
            if (mode === 'pedagogic' && contextType === 'quiz' && contextId && typeof window !== 'undefined' && window.route) {
                const response = await window.axios.post(window.route('user.quizzes.feedback.store', contextId), {
                    rating,
                    continue_learning: true,
                });
                setStatusMessage({ type: 'success', text: 'Feedback intensitas tersimpan.' });
                if (typeof onSubmitted === 'function') onSubmitted(response.data);
            } else if (typeof window !== 'undefined' && window.route) {
                const targetFeature = contextType === 'question' ? 'question' : contextType;
                const payload = {
                    feature: targetFeature,
                    context_id: Number(contextId),
                    response_type: 'submitted',
                    rating: typeof rating === 'number' && rating > 0 ? rating : 5,
                    reason: reason || null,
                    message: message.trim() || null,
                    page_url: `${window.location.pathname}${window.location.search}`,
                };
                const response = await window.axios.post(window.route('contextual-feedback.store'), payload);
                setStatusMessage({ type: 'success', text: 'Terima kasih, laporanmu sudah kami terima.' });
                if (typeof onSubmitted === 'function') onSubmitted(response.data);
            } else if (typeof onSubmitted === 'function') {
                onSubmitted({ rating, reason, message });
                setStatusMessage({ type: 'success', text: 'Tersimpan.' });
            }

            if (variant === 'trigger_button') {
                setTimeout(() => setIsModalOpen(false), 900);
            }
        } catch (error) {
            const errText = error.response?.data?.message || 'Gagal menyimpan feedback. Silakan coba lagi.';
            setStatusMessage({ type: 'error', text: errText });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (variant === 'trigger_button') {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    aria-label={title || 'Laporkan kendala'}
                    className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 ${className}`}
                >
                    <FlagOutlinedIcon sx={{ fontSize: 16 }} />
                    <span className="hidden sm:inline">{title || 'Lapor'}</span>
                </button>

                <FeedbackModalDialog
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={title || defaultTitle}
                    subtitle={subtitle || defaultSubtitle}
                >
                    <div className="space-y-4">
                        <FeedbackRatingStars
                            rating={typeof rating === 'number' ? rating : 0}
                            onRatingChange={handleRatingSelect}
                            reason={reason}
                            onReasonChange={setReason}
                            reasons={activeReasons}
                            message={message}
                            onMessageChange={setMessage}
                            placeholder={mode === 'issue' ? 'Jelaskan letak kesalahan (misal: kanji baris kedua salah terjemahan)...' : undefined}
                            disabled={isSubmitting || disabled}
                        />

                        {statusMessage.text && (
                            <p className={`text-xs font-bold ${statusMessage.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {statusMessage.text}
                            </p>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSubmitting}
                                className="min-h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={submitFeedback}
                                disabled={isSubmitting}
                                className="min-h-10 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
                            </button>
                        </div>
                    </div>
                </FeedbackModalDialog>
            </>
        );
    }

    if (collapsibleLabel && !isExpanded) {
        return (
            <div className={className}>
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="text-xs font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                    {collapsibleLabel}
                </button>
            </div>
        );
    }

    return (
        <section
            aria-label="Form Feedback Pembelajaran"
            className={`rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left dark:border-amber-900/40 dark:bg-amber-950/20 ${className}`}
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Feedback Sesi
                </span>
                {collapsibleLabel && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        Tutup
                    </button>
                )}
            </div>

            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {title || defaultTitle}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                {subtitle || defaultSubtitle}
            </p>

            {mode === 'pedagogic' ? (
                <FeedbackIntensitySelector
                    value={rating}
                    onChange={handleRatingSelect}
                    disabled={disabled || isSubmitting}
                />
            ) : (
                <FeedbackRatingStars
                    rating={typeof rating === 'number' ? rating : 0}
                    onRatingChange={handleRatingSelect}
                    reason={reason}
                    onReasonChange={setReason}
                    reasons={activeReasons}
                    message={message}
                    onMessageChange={setMessage}
                    disabled={disabled || isSubmitting}
                />
            )}

            {statusMessage.text && (
                <p className={`mt-2.5 text-xs font-bold ${statusMessage.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {statusMessage.text}
                </p>
            )}

            {mode !== 'pedagogic' && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={submitFeedback}
                        disabled={isSubmitting || disabled}
                        className="min-h-9 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Kirim Feedback'}
                    </button>
                </div>
            )}
        </section>
    );
}
