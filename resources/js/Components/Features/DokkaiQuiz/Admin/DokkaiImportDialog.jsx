import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';

import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

const EXPECTED_COLUMNS = [
    { key: 'judul_wacana', label: 'Judul Wacana', desc: 'Isi pada baris pertama wacana' },
    { key: 'level', label: 'Level JLPT', desc: 'N1 - N5' },
    { key: 'teks_bacaan', label: 'Teks Bacaan', desc: 'Teks wacana (enter ganda = paragraf baru)' },
    { key: 'pertanyaan', label: 'Pertanyaan', desc: 'Teks soal pemahaman' },
    { key: 'opsi_a', label: 'Opsi A', desc: 'Pilihan jawaban A' },
    { key: 'opsi_b', label: 'Opsi B', desc: 'Pilihan jawaban B' },
    { key: 'opsi_c', label: 'Opsi C', desc: 'Pilihan jawaban C' },
    { key: 'opsi_d', label: 'Opsi D', desc: 'Pilihan jawaban D' },
    { key: 'kunci', label: 'Kunci', desc: 'A, B, C, atau D' },
    { key: 'pembahasan', label: 'Pembahasan', desc: 'Penjelasan jawaban (opsional)' },
];

export default function DokkaiImportDialog({ open, day, onClose, onImportSuccess }) {
    useScrollLock(open);

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    const dayId = day?.id;

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !dayId) return;

        setSelectedFile(file);
        setErrorMessage('');
        setPreview(null);
        setProcessing(true);

        const formData = new FormData();
        formData.append('import_file', file);

        try {
            const res = await window.axios.post(
                `/admin/module-days/${dayId}/dokkai-quizzes/import/preview`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setPreview(res.data);
        } catch (err) {
            const errRes = err.response?.data;
            if (errRes && typeof errRes === 'object') {
                if (errRes.errors && Array.isArray(errRes.errors)) {
                    setPreview(errRes);
                } else if (errRes.message) {
                    setErrorMessage(errRes.message);
                } else {
                    setErrorMessage('Format file tidak sesuai atau gagal diproses.');
                }
            } else {
                setErrorMessage('Gagal memvalidasi file spreadsheet.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleCommit = async () => {
        if (!selectedFile || !dayId || !preview?.valid) return;

        setCommitting(true);
        setErrorMessage('');

        const formData = new FormData();
        formData.append('import_file', selectedFile);

        try {
            const res = await window.axios.post(
                `/admin/module-days/${dayId}/dokkai-quizzes/import`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (onImportSuccess) {
                onImportSuccess(res.data);
            }
            handleClose();
        } catch (err) {
            const errRes = err.response?.data;
            setErrorMessage(errRes?.message || 'Gagal menyimpan hasil import.');
        } finally {
            setCommitting(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreview(null);
        setErrorMessage('');
        setProcessing(false);
        setCommitting(false);
        onClose();
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <TableChartOutlinedIcon />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 dark:text-white">
                                Import Spreadsheet Wacana Dokkai
                            </h3>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Format Flat 1-Sheet (.xlsx & .csv) untuk Hari ke-{day?.day_number || ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>

                {/* BODY SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* DOWNLOAD TEMPLATES */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                                    Unduh Template Resmi
                                </h4>
                                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                                    Format 1-Sheet standar dengan contoh wacana dan 10 kolom terpadu.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={`/admin/module-days/${dayId}/dokkai-quizzes/template?format=xlsx`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-200"
                                >
                                    <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
                                    <span>Excel (.xlsx)</span>
                                </a>
                                <a
                                    href={`/admin/module-days/${dayId}/dokkai-quizzes/template?format=csv`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-200"
                                >
                                    <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
                                    <span>CSV UTF-8</span>
                                </a>
                            </div>
                        </div>

                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => setShowGuide(!showGuide)}
                                className="text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300"
                            >
                                {showGuide ? 'Sembunyikan Panduan Format Kolom' : 'Lihat Panduan & Aturan Format Kolom'}
                            </button>

                            {showGuide && (
                                <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60 text-xs text-gray-700 dark:text-gray-300 space-y-2">
                                    <p className="font-semibold text-emerald-950 dark:text-emerald-200">
                                        💡 Aturan Praktis Pengisian 1-Sheet:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                                        <li><strong>Auto-Inherit</strong>: Kolom <code>judul_wacana</code> dan <code>teks_bacaan</code> cukup diisi di baris pertama wacana. Baris soal berikutnya untuk wacana yang sama boleh dikosongkan.</li>
                                        <li><strong>Auto-Split Paragraf</strong>: Gunakan enter ganda (<code>\n\n</code>) di sel <code>teks_bacaan</code> untuk memisahkan paragraf. Sistem otomatis memecahnya jadi Paragraf 1, 2, dst.</li>
                                        <li><strong>Kunci Jawaban</strong>: Kolom <code>kunci</code> diisi huruf <code>A</code>, <code>B</code>, <code>C</code>, atau <code>D</code>.</li>
                                    </ul>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {EXPECTED_COLUMNS.map((col) => (
                                            <span key={col.key} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                {col.key}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* UPLOAD DROPZONE */}
                    <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-950/40">
                        <input
                            type="file"
                            accept=".xlsx,.csv,.txt"
                            onChange={handleFileChange}
                            disabled={processing || committing}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                                <UploadFileIcon sx={{ fontSize: 28 }} />
                            </div>
                            <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                                {selectedFile ? selectedFile.name : 'Pilih atau Tarik File Spreadsheet (.xlsx / .csv)'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {selectedFile
                                    ? `${(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk ganti file`
                                    : 'Mendukung file Excel (.xlsx) atau file teks CSV (Maks 5 MB)'}
                            </p>
                        </div>
                    </div>

                    {/* LOADING VALIDATION */}
                    {processing && (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            <span>Memvalidasi baris spreadsheet...</span>
                        </div>
                    )}

                    {/* ERROR MESSAGE */}
                    {errorMessage && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                            <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} className="shrink-0 mt-0.5 text-rose-600" />
                            <div>
                                <p className="font-bold">Terjadi Kesalahan</p>
                                <p className="mt-0.5">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* PREVIEW STATUS */}
                    {preview && !processing && (
                        <div className="space-y-4">
                            {preview.valid ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                                        <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} className="text-emerald-600" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            Validasi Sukses — Siap Diimpor
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                        Ditemukan <strong>{preview.total_passages} wacana</strong> dengan total <strong>{preview.total_questions} butir soal</strong> pemahaman.
                                    </p>

                                    {/* LIST PASSAGES PREVIEW */}
                                    <div className="mt-3 space-y-2">
                                        {preview.passages?.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                        <AutoStoriesIcon sx={{ fontSize: 16 }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">
                                                            {p.passage?.title}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                            Level: {p.passage?.jlpt_level} • {p.paragraphs?.length || 0} Paragraf • {p.questions?.length || 0} Soal
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Siap
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                                        <ErrorOutlineRoundedIcon sx={{ fontSize: 20 }} className="text-rose-600" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            Validasi Gagal — Ditemukan {preview.errors?.length || 0} Kesalahan
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                                        Perbaiki baris berikut pada spreadsheet Anda sebelum melanjutkan:
                                    </p>

                                    <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-rose-200 bg-white p-2 text-xs dark:border-rose-900 dark:bg-gray-900">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 dark:border-gray-800">
                                                    <th className="py-1 px-2">Baris</th>
                                                    <th className="py-1 px-2">Kolom</th>
                                                    <th className="py-1 px-2">Pesan Kesalahan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {preview.errors?.map((err, idx) => (
                                                    <tr key={idx} className="text-[11px]">
                                                        <td className="py-1.5 px-2 font-mono font-bold text-rose-600">{err.row}</td>
                                                        <td className="py-1.5 px-2 font-mono text-gray-700 dark:text-gray-300">{err.column}</td>
                                                        <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">{err.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={committing}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        Tutup
                    </button>
                    <button
                        type="button"
                        onClick={handleCommit}
                        disabled={!preview?.valid || committing}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {committing && (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        <span>{committing ? 'Menyimpan...' : 'Impor & Simpan ke Draf'}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
