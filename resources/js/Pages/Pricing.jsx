import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { motion, useReducedMotion } from 'framer-motion';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import { SeigaihaBand, ToriiIcon } from '@/Components/JapaneseIcons';
import Button from '@/Components/UI/Button';
import Footer from '@/Components/Layout/GuestFooter';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import FallEffect from '@/Components/theme/FallEffect';
import SeoHead from '@/Components/SEO/SeoHead';

const faqs = [
  {
    name: 'Apa perbedaan Kelas Mandiri dan Kelas Mentor?',
    desc: 'Kelas Mandiri aktif otomatis setelah pembayaran berhasil. Kelas Mentor mengikuti kloter dan baru aktif setelah mentor menyetujui pendaftaran.',
  },
  {
    name: 'Apakah saya bisa mencoba kelas sebelum membeli?',
    desc: 'Bisa. Buat akun gratis untuk membuka materi preview yang tersedia pada masing-masing kelas.',
  },
  {
    name: 'Kapan masa akses mulai dihitung?',
    desc: 'Kelas Mandiri dimulai setelah pembayaran berhasil. Kelas Mentor dimulai setelah pendaftaran disetujui mentor.',
  },
  {
    name: 'Apakah access key masih bisa digunakan?',
    desc: 'Bisa. Access key yang terkait kelas dapat dimasukkan melalui menu Profil.',
  },
];

const comparisons = [
  { label: 'Aktivasi akses', independent: 'Otomatis setelah pembayaran', mentored: 'Setelah persetujuan kloter' },
  { label: 'Jadwal belajar', independent: 'Fleksibel mengikuti ritme siswa', mentored: 'Mengikuti jadwal kelas' },
  { label: 'Pendampingan', independent: 'Roadmap dan evaluasi mandiri', mentored: 'Roadmap, mentor, dan ruang kelas' },
];

const formatDuration = (days) => {
  if (!days) return 'Mengikuti ketentuan kelas';
  if (days >= 365) return `${Math.round(days / 365)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
};

function ClassThumbnail({ program }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="aspect-[16/8] overflow-hidden bg-[#102D29]">
      {program.thumbnail_url && !failed ? (
        <img
          src={program.thumbnail_url}
          alt={program.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-brand-300">
          <SchoolIcon sx={{ fontSize: 48 }} />
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, auth }) {
  const isMentored = plan.scope_type === 'kloter';

  return (
    <div className="border-t border-white/10 py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-white">{plan.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${isMentored ? 'border-achievement-400/[0.35] bg-achievement-400/10 text-achievement-100' : 'border-brand-300/[0.35] bg-brand-300/10 text-brand-300'}`}>
              {plan.scope_label}
            </span>
          </div>
          {plan.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/[0.55]">{plan.description}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-black text-white">{plan.price_formatted}</p>
          <p className="text-[11px] font-semibold text-white/50">{formatDuration(plan.duration_days)}</p>
        </div>
      </div>

      <Button href={auth?.user ? route('user.kelas.index', { plan: plan.id }) : route('register')} className="mt-4 min-h-10 w-full !rounded-lg">
        {auth?.user ? 'Pilih paket ini' : 'Daftar dan pilih kelas'}
      </Button>
    </div>
  );
}

function ClassContents({ modules = [] }) {
  if (modules.length === 0) {
    return <p className="text-sm text-white/[0.55]">Materi preview sedang disiapkan.</p>;
  }

  return (
    <details className="group/details">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
        <span>Lihat isi kelas ({modules.length} Week)</span>
        <span className="text-lg text-brand-300 transition-transform group-open/details:rotate-45">+</span>
      </summary>
      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {modules.map((module) => (
          <div key={module.id} className="py-3">
            <p className="text-xs font-black uppercase text-brand-300">Week {module.week_number}</p>
            <p className="mt-1 text-sm font-bold text-white">{module.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/50">
              {module.presentations_count || 0} PPT
              {' · '}{module.flashcards_count || 0} set flashcard
              {' · '}{module.quizzes_count || 0} kuis
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function ClassCard({ program, auth }) {
  const plans = program.payment_plans || [];
  const cheapestPlan = plans[0];

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden border border-white/10 bg-[#183B37] transition-colors duration-300 hover:border-brand-300/[0.45]">
      <ClassThumbnail program={program} />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-white/[0.55]">
          {program.level && <span className="rounded-full border border-brand-300/30 bg-brand-300/10 px-2.5 py-1 text-brand-300">{program.level}</span>}
          <span className="inline-flex items-center gap-1"><MenuBookIcon sx={{ fontSize: 16 }} />{program.weeks_count || 0} Week</span>
          {program.instructor_name && <span className="inline-flex min-w-0 items-center gap-1"><GroupsIcon sx={{ fontSize: 16 }} /><span className="truncate">{program.instructor_name}</span></span>}
        </div>

        <h2 className="mt-4 text-xl font-black leading-snug text-white">{program.title}</h2>
        {program.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/[0.58]">{program.description}</p>}

        <Button variant="outline" href={route('public.classes.show', program.slug)} className="mt-5 w-full !border-white/20 !text-white hover:!border-brand-300 hover:!bg-white/[0.06] hover:!text-brand-300">
          Lihat detail kelas
        </Button>

        <div className="mt-6 border-t border-white/10 pt-5"><ClassContents modules={program.preview_modules} /></div>

        <div className="mt-6 border-t border-white/10 pt-5">
          {plans.length > 0 ? (
            <details className="group/plans">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              <div><p className="text-[11px] font-black uppercase text-white/[0.45]">Harga mulai</p><p className="mt-1 text-2xl font-black text-white">{cheapestPlan.price_formatted}</p></div>
                <span className="text-right text-xs font-bold text-brand-300">{plans.length} pilihan paket<span className="ml-2 inline-block text-lg transition-transform group-open/plans:rotate-45">+</span></span>
              </summary>
              <div className="mt-5 border-t border-white/10 pt-5">{plans.map((plan) => <PlanRow key={plan.id} plan={plan} auth={auth} />)}</div>
            </details>
          ) : (
            <div>
              <p className="text-sm font-bold text-white">Harga belum tersedia</p>
              <p className="mt-1 text-sm leading-6 text-white/[0.55]">Kelas tetap dapat dilihat sebagai preview sambil menunggu paket dibuka.</p>
              <Button variant="outline" href={auth?.user ? route('user.kelas.index') : route('register')} className="mt-4 w-full !border-white/20 !text-white sm:w-auto">
                {auth?.user ? 'Buka preview kelas' : 'Daftar untuk preview'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Pricing({ programs = [], seo = {} }) {
  const { auth } = usePage().props;
  const [openFaq, setOpenFaq] = useState(null);
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.14 },
      transition: { duration: 0.5, ease: 'easeOut' },
    };

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      <main className="overflow-hidden bg-white">
        <section className="relative border-b border-gray-100 bg-[#F7FAF8] px-5 py-16 sm:px-8 sm:py-20 lg:px-20 lg:py-24">
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-black uppercase text-brand-700"><ToriiIcon className="h-4 w-4" /> Kelas TOKU-UP</p>
            <h1 className="mx-auto mt-4 max-w-3xl break-words text-[2rem] font-black leading-tight text-ink-900 sm:text-4xl lg:text-5xl">Pilih kelas dan cara belajar yang sesuai.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base">Bandingkan materi, masa akses, Kelas Mandiri, dan Kelas Mentor sebelum menentukan pilihan.</p>
            <div className="mx-auto mt-8 grid min-w-0 max-w-xl grid-cols-3 divide-x divide-gray-200 border-y border-gray-200 py-4 text-left">
              {[
                ['Kelas', programs.length],
                ['Model belajar', '2 pilihan'],
                ['Preview', 'Tersedia'],
              ].map(([label, value]) => <div key={label} className="min-w-0 px-1 text-center sm:px-3"><p className="break-words text-[9px] font-bold uppercase text-ink-600 sm:text-[10px]">{label}</p><p className="mt-1 break-words text-xs font-black text-ink-900 sm:text-base">{value}</p></div>)}
            </div>
          </div>
        </section>

        <SeigaihaBand />

        <motion.section {...reveal} className="bg-[#102F2B] px-5 py-16 text-white sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase text-brand-300">Katalog kelas</p><h2 className="mt-2 text-3xl font-black">Kelas yang tersedia</h2></div>
              <p className="text-sm font-semibold text-white/[0.55]">{programs.length} kelas dapat dipilih</p>
            </div>

            {programs.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <ClassCard key={program.id} program={program} auth={auth} />)}</div>
            ) : (
              <div className="border border-dashed border-white/20 px-6 py-16 text-center"><SchoolIcon className="text-brand-300" sx={{ fontSize: 40 }} /><h2 className="mt-4 text-lg font-black">Belum ada kelas publik</h2><p className="mt-2 text-sm text-white/[0.55]">Kelas akan tampil setelah statusnya dipublikasikan.</p></div>
            )}

            <div className="mt-8 flex flex-col gap-4 border-t border-white/[0.12] pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-black">Belum siap membeli kelas?</p><p className="mt-1 text-sm text-white/[0.55]">Buat akun dan coba materi preview yang tersedia.</p></div>
              <Button href={auth?.user ? route('user.kelas.index') : route('register')} className="w-full !rounded-lg !bg-[#D9FFB8] !text-ink-950 hover:!bg-white sm:w-auto">{auth?.user ? 'Buka katalog saya' : 'Mulai gratis'}</Button>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-white px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 border-b border-gray-200 pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end">
              <div><p className="text-xs font-black uppercase text-learning-700">Bandingkan akses</p><h2 className="mt-3 text-3xl font-black text-ink-900">Mandiri atau bersama mentor?</h2></div>
              <p className="max-w-xl text-sm leading-7 text-ink-600 md:justify-self-end">Materi inti tetap terhubung dalam roadmap. Perbedaannya berada pada aktivasi, ritme belajar, dan pendampingan.</p>
            </div>

            <div className="mt-8 overflow-x-auto">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-gray-200 pb-4 text-sm"><span className="font-bold text-ink-600">Perbandingan</span><span className="font-black text-brand-700">Kelas Mandiri</span><span className="font-black text-learning-700">Kelas Mentor</span></div>
                {comparisons.map((row) => (
                  <div key={row.label} className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-gray-100 py-5 text-sm">
                    <span className="font-black text-ink-900">{row.label}</span>
                    <span className="flex items-start gap-2 pr-6 leading-6 text-ink-600"><CheckIcon sx={{ fontSize: 17 }} className="mt-0.5 shrink-0 text-brand-600" />{row.independent}</span>
                    <span className="flex items-start gap-2 leading-6 text-ink-600"><CheckIcon sx={{ fontSize: 17 }} className="mt-0.5 shrink-0 text-learning-600" />{row.mentored}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-[#F7FAF8] px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <AccessTimeIcon className="text-brand-600" sx={{ fontSize: 30 }} />
              <h2 className="mt-4 text-3xl font-black text-ink-900">Pertanyaan sebelum memilih kelas.</h2>
              <p className="mt-4 text-sm leading-7 text-ink-600">Informasi singkat mengenai aktivasi, preview, masa akses, dan access key.</p>
            </div>
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.name}>
                    <button type="button" className="flex w-full items-center justify-between gap-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600" onClick={() => setOpenFaq(isOpen ? null : index)} aria-expanded={isOpen}>
                      <span className="text-sm font-black text-ink-900 sm:text-base">{faq.name}</span>
                      <span className="shrink-0 text-xl text-brand-700">{isOpen ? '-' : '+'}</span>
                    </button>
                    {isOpen && <p className="max-w-2xl pb-5 text-sm leading-7 text-ink-600">{faq.desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </>
  );
}
