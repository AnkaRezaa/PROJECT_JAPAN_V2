import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Dialog from '@mui/material/Dialog';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayArrow';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

export default function LiveSessionDialog({ open, onClose, item }) {
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const session = item?.session;

    useEffect(() => {
        if (open) setError('');
    }, [open, session?.id]);

    if (!session) return null;

    const respond = (response) => {
        setSending(true);
        setError('');
        router.post(session.rsvp_url, { response }, {
            preserveScroll: true,
            preserveState: true,
            onError: (errors) => setError(Object.values(errors)[0] || 'Gagal menyimpan pilihan.'),
            onFinish: () => setSending(false),
        });
    };
    const status = session.status === 'live' ? 'Live sekarang' : session.status === 'ended' ? 'Selesai' : 'Terjadwal';

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby={`live-title-${session.id}`} fullWidth maxWidth="xs">
            <div className="bg-white p-5 dark:bg-gray-900 dark:text-white">
                <div className="flex items-start justify-between gap-3">
                    <h2 id={`live-title-${session.id}`} className="min-w-0 break-words text-lg font-bold">{item.title}</h2>
                    <button type="button" aria-label="Tutup" onClick={onClose} className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600"><CloseIcon /></button>
                </div>
                <p className="mt-2 break-words text-sm text-gray-600 dark:text-gray-300">{status} · {item.detail}</p>
                {!session.access_allowed && <p className="mt-4 text-sm">Akses kelas diperlukan untuk menggunakan fitur sesi ini.</p>}
                {session.access_allowed && session.status === 'scheduled' && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold">Rencana kehadiran</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {[['attending', 'Akan hadir', CheckCircleOutlineIcon], ['not_attending', 'Tidak bisa hadir', HighlightOffIcon]].map(([value, label, Icon]) => (
                                <button type="button" key={value} disabled={sending} aria-pressed={session.rsvp === value} onClick={() => respond(value)} className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm transition hover:border-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-600 disabled:opacity-60 ${session.rsvp === value ? 'border-green-700 bg-green-100 text-green-900' : 'border-gray-300 dark:border-gray-600'}`}><Icon sx={{ fontSize: 18 }} aria-hidden="true" />{label}</button>
                            ))}
                        </div>
                    </div>
                )}
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                {session.access_allowed && session.status === 'live' && session.join_url && <Link className="mt-4 inline-flex items-center gap-2 rounded bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800" href={session.join_url}><VideoCameraFrontIcon sx={{ fontSize: 18 }} aria-hidden="true" />Masuk kelas</Link>}
                {session.access_allowed && session.status === 'ended' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                        {session.recording_url && <a className="inline-flex items-center gap-1 text-sm font-bold text-green-700 hover:underline dark:text-green-300" href={session.recording_url} target="_blank" rel="noopener noreferrer"><PlayCircleOutlineIcon sx={{ fontSize: 18 }} aria-hidden="true" />Tonton rekaman</a>}
                        {session.summary_url && <a className="inline-flex items-center gap-1 text-sm font-bold text-green-700 hover:underline dark:text-green-300" href={session.summary_url} target="_blank" rel="noopener noreferrer"><DescriptionOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />Lihat rangkuman</a>}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
