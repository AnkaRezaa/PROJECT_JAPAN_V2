import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AdminExamHeader, AdminExamTabs, Metric, PrototypeNotice, StatusBadge, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

export default function Results({ results = [], exam_packages = [] }) {
    const [term, setTerm] = useState('');
    const [exam, setExam] = useState('all');
    const visible = useMemo(() => results.filter((item) => {
        if (exam !== 'all' && item.exam !== exam) return false;
        return `${item.name} ${item.exam}`.toLowerCase().includes(term.trim().toLowerCase());
    }), [exam, results, term]);
    const scored = results.filter((item) => item.max_score === 180);
    const average = scored.length ? Math.round(scored.reduce((total, item) => total + item.score, 0) / scored.length) : 0;

    return <AuthenticatedLayout><Head title="Hasil Ujian" /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
        <AdminExamHeader eyebrow="Monitoring peserta" title="Hasil ujian" description="Tinjau hasil per peserta dan paket tanpa mencampurkannya dengan nilai kuis kelas." action={<PrototypeNotice />} />
        <AdminExamTabs />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Pengerjaan tampil" value={results.length} /><Metric label="Rata-rata simulasi" value={`${average}/180`} /><Metric label="Lulus" value={results.filter((item) => item.status === 'passed').length} /><Metric label="Perlu ditinjau" value={results.filter((item) => item.status === 'failed').length} /></div>
        <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><div className="grid gap-3 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-[1fr_320px]"><label className="relative"><SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" /><input value={term} onChange={(event) => setTerm(event.target.value)} className={`${fieldClassName} mt-0 pl-10`} placeholder="Cari nama peserta" /></label><select value={exam} onChange={(event) => setExam(event.target.value)} className={`${fieldClassName} mt-0`}><option value="all">Semua paket ujian</option>{exam_packages.map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}</select></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60"><tr><th className="px-4 py-3">Peserta</th><th className="px-4 py-3">Paket</th><th className="px-4 py-3">Skor</th><th className="px-4 py-3">Durasi</th><th className="px-4 py-3">Selesai</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map((result) => <tr key={result.id}><td className="px-4 py-4 font-black text-gray-950 dark:text-white">{result.name}</td><td className="px-4 py-4"><p className="font-semibold text-gray-800 dark:text-gray-200">{result.exam}</p><p className="mt-1 text-xs text-gray-500">{result.level}</p></td><td className="px-4 py-4 font-black tabular-nums">{result.score}/{result.max_score}</td><td className="px-4 py-4 font-semibold tabular-nums text-gray-600 dark:text-gray-300">{result.duration}</td><td className="px-4 py-4 text-xs font-semibold text-gray-500">{result.completed_at}</td><td className="px-4 py-4"><StatusBadge status={result.status} /></td></tr>)}</tbody></table></div>
        </section>
    </div></div></AuthenticatedLayout>;
}
