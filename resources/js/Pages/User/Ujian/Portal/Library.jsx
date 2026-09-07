import React, { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterAltOffRoundedIcon from '@mui/icons-material/FilterAltOffRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { EmptyState, ExamCard, FieldLabel, PageHeading, PrototypeBadge, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';

const PAGE_SIZE = 6;

export default function Library({ exam_packages = [], levels = [], sessions = [], sections = [] }) {
    const [type, setType] = useState('all');
    const [term, setTerm] = useState('');
    const [level, setLevel] = useState('all');
    const [session, setSession] = useState('all');
    const [section, setSection] = useState('all');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const query = term.trim().toLowerCase();
        return exam_packages.filter((exam) => {
            if (type !== 'all' && exam.type !== type) return false;
            if (level !== 'all' && exam.level !== level) return false;
            if (session !== 'all' && exam.session !== session) return false;
            if (status !== 'all' && exam.status !== status) return false;
            if (section !== 'all' && !exam.sections?.some((item) => item.key === section)) return false;
            if (query && !`${exam.title} ${exam.description} ${exam.level} ${exam.session}`.toLowerCase().includes(query)) return false;
            return true;
        });
    }, [exam_packages, level, section, session, status, term, type]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visibleExams = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => setPage(1), [level, section, session, status, term, type]);

    const resetFilters = () => {
        setType('all');
        setTerm('');
        setLevel('all');
        setSession('all');
        setSection('all');
        setStatus('all');
    };

    return (
        <ExamPortalLayout>
            <Head title="Kumpulan Ujian" />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                    <PageHeading
                        eyebrow="Pustaka ujian"
                        title="Kumpulan Ujian"
                        description="Temukan latihan singkat atau simulasi lengkap berdasarkan level dan bagian yang ingin kamu ukur."
                        action={<PrototypeBadge />}
                    />
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                <div className="grid gap-5 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:p-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                    <label>
                        <FieldLabel>Cari ujian</FieldLabel>
                        <span className="relative block">
                            <SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
                            <input value={term} onChange={(event) => setTerm(event.target.value)} className={`${inputClassName} pl-10`} placeholder="Judul, level, atau sesi" />
                        </span>
                    </label>
                    <label>
                        <FieldLabel>Level</FieldLabel>
                        <select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClassName}>
                            <option value="all">Semua level</option>
                            {levels.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label>
                        <FieldLabel>Status</FieldLabel>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}>
                            <option value="all">Semua status</option>
                            <option value="available">Tersedia</option>
                            <option value="completed">Pernah dikerjakan</option>
                            <option value="locked">Belum tersedia</option>
                        </select>
                    </label>
                </div>

                <div className="mt-6 grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <aside className="self-start rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] lg:sticky lg:top-24">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-black">Filter lanjutan</h2>
                            <button type="button" onClick={resetFilters} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white" title="Reset filter" aria-label="Reset filter">
                                <FilterAltOffRoundedIcon sx={{ fontSize: 19 }} />
                            </button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <label>
                                <FieldLabel>Jenis</FieldLabel>
                                <select value={type} onChange={(event) => setType(event.target.value)} className={inputClassName}>
                                    <option value="all">Semua jenis</option>
                                    <option value="practice">Latihan Ujian</option>
                                    <option value="simulation">Simulasi JLPT</option>
                                </select>
                            </label>
                            <label>
                                <FieldLabel>Sesi / paket</FieldLabel>
                                <select value={session} onChange={(event) => setSession(event.target.value)} className={inputClassName}>
                                    <option value="all">Semua sesi</option>
                                    {sessions.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </label>
                            <label>
                                <FieldLabel>Bagian</FieldLabel>
                                <select value={section} onChange={(event) => setSection(event.target.value)} className={inputClassName}>
                                    <option value="all">Semua bagian</option>
                                    {sections.map((item) => <option key={item.key} value={item.key}>{item.short_label}</option>)}
                                </select>
                            </label>
                        </div>
                    </aside>

                    <section>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex w-full rounded-lg border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#142019] sm:w-auto" role="group" aria-label="Jenis ujian">
                                {[
                                    ['all', 'Semua'],
                                    ['practice', 'Latihan Ujian'],
                                    ['simulation', 'Simulasi JLPT'],
                                ].map(([value, label]) => (
                                    <button key={value} type="button" onClick={() => setType(value)} className={`min-h-9 flex-1 rounded-md px-3 text-xs font-black transition sm:flex-none ${type === value ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">{filtered.length}</strong> ujian ditemukan</p>
                        </div>

                        {visibleExams.length > 0 ? (
                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleExams.map((exam) => <ExamCard key={exam.id} exam={exam} />)}
                            </div>
                        ) : (
                            <div className="mt-5"><EmptyState title="Ujian tidak ditemukan" description="Coba gunakan kata kunci atau kombinasi filter yang berbeda." /></div>
                        )}

                        {filtered.length > PAGE_SIZE && (
                            <nav className="mt-7 flex items-center justify-center gap-2" aria-label="Pagination kumpulan ujian">
                                {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                                    <button key={item} type="button" onClick={() => setPage(item)} className={`grid h-10 w-10 place-items-center rounded-lg border text-sm font-black ${page === item ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#142019] dark:text-gray-200 dark:hover:bg-white/10'}`} aria-current={page === item ? 'page' : undefined}>
                                        {item}
                                    </button>
                                ))}
                            </nav>
                        )}
                    </section>
                </div>
            </div>
        </ExamPortalLayout>
    );
}
