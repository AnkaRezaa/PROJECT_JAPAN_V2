import { Link } from '@inertiajs/react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SchoolIcon from '@mui/icons-material/School';
import GuestFooter from '@/Components/Layout/GuestFooter';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import FallEffect from '@/Components/theme/FallEffect';
import guru1 from '@/../Images/bahasa-jepang-guru-1.jpg';
import guru2 from '@/../Images/bahasa-jepangnya-guru.jpg';
import studentImage from '@/../Images/japannese_student.jpg';
import MountFujiBg from '../../Images/Mount-Fuji-New.jpg';
import SeoHead from '@/Components/SEO/SeoHead';

// Ganti data sementara ini saat profil pengajar Japanlingo sudah siap dipublikasikan.
const teamMembers = [
    {
        name: 'Sensei Aiko',
        role: 'Pengajar Utama JLPT N3',
        description: 'Memandu arah modul mingguan dan evaluasi pembelajaran kelas.',
        image: guru1,
    },
    {
        name: 'Sensei Ren',
        role: 'Pendamping Kosakata',
        description: 'Menyiapkan latihan kosakata dan flashcard untuk sesi pengulangan.',
        image: guru2,
    },
    {
        name: 'Sensei Hana',
        role: 'Fasilitator Kelas',
        description: 'Mendampingi materi pendukung, kuis, dan progres peserta kelas.',
        image: guru1,
    },
];

const learningPoints = [
    {
        title: 'Kelas yang terarah',
        description: 'Fokus belajar mengikuti materi yang disiapkan untuk kelas.',
    },
    {
        title: 'Latihan yang dekat',
        description: 'Peserta dapat kembali ke latihan saat ingin memperkuat pemahaman.',
    },
    {
        title: 'Progres yang terlihat',
        description: 'Hasil latihan dan XP membantu peserta melihat perkembangan belajar.',
    },
];

export default function About({ seo = {} }) {
    return (
        <>
            <FallEffect />
            <SeoHead seo={seo} />
            <GuestNavbar heroTone="dark" />

            <main className="overflow-hidden bg-[#f7f8f8] text-slate-900 dark:bg-slate-950 dark:text-white">
                <section className="relative min-h-[570px] overflow-hidden bg-slate-950">
                    <img src={MountFujiBg} alt="Gunung Fuji" className="absolute inset-0 h-full w-full object-cover object-center opacity-80" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.93)_0%,rgba(2,6,23,0.74)_48%,rgba(2,6,23,0.28)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-[#f7f8f8] dark:to-slate-950" />

                    <div className="relative mx-auto flex min-h-[570px] max-w-7xl items-center px-5 py-20 sm:px-8 lg:px-10">
                        <div className="max-w-2xl">
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200 backdrop-blur-sm">
                                <SchoolIcon sx={{ fontSize: 16 }} /> Belajar JLPT N3
                            </p>
                            <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                                Kelas N3 yang memberi arah belajar lebih jelas.
                            </h1>
                            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-lg">
                                Japanlingo menyatukan roadmap mingguan, presentasi kelas, kosakata, flashcard, dan kuis dalam satu pengalaman belajar JLPT N3.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-950/40 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Lihat Kelas <ChevronRightIcon sx={{ fontSize: 18 }} />
                                </Link>
                                <Link href="/roadmap" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                                    Lihat Roadmap
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900 sm:py-24">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,0.10),transparent_66%)] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(244,63,94,0.16),transparent_66%)]" />
                    <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-10">
                        <div className="max-w-lg">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Tentang Japanlingo</p>
                            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">Kelas N3 yang terarah, dari materi sampai latihan.</h2>
                            <p className="mt-5 text-base font-medium leading-7 text-slate-700 dark:text-slate-200">
                                Japanlingo menempatkan materi pengajar dan latihan dalam satu kelas, sehingga peserta tidak perlu menebak langkah belajar berikutnya.
                            </p>
                            <div className="mt-7 border-l-2 border-red-500 pl-4 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
                                Dibuat khusus untuk pembelajaran JLPT N3 berbasis kelas.
                            </div>
                        </div>

                        <figure className="relative mx-auto w-full max-w-lg">
                            <div aria-hidden="true" className="absolute -bottom-5 -left-5 h-40 w-40 rounded-[2rem] bg-red-600" />
                            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-2xl dark:border-slate-700">
                                <img src={studentImage} alt="Peserta belajar bahasa Jepang" className="h-72 w-full object-cover object-center sm:h-80" />
                                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                            </div>
                        </figure>
                    </div>
                </section>

                <section id="cara-belajar" className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-14">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_56px)]" />
                    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                        <div className="relative grid gap-8 md:grid-cols-[0.76fr_1.24fr] md:items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Cara Belajar</p>
                                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Belajar bersama kelas, tetap bisa diulang mandiri.</h2>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-3 sm:gap-0">
                                {learningPoints.map((point, index) => (
                                    <article key={point.title} className={`sm:px-6 ${index > 0 ? 'sm:border-l sm:border-white/15' : ''}`}>
                                        <h3 className="text-base font-black text-white">{point.title}</h3>
                                        <p className="mt-2 text-sm font-medium leading-6 text-slate-300">{point.description}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#f7f8f8] py-16 dark:bg-slate-950 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-7 dark:border-slate-800 sm:flex-row sm:items-end">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Tim Pengajar</p>
                                <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white">Pengajar yang mendampingi kelas N3.</h2>
                            </div>
                            <p className="max-w-sm text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Setiap peran membantu menjaga materi dan latihan kelas tetap terarah.</p>
                        </div>

                        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {teamMembers.map((member) => (
                                <article key={member.name} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                                    <div className="relative overflow-hidden">
                                        <img src={member.image} alt={member.name} className="h-60 w-full object-cover object-center transition duration-500 group-hover:scale-105" />
                                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/65 to-transparent" />
                                        <p className="absolute bottom-4 left-5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">{member.role}</p>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-xl font-black text-slate-950 dark:text-white">{member.name}</h3>
                                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{member.description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="relative overflow-hidden bg-red-600 px-5 py-16 text-center text-white sm:px-8 sm:py-20">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_56px),repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_56px)]" />
                    <div className="relative mx-auto max-w-2xl">
                        <h2 className="text-3xl font-black">Siap melihat kelas JLPT N3?</h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-red-100">Pilih kelas, lihat roadmap, lalu mulai dari modul yang tersedia untukmu.</p>
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
