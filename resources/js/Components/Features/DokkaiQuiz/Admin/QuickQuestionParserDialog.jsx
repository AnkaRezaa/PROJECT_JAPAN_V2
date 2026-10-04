import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

function parseRawQuestionBlock(rawText) {
    if (!rawText.trim()) return [];

    // Cek apakah format TSV (mengandung tab dan newline)
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const hasTabs = lines.some((l) => l.includes('\t'));

    if (hasTabs) {
        return parseTsvFormat(lines);
    }

    return parseBlockTextFormat(rawText);
}

function parseTsvFormat(lines) {
    const questions = [];
    lines.forEach((line, idx) => {
        // Abaikan baris header jika ada
        if (idx === 0 && (line.toLowerCase().startsWith('soal') || line.toLowerCase().startsWith('pertanyaan') || line.toLowerCase().startsWith('question'))) {
            return;
        }

        const parts = line.split('\t').map((p) => p.trim());
        if (parts.length < 5) return;

        const qText = parts[0] || '';
        const optA = parts[1] || '';
        const optB = parts[2] || '';
        const optC = parts[3] || '';
        const optD = parts[4] || '';
        const key = (parts[5] || 'A').toUpperCase();
        const pNum = Number(parts[6] || 1);
        const evQuote = parts[7] || '';
        const expCorrect = parts[8] || '';

        questions.push({
            id: null,
            question_number: questions.length + 1,
            question_text: qText,
            question_translation: '',
            evidence_paragraph_number: isNaN(pNum) ? 1 : pNum,
            evidence_quote: evQuote,
            explanation_correct: expCorrect,
            explanation_distractors: { A: '', B: '', C: '', D: '' },
            options: [
                { id: 1, option_label: 'A', option_text: optA, is_correct: key === 'A' },
                { id: 2, option_label: 'B', option_text: optB, is_correct: key === 'B' },
                { id: 3, option_label: 'C', option_text: optC, is_correct: key === 'C' },
                { id: 4, option_label: 'D', option_text: optD, is_correct: key === 'D' },
            ],
        });
    });

    return questions;
}

function parseBlockTextFormat(rawText) {
    // Pisahkan berdasarkan delimiter '---' atau baris pemisah antar soal
    const blocks = rawText.split(/(?:^|\n)\s*---\s*(?:\n|$)/).map((b) => b.trim()).filter(Boolean);
    const questions = [];

    blocks.forEach((block) => {
        const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        let qText = '';
        let qTrans = '';
        let pNum = 1;
        let evQuote = '';
        let expCorrect = '';
        const distractors = { A: '', B: '', C: '', D: '' };
        const rawOptions = [];

        lines.forEach((rawLine) => {
            const line = rawLine.normalize('NFKC').trim();
            if (!line) return;

            // Deteksi Q: / Pertanyaan:
            const qMatch = line.match(/^(?:Q|Pertanyaan|Soal)\s*:\s*(.+)$/i);
            if (qMatch) {
                qText = qMatch[1].trim();
                return;
            }

            // Deteksi T: / Arti: / Terjemahan:
            const tMatch = line.match(/^(?:T|Arti|Terjemahan)\s*:\s*(.+)$/i);
            if (tMatch) {
                qTrans = tMatch[1].trim();
                return;
            }

            // Deteksi P: / Paragraf:
            const pMatch = line.match(/^(?:P|Paragraf)\s*:\s*(\d+)$/i);
            if (pMatch) {
                pNum = Number(pMatch[1]);
                return;
            }

            // Deteksi Eviden: / Bukti:
            const evMatch = line.match(/^(?:Eviden|Evidence|Bukti)\s*:\s*(.+)$/i);
            if (evMatch) {
                evQuote = evMatch[1].trim();
                return;
            }

            // Deteksi Pembahasan: / Penjelasan:
            const expMatch = line.match(/^(?:Pembahasan|Penjelasan)\s*:\s*(.+)$/i);
            if (expMatch) {
                expCorrect = expMatch[1].trim();
                return;
            }

            // Deteksi Pengecoh A/B/C/D:
            const distMatch = line.match(/^(?:Pengecoh|Distraktor)\s*([A-D])\s*:\s*(.+)$/i);
            if (distMatch) {
                const label = distMatch[1].toUpperCase();
                distractors[label] = distMatch[2].trim();
                return;
            }

            // Deteksi Opsi: *A:, A:, *1:, 1. (1) A. Teks * dsb
            const hasAsterisk = line.startsWith('*') || line.endsWith('*');
            const cleanLine = line.replace(/^\*\s*/, '').replace(/\s*\*$/, '');

            const optMatch = cleanLine.match(/^(?:(?:\(([1-4A-D])\))|([1-4A-D]))[\.\:\)\s]\s*(.+)$/i);
            if (optMatch) {
                let rawLabel = (optMatch[1] || optMatch[2]).toUpperCase();
                if (rawLabel === '1') rawLabel = 'A';
                if (rawLabel === '2') rawLabel = 'B';
                if (rawLabel === '3') rawLabel = 'C';
                if (rawLabel === '4') rawLabel = 'D';

                rawOptions.push({
                    option_label: rawLabel,
                    option_text: optMatch[3].trim(),
                    is_correct: hasAsterisk,
                });
                return;
            }

            // Jika belum ada qText dan baris bukan tag di atas, anggap baris awal sebagai pertanyaan
            if (!qText && !line.startsWith('*') && !line.startsWith('-')) {
                qText = line;
            }
        });

        if (qText) {
            // Siapkan 4 opsi standar A-D
            const labels = ['A', 'B', 'C', 'D'];
            const finalOptions = labels.map((lbl, idx) => {
                const found = rawOptions.find((o) => o.option_label === lbl);
                return {
                    id: idx + 1,
                    option_label: lbl,
                    option_text: found ? found.option_text : '',
                    is_correct: found ? found.is_correct : false,
                };
            });

            // Jika belum ada opsi yang ditandai benar (*), jadikan opsi A sebagai default
            if (!finalOptions.some((o) => o.is_correct)) {
                finalOptions[0].is_correct = true;
            }

            questions.push({
                id: null,
                question_number: questions.length + 1,
                question_text: qText,
                question_translation: qTrans,
                evidence_paragraph_number: pNum,
                evidence_quote: evQuote,
                explanation_correct: expCorrect,
                explanation_distractors: distractors,
                options: finalOptions,
            });
        }
    });

    return questions;
}

export default function QuickQuestionParserDialog({ open, onClose, onApply }) {
    const [rawInput, setRawInput] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);

    if (!open) return null;

    const parsed = parseRawQuestionBlock(rawInput);

    const handleApply = () => {
        if (parsed.length === 0) return;
        onApply(parsed, replaceMode);
        setRawInput('');
        onClose();
    };

    const handleSampleFormat = () => {
        const sample = `Q: 本文の内容と合っているものはどれか。
T: Manakah pernyataan yang sesuai dengan isi bacaan?
P: 1
Eviden: 毎年春になると、公園にはたくさんの桜が咲きます。
*A: 春に公園で桜が咲く。
B: 冬に公園で桜が満開になる。
C: 公園では花を一切見ることができない。
D: 夏だけ桜の花見が行われる。
Pembahasan: Paragraf 1 menyatakan sakura mekar di musim semi.
Pengecoh B: Teks menyebut musim semi, bukan musim dingin.
Pengecoh C: Salah karena ada banyak sakura.
Pengecoh D: Bunga mekar di musim semi bukan musim panas.
---
Q: 筆者が最も伝えたいことは何か。
T: Apa pesan utama yang ingin disampaikan penulis?
P: 2
Eviden: 自然の美しさを感じる心は、日々の生活を豊かにしてくれる。
A: 毎日忙しく働くことの大切さ。
*B: 自然の美しさに感動する心の価値。
C: 都会の生活をすぐにやめるべきだということ。
D: 桜の写真だけをたくさん集めること。
Pembahasan: Kalimat terakhir menegaskan hati yang merasakan keindahan alam memperkaya hidup.`;
        setRawInput(sample);
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-question-parser-title"
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            <BoltIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <h3 id="quick-question-parser-title" className="text-sm font-black text-gray-900 dark:text-white">
                                ⚡ Tempel Soal Cepat (Quick Question Parser)
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Tempel teks soal berformat atau tabel TSV dari Excel. Gunakan tanda bintang (*) di depan opsi untuk menandai kunci benar.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                            Tempel Teks Soal Dokkai di sini:
                        </label>
                        <button
                            type="button"
                            onClick={handleSampleFormat}
                            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            + Muat Contoh Format
                        </button>
                    </div>

                    <textarea
                        rows={9}
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        placeholder={`Contoh Format:\nQ: Pertanyaan dalam bahasa Jepang...\nT: Terjemahan pertanyaan...\nP: 1 (nomor rujukan paragraf eviden)\nEviden: Kutipan kalimat bukti...\n*A: Opsi benar (beri tanda * di depan)\nB: Opsi salah\nC: Opsi salah\nD: Opsi salah\nPembahasan: Penjelasan jawaban benar...\n---\n(Gunakan garis pembatas --- antar soal)`}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />

                    {/* Live Preview Bar */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                Pratinjau Deteksi: <span className="text-indigo-600 dark:text-indigo-400">{parsed.length} Soal Berhasil Dikenali</span>
                            </span>
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={replaceMode}
                                    onChange={(e) => setReplaceMode(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Gantikan semua soal yang ada saat ini</span>
                            </label>
                        </div>

                        {parsed.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {parsed.map((item, idx) => {
                                    const correctOpt = item.options.find((o) => o.is_correct);
                                    return (
                                        <div
                                            key={idx}
                                            className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs dark:border-gray-800 dark:bg-gray-900 space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">
                                                    Q{idx + 1}. {item.question_text}
                                                </span>
                                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Kunci: {correctOpt?.option_label || 'A'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500">
                                                {item.options.map((opt) => (
                                                    <span
                                                        key={opt.option_label}
                                                        className={opt.is_correct ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}
                                                    >
                                                        {opt.option_label}. {opt.option_text || '(kosong)'}
                                                    </span>
                                                ))}
                                            </div>
                                            {item.evidence_quote && (
                                                <p className="text-[10px] text-gray-400 truncate">
                                                    Eviden (P{item.evidence_paragraph_number}): {item.evidence_quote}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={parsed.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                        <span>Terapkan {parsed.length} Soal ke Builder</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
