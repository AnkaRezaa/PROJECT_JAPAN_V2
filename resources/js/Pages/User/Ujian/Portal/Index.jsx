import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { FieldLabel, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';

const initials = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const rankTone = {
    1: 'border-[#e7ae24] bg-[#ffd76e] text-[#533b00]',
    2: 'border-[#aeb9c2] bg-[#e7edf1] text-[#394550]',
    3: 'border-[#c87b4d] bg-[#efaa7e] text-[#512712]',
};

export default function Index({ active_exam, sessions = [], levels = [], latest_result, ranking = [], viewer }) {
    const availableSessions = useMemo(
        () => sessions.filter((item) => item !== 'Paket Latihan'),
        [sessions],
    );
    const [session, setSession] = useState(active_exam?.session || availableSessions[0] || '');
    const [level, setLevel] = useState(active_exam?.level || levels[0] || '');
    const canOpenActiveExam = Boolean(
        active_exam
        && session === active_exam.session
        && level === active_exam.level,
    );
    const topRanking = useMemo(() => ranking.slice(0, 3), [ranking]);
    const viewerRank = useMemo(
        () => ranking.find((item) => item.name === viewer?.name)?.rank,
        [ranking, viewer?.name],
    );

    const primaryHref = active_exam
        ? route('user.exams.show', active_exam.slug)
        : route('user.exams.library');
    const primaryLabel = active_exam?.status === 'available'
        ? 'Mulai ujian'
        : active_exam
            ? 'Lihat detail ujian'
            : 'Lihat kumpulan ujian';

    const stats = [
        {
            label: 'Skor terakhir',
            value: latest_result ? `${latest_result.score}/${latest_result.max_score}` : 'Belum ada',
            note: latest_result?.status || 'Mulai ujian pertamamu',
            icon: TrendingUpRoundedIcon,
            tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
        },
        {
            label: 'Sesi tersedia',
            value: availableSessions.length || '0',
            note: availableSessions.length ? 'Siap dipilih' : 'Belum dijadwalkan',
            icon: FlagOutlinedIcon,
            tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
        },
        {
            label: 'Target level',
            value: active_exam?.level ? `JLPT ${active_exam.level}` : 'Belum ada',
            note: active_exam ? active_exam.session : 'Pilih dari katalog ujian',
            icon: CheckCircleOutlineRoundedIcon,
            tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
        },
        {
            label: 'Peringkatmu',
            value: viewerRank ? `#${viewerRank}` : 'Belum masuk',
            note: viewerRank ? 'Pada ranking aktif' : 'Selesaikan simulasi resmi',
            icon: EmojiEventsOutlinedIcon,
            tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
        },
    ];

    return (
        <ExamPortalLayout>
            <Head title="Beranda Ujian" />

            <section className="relative isolate min-h-[440px] overflow-hidden border-b border-[#234835] bg-[#173d2b] text-white sm:min-h-[470px]">
                <img
                    src="/images/kelas-n3-ujian.jpg"
                    alt="Gunung Fuji dan pagoda Jepang"
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_45%]"
                />
                <div className="absolute inset-0 -z-10 bg-[#123524]/80" />

                <div className="pointer-events-none absolute -right-10 top-12 hidden select-none border-y border-white/15 py-3 pr-16 text-right lg:block" aria-hidden="true">
                    <p className="font-display text-[7rem] leading-none text-white/15">挑戦</p>
                    <p className="mt-2 text-xs font-black tracking-[0.35em] text-[#f8d56b]">日本語能力試験</p>
                </div>
                <div className="pointer-events-none absolute bottom-8 right-[8%] hidden items-center gap-3 text-white/35 lg:flex" aria-hidden="true">
                    <span className="h-px w-20 bg-current" />
                    <span className="text-xs font-black tracking-[0.3em]">TOKU-UP EXAM</span>
                </div>

                <div className="relative mx-auto flex min-h-[440px] max-w-7xl items-center px-4 py-12 sm:min-h-[470px] sm:px-6 lg:py-16">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 border-l-4 border-[#f5bd32] bg-black/20 px-3 py-2 text-xs font-black uppercase text-[#ffdf83] backdrop-blur-sm">
                            <FlagOutlinedIcon sx={{ fontSize: 17 }} /> Portal Ujian TOKU-UP
                        </div>
                        <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                            Siap menguji kemampuan bahasa Jepangmu?
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-[#e1efe7] sm:text-base">
                            Kerjakan latihan per bagian atau rasakan simulasi JLPT lengkap dengan waktu dan penilaian yang terarah.
                        </p>

                        {active_exam ? (
                            <div className="mt-7 border-l border-white/30 pl-4">
                                <p className="text-xs font-black uppercase text-[#9ce6ad]">Ujian pilihan</p>
                                <h2 className="mt-1 text-lg font-black sm:text-xl">{active_exam.title}</h2>
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#d7e9df] sm:text-sm">
                                    <span className="inline-flex items-center gap-1.5"><AccessTimeRoundedIcon sx={{ fontSize: 18 }} /> {active_exam.duration_minutes} menit</span>
                                    <span className="inline-flex items-center gap-1.5"><QuizOutlinedIcon sx={{ fontSize: 18 }} /> {active_exam.question_count} soal</span>
                                    <span className="inline-flex items-center gap-1.5"><LayersOutlinedIcon sx={{ fontSize: 18 }} /> {active_exam.section_count} bagian</span>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-7 border-l border-white/30 pl-4 text-sm font-semibold text-[#d7e9df]">
                                Belum ada ujian aktif. Katalog tetap dapat dibuka untuk melihat jadwal berikutnya.
                            </p>
                        )}

                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <Link
                                href={primaryHref}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f5bd32] px-6 text-sm font-black text-[#3d2b00] shadow-[0_12px_30px_-16px_rgba(245,189,50,0.85)] transition hover:bg-[#ffd05b] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#173d2b]"
                            >
                                {primaryLabel}
                                <ArrowForwardRoundedIcon sx={{ fontSize: 20 }} />
                            </Link>
                            <Link
                                href={route('user.exams.history')}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/35 bg-black/15 px-5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <HistoryOutlinedIcon sx={{ fontSize: 19 }} /> Riwayat
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:pb-16">
                <section className="relative z-10 -mt-7 rounded-lg border border-[#d6e2da] bg-white p-4 shadow-[0_18px_45px_-28px_rgba(23,61,43,0.5)] dark:border-white/10 dark:bg-[#142019] sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                        <label>
                            <FieldLabel>Sesi ujian</FieldLabel>
                            <select value={session} onChange={(event) => setSession(event.target.value)} className={inputClassName} disabled={!availableSessions.length}>
                                {!availableSessions.length && <option value="">Belum ada sesi</option>}
                                {availableSessions.map((item) => <option key={item}>{item}</option>)}
                            </select>
                        </label>
                        <label>
                            <FieldLabel>Level JLPT</FieldLabel>
                            <select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClassName} disabled={!levels.length}>
                                {!levels.length && <option value="">Belum ada level</option>}
                                {levels.map((item) => <option key={item}>{item}</option>)}
                            </select>
                        </label>
                        <Link
                            href={canOpenActiveExam ? route('user.exams.show', active_exam.slug) : route('user.exams.library')}
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${canOpenActiveExam ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10'}`}
                        >
                            {canOpenActiveExam ? 'Buka ujian pilihan' : 'Cari ujian yang sesuai'}
                            <ArrowForwardRoundedIcon sx={{ fontSize: 19 }} />
                        </Link>
                    </div>
                </section>

                <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan ujian">
                    {stats.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="flex min-h-[112px] items-center gap-4 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019]">
                                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${item.tone}`}><Icon /></span>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{item.label}</p>
                                    <p className="mt-0.5 truncate text-xl font-black text-[#17231d] dark:text-white">{item.value}</p>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{item.note}</p>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section className="mt-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase text-brand-700 dark:text-green-300">Pusat ujian</p>
                                <h2 className="mt-1 text-2xl font-black">Tentukan langkah berikutnya</h2>
                            </div>
                            <p className="max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">Pilih paket baru atau tinjau perkembangan dari ujian sebelumnya.</p>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {[
                                { title: 'Kumpulan Ujian', text: 'Temukan simulasi lengkap dan latihan per bagian sesuai target JLPT.', href: route('user.exams.library'), icon: Inventory2OutlinedIcon, eyebrow: 'Mulai latihan', kanji: '試', tone: 'border-[#b9dfc4] bg-[#edf9f0] text-brand-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200' },
                                { title: 'Riwayat Ujian', text: 'Bandingkan nilai, status kelulusan, dan hasil setiap bagian ujian.', href: route('user.exams.history'), icon: HistoryOutlinedIcon, eyebrow: 'Lihat perkembangan', kanji: '歩', tone: 'border-[#b9dce8] bg-[#eef8fb] text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={item.title} href={item.href} className={`group relative min-h-[220px] overflow-hidden rounded-lg border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}>
                                        <div className="absolute -right-3 -top-5 select-none text-[7rem] font-black leading-none opacity-[0.07]" aria-hidden="true">{item.kanji}</div>
                                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/80 shadow-sm dark:bg-white/10"><Icon /></span>
                                        <p className="mt-5 text-xs font-black uppercase opacity-70">{item.eyebrow}</p>
                                        <h3 className="mt-1 text-lg font-black">{item.title}</h3>
                                        <p className="mt-2 max-w-sm text-sm leading-6 opacity-80">{item.text}</p>
                                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-black">Buka halaman <ArrowForwardRoundedIcon className="transition group-hover:translate-x-1" sx={{ fontSize: 17 }} /></span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="mt-8 overflow-hidden rounded-lg border border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#142019]">
                            <div className="border-b border-[#dbe5df] bg-[#fff8df] px-5 py-4 dark:border-white/10 dark:bg-amber-950/30">
                                <h2 className="text-base font-black text-[#5d4400] dark:text-amber-100">Sebelum memasuki ruang ujian</h2>
                            </div>
                            <div className="grid gap-px bg-[#dbe5df] sm:grid-cols-3 dark:bg-white/10">
                                {[
                                    ['01', 'Siapkan perangkat', 'Pastikan koneksi dan baterai perangkat mencukupi.'],
                                    ['02', 'Periksa audio', 'Gunakan earphone untuk bagian mendengarkan.'],
                                    ['03', 'Jaga sesi', 'Jangan menutup halaman selama ujian berlangsung.'],
                                ].map(([number, title, text]) => (
                                    <div key={number} className="bg-white p-5 dark:bg-[#142019]">
                                        <span className="text-sm font-black text-[#bd8500] dark:text-amber-300">{number}</span>
                                        <h3 className="mt-2 text-sm font-black">{title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="self-start overflow-hidden rounded-lg border border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#142019]">
                        <div className="relative overflow-hidden border-b border-[#e8ddb9] bg-[#fff8df] px-5 py-5 dark:border-white/10 dark:bg-amber-950/30">
                            <div className="absolute right-3 top-0 select-none text-7xl font-black leading-none text-[#e0a600]/10" aria-hidden="true">勝</div>
                            <div className="relative flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase text-[#8a6200] dark:text-amber-300">{active_exam?.session || 'Ranking aktif'}</p>
                                    <h2 className="mt-1 text-lg font-black">Papan teratas</h2>
                                </div>
                                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f5bd32] text-[#523a00]"><EmojiEventsOutlinedIcon /></span>
                            </div>
                        </div>

                        {topRanking.length ? (
                            <div className="p-5">
                                <div className="flex min-h-[170px] items-end justify-center gap-2 border-b border-gray-100 pb-5 dark:border-white/10">
                                    {[topRanking[1], topRanking[0], topRanking[2]].filter(Boolean).map((item) => {
                                        const height = item.rank === 1 ? 'h-28' : item.rank === 2 ? 'h-24' : 'h-20';
                                        return (
                                            <div key={item.rank} className="flex min-w-0 flex-1 flex-col items-center">
                                                <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#e7f8ec] text-xs font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{initials(item.name)}</span>
                                                <p className="mb-2 w-full truncate text-center text-xs font-black">{item.name}</p>
                                                <div className={`flex w-full flex-col items-center justify-center rounded-t-lg border ${height} ${rankTone[item.rank] || rankTone[3]}`}>
                                                    <span className="text-xl font-black">{item.rank}</span>
                                                    <span className="mt-1 text-[11px] font-bold">{item.total} poin</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Link href={route('user.exams.ranking')} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 text-xs font-black text-brand-800 hover:bg-brand-50 dark:border-green-800 dark:text-green-200 dark:hover:bg-green-950/40">
                                    Lihat ranking lengkap <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                                </Link>
                            </div>
                        ) : (
                            <div className="p-5 text-center">
                                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                                    <EmojiEventsOutlinedIcon />
                                </span>
                                <h3 className="mt-4 text-sm font-black">Ranking belum dimulai</h3>
                                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">Selesaikan simulasi yang mendukung ranking untuk mengisi podium.</p>
                                <Link href={route('user.exams.library')} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-xs font-black text-white hover:bg-brand-700">
                                    Cari simulasi <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                                </Link>
                            </div>
                        )}
                    </aside>
                </section>

                <section className="mt-8 flex items-start gap-4 rounded-lg border border-[#cbe6d3] bg-[#e7f8ec] p-5 text-brand-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100 sm:items-center">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/70 dark:bg-white/10"><HeadphonesOutlinedIcon /></span>
                    <div>
                        <p className="text-sm font-black">Bagian mendengarkan membutuhkan audio yang jelas.</p>
                        <p className="mt-1 text-sm text-brand-800/80 dark:text-green-100/75">Gunakan earphone dan pilih tempat yang tenang sebelum memulai ujian.</p>
                    </div>
                </section>
            </div>
        </ExamPortalLayout>
    );
}
