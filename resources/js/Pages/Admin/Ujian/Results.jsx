import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminDialog from '@/Components/UI/AdminDialog';
import { AdminExamHeader, AdminExamTabs, AdminPagination, Metric, StatusBadge, apiErrorMessage, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

export default function Results({ results = [], exam_packages = [], pagination = {} }) {
    const [term, setTerm] = useState('');
    const [exam, setExam] = useState('all');
    const [invalidating, setInvalidating] = useState(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const visible = useMemo(() => results.filter((item) => {
        if (exam !== 'all' && item.exam !== exam) return false;
        return `${item.name} ${item.exam}`.toLowerCase().includes(term.trim().toLowerCase());
    }), [exam, results, term]);
    const scored = results.filter((item) => item.status !== 'invalidated' && item.max_score > 0);
    const average = scored.length ? Math.round(scored.reduce((total, item) => total + ((item.score / item.max_score) * 100), 0) / scored.length) : 0;

    const invalidate = async () => {
        setBusy(true); setError(''); setMessage('');
        try {
            await window.axios.post(route('admin.exam-attempts.invalidate', invalidating.id), { reason });
            setInvalidating(null); setReason(''); setMessage('Attempt dibatalkan dan dikeluarkan dari peringkat.');
            router.reload({ only: ['results', 'pagination'], preserveScroll: true });
        } catch (requestError) {
            setError(apiErrorMessage(requestError));
        } finally {
            setBusy(false);
        }
    };

    return <AuthenticatedLayout><Head title="Hasil Ujian" /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
        <AdminExamHeader eyebrow="Monitoring peserta" title="Hasil ujian" description="Tinjau hasil per peserta dan paket tanpa mencampurkannya dengan nilai kuis kelas." />
        <AdminExamTabs />
        {(message || error) && <div className={`border px-4 py-3 text-sm font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>{error || message}</div>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Pengerjaan tampil" value={results.length} /><Metric label="Rata-rata nilai" value={`${average}%`} /><Metric label="Lulus" value={results.filter((item) => item.status === 'passed').length} /><Metric label="Dibatalkan" value={results.filter((item) => item.status === 'invalidated').length} /></div>
        <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><div className="grid gap-3 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-[1fr_320px]"><label className="relative"><SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" /><input value={term} onChange={(event) => setTerm(event.target.value)} className={`${fieldClassName} mt-0 pl-10`} placeholder="Cari nama peserta" /></label><select value={exam} onChange={(event) => setExam(event.target.value)} className={`${fieldClassName} mt-0`}><option value="all">Semua paket ujian</option>{exam_packages.map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}</select></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60"><tr><th className="px-4 py-3">Peserta</th><th className="px-4 py-3">Paket</th><th className="px-4 py-3">Skor</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3">Selesai</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map((result) => <tr key={result.id}><td className="px-4 py-4 font-black text-gray-950 dark:text-white">{result.name}</td><td className="px-4 py-4"><p className="font-semibold text-gray-800 dark:text-gray-200">{result.exam}</p><p className="mt-1 text-xs text-gray-500">{result.level}</p></td><td className="px-4 py-4 font-black tabular-nums">{result.score}/{result.max_score}</td><td className="px-4 py-4 font-semibold tabular-nums text-gray-600 dark:text-gray-300">{result.duration}</td><td className="px-4 py-4 text-xs font-semibold text-gray-500">{result.completed_at}</td><td className="px-4 py-4"><StatusBadge status={result.status} /></td><td className="px-4 py-4 text-right">{result.status !== 'invalidated' && <button type="button" onClick={() => { setInvalidating(result); setReason(''); }} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-black text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" title="Batalkan attempt"><BlockRoundedIcon fontSize="small" /> Batalkan</button>}</td></tr>)}{visible.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center font-semibold text-gray-500">Tidak ada hasil yang sesuai dengan filter.</td></tr>}</tbody></table></div>
            <AdminPagination links={pagination.results} />
        </section>
    </div></div>
    <AdminDialog open={Boolean(invalidating)} onClose={() => !busy && setInvalidating(null)} eyebrow="Audit hasil" title="Batalkan attempt" description="Skor tidak dihapus, tetapi tidak lagi dihitung dalam peringkat." footer={<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setInvalidating(null)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black dark:border-gray-700">Batal</button><button type="button" disabled={busy || reason.trim().length < 5} onClick={invalidate} className="h-10 rounded-md bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy ? 'Memproses...' : 'Batalkan attempt'}</button></div>}>
        {invalidating && <div><dl className="grid grid-cols-[120px_1fr] gap-2 text-sm"><dt className="font-bold text-gray-500">Peserta</dt><dd className="font-black text-gray-900 dark:text-white">{invalidating.name}</dd><dt className="font-bold text-gray-500">Paket</dt><dd className="font-black text-gray-900 dark:text-white">{invalidating.exam}</dd><dt className="font-bold text-gray-500">Skor</dt><dd className="font-black text-gray-900 dark:text-white">{invalidating.score}/{invalidating.max_score}</dd></dl><label className="mt-5 block"><span className="text-xs font-black text-gray-700 dark:text-gray-300">Alasan pembatalan</span><textarea rows="4" className={`${fieldClassName} h-auto py-3`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Minimal 5 karakter untuk catatan audit." /></label>{error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}</div>}
    </AdminDialog>
    </AuthenticatedLayout>;
}
