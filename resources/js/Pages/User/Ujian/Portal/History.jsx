import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { EmptyState, FieldLabel, PageHeading, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';
import ExamResultView from '@/Components/Features/ExamPortal/ExamResultView';

const sectionLabels = { vocabulary: 'Kosakata & Huruf', grammar_reading: 'Tata Bahasa & Membaca', listening: 'Mendengarkan' };
const levelLabel = (level) => String(level || '').startsWith('JLPT ') ? level : `JLPT ${level}`;

export default function History({ history = [], sessions = [], levels = [], viewer }) {
    const [session, setSession] = useState('all');
    const [level, setLevel] = useState('all');
    const [status, setStatus] = useState('all');
    const [selectedId, setSelectedId] = useState(history[0]?.id || null);
    const [resultDialog, setResultDialog] = useState(null);
    const filtered = useMemo(() => history.filter((item) => (
        (session === 'all' || item.session === session)
        && (level === 'all' || item.level === level)
        && (status === 'all' || item.status === status)
    )), [history, level, session, status]);
    const selected = history.find((item) => item.id === selectedId) || filtered[0] || null;
    const bestScore = history.reduce((highest, item) => Math.max(highest, Math.round((item.score / item.max_score) * 100)), 0);

    useEffect(() => {
        if (!resultDialog) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setResultDialog(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [resultDialog]);

    const openResult = async (item) => {
        setResultDialog({ item, loading: true, result: null, error: '' });
        try {
            const response = await window.axios.get(route('user.exam-attempts.result', item.id));
            setResultDialog({ item, loading: false, result: response.data.result, error: '' });
        } catch (requestError) {
            setResultDialog({
                item,
                loading: false,
                result: null,
                error: requestError.response?.data?.message || 'Hasil ujian belum dapat ditampilkan.',
            });
        }
    };

    return (
        <ExamPortalLayout>
            <Head title="Riwayat Ujian" />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10"><PageHeading eyebrow="Catatan hasil" title="Riwayat Ujian" description="Lihat kembali percobaan dan perkembangan hasil latihan maupun simulasi." /></div></section>

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
                                <tbody className="divide-y divide-gray-100 dark:divide-white/10">{filtered.map((item) => <tr key={item.id} className={selected?.id === item.id ? 'bg-brand-50/70 dark:bg-green-950/30' : 'hover:bg-[#f7faf8] dark:hover:bg-white/5'}><td className="px-5 py-4"><button type="button" onClick={() => setSelectedId(item.id)} className="text-left"><strong className="block max-w-72 truncate">{item.title}</strong><span className="text-xs text-gray-500 dark:text-gray-400">{levelLabel(item.level)} · {item.session}</span></button></td><td className="px-4 py-4 text-gray-600 dark:text-gray-300">{item.completed_at}</td><td className="px-4 py-4">#{item.attempt}</td><td className="px-4 py-4 font-black">{item.score}/{item.max_score}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'passed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' : item.status === 'failed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>{item.status === 'passed' ? 'Estimasi lulus' : item.status === 'failed' ? 'Belum memenuhi estimasi' : 'Selesai'}</span></td><td className="px-5 py-4"><button type="button" onClick={() => openResult(item)} className="grid h-9 w-9 place-items-center rounded-lg text-brand-700 hover:bg-brand-50 dark:text-green-300 dark:hover:bg-green-950/40" aria-label={`Lihat hasil lengkap ${item.title} attempt ${item.attempt}`}><ArrowForwardRoundedIcon sx={{ fontSize: 19 }} /></button></td></tr>)}</tbody>
                            </table></div>
                        </section>

                        {selected && <aside className="self-start rounded-lg border border-[#dbe5df] bg-white p-5 dark:border-white/10 dark:bg-[#142019] xl:sticky xl:top-24"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><CheckCircleRoundedIcon /></span><div><p className="text-xs font-bold text-gray-500 dark:text-gray-400">Analisis attempt #{selected.attempt}</p><h2 className="font-black">{selected.score}/{selected.max_score}</h2></div></div><p className="mt-4 text-sm font-black">{selected.title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selected.completed_at} · {selected.duration}</p><div className="mt-5 space-y-4">{Object.entries(selected.sections || {}).map(([key, value]) => { const max = selected.max_score === 180 ? 60 : 100; return <div key={key}><div className="flex justify-between gap-3 text-xs"><span className="font-bold text-gray-600 dark:text-gray-300">{sectionLabels[key] || key}</span><strong>{value}/{max}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div></div>; })}</div><Link href={route('user.exams.show', selected.exam_slug)} className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 text-xs font-black text-brand-800 hover:bg-brand-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40">Lihat paket ujian <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></Link></aside>}
                    </div>
                ) : <div className="mt-6"><EmptyState title="Riwayat belum tersedia" description="Belum ada attempt yang cocok dengan filter ini." /></div>}
            </div>

            {resultDialog && (
                <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Hasil ${resultDialog.item.title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setResultDialog(null); }}>
                    <section className="relative mx-auto min-h-full max-w-6xl bg-[#f7faf8] shadow-2xl dark:bg-[#0f1713]">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dbe5df] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#142019] sm:px-6">
                            <div>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Hasil attempt #{resultDialog.item.attempt}</p>
                                <p className="font-black text-gray-950 dark:text-white">{resultDialog.item.title}</p>
                            </div>
                            <button type="button" onClick={() => setResultDialog(null)} className="grid h-10 w-10 place-items-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10" aria-label="Tutup hasil ujian">
                                <CloseRoundedIcon />
                            </button>
                        </div>

                        {resultDialog.loading && (
                            <div className="grid min-h-72 place-items-center px-6 py-16 text-center">
                                <div>
                                    <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-r-brand-700" aria-hidden="true" />
                                    <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-300">Memuat hasil ujian...</p>
                                </div>
                            </div>
                        )}
                        {resultDialog.error && <div className="mx-auto max-w-xl px-6 py-16 text-center"><p className="font-black text-rose-700 dark:text-rose-300">Hasil tidak dapat dibuka</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{resultDialog.error}</p></div>}
                        {resultDialog.result && <ExamResultView result={resultDialog.result} onExit={() => setResultDialog(null)} exitLabel="Tutup hasil" />}
                    </section>
                </div>
            )}
        </ExamPortalLayout>
    );
}
