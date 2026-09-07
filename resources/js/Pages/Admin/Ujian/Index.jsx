import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AdminExamHeader, AdminExamTabs, Metric, PrototypeNotice, StatusBadge, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

export default function Index({ exam_packages = [] }) {
    const [term, setTerm] = useState('');
    const [level, setLevel] = useState('all');
    const [status, setStatus] = useState('all');
    const filtered = useMemo(() => exam_packages.filter((exam) => {
        if (level !== 'all' && exam.level !== level) return false;
        if (status !== 'all' && exam.status !== status) return false;
        return `${exam.title} ${exam.description}`.toLowerCase().includes(term.trim().toLowerCase());
    }), [exam_packages, level, status, term]);

    return (
        <AuthenticatedLayout>
            <Head title="Kelola Ujian" />
            <div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <AdminExamHeader eyebrow="Domain ujian mandiri" title="Kelola Ujian" description="Susun paket latihan dan simulasi JLPT tanpa mencampurnya dengan Evaluasi Week." action={<div className="flex flex-wrap items-center gap-2"><PrototypeNotice /><Link href="/admin/exams/create" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700"><AddRoundedIcon fontSize="small" /> Buat ujian</Link></div>} />
                    <AdminExamTabs />

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Metric label="Total paket" value={exam_packages.length} detail="Semua level" />
                        <Metric label="Sudah terbit" value={exam_packages.filter((item) => item.status === 'published').length} detail="Terlihat oleh peserta" />
                        <Metric label="Masih draft" value={exam_packages.filter((item) => item.status === 'draft').length} detail="Perlu divalidasi" />
                        <Metric label="Total pengerjaan" value={exam_packages.reduce((total, item) => total + item.attempt_count, 0)} detail="Data contoh" />
                    </div>

                    <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="grid gap-3 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-[1fr_160px_160px]">
                            <label className="relative">
                                <SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
                                <input value={term} onChange={(event) => setTerm(event.target.value)} className={`${fieldClassName} mt-0 pl-10`} placeholder="Cari nama paket ujian" />
                            </label>
                            <select value={level} onChange={(event) => setLevel(event.target.value)} className={`${fieldClassName} mt-0`}><option value="all">Semua level</option>{['N5', 'N4', 'N3', 'N2', 'N1'].map((item) => <option key={item}>{item}</option>)}</select>
                            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClassName} mt-0`}><option value="all">Semua status</option><option value="published">Terbit</option><option value="draft">Draft</option><option value="archived">Arsip</option></select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[880px] text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60 dark:text-gray-400"><tr><th className="px-4 py-3">Paket</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Konten</th><th className="px-4 py-3">Pengerjaan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filtered.map((exam) => <tr key={exam.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30">
                                        <td className="px-4 py-4"><p className="font-black text-gray-950 dark:text-white">{exam.title}</p><p className="mt-1 text-xs text-gray-500">{exam.level} · diperbarui {exam.updated_at}</p></td>
                                        <td className="px-4 py-4 font-semibold text-gray-600 dark:text-gray-300">{exam.type === 'simulation' ? 'Simulasi JLPT' : 'Latihan ujian'}</td>
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300"><strong>{exam.question_count}</strong> soal · {exam.sections.length} bagian</td>
                                        <td className="px-4 py-4 font-bold tabular-nums text-gray-700 dark:text-gray-200">{exam.attempt_count}</td>
                                        <td className="px-4 py-4"><StatusBadge status={exam.status} /></td>
                                        <td className="px-4 py-4"><div className="flex justify-end gap-1"><Link href={`/admin/exams/${exam.slug}/preview`} className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white" title="Preview sebagai peserta"><VisibilityOutlinedIcon fontSize="small" /></Link><Link href={`/admin/exams/${exam.slug}/edit`} className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white" title="Edit paket"><EditOutlinedIcon fontSize="small" /></Link></div></td>
                                    </tr>)}
                                    {filtered.length === 0 && <tr><td colSpan="6" className="px-4 py-12 text-center font-semibold text-gray-500">Tidak ada paket yang sesuai dengan filter.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
