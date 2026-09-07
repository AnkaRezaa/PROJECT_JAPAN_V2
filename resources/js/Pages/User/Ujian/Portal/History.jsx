import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { EmptyState, FieldLabel, PageHeading, PrototypeBadge, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';

const sectionLabels = { vocabulary: 'Kosakata & Huruf', grammar_reading: 'Tata Bahasa & Membaca', listening: 'Mendengarkan' };

export default function History({ history = [], sessions = [], levels = [], viewer }) {
    const [session, setSession] = useState('all');
    const [level, setLevel] = useState('all');
    const [status, setStatus] = useState('all');
    const [selectedId, setSelectedId] = useState(history[0]?.id || null);
    const filtered = useMemo(() => history.filter((item) => (
        (session === 'all' || item.session === session)
        && (level === 'all' || item.level === level)
        && (status === 'all' || item.status === status)
    )), [history, level, session, status]);
    const selected = history.find((item) => item.id === selectedId) || filtered[0] || null;
    const bestScore = history.reduce((highest, item) => Math.max(highest, Math.round((item.score / item.max_score) * 100)), 0);

    return (
        <ExamPortalLayout>
            <Head title="Riwayat Ujian" />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10"><PageHeading eyebrow="Catatan hasil" title="Riwayat Ujian" description="Lihat kembali percobaan dan perkembangan hasil latihan maupun simulasi." action={<PrototypeBadge />} /></div></section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                <section className="grid gap-px overflow-hidden rounded-lg border border-[#dbe5df] bg-[#dbe5df] dark:border-white/10 dark:bg-white/10 sm:grid-cols-[1.4fr_1fr_1fr]">
                    <div className="bg-white p-5 dark:bg-[#142019]"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">Peserta</p><p className="mt-1 truncate text-lg font-black">{viewer?.name}</p><p className="truncate text-xs text-gray-500 dark:text-gray-400">{viewer?.email}</p></div>
                    <div className="bg-white p-5 dark:bg-[#142019]"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">Jumlah ujian</p><p className="mt-1 text-2xl font-black">{history.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Data pratinjau</p></div>
                    <div className="bg-white p-5 dark:bg-[#142019]"><p className="text-xs font-bold text-gray-500 dark:text-gray-400">Hasil terbaik</p><p className="mt-1 text-2xl font-black">{bestScore}%</p><p className="text-xs text-gray-500 dark:text-gray-400">Dari seluruh attempt</p></div>
                </section>

                <section className="mt-6 grid gap-4 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:grid-cols-3 sm:p-5">
                    <label><FieldLabel>Sesi</FieldLabel><select value={session} onChange={(event) => setSession(event.target.value)} className={inputClassName}><option value="all">Semua sesi</option>{sessions.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label><FieldLabel>Level</FieldLabel><select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClassName}><option value="all">Semua level</option>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label><FieldLabel>Status</FieldLabel><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}><option value="all">Semua status</option><option value="passed">Estimasi lulus</option><option value="completed">Selesai</option><option value="failed">Belum lulus</option></select></label>
                </section>

                {filtered.length > 0 ? (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <section className="overflow-hidden rounded-lg border border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#142019]">
                            <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-[#f1f6f3] text-xs uppercase text-gray-600 dark:bg-white/5 dark:text-gray-300"><tr><th className="px-5 py-3">Ujian</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Attempt</th><th className="px-4 py-3">Nilai</th><th className="px-4 py-3">Status</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th></tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/10">{filtered.map((item) => <tr key={item.id} className={selected?.id === item.id ? 'bg-brand-50/70 dark:bg-green-950/30' : 'hover:bg-[#f7faf8] dark:hover:bg-white/5'}><td className="px-5 py-4"><button type="button" onClick={() => setSelectedId(item.id)} className="text-left"><strong className="block max-w-72 truncate">{item.title}</strong><span className="text-xs text-gray-500 dark:text-gray-400">JLPT {item.level} · {item.session}</span></button></td><td className="px-4 py-4 text-gray-600 dark:text-gray-300">{item.completed_at}</td><td className="px-4 py-4">#{item.attempt}</td><td className="px-4 py-4 font-black">{item.score}/{item.max_score}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'passed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>{item.status === 'passed' ? 'Estimasi lulus' : 'Selesai'}</span></td><td className="px-5 py-4"><button type="button" onClick={() => setSelectedId(item.id)} className="grid h-9 w-9 place-items-center rounded-lg text-brand-700 hover:bg-brand-50 dark:text-green-300 dark:hover:bg-green-950/40" aria-label={`Lihat analisis ${item.title}`}><ArrowForwardRoundedIcon sx={{ fontSize: 19 }} /></button></td></tr>)}</tbody>
                            </table></div>
                        </section>

                        {selected && <aside className="self-start rounded-lg border border-[#dbe5df] bg-white p-5 dark:border-white/10 dark:bg-[#142019] xl:sticky xl:top-24"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><CheckCircleRoundedIcon /></span><div><p className="text-xs font-bold text-gray-500 dark:text-gray-400">Analisis attempt #{selected.attempt}</p><h2 className="font-black">{selected.score}/{selected.max_score}</h2></div></div><p className="mt-4 text-sm font-black">{selected.title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selected.completed_at} · {selected.duration}</p><div className="mt-5 space-y-4">{Object.entries(selected.sections || {}).map(([key, value]) => { const max = selected.max_score === 180 ? 60 : 100; return <div key={key}><div className="flex justify-between gap-3 text-xs"><span className="font-bold text-gray-600 dark:text-gray-300">{sectionLabels[key] || key}</span><strong>{value}/{max}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div></div>; })}</div><Link href={route('user.exams.show', selected.exam_slug)} className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 text-xs font-black text-brand-800 hover:bg-brand-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40">Lihat paket ujian <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></Link></aside>}
                    </div>
                ) : <div className="mt-6"><EmptyState title="Riwayat belum tersedia" description="Belum ada attempt yang cocok dengan filter ini." /></div>}
            </div>
        </ExamPortalLayout>
    );
}
