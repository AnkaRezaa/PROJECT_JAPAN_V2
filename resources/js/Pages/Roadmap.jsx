import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import StyleIcon from '@mui/icons-material/Style';
import GuestFooter from '@/Components/Layout/GuestFooter';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import FallEffect from '@/Components/theme/FallEffect';
import theme from '@/Components/theme/themes';
import MountFujiBg from '../../Images/Mount-Fuji-New.jpg';
import SeoHead from '@/Components/SEO/SeoHead';

const roadmapNodePositions = ['50%', '26%', '70%', '50%'];
const roadmapPointPositions = [200, 104, 280, 200];
const weeksPerView = 8;
const roadmapNodeColors = [
    { background: theme.doneColor, shadow: theme.doneShadow },
    { background: theme.activeColor, shadow: theme.activeShadow },
    { background: '#e6a22c', shadow: '#a96512' },
    { background: '#64748b', shadow: '#334155' },
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
        description: 'Kumpulan kata sesuai fokus kelas untuk dipelajari dalam konteks.',
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

function WeekNode({ week, index, selected, onSelect }) {
    const isSelected = selected?.id === week.id;
    const colors = roadmapNodeColors[index % roadmapNodeColors.length];

    return (
        <div className="absolute z-10" style={{ left: roadmapNodePositions[index % roadmapNodePositions.length], top: `${index * 156}px`, transform: 'translateX(-50%)' }}>
            <button
                type="button"
                onClick={() => onSelect(week)}
                aria-pressed={isSelected}
                aria-label={`Lihat rincian Minggu ${week.week_number}: ${week.title}`}
                className="group flex w-28 flex-col items-center gap-2 rounded-2xl px-1 pb-1 pt-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-focus/30"
            >
                <span
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-white transition duration-200 group-hover:-translate-y-1 group-hover:scale-105 dark:border-slate-900 ${isSelected ? 'ring-4 ring-brand-300 dark:ring-brand-500/40' : ''}`}
                    style={{ backgroundColor: colors.background, boxShadow: `0 7px 0 ${colors.shadow}` }}
                >
                    <AutoStoriesIcon sx={{ fontSize: 34 }} />
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${isSelected ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}>
                    Minggu {week.week_number}
                </span>
            </button>
        </div>
    );
}

export default function Roadmap({ roadmapOptions = [], selectedRoadmap = null, seo = {} }) {
    const [selectedWeekId, setSelectedWeekId] = useState(selectedRoadmap?.weeks?.[0]?.id ?? null);
    const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
    const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
    const [classSearch, setClassSearch] = useState('');
    const [weekPage, setWeekPage] = useState(0);
    const classMenuRef = useRef(null);
    const weeks = selectedRoadmap?.weeks ?? [];
    const weekPageCount = Math.max(1, Math.ceil(weeks.length / weeksPerView));
    const visibleWeeks = weeks.slice(weekPage * weeksPerView, (weekPage + 1) * weeksPerView);
    const filteredRoadmapOptions = roadmapOptions.filter((roadmap) => {
        const search = classSearch.trim().toLocaleLowerCase('id-ID');
        if (!search) return true;
        return `${roadmap.title} ${roadmap.level ?? ''}`.toLocaleLowerCase('id-ID').includes(search);
    });
    const selectedWeek = weeks.find((week) => week.id === selectedWeekId) ?? weeks[0] ?? null;
    const roadmapHeight = visibleWeeks.length > 0 ? Math.max(210, ((visibleWeeks.length - 1) * 156) + 130) : 0;
    const roadmapPoints = visibleWeeks
        .map((_, index) => `${roadmapPointPositions[index % roadmapPointPositions.length]},${40 + (index * 156)}`)
        .join(' ');

    useEffect(() => {
        setSelectedWeekId(selectedRoadmap?.weeks?.[0]?.id ?? null);
        setWeekPage(0);
        setClassSearch('');
    }, [selectedRoadmap?.slug]);

    useEffect(() => {
        if (!isClassMenuOpen) return undefined;

        const closeMenu = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'mousedown' && classMenuRef.current?.contains(event.target)) return;
            setIsClassMenuOpen(false);
        };

        document.addEventListener('mousedown', closeMenu);
        document.addEventListener('keydown', closeMenu);

        return () => {
            document.removeEventListener('mousedown', closeMenu);
            document.removeEventListener('keydown', closeMenu);
        };
    }, [isClassMenuOpen]);

    const changeRoadmap = (roadmap) => {
        setIsClassMenuOpen(false);
        if (roadmap.slug === selectedRoadmap?.slug) return;

        router.get(route('roadmap'), { kelas: roadmap.slug }, {
            only: ['selectedRoadmap'],
            preserveScroll: true,
            replace: true,
            onStart: () => setIsRoadmapLoading(true),
            onFinish: () => setIsRoadmapLoading(false),
        });
    };

    const changeWeekPage = (nextPage) => {
        const safePage = Math.min(Math.max(nextPage, 0), weekPageCount - 1);
        const firstWeek = weeks[safePage * weeksPerView];
        setWeekPage(safePage);
        setSelectedWeekId(firstWeek?.id ?? null);
    };

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
                                <SchoolIcon sx={{ fontSize: 16 }} /> Preview roadmap kelas
                            </p>
                            <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                                Roadmap Belajar Bahasa Jepang
                            </h1>
                            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-lg">
                                Satu jalur belajar untuk mengikuti materi kelas, memperkuat kosakata, berlatih dengan flashcard, dan mengevaluasi pemahaman lewat kuis.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-brand-600 px-5 text-sm font-black text-white shadow-lg shadow-brand-950/40 transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
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
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Preview Kurikulum</p>
                            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
                                {selectedRoadmap ? `Roadmap ${selectedRoadmap.title}` : 'Roadmap kelas belum tersedia'}
                            </h2>
                            <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                                {selectedRoadmap
                                    ? `${selectedRoadmap.weeks_count} Minggu · ${selectedRoadmap.days_count} Hari. Lihat susunan materi kelas, bukan status progres akunmu.`
                                    : 'Admin belum memublikasikan roadmap kelas yang dapat ditampilkan.'}
                            </p>
                        </div>

                        {roadmapOptions.length > 0 && (
                            <div ref={classMenuRef} className="relative z-30 mx-auto mt-8 max-w-xl">
                                <button
                                    type="button"
                                    onClick={() => setIsClassMenuOpen((open) => !open)}
                                    aria-expanded={isClassMenuOpen}
                                    aria-haspopup="listbox"
                                    className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                        <SchoolIcon sx={{ fontSize: 22 }} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Roadmap yang dilihat</span>
                                        <span className="mt-0.5 block truncate text-sm font-black text-slate-950 dark:text-white">{selectedRoadmap?.title}</span>
                                    </span>
                                    <span className="hidden shrink-0 text-xs font-black text-brand-700 dark:text-brand-300 sm:block">Ganti roadmap</span>
                                    <ExpandMoreIcon className={`shrink-0 text-slate-500 transition-transform ${isClassMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isClassMenuOpen && (
                                    <div role="listbox" aria-label="Pilih roadmap kelas" className="absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                        {roadmapOptions.length > 6 && (
                                            <label className="sticky top-0 z-10 mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                                                <SearchIcon className="shrink-0 text-slate-400" sx={{ fontSize: 19 }} />
                                                <span className="sr-only">Cari roadmap kelas</span>
                                                <input
                                                    type="search"
                                                    value={classSearch}
                                                    onChange={(event) => setClassSearch(event.target.value)}
                                                    placeholder="Cari kelas atau level"
                                                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:ring-0 dark:text-white"
                                                />
                                            </label>
                                        )}

                                        {filteredRoadmapOptions.map((roadmap) => {
                                            const active = roadmap.slug === selectedRoadmap?.slug;

                                            return (
                                                <button
                                                    key={roadmap.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => changeRoadmap(roadmap)}
                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${active ? 'bg-brand-50 dark:bg-brand-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                >
                                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                        {active ? <CheckIcon sx={{ fontSize: 18 }} /> : <AutoStoriesIcon sx={{ fontSize: 18 }} />}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{roadmap.title}</span>
                                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">{roadmap.weeks_count} Minggu · {roadmap.days_count} Hari{roadmap.level ? ` · ${roadmap.level}` : ''}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {filteredRoadmapOptions.length === 0 && (
                                            <p className="px-3 py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">Kelas tidak ditemukan.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {isRoadmapLoading && (
                            <div role="status" className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg dark:bg-white dark:text-slate-900">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                Menyiapkan roadmap kelas...
                            </div>
                        )}

                        {selectedRoadmap && weeks.length > 0 ? (
                            <>
                                {weekPageCount > 1 && (
                                    <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => changeWeekPage(weekPage - 1)}
                                            disabled={weekPage === 0}
                                            aria-label="Lihat kelompok Minggu sebelumnya"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                            <ChevronLeftIcon sx={{ fontSize: 20 }} />
                                        </button>
                                        <p className="text-center text-xs font-black text-slate-700 dark:text-slate-200">
                                            Minggu {(weekPage * weeksPerView) + 1}–{Math.min((weekPage + 1) * weeksPerView, weeks.length)} dari {weeks.length}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => changeWeekPage(weekPage + 1)}
                                            disabled={weekPage >= weekPageCount - 1}
                                            aria-label="Lihat kelompok Minggu berikutnya"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                            <ChevronRightIcon sx={{ fontSize: 20 }} />
                                        </button>
                                    </div>
                                )}

                                <div className="relative mx-auto mt-10 max-w-md" style={{ height: `${roadmapHeight}px` }}>
                                    {visibleWeeks.length > 1 && (
                                        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 400 ${roadmapHeight}`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
                                            <polyline points={roadmapPoints} fill="none" stroke={theme.pathGrad[0]} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 10" opacity="0.76" />
                                            <polyline points={roadmapPoints} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 10" opacity="0.75" />
                                        </svg>
                                    )}
                                    {visibleWeeks.map((week, index) => (
                                        <WeekNode key={week.id} week={week} index={index} selected={selectedWeek} onSelect={(item) => setSelectedWeekId(item.id)} />
                                    ))}
                                </div>

                                {selectedWeek && (
                                    <div className="mx-auto mt-3 max-w-2xl rounded-2xl border border-brand-100 bg-brand-50 p-5 shadow-sm dark:border-brand-900/40 dark:bg-brand-950/20 sm:p-6">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">Minggu {selectedWeek.week_number}</p>
                                            <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{selectedWeek.title}</h3>
                                            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
                                                {selectedWeek.description || 'Ringkasan materi untuk Minggu ini sedang disiapkan.'}
                                            </p>
                                        </div>

                                        <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                            {selectedWeek.days.length > 0 ? selectedWeek.days.map((day) => (
                                                <article key={day.id} className="rounded-xl border border-white bg-white/80 p-3.5 text-left dark:border-slate-700 dark:bg-slate-800/80">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">Hari {day.day_number}</p>
                                                    <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">{day.title || `Materi Hari ${day.day_number}`}</h4>
                                                    {day.description && <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{day.description}</p>}
                                                </article>
                                            )) : (
                                                <p className="col-span-full rounded-xl border border-dashed border-brand-200 bg-white/60 px-4 py-5 text-center text-sm font-semibold text-slate-600 dark:border-brand-800 dark:bg-slate-800/50 dark:text-slate-300">Rincian Hari untuk Minggu ini belum dipublikasikan.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : roadmapOptions.length > 0 ? (
                            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
                                <h3 className="text-lg font-black text-slate-950 dark:text-white">Week belum tersedia</h3>
                                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Pilih roadmap lain atau kembali setelah admin memublikasikan susunan kelas.</p>
                            </div>
                        ) : (
                            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
                                <h3 className="text-lg font-black text-slate-950 dark:text-white">Roadmap belum tersedia</h3>
                                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Pilihan roadmap akan muncul setelah kelas dan Week dipublikasikan.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-[#f7f8f8] py-16 dark:bg-slate-950 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Isi Modul Mingguan</p>
                                <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white">Materi dan latihan tidak berjalan sendiri-sendiri.</h2>
                                <p className="mt-4 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">Setiap modul dirancang sebagai jalur belajar: pahami dulu, ulangi seperlunya, lalu uji pemahamanmu.</p>
                                <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center gap-1 text-sm font-black text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
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
                                <h2 className="mt-3 text-3xl font-black leading-tight">Belajar dengan jalur yang mudah diikuti.</h2>
                                <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300">Masuk kelas, lihat roadmap, buka materi pendukung, dan lanjutkan latihan dari titik terakhir.</p>
                            </div>
                            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl lg:mt-0">
                                <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-800 px-4 py-3">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                        <span className="ml-3 truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{selectedRoadmap?.title || 'Roadmap kelas mingguan'}</span>
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

                <section className="relative overflow-hidden bg-brand-600 px-5 py-16 text-center text-white sm:px-8 sm:py-20">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_56px)]" />
                    <div className="relative mx-auto max-w-2xl">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-amber-200"><FlashOnIcon sx={{ fontSize: 28 }} /></span>
                        <h2 className="mt-5 text-3xl font-black">Siap memilih roadmap belajar?</h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-brand-100">Lihat pilihan kelas dan harga sebelum memulai perjalanan belajarmu.</p>
                        <Link href="/pricing" className="mt-7 inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-white px-5 text-sm font-black text-brand-700 shadow-lg transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                            Lihat Kelas dan Harga <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Link>
                    </div>
                </section>
            </main>

            <GuestFooter />
        </>
    );
}
