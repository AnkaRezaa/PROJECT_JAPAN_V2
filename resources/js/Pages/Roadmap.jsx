import { Link } from '@inertiajs/react';
import { useState } from 'react';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import StyleIcon from '@mui/icons-material/Style';
import GuestFooter from '@/Components/Layout/GuestFooter';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import FallEffect from '@/Components/theme/FallEffect';
import theme from '@/Components/theme/themes';
import MountFujiBg from '../../Images/Mount-Fuji-New.jpg';
import SeoHead from '@/Components/SEO/SeoHead';

const stages = [
    {
        id: 'kelas',
        eyebrow: 'Mulai dari sini',
        title: 'Pilih Kelas N3',
        description: 'Masuk ke kelas JLPT N3 yang sesuai, lalu lihat roadmap mingguan yang tersedia untukmu.',
        icon: SchoolIcon,
        state: 'start',
    },
    {
        id: 'modul',
        eyebrow: 'Setiap minggu',
        title: 'Ikuti Modul Mingguan',
        description: 'Setiap modul menyatukan materi pendukung dan latihan dalam satu jalur belajar yang lebih terarah.',
        icon: AutoStoriesIcon,
        state: 'learning',
    },
    {
        id: 'latihan',
        eyebrow: 'Belajar aktif',
        title: 'Latih dan Ulangi',
        description: 'Gunakan PPT, kosakata, dan flashcard untuk memahami materi sebelum masuk ke evaluasi.',
        icon: StyleIcon,
        state: 'practice',
    },
    {
        id: 'kuis',
        eyebrow: 'Evaluasi',
        title: 'Selesaikan Kuis',
        description: 'Kerjakan kuis, dapatkan umpan balik, lalu pantau XP dan progres belajarmu dari dashboard.',
        icon: QuizIcon,
        state: 'finish',
    },
];

const weeklyResources = [
    {
        title: 'PPT Kelas',
        description: 'Presentasi pendukung dari pengajar untuk mengikuti fokus modul.',
        icon: SlideshowIcon,
        tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    },
    {
        title: 'Kosakata',
        description: 'Kumpulan kata N3 untuk dipelajari dalam konteks kelas.',
        icon: LocalLibraryIcon,
        tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
        title: 'Flashcard',
        description: 'Latihan pengulangan singkat untuk memperkuat ingatan.',
        icon: StyleIcon,
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
        title: 'Kuis',
        description: 'Evaluasi pemahaman dan sumber XP untuk progres belajar.',
        icon: QuizIcon,
        tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
];

function StageNode({ stage, index, selected, onSelect }) {
    const Icon = stage.icon;
    const positions = ['50%', '26%', '70%', '50%'];
    const isSelected = selected.id === stage.id;
    const colors = {
        start: { background: theme.doneColor, shadow: theme.doneShadow },
        learning: { background: theme.activeColor, shadow: theme.activeShadow },
        practice: { background: '#e6a22c', shadow: '#a96512' },
        finish: { background: '#64748b', shadow: '#334155' },
    }[stage.state];

    return (
        <div className="absolute z-10" style={{ left: positions[index], top: `${index * 156}px`, transform: 'translateX(-50%)' }}>
            <button
                type="button"
                onClick={() => onSelect(stage)}
                aria-pressed={isSelected}
                className="group flex w-28 flex-col items-center gap-2 rounded-2xl px-1 pb-1 pt-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
            >
                <span
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-white transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 dark:border-slate-900 ${isSelected ? 'ring-4 ring-red-300 dark:ring-red-500/40' : ''}`}
                    style={{ backgroundColor: colors.background, boxShadow: `0 7px 0 ${colors.shadow}` }}
                >
                    <Icon sx={{ fontSize: 34 }} />
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${isSelected ? 'bg-red-600 text-white' : 'bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}>
                    {index === 0 ? 'Preview' : `Tahap ${index + 1}`}
                </span>
            </button>
        </div>
    );
}

export default function Roadmap({ seo = {} }) {
    const [selectedStage, setSelectedStage] = useState(stages[0]);

    return (
        <>
            <FallEffect />
            <SeoHead seo={seo} />
            <GuestNavbar heroTone="dark" />

            <main className="overflow-hidden bg-[#f7f8f8] text-slate-900 dark:bg-slate-950 dark:text-white">
                <section className="relative min-h-[620px] overflow-hidden bg-slate-950">
                    <img src={MountFujiBg} alt="Gunung Fuji" className="absolute inset-0 h-full w-full object-cover object-center opacity-80" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.72)_47%,rgba(2,6,23,0.25)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f7f8f8] dark:to-slate-950" />

                    <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-5 py-20 sm:px-8 lg:px-10">
                        <div className="max-w-2xl">
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200 backdrop-blur-sm">
                                <SchoolIcon sx={{ fontSize: 16 }} /> Kurikulum JLPT N3
                            </p>
                            <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                                Kurikulum JLPT N3 Mingguan
                            </h1>
                            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-lg">
                                Satu jalur belajar untuk mengikuti materi kelas, memperkuat kosakata, berlatih dengan flashcard, dan mengevaluasi pemahaman lewat kuis.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Lihat Kelas dan Harga <ChevronRightIcon sx={{ fontSize: 18 }} />
                                </Link>
                                <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Daftar untuk Preview
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900 sm:py-18">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(190,24,93,0.035)_0_1px,transparent_1px_58px),repeating-linear-gradient(0deg,rgba(190,24,93,0.028)_0_1px,transparent_1px_58px)] dark:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.022)_0_1px,transparent_1px_58px),repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0_1px,transparent_1px_58px)]" />
                    <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Preview Kurikulum</p>
                            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Satu roadmap, empat tahapan belajar</h2>
                            <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Ini adalah gambaran alur kelas N3, bukan status progres akunmu.</p>
                        </div>

                        <div className="relative mx-auto mt-10 h-[640px] max-w-md">
                            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 640" preserveAspectRatio="none" aria-hidden="true">
                                <path d="M200 50 C200 120, 104 100, 104 206 S280 252, 280 362 S200 420, 200 518" fill="none" stroke={theme.pathGrad[0]} strokeWidth="8" strokeLinecap="round" strokeDasharray="12 10" opacity="0.76" />
                                <path d="M200 50 C200 120, 104 100, 104 206 S280 252, 280 362 S200 420, 200 518" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 10" opacity="0.75" />
                            </svg>
                            {stages.map((stage, index) => (
                                <StageNode key={stage.id} stage={stage} index={index} selected={selectedStage} onSelect={setSelectedStage} />
                            ))}
                        </div>

                        <div className="mx-auto mt-1 max-w-xl rounded-2xl border border-red-100 bg-red-50 p-5 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">{selectedStage.eyebrow}</p>
                            <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{selectedStage.title}</h3>
                            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">{selectedStage.description}</p>
                        </div>
                    </div>
                </section>

                <section className="bg-[#f7f8f8] py-16 dark:bg-slate-950 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Isi Modul Mingguan</p>
                                <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white">Materi dan latihan tidak berjalan sendiri-sendiri.</h2>
                                <p className="mt-4 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">Setiap modul dirancang sebagai jalur belajar: pahami dulu, ulangi seperlunya, lalu uji pemahamanmu.</p>
                                <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center gap-1 text-sm font-black text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    Lihat pilihan kelas <ChevronRightIcon sx={{ fontSize: 19 }} />
                                </Link>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {weeklyResources.map((resource) => {
                                    const Icon = resource.icon;

                                    return (
                                        <article key={resource.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${resource.tone}`}><Icon sx={{ fontSize: 23 }} /></div>
                                            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">{resource.title}</h3>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{resource.description}</p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:grid lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-10">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Gambaran Kelas</p>
                                <h2 className="mt-3 text-3xl font-black leading-tight">Belajar N3 dengan jalur yang mudah diikuti.</h2>
                                <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300">Masuk kelas, lihat roadmap, buka materi pendukung, dan lanjutkan latihan dari titik terakhir.</p>
                            </div>
                            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl lg:mt-0">
                                <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-800 px-4 py-3">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    <span className="ml-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Kelas N3 Mingguan</span>
                                </div>
                                <div className="grid gap-3 p-4 sm:grid-cols-[0.85fr_1.15fr]">
                                    <div className="rounded-xl bg-rose-500 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-100">Minggu 1</p>
                                        <p className="mt-2 text-lg font-black">Mulai Belajar</p>
                                        <div className="mt-5 flex items-center gap-2 text-xs font-bold text-rose-100"><PlayCircleIcon sx={{ fontSize: 17 }} /> Roadmap tersedia</div>
                                    </div>
                                    <div className="space-y-2">
                                        {[['PPT Kelas', SlideshowIcon], ['Kosakata', LocalLibraryIcon], ['Flashcard', StyleIcon], ['Kuis', QuizIcon]].map(([label, Icon]) => (
                                            <div key={label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                                                <span className="flex items-center gap-2 text-xs font-bold text-slate-100"><Icon sx={{ fontSize: 16 }} />{label}</span>
                                                <CheckCircleIcon sx={{ fontSize: 16 }} className="text-emerald-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative overflow-hidden bg-red-600 px-5 py-16 text-center text-white sm:px-8 sm:py-20">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_56px)]" />
                    <div className="relative mx-auto max-w-2xl">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-amber-200"><FlashOnIcon sx={{ fontSize: 28 }} /></span>
                        <h2 className="mt-5 text-3xl font-black">Siap melihat kelas N3?</h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-red-100">Lihat pilihan kelas dan harga sebelum memulai perjalanan belajarmu.</p>
                        <Link href="/pricing" className="mt-7 inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-white px-5 text-sm font-black text-red-700 shadow-lg transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                            Lihat Kelas dan Harga <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Link>
                    </div>
                </section>
            </main>

            <GuestFooter />
        </>
    );
}
