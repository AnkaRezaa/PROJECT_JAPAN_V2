import React, { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { pushAnalyticsEvent } from '@/lib/analytics';

const featureContent = {
    quiz: {
        question: 'Seberapa jelas soal dan penjelasan hasil kuis ini?',
        reasons: [['clear_questions', 'Soal jelas'], ['unclear_explanation', 'Penjelasan kurang'], ['too_difficult', 'Terlalu sulit'], ['too_easy', 'Terlalu mudah'], ['technical_issue', 'Kendala teknis']],
    },
    exam: {
        question: 'Seberapa jelas alur ujian dan hasil yang ditampilkan?',
        reasons: [['clear_instructions', 'Instruksi jelas'], ['clear_results', 'Hasil jelas'], ['confusing_time', 'Waktu membingungkan'], ['difficult_navigation', 'Navigasi sulit'], ['technical_issue', 'Kendala teknis']],
    },
    lesson_day: {
        question: 'Apakah materi Day ini membantu proses belajarmu?',
        reasons: [['easy_to_understand', 'Mudah dipahami'], ['too_dense', 'Terlalu padat'], ['needs_examples', 'Butuh contoh'], ['unclear_media', 'Media kurang jelas'], ['technical_issue', 'Kendala teknis']],
    },
    live_class: {
        question: 'Apakah sesi kelas ini membantu proses belajarmu?',
        reasons: [['easy_to_understand', 'Mudah dipahami'], ['too_dense', 'Terlalu padat'], ['needs_examples', 'Butuh contoh'], ['unclear_media', 'Media kurang jelas'], ['technical_issue', 'Kendala teknis']],
    },
};

export default function ContextualFeedbackPrompt({ feature, contextId, className = '', collapsibleLabel = null }) {
    const enabled = usePage().props.featureFlags?.contextualFeedback === true;
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(!collapsibleLabel);
    const [rating, setRating] = useState(null);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const shownRef = useRef(false);
    const content = featureContent[feature];

    useEffect(() => {
        let active = true;
        shownRef.current = false;
        setVisible(false);
        setExpanded(!collapsibleLabel);
        setRating(null);
        setReason('');
        setMessage('');
        setError('');
        if (!enabled || !content || !Number(contextId)) return () => { active = false; };

        window.axios.get(route('contextual-feedback.status'), { params: { feature, context_id: contextId } })
            .then(({ data }) => {
                if (active && !data.recorded) setVisible(true);
            })
            .catch(() => {});

        return () => { active = false; };
    }, [enabled, feature, contextId, collapsibleLabel]);

    useEffect(() => {
        if (!visible || !expanded || shownRef.current) return;
        shownRef.current = true;
        pushAnalyticsEvent('feedback_shown', { feature });
    }, [expanded, feature, visible]);

    if (!visible || !content) return null;

    if (collapsibleLabel && !expanded) {
        return (
            <div className={className}>
                <button type="button" onClick={() => setExpanded(true)} className="text-sm font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                    {collapsibleLabel}
                </button>
            </div>
        );
    }

    const send = async (responseType) => {
        if (processing || (responseType === 'submitted' && !rating)) return;
        setProcessing(true);
        setError('');
        try {
            await window.axios.post(route('contextual-feedback.store'), {
                feature,
                context_id: Number(contextId),
                response_type: responseType,
                rating: responseType === 'submitted' ? rating : null,
                reason: responseType === 'submitted' ? reason || null : null,
                message: responseType === 'submitted' ? message.trim() || null : null,
                page_url: `${window.location.pathname}${window.location.search}`,
            });
            pushAnalyticsEvent(responseType === 'submitted' ? 'feedback_submitted' : 'feedback_skipped', { feature, rating: rating || 0 });
            setVisible(false);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Feedback belum dapat disimpan. Coba lagi.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <section aria-labelledby={`context-feedback-${feature}`} className={`border border-emerald-200 bg-white p-5 text-left shadow-sm dark:border-emerald-900/60 dark:bg-[#142019] ${className}`}>
            <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">Feedback singkat</p>
            <h2 id={`context-feedback-${feature}`} className="mt-1 text-base font-black text-gray-950 dark:text-white">{content.question}</h2>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Rating 1 sampai 5">
                {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" aria-pressed={rating === value} onClick={() => setRating(value)} className={`grid h-11 w-11 place-items-center rounded-lg border text-sm font-black ${rating === value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'}`}>{value}</button>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {content.reasons.map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={reason === value} onClick={() => setReason(reason === value ? '' : value)} className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-bold ${reason === value ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>{label}</button>
                ))}
            </div>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={3} placeholder="Komentar tambahan (opsional)" className="mt-3 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
            {error && <p role="alert" className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{error}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
                {collapsibleLabel && <button type="button" disabled={processing} onClick={() => setExpanded(false)} className="min-h-11 px-4 text-sm font-bold text-gray-600 disabled:opacity-50 dark:text-gray-300">Tutup</button>}
                <button type="button" disabled={processing} onClick={() => send('skipped')} className="min-h-11 px-4 text-sm font-bold text-gray-600 disabled:opacity-50 dark:text-gray-300">Lewati</button>
                <button type="button" disabled={processing || !rating} onClick={() => send('submitted')} className="min-h-11 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">{processing ? 'Menyimpan...' : 'Kirim'}</button>
            </div>
        </section>
    );
}
