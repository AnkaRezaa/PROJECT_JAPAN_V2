import React, { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Field from '@/Components/UI/QuizField';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900/30';

export default function SentenceBuilderEditor({ question, onChange }) {
    const [rawSentence, setRawSentence] = useState('');
    const quickDistractors = ['まで', 'のに', 'から', 'より', 'だけ', 'しか', 'には', 'でも', 'ほど', 'ばかり'];

    const syncTokens = (tokens) => onChange({
        ...question,
        tokens,
        correctOrder: tokens.filter((token) => !token.distractor).map((token) => token.id),
    });

    const updateToken = (id, field, value) => syncTokens(
        question.tokens.map((token) => (token.id === id ? { ...token, [field]: value } : token))
    );

    const addToken = (isDistractor = false) => syncTokens([
        ...question.tokens,
        { id: `t${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, text: '', reading: '', distractor: isDistractor },
    ]);

    const removeToken = (id) => syncTokens(question.tokens.filter((token) => token.id !== id));

    const moveTokenInList = (id, direction) => {
        const targetTokens = question.tokens.filter((t) => !t.distractor);
        const index = targetTokens.findIndex((t) => t.id === id);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= targetTokens.length) return;

        const updatedTarget = [...targetTokens];
        const temp = updatedTarget[index];
        updatedTarget[index] = updatedTarget[newIndex];
        updatedTarget[newIndex] = temp;

        const distractors = question.tokens.filter((t) => t.distractor);
        syncTokens([...updatedTarget, ...distractors]);
    };

    const handleAutoSplit = () => {
        if (!rawSentence.trim()) return;
        const parts = rawSentence.includes('|')
            ? rawSentence.split('|').map((s) => s.trim()).filter(Boolean)
            : rawSentence.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) return;
        const newTokens = parts.map((text, idx) => ({
            id: `t_${Date.now()}_${idx + 1}`,
            text,
            reading: '',
            distractor: false,
        }));
        const existingDistractors = question.tokens.filter((t) => t.distractor);
        syncTokens([...newTokens, ...existingDistractors]);
        setRawSentence('');
    };

    const handleAddDistractor = (word) => {
        const id = `dist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        syncTokens([...question.tokens, { id, text: word, reading: '', distractor: true }]);
    };

    const targetTokens = question.tokens.filter((t) => !t.distractor);
    const distractorTokens = question.tokens.filter((t) => Boolean(t.distractor));
    const liveSentence = targetTokens.map((t) => t.text || '___').join('');

    return (
        <div className="space-y-5">
            {/* Live Reconstructed Sentence Preview Bar */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Kunci Susunan Kalimat (Reconstructed)
                    </span>
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                        {targetTokens.length} Potongan Kalimat
                    </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-white p-3 font-japanese text-sm font-black text-gray-900 dark:border-emerald-800 dark:bg-gray-900 dark:text-white" lang="ja">
                    {targetTokens.length > 0 ? (
                        targetTokens.map((token, idx) => (
                            <span key={token.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                                <span className="text-[10px] opacity-60">#{idx + 1}</span>
                                <span>{token.text || '(kosong)'}</span>
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">Belum ada token kunci.</span>
                    )}
                </div>
                {liveSentence && (
                    <p className="mt-2 text-xs font-bold text-gray-600 dark:text-gray-300 font-japanese" lang="ja">
                        Kalimat Utuh: <span className="text-emerald-700 dark:text-emerald-300 font-black">{liveSentence}</span>
                    </p>
                )}
            </div>

            {/* Auto-Split Helper Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-950/20">
                <span className="block text-xs font-black text-gray-800 dark:text-gray-200">
                    Pemisah Kalimat Cepat (Auto-Split dengan |)
                </span>
                <p className="mt-0.5 text-[11px] text-gray-500">
                    Ketik atau tempel kalimat utuh dengan tanda pipa | untuk otomatis dipecah menjadi potongan kata berurutan.
                </p>
                <div className="mt-2 flex gap-2">
                    <input
                        className={`${inputClass} !py-2 text-xs font-japanese`}
                        value={rawSentence}
                        onChange={(e) => setRawSentence(e.target.value)}
                        placeholder="Contoh: 勉強すれば | するほど | 上手になります"
                        lang="ja"
                    />
                    <button
                        type="button"
                        onClick={handleAutoSplit}
                        disabled={!rawSentence.trim()}
                        className="shrink-0 flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition disabled:opacity-40"
                    >
                        <BoltIcon sx={{ fontSize: 16 }} />
                        Pecah Token
                    </button>
                </div>
            </div>

            <Field label="Instruksi" required tooltip="Teks panduan pengerjaan yang muncul di atas soal susun kalimat untuk siswa.">
                <input className={inputClass} value={question.prompt} onChange={(event) => onChange({ ...question, prompt: event.target.value })} />
            </Field>

            <Field label="Arti atau konteks" required tooltip="Arti kalimat utuh atau petunjuk situasi dalam bahasa Indonesia.">
                <input className={inputClass} value={question.context || ''} onChange={(event) => onChange({ ...question, context: event.target.value })} />
            </Field>

            {/* ZONA 1: KUNCI KALIMAT UTAMA */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs dark:border-emerald-900/60 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Zona Target: Susunan Kunci Kalimat <span className="text-rose-500 font-black">*</span>
                        </span>
                        <p className="text-[11px] text-gray-400">Urutan token di bawah adalah urutan kunci jawaban benar yang harus disusun siswa.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => addToken(false)}
                        className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                        <AddIcon sx={{ fontSize: 14 }} />
                        Tambah Token Kunci
                    </button>
                </div>

                <div className="mt-3 space-y-2">
                    {targetTokens.length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400 italic">Belum ada token kunci. Tambahkan token atau gunakan Auto-Split di atas.</p>
                    ) : (
                        targetTokens.map((token, index) => (
                            <div key={token.id} className="grid items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-2 sm:grid-cols-[auto_1fr_1fr_auto_auto] dark:border-gray-800 dark:bg-gray-950/40">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black text-white">
                                    {index + 1}
                                </span>
                                <input
                                    className={`${inputClass} !py-2 font-japanese`}
                                    value={token.text}
                                    onChange={(e) => updateToken(token.id, 'text', e.target.value)}
                                    placeholder={`Potongan #${index + 1}`}
                                    lang="ja"
                                />
                                <input
                                    className={`${inputClass} !py-2`}
                                    value={token.reading || ''}
                                    onChange={(e) => updateToken(token.id, 'reading', e.target.value)}
                                    placeholder="Cara baca (opsional)"
                                />
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        title="Geser ke atas / sebelumnya"
                                        disabled={index === 0}
                                        onClick={() => moveTokenInList(token.id, -1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-20 dark:border-gray-700 dark:text-gray-300"
                                    >
                                        <ArrowUpwardIcon sx={{ fontSize: 15 }} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Geser ke bawah / sesudahnya"
                                        disabled={index === targetTokens.length - 1}
                                        onClick={() => moveTokenInList(token.id, 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-20 dark:border-gray-700 dark:text-gray-300"
                                    >
                                        <ArrowDownwardIcon sx={{ fontSize: 15 }} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        title="Jadikan sebagai pengecoh"
                                        onClick={() => updateToken(token.id, 'distractor', true)}
                                        className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                                    >
                                        Jadikan Pengecoh
                                    </button>
                                    <button
                                        type="button"
                                        title="Hapus token"
                                        disabled={targetTokens.length <= 2}
                                        onClick={() => removeToken(token.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-20 dark:hover:bg-rose-950/30"
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ZONA 2: BANK PENGECOH (DISTRACTORS) */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3 dark:border-amber-900/40">
                    <div>
                        <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                            Zona Bank Pengecoh (Distractor Bank)
                        </span>
                        <p className="text-[11px] text-gray-500">Token di zona ini akan diacak bersama soal siswa, namun BUKAN bagian dari kunci jawaban benar.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => addToken(true)}
                        className="flex h-8 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 text-[11px] font-black text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-300"
                    >
                        <AddIcon sx={{ fontSize: 14 }} />
                        Tambah Pengecoh Manual
                    </button>
                </div>

                {/* Quick distractor pills */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-gray-500 font-bold">Pengecoh Cepat:</span>
                    {quickDistractors.map((word) => (
                        <button
                            key={word}
                            type="button"
                            onClick={() => handleAddDistractor(word)}
                            className="px-2 py-0.5 rounded-md border border-amber-200 bg-white dark:border-amber-900 dark:bg-slate-900 text-amber-800 dark:text-amber-300 font-japanese font-bold text-xs hover:bg-amber-100 transition"
                            lang="ja"
                        >
                            + {word}
                        </button>
                    ))}
                </div>

                <div className="mt-3 space-y-2">
                    {distractorTokens.length === 0 ? (
                        <p className="py-2 text-center text-xs text-gray-400 italic">Belum ada token pengecoh.</p>
                    ) : (
                        distractorTokens.map((token, index) => (
                            <div key={token.id} className="grid items-center gap-2 rounded-xl border border-amber-200 bg-white p-2 sm:grid-cols-[auto_1fr_1fr_auto_auto] dark:border-amber-900/40 dark:bg-gray-950/40">
                                <span className="flex h-7 px-2 items-center justify-center rounded-lg bg-amber-500 text-[10px] font-black text-white">
                                    Pengecoh #{index + 1}
                                </span>
                                <input
                                    className={`${inputClass} !py-2 font-japanese`}
                                    value={token.text}
                                    onChange={(e) => updateToken(token.id, 'text', e.target.value)}
                                    placeholder="Teks pengecoh"
                                    lang="ja"
                                />
                                <input
                                    className={`${inputClass} !py-2`}
                                    value={token.reading || ''}
                                    onChange={(e) => updateToken(token.id, 'reading', e.target.value)}
                                    placeholder="Cara baca (opsional)"
                                />
                                <button
                                    type="button"
                                    title="Pindahkan ke kalimat utama"
                                    onClick={() => updateToken(token.id, 'distractor', false)}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                >
                                    Jadikan Kunci
                                </button>
                                <button
                                    type="button"
                                    title="Hapus pengecoh"
                                    onClick={() => removeToken(token.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Field label="Feedback jawaban" required tooltip="Penjelasan materi yang muncul setelah siswa menjawab.">
                <textarea className={`${inputClass} min-h-20`} value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} />
            </Field>
        </div>
    );
}
