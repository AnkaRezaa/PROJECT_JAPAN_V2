import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HeadsetIcon from '@mui/icons-material/Headset';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import { SakuraIcon, ScrollIcon, SeigaihaBand, ToriiIcon } from '@/Components/JapaneseIcons';
import Button from '@/Components/UI/Button';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import Footer from '@/Components/Layout/GuestFooter';
import WhatsAppContact from '@/Components/Marketing/WhatsAppContact';
import PromoPopup from '@/Components/Marketing/PromoPopup';
import FallEffect from '@/Components/theme/FallEffect';
import SeoHead from '@/Components/SEO/SeoHead';
import heroStaticImage from '@/../Images/Mount-Fuji-New.jpg';

const learningSteps = [
  {
    number: '01',
    title: 'Pilih kelas',
    description: 'Mulai dari kelas yang sesuai dengan target dan cara belajar Anda.',
    icon: <AssignmentIcon sx={{ fontSize: 20 }} />,
  },
  {
    number: '02',
    title: 'Ikuti roadmap',
    description: 'PPT, kosakata, flashcard, dan kuis tersusun dalam satu perjalanan.',
    icon: <ListAltIcon sx={{ fontSize: 20 }} />,
  },
  {
    number: '03',
    title: 'Ulangi yang belum kuat',
    description: 'Materi yang perlu diperkuat kembali muncul melalui repetisi belajar.',
    icon: <BoltIcon sx={{ fontSize: 20 }} />,
  },
  {
    number: '04',
    title: 'Lihat perkembangan',
    description: 'Progress, XP, streak, dan aktivitas tersimpan dalam satu akun.',
    icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,
  },
];

const roadmapWeeks = [
  { week: 'W1', title: 'Fondasi N3', detail: 'Pengenalan kelas, kosakata dasar, dan kuis pembuka.', state: 'Preview tersedia', tone: 'brand' },
  { week: 'W2', title: 'Grammar & Kotoba', detail: 'Pola kalimat dan repetisi kosakata harian.', state: 'Materi lanjutan', tone: 'blue' },
  { week: 'W3', title: 'Kanji & Bacaan', detail: 'Kanji, contoh kalimat, dan latihan membaca.', state: 'Materi lanjutan', tone: 'amber' },
  { week: 'W4', title: 'Review & Kuis', detail: 'Review terarah dan evaluasi progress.', state: 'Evaluasi', tone: 'ink' },
];

const benefits = [
  {
    icon: <VideogameAssetIcon sx={{ fontSize: 22 }} />,
    title: 'Latihan yang terasa progresif',
    description: 'Kuis, XP, streak, dan badge memberi penanda perkembangan tanpa mengganggu fokus belajar.',
    tone: 'bg-brand-50 text-brand-700',
  },
  {
    icon: <HeadsetIcon sx={{ fontSize: 22 }} />,
    title: 'Materi saling terhubung',
    description: 'Kosakata, audio, flashcard, presentasi, dan kuis tetap berada dalam konteks minggu yang sama.',
    tone: 'bg-learning-50 text-learning-700',
  },
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 22 }} />,
    title: 'Urutan belajar lebih jelas',
    description: 'Roadmap menunjukkan apa yang sudah selesai, sedang dipelajari, dan perlu dikerjakan berikutnya.',
    tone: 'bg-achievement-50 text-achievement-700',
  },
];

const formatDuration = (days) => {
  if (!days) return 'Mengikuti ketentuan kelas';
  if (days >= 365) return `${Math.round(days / 365)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
};

const weekTone = {
  brand: 'border-brand-300 bg-brand-50 text-brand-700',
  blue: 'border-learning-200 bg-learning-50 text-learning-700',
  amber: 'border-achievement-100 bg-achievement-50 text-achievement-700',
  ink: 'border-ink-700 bg-ink-900 text-white',
};

export default function LandingPage({ programs = [], seo = {}, activePopup = null }) {
  const reduceMotion = useReducedMotion();
  const publicPlans = programs.flatMap((program) => (program.payment_plans || []).map((plan) => ({
    ...plan,
    programId: program.id,
    programTitle: program.title,
  })));
  const reveal = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 22 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.16 },
      transition: { duration: 0.55, ease: 'easeOut' },
    };

  React.useEffect(() => {
    const wasDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.remove('dark');
    return () => {
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  const scrollToDemo = () => {
    document.getElementById('demo-belajar')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      <main className="overflow-hidden bg-white">
        <section className="relative isolate bg-white px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[720px] lg:px-20 lg:py-24">
          <img
            src={heroStaticImage}
            alt="Pemandangan Gunung Fuji dan pagoda Jepang"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[42%_center] sm:object-center"
          />
          <div className="absolute inset-0 -z-10 bg-white/55 sm:bg-white/45" />

          <div className="mx-auto grid min-w-0 max-w-7xl items-center gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-20">
            <div className="relative z-10 min-w-0 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/[0.85] px-3 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-brand-600 motion-safe:animate-pulse" />
                <span className="text-xs font-bold uppercase text-brand-700">Roadmap belajar bahasa Jepang</span>
              </div>

              <h1 className="mb-6 break-words text-[2rem] font-black leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl">
                Belajar Bahasa Jepang
                <span className="mt-1 block text-[#15803D]">Lebih Terarah</span>
              </h1>
              <p className="max-w-xl text-base leading-8 text-ink-700 sm:text-lg">
                Ikuti roadmap mingguan yang menghubungkan materi, flashcard, kuis, dan presentasi dalam satu progres belajar.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" href="/register" className="!h-14 !min-h-14 !w-full !shrink-0 !whitespace-nowrap !rounded-xl !bg-[#30C060] !px-7 !text-[#24303B] !shadow-[0_10px_24px_rgba(48,192,96,0.2)] hover:!translate-y-0 hover:!bg-[#15803D] hover:!text-white sm:!w-auto">
                  Mulai Belajar Gratis <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 20 }} />
                </Button>
                <Button size="lg" variant="outline" type="button" onClick={scrollToDemo} className="!h-14 !min-h-14 !w-full !shrink-0 !whitespace-nowrap !rounded-xl !border-[#2D3742]/25 !bg-white/90 !px-7 !text-[#2D3742] hover:!translate-y-0 hover:!border-[#2D3742]/40 hover:!bg-white sm:!w-auto">
                  <PlayCircleIcon sx={{ fontSize: 23 }} />
                  Lihat Demo
                </Button>
              </div>

              <div className="mt-9 flex min-w-0 max-w-md items-start gap-4 border-t border-ink-900/10 pt-5 text-sm text-ink-700 sm:items-center">
                <div className="flex -space-x-2" aria-hidden="true">
                  {['あ', '漢', '語'].map((label, index) => (
                    <span key={label} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-black ${index === 0 ? 'bg-brand-100 text-brand-700' : index === 1 ? 'bg-learning-100 text-learning-700' : 'bg-achievement-100 text-achievement-700'}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <span className="min-w-0 break-words">Bergabunglah dengan <strong className="font-black text-ink-900">komunitas pembelajar</strong> TOKU-UP</span>
              </div>

              <div className="mt-6 hidden items-center gap-5 text-[11px] font-bold text-ink-600 sm:flex">
                <span className="inline-flex items-center gap-1.5"><SakuraIcon className="h-4 w-4 text-pink-400" /> 学ぶ <span className="text-ink-500">Learn</span></span>
                <span aria-hidden="true" className="h-px w-6 bg-ink-900/15" />
                <span>合格 <span className="text-ink-500">Pass</span></span>
                <span aria-hidden="true" className="h-px w-6 bg-ink-900/15" />
                <span>向上 <span className="text-ink-500">Level up</span></span>
              </div>
            </div>

            <motion.div {...reveal} className="relative mx-auto min-w-0 w-full max-w-full sm:max-w-xl lg:mx-0">
              <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/[0.94] p-6 shadow-[0_24px_70px_rgba(37,48,58,0.16)] backdrop-blur-sm sm:p-8">
                <div className="mb-8 flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase text-brand-700">Hari ini</p>
                    <h2 className="mt-2 flex items-center gap-2 text-xl font-black text-ink-900">
                      <VideogameAssetIcon className="text-brand-600" sx={{ fontSize: 22 }} />
                      Target Harian
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">Jaga streak Anda tetap aktif!</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-achievement-100 text-achievement-700"><LocalFireDepartmentIcon /></div>
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'Latihan Kanji', value: 80, icon: 'あ', color: 'bg-brand-600' },
                    { label: 'Mendengar N3', value: 45, icon: <HeadsetIcon sx={{ fontSize: 18 }} />, color: 'bg-learning-600' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 font-black text-brand-700">{item.icon}</div>
                          <span className="font-bold text-ink-900">{item.label}</span>
                        </div>
                        <span className="font-black text-ink-900">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                    </div>
                  ))}
                </div>

                <Button className="mt-8 h-14 w-full !rounded-xl !bg-ink-900 !py-4 !text-base !text-white hover:!translate-y-0 hover:!bg-ink-800" href="/register">Lanjutkan Belajar</Button>
              </div>

              <div className="absolute -bottom-7 -left-4 hidden items-center gap-3 rounded-xl border border-white bg-[#E4E2D5] px-4 py-3 shadow-lg sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-xs font-black text-brand-700">N3</div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-600">Tingkat saat ini</p>
                  <p className="text-sm font-black text-ink-900">JLPT N3</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <SeigaihaBand />

        <motion.section {...reveal} id="demo-belajar" className="scroll-mt-24 bg-[#123D38] px-5 py-16 text-white sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-brand-300"><ToriiIcon className="h-4 w-4" /> Satu ekosistem belajar</p>
                <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-4xl">Dari memilih kelas sampai melihat progress.</h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.68] lg:justify-self-end sm:text-base">Setiap aktivitas tetap berada dalam konteks roadmap yang sama, sehingga siswa tidak perlu menebak apa yang harus dikerjakan berikutnya.</p>
            </div>

            <div className="grid border-y border-white/[0.14] md:grid-cols-2 xl:grid-cols-4">
              {learningSteps.map((step, index) => (
                <article key={step.number} className="relative min-h-56 border-b border-white/[0.14] px-1 py-7 md:px-6 xl:border-b-0 xl:border-r xl:last:border-r-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-300">{step.number}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-brand-300">{step.icon}</span>
                  </div>
                  <h3 className="mt-10 text-lg font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/[0.62]">{step.description}</p>
                  {index < learningSteps.length - 1 && <span aria-hidden="true" className="absolute -right-1 top-10 hidden h-2 w-2 rounded-full bg-brand-500 xl:block" />}
                </article>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-[#F7FAF8] px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase text-brand-700"><ScrollIcon className="h-4 w-4" /> Roadmap mingguan</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-ink-900 sm:text-4xl">Belajar dengan urutan yang terlihat jelas.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-ink-600 sm:text-base">Materi disusun per minggu agar PPT, kosakata, flashcard, latihan, dan evaluasi tidak terpisah menjadi menu yang membingungkan.</p>
              <Button
                href="/roadmap"
                variant="secondary"
                className="mt-7 !h-12 !min-h-12 !rounded-lg !bg-[#2D3742] !px-5 !text-white hover:!translate-y-0 hover:!bg-[#1F2933]"
              >
                Lihat roadmap lengkap
                <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 18 }} />
              </Button>
            </div>

            <div className="relative border border-[var(--toku-border)] bg-white p-5 shadow-[0_20px_55px_rgba(37,48,58,0.08)] sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-5">
                <div><p className="text-xs font-bold text-ink-600">JLPT N3 Mingguan</p><h3 className="mt-1 text-lg font-black text-ink-900">Perjalanan belajar Anda</h3></div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">1 dari 4</span>
              </div>
              <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[1.2rem] before:top-8 before:w-px before:bg-gray-200">
                {roadmapWeeks.map((item, index) => (
                  <div key={item.week} className={`relative grid gap-3 border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${index === 0 ? 'border-brand-200 bg-brand-50/[0.45]' : 'border-gray-100 bg-white'}`}>
                    <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black ${weekTone[item.tone]}`}>{item.week}</span>
                    <div><h4 className="text-sm font-black text-ink-900">{item.title}</h4><p className="mt-1 text-xs leading-5 text-ink-600">{item.detail}</p></div>
                    <span className="text-xs font-bold text-ink-600 sm:text-right">{item.state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-white px-5 py-16 sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-20">
            <div className="relative border border-[var(--toku-border)] bg-[#F7FAF8] p-5 sm:p-8">
              <div className="flex items-start justify-between gap-5 border-b border-gray-200 pb-6">
                <div><p className="text-xs font-black uppercase text-learning-700">Progress minggu ini</p><h3 className="mt-2 text-2xl font-black text-ink-900">Tetap fokus pada langkah berikutnya.</h3></div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><BoltIcon /></div>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {[
                  ['Materi selesai', '8/12', 'text-brand-700'],
                  ['Kuis terbaik', '88%', 'text-learning-700'],
                  ['Streak aktif', '6 hari', 'text-achievement-700'],
                ].map(([label, value, color]) => (
                  <div key={label} className="border-l-2 border-gray-200 pl-4"><p className="text-xs font-bold text-ink-600">{label}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value}</p></div>
                ))}
              </div>
              <div className="mt-8 border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm"><span className="font-bold text-ink-900">Minggu 1 - Fondasi N3</span><span className="font-black text-brand-700">67%</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-brand-600" /></div>
              </div>
            </div>

            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase text-achievement-700"><SakuraIcon className="h-4 w-4 text-pink-400" /> Mengapa TOKU-UP</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-ink-900 sm:text-4xl">Satu tampilan untuk belajar, mengulang, dan berkembang.</h2>
              <div className="mt-9 space-y-7">
                {benefits.map((item) => (
                  <div key={item.title} className="group flex gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>{item.icon}</span>
                    <div><h3 className="font-black text-ink-900">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink-600">{item.description}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <SeigaihaBand />

        <motion.section {...reveal} className="bg-[#0F171B] px-5 py-16 text-white sm:px-8 lg:px-20 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="flex items-center gap-2 text-xs font-black uppercase text-brand-300"><ToriiIcon className="h-4 w-4" /> Kelas TOKU-UP</p><h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">Pilih cara belajar yang sesuai dengan ritme Anda.</h2></div>
              <p className="max-w-md text-sm leading-7 text-white/60">Harga, durasi, dan jenis akses selalu mengikuti pengaturan kelas yang sedang tersedia.</p>
            </div>
            <div className={`grid gap-4 ${publicPlans.length > 2 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {publicPlans.length > 0 ? publicPlans.map((plan, index) => (
                <article key={`${plan.programId}-${plan.id}`} className={`relative border p-6 ${index === 0 ? 'border-brand-300 bg-[#183B37]' : 'border-white/[0.12] bg-white/[0.045]'}`}>
                  {index === 0 && <span className="absolute right-5 top-5 rounded-full border border-brand-300/40 bg-brand-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-brand-300">Pilihan awal</span>}
                  <p className="pr-24 text-[11px] font-black uppercase text-achievement-100">{plan.programTitle}</p>
                  <h3 className="mt-3 text-xl font-black">{plan.name}</h3>
                  <p className="mt-7 text-3xl font-black">{plan.price_formatted}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-white/[0.55]"><span>{plan.scope_label}</span><span>{formatDuration(plan.duration_days)}</span></div>
                  {plan.description && <p className="mt-5 line-clamp-2 text-sm leading-6 text-white/[0.68]">{plan.description}</p>}
                  <ul className="mt-6 space-y-3 p-0">
                    {(plan.features || []).slice(0, 3).map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-white/[0.78]"><CheckIcon sx={{ fontSize: 17 }} className="mt-0.5 shrink-0 text-brand-300" />{feature}</li>)}
                  </ul>
                </article>
              )) : (
                <div className="border border-dashed border-white/20 px-6 py-12 text-center sm:col-span-2"><p className="text-lg font-black">Paket kelas sedang disiapkan</p><p className="mt-2 text-sm text-white/60">Daftar untuk membuka preview kelas yang tersedia.</p></div>
              )}
            </div>
            <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-white/[0.12] pt-8 sm:flex-row sm:items-center">
              <p className="max-w-xl text-sm leading-6 text-white/[0.65]">Bandingkan materi, tipe pendampingan, dan masa akses sebelum menentukan kelas.</p>
              <Button href="/pricing" className="!rounded-lg !bg-[#D9FFB8] !text-ink-950 hover:!bg-white">Lihat kelas dan harga</Button>
            </div>
          </div>
        </motion.section>
      </main>

      <PromoPopup popup={activePopup} />
      <WhatsAppContact />
      <Footer />
    </>
  );
}
