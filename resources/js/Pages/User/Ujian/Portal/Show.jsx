import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import WifiRoundedIcon from '@mui/icons-material/WifiRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { PrototypeBadge } from '@/Components/Features/ExamPortal/ExamPortalUI';

const sectionDescriptions = {
    vocabulary: 'Pengenalan huruf, penggunaan kosakata, dan pemahaman makna.',
    grammar_reading: 'Pola kalimat, tata bahasa, dan pemahaman bacaan.',
    listening: 'Pemahaman informasi dan percakapan melalui audio.',
};

export default function Show({ exam }) {
    const [checks, setChecks] = useState({ connection: false, device: false, audio: false });
    const allChecked = Object.values(checks).every(Boolean);
    const toggle = (key) => setChecks((current) => ({ ...current, [key]: !current[key] }));
    const isSimulation = exam.type === 'simulation';

    return (
        <ExamPortalLayout>
            <Head title={exam.title} />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
                    <Link href={route('user.exams.library')} className="inline-flex items-center gap-2 text-sm font-black text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-green-300"><ArrowBackRoundedIcon sx={{ fontSize: 19 }} /> Kembali ke kumpulan ujian</Link>
                    <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${isSimulation ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200'}`}>{isSimulation ? 'Simulasi JLPT' : 'Latihan Ujian'}</span><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">JLPT {exam.level}</span></div>
                            <h1 className="mt-4 text-2xl font-black leading-tight text-[#17231d] dark:text-white sm:text-3xl">{exam.title}</h1>
                            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">{exam.description}</p>
                        </div>
                        <PrototypeBadge />
                    </div>
                    <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-gray-200 pt-5 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
                        <span className="inline-flex items-center gap-2"><AccessTimeRoundedIcon sx={{ fontSize: 19 }} /> <strong>{exam.duration_minutes} menit</strong></span>
                        <span className="inline-flex items-center gap-2"><QuizOutlinedIcon sx={{ fontSize: 19 }} /> <strong>{exam.question_count} soal</strong></span>
                        <span className="inline-flex items-center gap-2"><LayersOutlinedIcon sx={{ fontSize: 19 }} /> <strong>{exam.section_count} bagian</strong></span>
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-10">
                <div className="space-y-8">
                    <section>
                        <h2 className="text-xl font-black">Bagian ujian</h2>
                        <div className="mt-4 space-y-3">
                            {exam.sections?.map((section, index) => (
                                <div key={section.key} className="flex gap-4 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:p-5">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e7f8ec] text-sm font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{index + 1}</span>
                                    <div><h3 className="font-black">{section.label}</h3><p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{sectionDescriptions[section.key]}</p></div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8 dark:border-white/10">
                        <h2 className="text-xl font-black">Ketentuan pengerjaan</h2>
                        <ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Waktu berjalan setelah sesi dimulai.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Jawaban terakhir dikirim saat waktu habis.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Soal dapat ditandai untuk diperiksa kembali.</li>
                            <li className="flex gap-3"><CheckCircleRoundedIcon className="mt-0.5 shrink-0 text-brand-600" sx={{ fontSize: 19 }} /> Hasil simulasi tidak mengubah progres kelas.</li>
                        </ul>
                    </section>

                    {isSimulation && <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100"><h2 className="font-black">Tentang hasil simulasi</h2><p className="mt-2 text-sm leading-6">Skor yang ditampilkan merupakan estimasi TOKU-UP untuk membantu evaluasi belajar dan bukan nilai resmi penyelenggara JLPT.</p></section>}
                </div>

                <aside className="self-start rounded-lg border border-[#dbe5df] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#142019] lg:sticky lg:top-24">
                    <h2 className="text-lg font-black">Pemeriksaan perangkat</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Konfirmasi kesiapan sebelum masuk ke ruang ujian.</p>
                    <div className="mt-5 space-y-2">
                        {[
                            ['connection', 'Koneksi internet stabil', WifiRoundedIcon],
                            ['device', 'Perangkat dan baterai siap', DevicesRoundedIcon],
                            ['audio', 'Audio dapat terdengar', HeadphonesOutlinedIcon],
                        ].map(([key, label, Icon]) => (
                            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checks[key] ? 'border-brand-300 bg-brand-50 dark:border-green-800 dark:bg-green-950/40' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'}`}>
                                <input type="checkbox" checked={checks[key]} onChange={() => toggle(key)} className="rounded border-gray-300 text-brand-600 focus:ring-focus" />
                                <Icon sx={{ fontSize: 19 }} className={checks[key] ? 'text-brand-700 dark:text-green-300' : 'text-gray-400'} />
                                <span className="text-sm font-bold">{label}</span>
                            </label>
                        ))}
                    </div>
                    <button type="button" disabled className="mt-5 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 text-sm font-black text-gray-500 dark:bg-gray-800 dark:text-gray-400" title="Backend simulasi belum tersedia">
                        <LockClockOutlinedIcon sx={{ fontSize: 19 }} /> {allChecked ? 'Backend belum tersedia' : 'Lengkapi pemeriksaan'}
                    </button>
                    <p className="mt-3 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">Tombol mulai diaktifkan setelah backend ujian mandiri tersedia.</p>
                </aside>
            </div>
        </ExamPortalLayout>
    );
}
