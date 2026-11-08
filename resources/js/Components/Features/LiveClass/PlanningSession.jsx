import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function PlanningSession({ session, inputClass }) {
    const [members, setMembers] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const form = useForm({ recording_url: session.recording_url || '', summary_url: session.summary_url || '' });

    const showAttendance = async () => {
        if (members) {
            setMembers(null);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await fetch(session.attendance_url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
            if (!response.ok) throw new Error('Gagal memuat rencana kehadiran.');
            setMembers((await response.json()).members);
        } catch (exception) {
            setError(exception.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-gray-200 py-4 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 break-words">
                    <p className="font-bold">{session.title} · {session.kloter}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{session.status} {session.scheduled_at && `· ${new Date(session.scheduled_at).toLocaleString('id-ID')}`}</p>
                </div>
                <button type="button" onClick={showAttendance} disabled={loading} aria-expanded={Boolean(members)} className="rounded border px-3 py-2 text-sm dark:border-gray-600">{loading ? 'Memuat...' : members ? 'Tutup rekap' : 'Lihat kehadiran'}</button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            {members && <div className="mt-3 text-sm">
                <p>Hadir: {members.filter((member) => member.response === 'attending').length} · Tidak hadir: {members.filter((member) => member.response === 'not_attending').length} · Belum menjawab: {members.filter((member) => !member.response).length}</p>
                <ul className="mt-2 max-h-40 overflow-auto">{members.map((member) => <li key={member.id}>{member.name} — {member.response === 'attending' ? 'Akan hadir' : member.response === 'not_attending' ? 'Tidak bisa hadir' : 'Belum menjawab'}</li>)}</ul>
            </div>}
            {session.status === 'ended' && <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); form.patch(session.materials_url, { preserveScroll: true }); }}>
                <label className="text-sm">Tautan rekaman<input type="url" maxLength="2048" value={form.data.recording_url} onChange={(event) => form.setData('recording_url', event.target.value)} className={inputClass} /></label>
                {form.errors.recording_url && <p role="alert" className="text-sm text-red-600">{form.errors.recording_url}</p>}
                <label className="text-sm">Tautan rangkuman<input type="url" maxLength="2048" value={form.data.summary_url} onChange={(event) => form.setData('summary_url', event.target.value)} className={inputClass} /></label>
                {form.errors.summary_url && <p role="alert" className="text-sm text-red-600">{form.errors.summary_url}</p>}
                <button type="submit" disabled={form.processing} className="justify-self-start rounded bg-orange-600 px-3 py-2 text-sm font-bold text-white">{form.processing ? 'Menyimpan...' : 'Simpan tautan'}</button>
            </form>}
        </div>
    );
}
