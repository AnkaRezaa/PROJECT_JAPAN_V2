import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function parseRawVocabText(rawText, defaultLevel = 'N3') {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const vocabularies = [];

    lines.forEach((line) => {
        // Abaikan baris header tabel jika ada
        if (line.toLowerCase().startsWith('kata') || line.toLowerCase().startsWith('word') || line.toLowerCase().startsWith('kanji')) {
            return;
        }

        // Pisahkan dengan tab, pipa ASCII (|), atau pipa Jepang (｜)
        const parts = line.split(/[|\t｜]/).map((p) => p.trim());

        if (parts.length === 0 || !parts[0]) return;

        const word = parts[0] || '';
        const furigana = parts[1] || '';
        let romaji = '';
        let meaning = '';
        let pos = 'noun';
        let level = defaultLevel;

        if (parts.length === 2) {
            // kata | arti (jika tanpa furigana terpisah)
            meaning = parts[1];
        } else if (parts.length === 3) {
            // kata | furigana | arti
            meaning = parts[2];
        } else if (parts.length === 4) {
            // Cek apakah kolom ke-4 adalah level JLPT (N1-N5): kata | furigana | arti | level
            if (/^N[1-5]$/i.test(parts[3])) {
                meaning = parts[2];
                level = parts[3].toUpperCase();
            } else {
                // kata | furigana | romaji | arti
                romaji = parts[2];
                meaning = parts[3];
            }
        } else if (parts.length >= 5) {
            // kata | furigana | romaji | arti | pos | level
            romaji = parts[2];
            meaning = parts[3];
            pos = parts[4] || 'noun';
            level = parts[5] || defaultLevel;
        }

        vocabularies.push({
            id: null,
            word,
            furigana: furigana || word,
            romaji: romaji || null,
            meaning: meaning || '',
            pitch_accent: null,
            part_of_speech: pos || 'noun',
            jlpt_level: level || defaultLevel,
            example_sentence: null,
            example_translation: null,
        });
    });

    return vocabularies;
}

export default function QuickVocabParserDialog({ open, onClose, onApply, defaultLevel = 'N3' }) {
    const [rawInput, setRawInput] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);

    if (!open) return null;

    const parsed = parseRawVocabText(rawInput, defaultLevel);

    const handleApply = () => {
        if (parsed.length === 0) return;
        onApply(parsed, replaceMode);
        setRawInput('');
        onClose();
    };

    const handleSampleFormat = () => {
        const sample = `桜 | さくら | sakura | Bunga sakura | noun | N3
季節 | きせつ | kisetsu | Musim | noun | N3
満開 | まんかい | mankai | Mekar penuh | noun | N3
楽しむ | たのしむ | tanoshimu | Menikmati | verb_godan | N3
美しい | うつくしい | utsukushii | Indah, elok | adj_i | N3`;
        setRawInput(sample);
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-vocab-parser-title"
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            <BoltIcon sx={{ fontSize: 18 }} />
                        </span>
                        <div>
                            <h3 id="quick-vocab-parser-title" className="text-sm font-black text-gray-900 dark:text-white">
                                ⚡ Tempel Glosarium Cepat
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Tempel daftar kosakata massal dengan pemisah pipa (|) atau tab (salinan Excel).
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
                            Format: <code className="text-indigo-600 dark:text-indigo-400 font-mono">kata | cara baca | arti</code> atau <code className="text-indigo-600 dark:text-indigo-400 font-mono">kata | furigana | romaji | arti</code>
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
                        rows={7}
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        placeholder={`Contoh:\n桜 | さくら | sakura | Bunga sakura\n季節 | きせつ | kisetsu | Musim\n楽しむ | たのしむ | tanoshimu | Menikmati`}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs leading-relaxed text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />

                    {/* Live Preview Bar */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                Pratinjau Deteksi: <span className="text-indigo-600 dark:text-indigo-400">{parsed.length} Kata Berhasil Dikenali</span>
                            </span>
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={replaceMode}
                                    onChange={(e) => setReplaceMode(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Gantikan semua kata saat ini</span>
                            </label>
                        </div>

                        {parsed.length > 0 && (
                            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                {parsed.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-japanese font-black text-gray-900 dark:text-white">
                                                {item.word}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-japanese">
                                                ({item.furigana})
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                            {item.meaning}
                                        </span>
                                    </div>
                                ))}
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
                        <span>Terapkan {parsed.length} Kata ke Glosarium</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
