import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function splitParagraphs(rawText, splitMode = 'double_newline') {
    if (!rawText.trim()) return [];

    let rawList = [];

    if (splitMode === 'single_newline') {
        rawList = rawText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    } else if (splitMode === 'japanese_indent') {
        // Pisahkan jika ada spasi lebar jepang (　) di awal kalimat
        rawList = rawText.split(/(?=(?:^|\n)[　\s]{1,2})/).map((s) => s.trim()).filter(Boolean);
    } else {
        // default: double newline
        rawList = rawText.split(/\r?\n\s*\r?\n/).map((s) => s.trim()).filter(Boolean);
    }

    return rawList.map((content, idx) => ({
        id: null,
        paragraph_number: idx + 1,
        label: `Paragraf ${idx + 1}`,
        content_raw: content,
    }));
}

export default function AutoSplitParagraphDialog({ open, onClose, onApply }) {
    const [rawText, setRawText] = useState('');
    const [splitMode, setSplitMode] = useState('double_newline');

    if (!open) return null;

    const parsed = splitParagraphs(rawText, splitMode);

    const handleApply = () => {
        if (parsed.length === 0) return;
        onApply(parsed);
        setRawText('');
        onClose();
    };

    const handleSampleText = () => {
        const sample = `日本には四季があり、それぞれの季節に独自の美しさがあります。特に春は、桜が咲く季節として多くの人々に親しまれています。毎年三月の終わりから四月にかけて、公園や川沿いの桜が一斉に花を開きます。

桜の季節になると、人々は家族や友人と一緒に「お花見」を楽しみます。木の下にシートを広げ、美味しいお弁当を食べながら満開の花を眺める時間は、日本の春の風物詩です。夜にはライトアップされ、夜桜の幻想的な美しさに感動します。

しかし、桜の花が咲いている期間はとても短く、約一週間で散ってしまいます。日本人はその儚さに人生の尊さを重ね合わせ、今この瞬間を大切に生きようという教訓を学んできたのです。`;
        setRawText(sample);
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-split-paragraph-title"
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
                            <h3 id="auto-split-paragraph-title" className="text-sm font-black text-gray-900 dark:text-white">
                                ⚡ Pecah Teks Menjadi Paragraf Otomatis
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                Tempel seluruh teks wacana bacaan dan sistem akan memecahnya menjadi blok paragraf terpisah.
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                Metode Pemisah:
                            </span>
                            <select
                                value={splitMode}
                                onChange={(e) => setSplitMode(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <option value="double_newline">Baris Kosong (Enter 2x)</option>
                                <option value="single_newline">Tiap Baris Baru (Enter 1x)</option>
                                <option value="japanese_indent">Indentasi Jepang (Spasi　di awal)</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleSampleText}
                            className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            + Muat Contoh Teks
                        </button>
                    </div>

                    <textarea
                        rows={8}
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Tempel naskah bacaan utuh di sini..."
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 font-japanese text-xs leading-relaxed text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />

                    {/* Live Preview Bar */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 space-y-2">
                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                            Pratinjau Hasil Pemecahan: <span className="text-indigo-600 dark:text-indigo-400">{parsed.length} Paragraf Dihasilkan</span>
                        </span>

                        {parsed.length > 0 && (
                            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                                {parsed.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs dark:border-gray-800 dark:bg-gray-900 space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-indigo-600 dark:text-indigo-400">
                                                Paragraf {idx + 1}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {item.content_raw.replace(/\s+/g, '').length} karakter
                                            </span>
                                        </div>
                                        <p className="font-japanese text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2">
                                            {item.content_raw}
                                        </p>
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
                        <span>Terapkan {parsed.length} Paragraf ke Teks</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
