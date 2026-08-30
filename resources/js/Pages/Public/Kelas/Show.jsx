import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import GroupsIcon from '@mui/icons-material/Groups';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import Button from '@/Components/UI/Button';
import GuestFooter from '@/Components/Layout/GuestFooter';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import FallEffect from '@/Components/theme/FallEffect';
import SeoHead from '@/Components/SEO/SeoHead';

const formatDuration = (days) => {
  if (!days) return 'Mengikuti ketentuan kelas';
  if (days >= 365) return `${Math.round(days / 365)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
};

function ClassImage({ program }) {
  const [failed, setFailed] = useState(false);

  if (!program.thumbnail_url || failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-gray-900 text-white">
        <SchoolIcon sx={{ fontSize: 64 }} />
      </div>
    );
  }

  return (
    <img
      src={program.thumbnail_url}
      alt={`Kelas ${program.title}`}
      className="aspect-video w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function PlanOption({ plan, auth }) {
  const isMentored = plan.scope_type === 'kloter';

  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isMentored
          ? 'bg-amber-50 text-amber-700'
          : 'bg-emerald-50 text-emerald-700'
        }`}>
          {plan.scope_label}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">
          <AccessTimeIcon sx={{ fontSize: 16 }} /> {formatDuration(plan.duration_days)}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-black text-gray-950">{plan.name}</h3>
      {plan.description && <p className="mt-2 text-sm leading-6 text-gray-600">{plan.description}</p>}
      <p className="mt-5 text-3xl font-black text-gray-950">{plan.price_formatted}</p>

      {(plan.features || []).length > 0 && (
        <ul className="mt-5 space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-gray-600">
              <CheckIcon className="mt-1 shrink-0 text-emerald-600" sx={{ fontSize: 17 }} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        href={auth?.user ? route('user.kelas.index', { plan: plan.id }) : route('register')}
        className="mt-auto w-full"
      >
        {auth?.user ? 'Pilih paket ini' : 'Daftar dan pilih kelas'}
      </Button>
    </article>
  );
}

export default function PublicClassShow({ program, seo = {} }) {
  const { auth } = usePage().props;
  const modules = program.preview_modules || [];
  const plans = program.payment_plans || [];

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      <main className="bg-white text-gray-950">
        <section className="border-b border-gray-200 bg-gray-50 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)] lg:items-center">
            <div>
              <Link href={route('pricing')} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800">
                <ArrowBackIcon sx={{ fontSize: 18 }} /> Kembali ke daftar kelas
              </Link>

              <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-black">
                {program.curriculum_track && <span className="rounded-full bg-gray-900 px-3 py-1.5 text-white">{program.curriculum_track}</span>}
                {program.level && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-700">{program.level}</span>}
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600">
                  <MenuBookIcon sx={{ fontSize: 16 }} /> {program.weeks_count || 0} Week
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{program.title}</h1>
              {program.description && <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">{program.description}</p>}
              {program.instructor_name && (
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                  <GroupsIcon sx={{ fontSize: 20 }} className="text-brand-600" /> Pengajar: {program.instructor_name}
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <ClassImage program={program} />
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase text-brand-600">Isi kelas</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Roadmap yang akan dipelajari</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">Materi dibuka mengikuti aturan kelas dan progres belajar masing-masing peserta.</p>
            </div>

            {modules.length > 0 ? (
              <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
                {modules.map((module) => (
                  <article key={module.id} className="grid gap-3 py-5 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                    <p className="text-xs font-black uppercase text-brand-600">Week {module.week_number}</p>
                    <div>
                      <h3 className="text-base font-black text-gray-950">{module.title}</h3>
                      {module.description && <p className="mt-1 text-sm leading-6 text-gray-600">{module.description}</p>}
                    </div>
                    <p className="text-xs font-bold text-gray-500 sm:text-right">
                      {module.presentations_count || 0} PPT · {module.flashcards_count || 0} flashcard · {module.quizzes_count || 0} kuis
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                Preview roadmap sedang disiapkan.
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase text-brand-600">Pilihan akses</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Pilih cara belajar</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">Kelas mandiri aktif setelah pembayaran berhasil. Kelas mentor mengikuti jadwal dan persetujuan kloter.</p>
            </div>

            {plans.length > 0 ? (
              <div className={`mt-8 grid gap-4 ${plans.length > 1 ? 'md:grid-cols-2' : 'max-w-xl'}`}>
                {plans.map((plan) => <PlanOption key={plan.id} plan={plan} auth={auth} />)}
              </div>
            ) : (
              <div className="mt-8 border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <h3 className="font-black text-gray-950">Paket kelas sedang disiapkan</h3>
                <p className="mt-2 text-sm text-gray-600">Daftar untuk melihat preview yang tersedia.</p>
                <Button href={auth?.user ? route('user.kelas.index') : route('register')} className="mt-5">
                  {auth?.user ? 'Buka katalog saya' : 'Mulai gratis'}
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <GuestFooter />
    </>
  );
}
