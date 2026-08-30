import React, { useEffect, useId, useRef, useState } from 'react';
import { KanjiWriter } from 'kanji-recognizer';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Modal from '@/Components/Modal';
import { playSoundEffect } from '@/Components/UI/SoundEffects';
import { loadStrokeCharacter } from './strokeData';

const initialResult = {
    completed: false,
    mistakes: 0,
    hintsUsed: 0,
    attemptsByStroke: [],
    revealed: false,
};

function StrokeComparisonPreview({ label, paths, strokeColor = '#334155', userStrokes = false }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-950/50">
            <p className="mb-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                {label}
            </p>
            <svg viewBox="0 0 109 109" className="mx-auto block w-full max-w-[138px]" role="img" aria-label={label}>
                <path d="M54.5 5V104M5 54.5H104" stroke="currentColor" strokeWidth="0.75" opacity="0.13" />
                {paths.map((path, index) => (
                    <path
                        key={`${label}-${index}`}
                        d={typeof path === 'string' ? path : path.d}
                        fill="none"
                        stroke={userStrokes ? path.color : strokeColor}
                        strokeWidth={userStrokes ? 5 : 4.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        </div>
    );
}

export default function KanjiHandwritingCanvas({
    character,
    mode = 'practice',
    compact = false,
    selfEvaluation = false,
    onChange,
    onComplete,
    onError,
}) {
    const reactId = useId().replace(/:/g, '');
    const containerId = `kanji-writer-${reactId}`;
    const writerRef = useRef(null);
    const startedAtRef = useRef(Date.now());
    const resultRef = useRef(initialResult);
    const onChangeRef = useRef(onChange);
    const onCompleteRef = useRef(onComplete);
    const onErrorRef = useRef(onError);
    const [strokeData, setStrokeData] = useState(null);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Memuat urutan stroke...');
    const [progress, setProgress] = useState(0);
    const [drawnStrokes, setDrawnStrokes] = useState(0);
    const [mistakesOnStroke, setMistakesOnStroke] = useState(0);
    const [failedChecks, setFailedChecks] = useState(0);
    const [evaluation, setEvaluation] = useState(null);
    const [evaluationPreview, setEvaluationPreview] = useState(null);
    const [completed, setCompleted] = useState(false);
    const [strokeFeedback, setStrokeFeedback] = useState(null);

    useEffect(() => {
        onChangeRef.current = onChange;
        onCompleteRef.current = onComplete;
        onErrorRef.current = onError;
    }, [onChange, onComplete, onError]);

    const emitResult = (nextResult, completedStrokes = writerRef.current?.currentStrokeIndex ?? progress) => {
        resultRef.current = nextResult;
        onChangeRef.current?.({
            character,
            completed_strokes: completedStrokes,
            total_strokes: strokeData?.stroke_count || 0,
            attempts_by_stroke: nextResult.attemptsByStroke,
            mistakes: nextResult.mistakes,
            hints_used: nextResult.hintsUsed,
            duration_ms: Date.now() - startedAtRef.current,
            revealed: nextResult.revealed,
        });
    };

    useEffect(() => {
        let active = true;
        setStatus('loading');
        setMessage('Memuat urutan stroke...');
        setStrokeData(null);

        loadStrokeCharacter(character)
            .then((data) => {
                if (!active) return;
                setStrokeData(data);
                setStatus('ready');
                setMessage(mode === 'preview' ? 'Pratinjau siap.' : 'Mulai dari stroke pertama.');
            })
            .catch((error) => {
                if (!active) return;
                setStatus('error');
                setMessage(error.message);
                onErrorRef.current?.(error);
            });

        return () => {
            active = false;
        };
    }, [character, mode]);

    useEffect(() => {
        if (!strokeData || status !== 'ready') return undefined;

        const container = document.getElementById(containerId);
        if (!container) return undefined;
        container.innerHTML = '';
        startedAtRef.current = Date.now();
        resultRef.current = initialResult;
        setProgress(0);
        setDrawnStrokes(0);
        setMistakesOnStroke(0);
        setFailedChecks(0);
        setEvaluation(null);
        setEvaluationPreview(null);
        setCompleted(false);
        setStrokeFeedback(null);

        const isQuizMode = mode === 'quiz';
        const usesSelfEvaluation = isQuizMode && selfEvaluation;
        const writer = new KanjiWriter(containerId, strokeData.paths, {
            width: 109,
            height: 109,
            showGhost: true,
            showGrid: true,
            checkMode: isQuizMode ? 'full' : 'stroke',
            passThreshold: 15,
            startDistThreshold: 40,
            correctColor: '#16a34a',
            incorrectColor: '#dc2626',
            hintColor: '#f59e0b',
            ghostColor: '#f97316',
            ghostOpacity: '0.16',
            strokeColor: '#111827',
            strokeWidth: 5,
        });
        writerRef.current = writer;

        let handleFullStrokeEnd;

        if (isQuizMode) {
            const renderFullGuide = () => {
                writer.bgGroup.innerHTML = '';
                writer.kanjiData.forEach((pathData) => {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', pathData);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', '#94a3b8');
                    path.setAttribute('stroke-width', '2.4');
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    path.style.opacity = '0.22';
                    writer.bgGroup.appendChild(path);
                });
            };

            writer.renderUpcomingStrokes = renderFullGuide;
            renderFullGuide();
            writer.onComplete = () => {};
            const originalFullStrokeEnd = writer.boundEnd;

            writer.svg.removeEventListener('pointerup', originalFullStrokeEnd);
            writer.svg.removeEventListener('pointerleave', originalFullStrokeEnd);

            handleFullStrokeEnd = (event) => {
                const strokeIndex = writer.userStrokes.length;
                originalFullStrokeEnd(event);

                const userStroke = writer.userStrokes[strokeIndex];
                const targetStroke = writer.kanjiData[strokeIndex];

                if (!userStroke || !targetStroke) {
                    return;
                }

                const strokeResult = writer.recognizer.evaluate(userStroke.points, targetStroke);
                const nextTotal = writer.userStrokes.length;

                setDrawnStrokes(nextTotal);
                setEvaluation(null);
                setCompleted(false);

                if (strokeResult.success) {
                    userStroke.path.setAttribute('stroke', writer.options.correctColor);
                    setStrokeFeedback(null);
                    setMessage(nextTotal >= strokeData.stroke_count
                        ? 'Semua goresan sudah dibuat. Tekan Periksa Tulisan.'
                        : 'Stroke tepat. Lanjutkan ke stroke berikutnya.');
                    return;
                }

                userStroke.path.setAttribute('stroke', writer.options.incorrectColor);
                if (usesSelfEvaluation) {
                    setStrokeFeedback(null);
                    setMessage(nextTotal >= strokeData.stroke_count
                        ? 'Semua goresan sudah dibuat. Tekan Periksa Tulisan untuk membandingkan hasil.'
                        : 'Stroke ini belum tepat. Kamu bisa menghapusnya atau lanjutkan lalu periksa di akhir.');
                    return;
                }

                writer.svg.style.pointerEvents = 'none';
                setStrokeFeedback({
                    stroke: strokeIndex + 1,
                    total: strokeData.stroke_count,
                });
                setMessage(`Stroke ke-${strokeIndex + 1} belum tepat. Hapus goresan terakhir lalu coba lagi.`);
            };
            writer.boundEnd = handleFullStrokeEnd;
            writer.svg.addEventListener('pointerup', writer.boundEnd);
            writer.svg.addEventListener('pointerleave', writer.boundEnd);
            setMessage('Tulis seluruh karakter mengikuti panduan transparan.');
        } else {
            const originalCorrect = writer.onCorrect.bind(writer);
            writer.onCorrect = async () => {
                const strokeIndex = writer.currentStrokeIndex;
                const nextAttempts = [...resultRef.current.attemptsByStroke];
                nextAttempts[strokeIndex] = (nextAttempts[strokeIndex] || 0) + 1;
                const nextResult = { ...resultRef.current, attemptsByStroke: nextAttempts };
                resultRef.current = nextResult;
                await originalCorrect();
                const completedStrokes = writer.currentStrokeIndex;
                setProgress(completedStrokes);
                setMistakesOnStroke(0);
                setMessage(completedStrokes >= strokeData.stroke_count ? 'Selesai.' : 'Benar. Lanjutkan stroke berikutnya.');
                emitResult(nextResult, completedStrokes);
            };

            const originalIncorrect = writer.onIncorrect.bind(writer);
            writer.onIncorrect = () => {
                const strokeIndex = writer.currentStrokeIndex;
                const nextAttempts = [...resultRef.current.attemptsByStroke];
                nextAttempts[strokeIndex] = (nextAttempts[strokeIndex] || 0) + 1;
                const nextResult = {
                    ...resultRef.current,
                    attemptsByStroke: nextAttempts,
                    mistakes: resultRef.current.mistakes + 1,
                };
                resultRef.current = nextResult;
                setMistakesOnStroke((count) => count + 1);
                setMessage('Stroke belum tepat. Coba sekali lagi.');
                originalIncorrect();
                emitResult(nextResult, writer.currentStrokeIndex);
            };

            writer.onComplete = () => {
                const nextResult = { ...resultRef.current, completed: true };
                resultRef.current = nextResult;
                setCompleted(true);
                setMessage('Karakter selesai ditulis.');
                emitResult(nextResult, strokeData.stroke_count);
                onCompleteRef.current?.({
                    character,
                    completed_strokes: strokeData.stroke_count,
                    total_strokes: strokeData.stroke_count,
                    attempts_by_stroke: nextResult.attemptsByStroke,
                    mistakes: nextResult.mistakes,
                    hints_used: nextResult.hintsUsed,
                    duration_ms: Date.now() - startedAtRef.current,
                    revealed: nextResult.revealed,
                });
            };
        }

        if (mode === 'preview') {
            writer.animate().catch(() => setMessage('Animasi tidak dapat diputar.'));
        }

        return () => {
            if (handleFullStrokeEnd) {
                writer.svg.removeEventListener('pointerup', handleFullStrokeEnd);
                writer.svg.removeEventListener('pointerleave', handleFullStrokeEnd);
            }
            writer.recognizer?.measurePath?.remove();
            writer.destroy();
            writerRef.current = null;
        };
    }, [containerId, mode, selfEvaluation, status, strokeData]);

    const reset = () => {
        writerRef.current?.clear();
        if (writerRef.current?.svg) writerRef.current.svg.style.pointerEvents = '';
        startedAtRef.current = Date.now();
        resultRef.current = initialResult;
        setProgress(0);
        setDrawnStrokes(0);
        setMistakesOnStroke(0);
        setEvaluation(null);
        setEvaluationPreview(null);
        if (mode !== 'quiz') setFailedChecks(0);
        setCompleted(false);
        setStrokeFeedback(null);
        setMessage(
            mode === 'preview'
                ? 'Pratinjau diulang.'
                : mode === 'quiz'
                    ? 'Tulis ulang seluruh karakter, lalu periksa.'
                    : 'Mulai lagi dari stroke pertama.'
        );
        emitResult(initialResult);
    };

    const checkWriting = () => {
        const writer = writerRef.current;
        if (!writer || mode !== 'quiz' || drawnStrokes === 0) return;

        const checkResult = writer.check();
        if (!checkResult) return;

        setStrokeFeedback(null);

        const correctStrokes = checkResult.results.filter((result) => result.success).length;
        const incorrectStrokes = Math.max(
            strokeData?.stroke_count || 0,
            checkResult.results.length,
        ) - correctStrokes;
        const nextAttempts = Array.from(
            { length: Math.max(strokeData?.stroke_count || 0, checkResult.results.length) },
            (_, index) => (resultRef.current.attemptsByStroke[index] || 0) + 1,
        );
        const nextResult = {
            ...resultRef.current,
            completed: checkResult.success,
            attemptsByStroke: nextAttempts,
            mistakes: resultRef.current.mistakes + incorrectStrokes,
        };

        resultRef.current = nextResult;
        setEvaluation({
            success: checkResult.success,
            correct: correctStrokes,
            incorrect: incorrectStrokes,
            total: strokeData?.stroke_count || checkResult.results.length,
        });
        if (selfEvaluation) {
            setEvaluationPreview({
                userPaths: writer.userStrokes
                    .map((stroke) => ({
                        d: stroke.path?.getAttribute('d') || '',
                        color: stroke.path?.getAttribute('stroke') || writer.options.strokeColor,
                    }))
                    .filter((stroke) => stroke.d),
                targetPaths: strokeData?.paths || [],
            });
            writer.svg.style.pointerEvents = 'none';
        }
        emitResult(nextResult, correctStrokes);

        if (!checkResult.success) {
            setFailedChecks((count) => count + 1);
            setMessage(`${correctStrokes} stroke tepat, ${incorrectStrokes} perlu diperbaiki.`);
            playSoundEffect(selfEvaluation ? 'warning' : 'incorrect');
            return;
        }

        setCompleted(true);
        setProgress(strokeData.stroke_count);
        setMessage('Tulisan sudah sesuai. Tekan Lanjut untuk meneruskan.');
        playSoundEffect('correct');
    };

    const continueAfterEvaluation = () => {
        if (mode !== 'quiz' || !evaluation || (!selfEvaluation && (!completed || !evaluation.success))) return;

        const result = resultRef.current;
        const outcome = evaluation.success ? 'completed' : 'skipped';
        playSoundEffect('confirm');
        onCompleteRef.current?.({
            character,
            outcome,
            completed_strokes: outcome === 'completed' ? strokeData.stroke_count : evaluation.correct,
            total_strokes: strokeData.stroke_count,
            attempts_by_stroke: result.attemptsByStroke,
            mistakes: result.mistakes,
            hints_used: result.hintsUsed,
            duration_ms: Date.now() - startedAtRef.current,
            revealed: result.revealed,
        });
    };

    const retryEvaluation = () => {
        playSoundEffect('select');
        reset();
    };

    const hint = () => {
        writerRef.current?.hint();
        const nextResult = { ...resultRef.current, hintsUsed: resultRef.current.hintsUsed + 1 };
        resultRef.current = nextResult;
        setMessage('Ikuti arah stroke berwarna kuning.');
        emitResult(nextResult);
    };

    const undoLastStroke = () => {
        const writer = writerRef.current;
        if (!writer || mode !== 'quiz' || writer.userStrokes.length === 0) return;

        const removedStroke = writer.userStrokes.pop();
        removedStroke?.path?.remove();
        writer.currentStrokeIndex = Math.max(0, writer.currentStrokeIndex - 1);
        writer.renderUpcomingStrokes();
        writer.svg.style.pointerEvents = '';

        setDrawnStrokes(writer.userStrokes.length);
        setEvaluation(null);
        setCompleted(false);
        setStrokeFeedback(null);
        setMessage('Goresan terakhir dihapus. Coba tulis stroke ini lagi.');
    };

    const reveal = async () => {
        const nextResult = { ...resultRef.current, completed: false, revealed: true };
        resultRef.current = nextResult;
        setCompleted(false);
        setEvaluation({
            success: false,
            correct: writerRef.current?.currentStrokeIndex || 0,
            incorrect: Math.max(0, (strokeData?.stroke_count || 0) - (writerRef.current?.currentStrokeIndex || 0)),
            total: strokeData?.stroke_count || 0,
        });
        emitResult(nextResult, writerRef.current?.currentStrokeIndex || 0);
        try {
            await writerRef.current?.animate();
        } catch {
            setMessage('Panduan tidak dapat diputar.');
        }
        writerRef.current?.clear();
        if (writerRef.current?.svg) writerRef.current.svg.style.pointerEvents = '';
        setDrawnStrokes(0);
        setProgress(0);
        setEvaluation(null);
        setStrokeFeedback(null);
        setMessage('Panduan selesai. Sekarang coba tulis kembali dengan tanganmu sendiri.');
    };

    return (
        <div className={`mx-auto w-full ${compact ? 'max-w-[260px]' : 'max-w-[460px] [@media(max-height:820px)]:max-w-[300px]'}`}>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                <span>
                    {strokeData
                        ? mode === 'quiz'
                            ? `${drawnStrokes}/${strokeData.stroke_count} stroke dibuat`
                            : `${progress}/${strokeData.stroke_count} stroke`
                        : 'Memuat...'}
                </span>
                {mode === 'practice' && <span>{resultRef.current.mistakes} kesalahan</span>}
                {mode === 'quiz' && evaluation && (
                    <span className={evaluation.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {evaluation.correct} tepat
                    </span>
                )}
            </div>
            <div
                id={containerId}
                className="aspect-square w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner dark:border-gray-700"
                aria-label={`Area latihan menulis ${character}`}
            />
            <p className={`mt-2 min-h-5 text-center text-xs font-bold ${status === 'error' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {message}
            </p>
            {mode === 'quiz' && evaluation && !selfEvaluation && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`mt-3 rounded-xl border px-4 py-3 text-center ${
                        evaluation.success
                            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
                    }`}
                >
                    <p className="text-sm font-black">{evaluation.success ? 'Benar' : 'Salah'}</p>
                    <p className="mt-0.5 text-xs font-bold">
                        {evaluation.success
                            ? `Semua ${evaluation.total} stroke sudah sesuai.`
                            : `${evaluation.correct} stroke tepat, ${evaluation.incorrect} perlu diperbaiki.`}
                    </p>
                </div>
            )}
            {mode === 'quiz' && selfEvaluation && evaluation && evaluationPreview && (
                <Modal show maxWidth="lg" closeable={false}>
                    <section aria-labelledby={`${containerId}-evaluation-title`} className="p-4 sm:p-6">
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600 dark:text-orange-300">Evaluasi tulisan</p>
                            <h3 id={`${containerId}-evaluation-title`} className="mt-1.5 text-lg font-black text-gray-900 dark:text-white sm:text-xl">
                                Bandingkan hasil tulisanmu
                            </h3>
                            <p className={`mt-1.5 text-sm font-black ${evaluation.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {evaluation.success ? 'Tepat' : 'Perlu diperbaiki'}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                {evaluation.success
                                    ? `Semua ${evaluation.total} stroke sudah sesuai.`
                                    : `${evaluation.correct} dari ${evaluation.total} stroke sudah sesuai panduan.`}
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <StrokeComparisonPreview label="Tulisanmu" paths={evaluationPreview.userPaths} userStrokes />
                            <StrokeComparisonPreview label="Target" paths={evaluationPreview.targetPaths} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                data-sound="none"
                                onClick={retryEvaluation}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-black text-orange-700 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/50 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60"
                            >
                                <RestartAltRoundedIcon sx={{ fontSize: 18 }} /> Coba Lagi
                            </button>
                            <button
                                type="button"
                                data-sound="none"
                                onClick={continueAfterEvaluation}
                                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4 dark:text-gray-950 ${
                                    evaluation.success
                                        ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-300/60 dark:bg-green-500 dark:hover:bg-green-400'
                                        : 'bg-gray-900 hover:bg-gray-800 focus-visible:ring-gray-300/60 dark:bg-gray-100 dark:hover:bg-white'
                                }`}
                            >
                                {evaluation.success ? 'Lanjut latihan' : 'Lewati latihan'}
                            </button>
                        </div>
                    </section>
                </Modal>
            )}
            {mode === 'quiz' && strokeFeedback && (
                <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-left text-red-800 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
                    <div className="min-w-0">
                        <p className="text-sm font-black">Stroke salah</p>
                        <p className="mt-0.5 text-xs font-semibold leading-5">
                            Stroke {strokeFeedback.stroke} dari {strokeFeedback.total} tidak sesuai posisi atau arah panduan.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={undoLastStroke}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300/60"
                    >
                        <UndoRoundedIcon sx={{ fontSize: 17 }} /> Hapus
                    </button>
                </div>
            )}
            {status === 'ready' && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {mode === 'preview' && (
                        <button type="button" onClick={() => writerRef.current?.animate()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                            <PlayArrowRoundedIcon sx={{ fontSize: 18 }} /> Putar
                        </button>
                    )}
                    <button type="button" onClick={reset} disabled={mode === 'quiz' && (drawnStrokes === 0 || (selfEvaluation && evaluation))} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                        <RestartAltRoundedIcon sx={{ fontSize: 18 }} /> Ulangi
                    </button>
                    {mode === 'quiz' && !completed && !(selfEvaluation && evaluation) && (
                        <button type="button" onClick={undoLastStroke} disabled={drawnStrokes === 0} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 text-xs font-black text-orange-700 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60">
                            <UndoRoundedIcon sx={{ fontSize: 18 }} /> Hapus
                        </button>
                    )}
                    {mode === 'quiz' && !completed && !(selfEvaluation && evaluation) && (
                        <button
                            type="button"
                            data-sound="none"
                            onClick={checkWriting}
                            disabled={drawnStrokes === 0}
                            className="col-span-1 inline-flex h-10 items-center justify-center rounded-xl bg-orange-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/60 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-orange-500 dark:text-gray-950 dark:hover:bg-orange-400 sm:col-span-2"
                        >
                            Periksa Tulisan
                        </button>
                    )}
                    {(mode === 'practice' || mode === 'quiz') && !completed && !(selfEvaluation && evaluation) && (
                        <button type="button" onClick={hint} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-black text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60">
                            <LightbulbOutlinedIcon sx={{ fontSize: 17 }} /> Hint
                        </button>
                    )}
                    {mode === 'quiz' && !selfEvaluation && completed && evaluation?.success && (
                        <button
                            type="button"
                            onClick={continueAfterEvaluation}
                            className="col-span-1 inline-flex h-10 items-center justify-center rounded-xl bg-green-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300/60 dark:bg-green-500 dark:text-gray-950 dark:hover:bg-green-400 sm:col-span-3"
                        >
                            Lanjut
                        </button>
                    )}
                    {mode === 'practice' && !completed && mistakesOnStroke >= 3 && (
                        <button type="button" onClick={reveal} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gray-900 text-xs font-black text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-400/50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white sm:col-span-2">
                            <VisibilityOutlinedIcon sx={{ fontSize: 17 }} /> Lihat panduan
                        </button>
                    )}
                    {mode === 'quiz' && !completed && failedChecks > 0 && (
                        <button type="button" onClick={reveal} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-black text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/50 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 sm:col-span-4">
                            <VisibilityOutlinedIcon sx={{ fontSize: 17 }} /> Lihat Urutan
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
