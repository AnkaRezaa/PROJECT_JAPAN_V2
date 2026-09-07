import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AdminExamHeader, AdminExamTabs, Metric, PrototypeNotice, StatusBadge, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

export default function Sessions({ sessions = [] }) {
    const [status, setStatus] = useState('all');
    const visible = useMemo(() => sessions.filter((item) => status === 'all' || item.status === status), [sessions, status]);

    return <AuthenticatedLayout><Head title="Sesi Ujian" /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
        <AdminExamHeader eyebrow="Distribusi & jadwal" title="Sesi dan akses ujian" description="Atur periode pengerjaan, cakupan peserta, dan status ketersediaan setiap paket." action={<div className="flex items-center gap-2"><PrototypeNotice /><button type="button" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-black text-white"><AddRoundedIcon fontSize="small" /> Buat sesi</button></div>} />
        <AdminExamTabs />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Total sesi" value={sessions.length} /><Metric label="Sedang berjalan" value={sessions.filter((item) => item.status === 'active').length} /><Metric label="Terjadwal" value={sessions.filter((item) => item.status === 'scheduled').length} /><Metric label="Total peserta" value={sessions.reduce((total, item) => total + item.participants, 0)} detail="Data contoh" /></div>
        <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-gray-950 dark:text-white">Daftar sesi</h2><p className="mt-1 text-xs font-semibold text-gray-500">Satu paket dapat dipakai pada beberapa periode.</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClassName} mt-0 sm:w-44`}><option value="all">Semua status</option><option value="active">Berjalan</option><option value="scheduled">Terjadwal</option><option value="closed">Selesai</option></select></div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map((session) => <article key={session.id} className="grid gap-4 p-4 md:grid-cols-[44px_minmax(0,1fr)_210px_120px_100px] md:items-center"><span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"><EventOutlinedIcon fontSize="small" /></span><div><p className="font-black text-gray-950 dark:text-white">{session.name}</p><p className="mt-1 text-xs font-semibold text-gray-500">{session.exam_title} · {session.level}</p></div><div className="text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300"><p>{session.starts_at}</p><p>sampai {session.ends_at}</p></div><p className="text-sm font-black tabular-nums text-gray-800 dark:text-gray-200">{session.participants} peserta</p><StatusBadge status={session.status} /></article>)}</div>
        </section>
    </div></div></AuthenticatedLayout>;
}
