import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const sheets = [
    {
        id: 'materi',
        label: 'Materi',
        columns: ['lesson_key', 'level', 'module_week', 'day_number', 'pattern', 'title', 'meaning', 'formula', 'explanation'],
    },
    {
        id: 'contoh',
        label: 'Contoh',
        columns: ['lesson_key', 'order', 'japanese', 'reading', 'translation'],
    },
    {
        id: 'soal',
        label: 'Soal',
        columns: ['lesson_key', 'stage', 'order', 'prompt', 'source_text', 'context', 'options_or_tokens', 'correct_answer_or_order', 'feedback', 'points'],
    },
];

const sampleLessons = [
    {
        key: 'n3-ba-hodo',
        pattern: '〜ば〜ほど',
        title: 'Semakin..., semakin...',
        location: 'Minggu 1 / Hari 2',
        examples: 3,
        questions: 15,
        status: 'ready',
    },
    {
        key: 'n3-you-ni',
        pattern: '〜ように',
        title: 'Agar / supaya',
        location: 'Minggu 2 / Hari 1',
        examples: 2,
        questions: 10,
        status: 'warning',
    },
];

function SheetGuide({ sheet }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">Sheet {sheet.label}</p>
                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Nama kolom harus sama agar validasi baris dapat dilakukan.</p>
                </div>
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-300">{sheet.columns.length} kolom</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {sheet.columns.map((column) => (
                    <code key={column} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{column}</code>
                ))}
            </div>
        </div>
    );
}

export default function GrammarBulkImportDialog({ open, program, onClose }) {
    const [activeSheet, setActiveSheet] = useState('materi');
    const [showSample, setShowSample] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const currentSheet = useMemo(() => sheets.find((sheet) => sheet.id === activeSheet), [activeSheet]);

    const sendFile = async (commit = false) => {
        if (!selectedFile || !program?.id) return;
        setProcessing(true);
        setMessage('');
        const data = new FormData();
        data.append('import_file', selectedFile);
        try {
            const suffix = commit ? 'import' : 'import/preview';
            const response = await window.axios.post(`/admin/programs/${program.id}/grammar-quizzes/${suffix}`, data);
            if (commit) {
                setMessage(response.data.message);
                setPreview(null);
                setSelectedFile(null);
            } else {
                setPreview(response.data);
                setShowSample(true);
            }
        } catch (requestError) {
            const response = requestError.response?.data;
            if (Array.isArray(response?.errors)) {
                setPreview(response);
                setShowSample(true);
            } else {
                setMessage(response?.message || Object.values(response?.errors || {}).flat()[0] || 'Workbook gagal diproses.');
            }
        } finally {
            setProcessing(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Import banyak Grammar" className="fixed inset-0 z-[145] flex flex-col bg-[#f5f7f6] dark:bg-gray-950">
            <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="mx-auto flex max-w-6xl items-center gap-3">
                    <button type="button" onClick={onClose} className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-black text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                        <ArrowBackIcon sx={{ fontSize: 19 }} /> Kembali
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">{program?.title || 'Kelas terpilih'}</p>
                        <h1 className="truncate text-base font-black text-gray-900 dark:text-white">Import Banyak Grammar</h1>
                    </div>
                    {program?.id && <a href={`/admin/programs/${program.id}/grammar-quizzes/template`} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700">Unduh Template</a>}
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><DescriptionOutlinedIcon sx={{ fontSize: 20 }} /></span>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">1. Siapkan workbook</h2>
                                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">Satu file dapat membawa beberapa lesson. Gunakan lesson_key yang sama pada ketiga sheet.</p>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
                                {sheets.map((sheet) => (
                                    <button key={sheet.id} type="button" onClick={() => setActiveSheet(sheet.id)} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-black ${activeSheet === sheet.id ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                        {sheet.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4"><SheetGuide sheet={currentSheet} /></div>
                        </section>

                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <h2 className="text-base font-black text-gray-900 dark:text-white">2. Unggah dan periksa</h2>
                            <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-gray-700 dark:bg-gray-950/40 dark:hover:border-emerald-700">
                                <UploadFileIcon className="text-emerald-600" sx={{ fontSize: 30 }} />
                                <span className="mt-2 text-sm font-black text-gray-800 dark:text-white">Pilih workbook XLSX</span>
                                <span className="mt-1 text-xs font-medium text-gray-500">Maksimal 2 MB, berisi sheet Materi, Contoh, dan Soal.</span>
                                <input type="file" accept=".xlsx" className="sr-only" onChange={(event) => { setSelectedFile(event.target.files?.[0] || null); setPreview(null); setMessage(''); }} />
                            </label>
                            {selectedFile && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                                    <ErrorOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                    <span><strong>{selectedFile.name}</strong> siap diperiksa sebelum disimpan.</span>
                                </div>
                            )}
                            <button type="button" disabled={!selectedFile || processing} onClick={() => sendFile(false)} className="mt-4 h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800 transition hover:border-emerald-400 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                                {processing ? 'Memeriksa...' : 'Periksa Workbook'}
                            </button>
                        </section>

                        {showSample && (
                            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                                    <h2 className="text-base font-black text-gray-900 dark:text-white">3. Review sebelum import</h2>
                                    <p className="mt-1 text-xs font-medium text-gray-500">{preview ? `${preview.lesson_count} lesson, ${preview.example_count} contoh, dan ${preview.question_count} soal ditemukan.` : 'Belum ada hasil validasi.'}</p>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {preview?.errors?.map((item, index) => (
                                        <div key={`${item.sheet}-${item.row}-${index}`} className="px-5 py-4">
                                            <p className="text-sm font-black text-rose-700 dark:text-rose-300">{item.message}</p>
                                            <p className="mt-1 text-xs font-medium text-gray-500">{item.sheet}, baris {item.row}, kolom {item.column}</p>
                                        </div>
                                    ))}
                                    {preview?.valid && <div className="px-5 py-4 text-sm font-black text-emerald-700">Workbook valid dan siap diimport sebagai draf.</div>}
                                    {!preview && sampleLessons.map((lesson) => (
                                        <div key={lesson.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${lesson.status === 'ready' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'}`}>
                                                {lesson.status === 'ready' ? <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} /> : <ErrorOutlineRoundedIcon sx={{ fontSize: 20 }} />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lesson.pattern} · {lesson.title}</p>
                                                <p className="mt-0.5 text-xs font-medium text-gray-500">{lesson.location} · {lesson.examples} contoh · {lesson.questions} soal</p>
                                            </div>
                                            <span className={`text-xs font-black ${lesson.status === 'ready' ? 'text-emerald-600' : 'text-amber-600'}`}>{lesson.status === 'ready' ? 'Siap' : '1 peringatan'}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-5">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white">Ringkasan import</h2>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between gap-3"><dt className="font-medium text-gray-500">Workbook</dt><dd className="max-w-40 truncate font-black text-gray-800 dark:text-gray-100">{selectedFile?.name || 'Belum dipilih'}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="font-medium text-gray-500">Cakupan</dt><dd className="font-black text-gray-800 dark:text-gray-100">Banyak lesson</dd></div>
                            <div className="flex justify-between gap-3"><dt className="font-medium text-gray-500">Status akhir</dt><dd className="font-black text-gray-800 dark:text-gray-100">Draf</dd></div>
                        </dl>
                        <button type="button" disabled={!preview?.valid || processing} onClick={() => sendFile(true)} className="mt-5 h-11 w-full rounded-xl bg-emerald-600 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800">Import ke Draf</button>
                        {message && <p className="mt-2 text-center text-[11px] font-bold leading-4 text-emerald-600">{message}</p>}
                    </aside>
                </div>
            </main>
        </div>,
        document.body,
    );
}
