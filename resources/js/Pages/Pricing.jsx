import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import Badge from '@/Components/UI/Badge';
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

const formatDuration = (days) => {
  if (!days) return 'Mengikuti ketentuan kelas';
  if (days >= 365) return `${Math.round(days / 365)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
};

function ClassThumbnail({ program }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="aspect-[16/9] overflow-hidden bg-gray-100">
      {program.thumbnail_url && !failed ? (
        <img
          src={program.thumbnail_url}
          alt={program.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-900 text-white">
          <SchoolIcon sx={{ fontSize: 48 }} />
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, auth }) {
  const isMentored = plan.scope_type === 'kloter';

  return (
    <div className="border-t border-gray-100 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-gray-900">{plan.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isMentored
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
            }`}>
              {plan.scope_label}
            </span>
          </div>
          {plan.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{plan.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-black text-gray-950">{plan.price_formatted}</p>
          <p className="text-[11px] font-semibold text-gray-500">{formatDuration(plan.duration_days)}</p>
        </div>
      </div>

      <Button
        href={auth?.user ? route('user.kelas.index', { plan: plan.id }) : route('register')}
        className="mt-3 min-h-10 w-full"
      >
        {auth?.user ? 'Pilih paket ini' : 'Daftar dan pilih kelas'}
      </Button>
    </div>
  );
}

function ClassContents({ modules = [] }) {
  if (modules.length === 0) {
    return <p className="text-sm text-gray-500">Materi preview sedang disiapkan.</p>;
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-gray-900">
        <span>Lihat isi kelas ({modules.length} Week)</span>
        <span className="text-lg text-red-600 group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
        {modules.map((module) => (
          <div key={module.id} className="py-3">
            <p className="text-xs font-black uppercase text-red-600">Week {module.week_number}</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{module.title}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
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
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <ClassThumbnail program={program} />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
          {program.level && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{program.level}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <MenuBookIcon sx={{ fontSize: 16 }} />
            {program.weeks_count || 0} Week
          </span>
          {program.instructor_name && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <GroupsIcon sx={{ fontSize: 16 }} />
              <span className="truncate">{program.instructor_name}</span>
            </span>
          )}
        </div>

        <h2 className="mt-3 text-lg font-black leading-snug text-gray-950 sm:text-xl">
          {program.title}
        </h2>
        {program.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">{program.description}</p>
        )}

        <Button
          variant="outline"
          href={route('public.classes.show', program.slug)}
          className="mt-4 w-full"
        >
          Lihat detail kelas
        </Button>

        <div className="mt-5 border-t border-gray-200 pt-5">
          <ClassContents modules={program.preview_modules} />
        </div>

        <div className="mt-5 border-t border-gray-200 pt-4">
          {plans.length > 0 ? (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase text-gray-500">Harga mulai</p>
                  <p className="mt-1 text-xl font-black text-gray-950">{cheapestPlan.price_formatted}</p>
                </div>
                <span className="text-right text-xs font-bold text-red-600">
                  {plans.length} pilihan paket
                  <span className="ml-2 inline-block text-lg group-open:rotate-45">+</span>
                </span>
              </summary>
              <div className="mt-4 border-t border-gray-100 pt-4">
                {plans.map((plan) => (
                  <PlanRow key={plan.id} plan={plan} auth={auth} />
                ))}
              </div>
            </details>
          ) : (
            <div>
              <p className="text-sm font-bold text-gray-900">Harga belum tersedia</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Kelas tetap dapat dilihat sebagai preview sambil menunggu paket dibuka.
              </p>
              <Button
                variant="outline"
                href={auth?.user ? route('user.kelas.index') : route('register')}
                className="mt-4 w-full sm:w-auto"
              >
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

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      <main>
        <section className="border-b border-gray-100 bg-white px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
          <Badge color="red" className="mb-4">Kelas Japanlingo</Badge>
          <h1 className="mx-auto max-w-3xl text-3xl font-black text-gray-950 sm:text-4xl lg:text-5xl">
            Pilih kelas dan cara belajar yang sesuai
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
            Bandingkan materi, durasi, Kelas Mandiri, dan Kelas Mentor sebelum menentukan pilihan.
          </p>
        </section>

        <section className="bg-gray-50 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-red-600">Katalog kelas</p>
                <h2 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">Kelas yang tersedia</h2>
              </div>
              <p className="text-sm font-semibold text-gray-500">{programs.length} kelas dapat dipilih</p>
            </div>

            {programs.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {programs.map((program) => (
                  <ClassCard key={program.id} program={program} auth={auth} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <SchoolIcon className="text-gray-400" sx={{ fontSize: 40 }} />
                <h2 className="mt-4 text-lg font-black text-gray-900">Belum ada kelas publik</h2>
                <p className="mt-2 text-sm text-gray-500">Kelas akan tampil setelah statusnya dipublikasikan.</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 border border-gray-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="font-black text-gray-900">Belum siap membeli kelas?</p>
                <p className="mt-1 text-sm text-gray-500">Buat akun dan coba materi preview yang tersedia.</p>
              </div>
              <Button
                variant="outline"
                href={auth?.user ? route('user.kelas.index') : route('register')}
                className="w-full sm:w-auto"
              >
                {auth?.user ? 'Buka katalog saya' : 'Mulai gratis'}
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <AccessTimeIcon className="text-red-600" sx={{ fontSize: 30 }} />
              <h2 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl">
                Pertanyaan yang sering diajukan
              </h2>
            </div>

            <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <div key={faq.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-5 text-left"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-black text-gray-900 sm:text-base">{faq.name}</span>
                      <span className="shrink-0 text-xl text-red-600">{isOpen ? '-' : '+'}</span>
                    </button>
                    {isOpen && <p className="pb-5 text-sm leading-6 text-gray-500">{faq.desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
