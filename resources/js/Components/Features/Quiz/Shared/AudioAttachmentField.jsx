import React, { useEffect, useRef, useState } from 'react';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { TooltipHelp } from '@/Components/UI/QuizField';

export default function AudioAttachmentField({
    audioUrl,
    value,
    placeholder = 'Tempel tautan URL audio .mp3 atau klik Unggah Berkas',
    onChange,
    label = 'Audio Narasi / Listening',
    tooltip = 'File audio narasi atau listening. Jika dikosongkan, sistem secara otomatis melafalkan teks Jepang menggunakan Google Web Speech TTS.',
    uploadEndpoint = '/admin/upload',
    className = '',
}) {
    const resolvedAudioUrl = audioUrl ?? value ?? '';
    const fileInputRef = useRef(null);
    const isMountedRef = useRef(true);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setUploadError('');

        try {
            const res = await window.axios.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (isMountedRef.current && res.data?.url) {
                onChange?.(res.data.url);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setUploadError(err.response?.data?.message || 'Gagal mengunggah berkas audio.');
            }
        } finally {
            if (isMountedRef.current) {
                setUploading(false);
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAudio = () => {
        onChange?.('');
    };

    return (
        <div className={`space-y-2.5 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    <MicNoneOutlinedIcon sx={{ fontSize: 15 }} />
                    <span>{label}</span>
                    <TooltipHelp text={tooltip} />
                </label>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Otomatis TTS Aktif
                </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <input
                        type="url"
                        value={resolvedAudioUrl || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-xs font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                        <UploadFileIcon sx={{ fontSize: 16 }} />
                        <span>{uploading ? 'Mengunggah...' : 'Unggah Audio'}</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/m4a,audio/ogg,.mp3,.wav,.m4a"
                        className="hidden"
                        disabled={uploading}
                        onChange={handleFileChange}
                    />

                    {resolvedAudioUrl && (
                        <button
                            type="button"
                            onClick={handleRemoveAudio}
                            title="Hapus file audio"
                            aria-label="Hapus file audio"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                        </button>
                    )}
                </div>
            </div>

            {uploadError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {uploadError}
                </p>
            )}

            {resolvedAudioUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                        <GraphicEqIcon sx={{ fontSize: 18 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            {resolvedAudioUrl}
                        </p>
                        <audio controls className="mt-1.5 h-7 w-full" src={resolvedAudioUrl}>
                            Browser Anda tidak mendukung elemen audio.
                        </audio>
                    </div>
                </div>
            ) : (
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                    <em>Opsional</em>: Kosongkan jika ingin sistem melafalkan otomatis menggunakan Web Speech API browser siswa.
                </p>
            )}
        </div>
    );
}
