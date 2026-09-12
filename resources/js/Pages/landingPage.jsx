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
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StarIcon from '@mui/icons-material/Star';
import { DarumaIcon, SakuraIcon, ScrollIcon, SeigaihaBand, ToriiIcon } from '@/Components/JapaneseIcons';
import Button from '@/Components/UI/Button';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import Footer from '@/Components/Layout/GuestFooter';
import WhatsAppContact from '@/Components/Marketing/WhatsAppContact';
import PromoPopup from '@/Components/Marketing/PromoPopup';
import FallEffect from '@/Components/theme/FallEffect';
import SeoHead from '@/Components/SEO/SeoHead';
import heroStaticImage from '@/../Images/Mount-Fuji-New.jpg';

const sampleFlashcards = [
  {
    kanji: '挑戦',
    furigana: 'ちょうせん',
    romaji: 'chousen',
    meaning: 'Tantangan / Mencoba hal baru',
    sentence: '新しい目標に挑戦する。',
    sentenceMeaning: 'Menantang diri untuk target baru.',
    level: 'JLPT N3',
  },
  {
    kanji: '継続',
    furigana: 'けいぞく',
    romaji: 'keizoku',
    meaning: 'Keberlanjutan / Konsistensi',
    sentence: '毎日の勉強を継続する。',
    sentenceMeaning: 'Melanjutkan belajar setiap hari secara konsisten.',
    level: 'JLPT N3',
  },
  {
    kanji: '合格',
    furigana: 'ごうかく',
    romaji: 'goukaku',
    meaning: 'Lulus / Sukses Ujian',
    sentence: 'JLPT N3の試験に合格した。',
    sentenceMeaning: 'Berhasil lulus ujian JLPT N3.',
    level: 'JLPT N3',
  },
];

const testimonials = [
  {
    name: 'Dimas Pratama',
    tag: 'Lolos JLPT N3',
    batch: 'Alumni Kloter N3',
    comment: 'Roadmap mingguan sangat membantu membagi waktu antara kerja shift dan belajar kanji tanpa merasa overwhelmed. Urutan materi dari PPT ke kuis sangat runtut.',
    rating: 5,
    avatar: 'D',
    avatarTone: 'bg-brand-100 text-brand-700',
  },
  {
    name: 'Siti Nurhaliza',
    tag: 'Persiapan Tokutei Ginou',
    batch: 'Peserta Mandiri',
    comment: 'Fitur flashcard dan kuis repetisinya bikin kosakata dan pola kalimat nempel lebih cepat di ingatan dibanding sekadar menghafal buku catatan.',
    rating: 5,
    avatar: 'S',
    avatarTone: 'bg-learning-100 text-learning-700',
  },
  {
    name: 'Rian Ardiansyah',
    tag: 'Target JLPT N2',
    batch: 'Alumni N3',
    comment: 'Penyusunan materi dari pengajar, audio pelafalan, sampai evaluasi kuis dalam satu alur membuat saya selalu tahu langkah konkret apa yang harus dikerjakan.',
    rating: 5,
    avatar: 'R',
    avatarTone: 'bg-achievement-100 text-achievement-700',
  },
];

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

  const [activeCardIdx, setActiveCardIdx] = React.useState(0);
  const [studiedCount, setStudiedCount] = React.useState(18);
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);

  const currentCard = sampleFlashcards[activeCardIdx];

  const handleSpeak = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextCard = () => {
    setActiveCardIdx((prev) => (prev + 1) % sampleFlashcards.length);
    setStudiedCount((prev) => prev + 1);
  };

  const scrollToDemo = () => {
    document.getElementById('demo-belajar')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      <main className="overflow-hidden bg-white">
        <section className="relative isolate bg-white px-4 py-10 sm:px-6 sm:py-14 lg:min-h-[560px] lg:px-8 lg:py-16">
          <img
            src={heroStaticImage}
            alt="Pemandangan Gunung Fuji dan pagoda Jepang"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[42%_center] sm:object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/85 to-white/45" />

          <div className="mx-auto grid min-w-0 max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div className="relative z-10 min-w-0 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/[0.85] px-3 py-1 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-brand-600 motion-safe:animate-pulse" />
                <span className="text-xs font-bold uppercase text-brand-700">Roadmap belajar bahasa Jepang</span>
              </div>

              <h1 className="mb-4 break-words text-2xl font-extrabold leading-tight text-ink-900 sm:text-4xl lg:text-[2.75rem]">
                Belajar Bahasa Jepang
                <span className="mt-1 block text-[#15803D]">Lebih Terarah</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-ink-700 sm:text-base">
                Ikuti roadmap mingguan yang menghubungkan materi, flashcard, kuis, dan presentasi dalam satu progres belajar.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="md" href="/register" className="!h-10 !min-h-[40px] !w-full !shrink-0 !whitespace-nowrap !rounded-xl !bg-[#30C060] !px-5 !text-sm !font-bold !text-[#24303B] !shadow-[0_8px_18px_rgba(48,192,96,0.2)] hover:!translate-y-0 hover:!bg-[#15803D] hover:!text-white sm:!w-auto">
                  Mulai Belajar Gratis <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 18 }} />
                </Button>
                <Button size="md" variant="outline" type="button" onClick={scrollToDemo} className="!h-10 !min-h-[40px] !w-full !shrink-0 !whitespace-nowrap !rounded-xl !border-[#2D3742]/25 !bg-white/90 !px-5 !text-sm !font-bold !text-[#2D3742] hover:!translate-y-0 hover:!border-[#2D3742]/40 hover:!bg-white sm:!w-auto">
                  <PlayCircleIcon sx={{ fontSize: 20 }} />
                  Lihat Demo
                </Button>
              </div>

              <div className="mt-7 flex min-w-0 max-w-md items-start gap-4 border-t border-ink-900/10 pt-4 text-sm text-ink-700 sm:items-center">
                <div className="flex -space-x-2" aria-hidden="true">
                  {['あ', '漢', '語'].map((label, index) => (
                    <span key={label} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-black ${index === 0 ? 'bg-brand-100 text-brand-700' : index === 1 ? 'bg-learning-100 text-learning-700' : 'bg-achievement-100 text-achievement-700'}`}>
                      {label}
                    </span>
                  ))}
                </div>
                <span className="min-w-0 break-words text-xs sm:text-sm">Bergabunglah dengan <strong className="font-bold text-ink-900">3,200+ pembelajar</strong> komunitas TOKU-UP</span>
              </div>

              <div className="mt-5 hidden items-center gap-4 text-[11px] font-bold text-ink-600 sm:flex">
                <span className="inline-flex items-center gap-1.5"><SakuraIcon className="h-3.5 w-3.5 text-pink-400" /> 学ぶ <span className="text-ink-500">Learn</span></span>
                <span aria-hidden="true" className="h-px w-5 bg-ink-900/15" />
                <span>合格 <span className="text-ink-500">Pass</span></span>
                <span aria-hidden="true" className="h-px w-5 bg-ink-900/15" />
                <span>向上 <span className="text-ink-500">Level up</span></span>
              </div>
            </div>

            <motion.div {...reveal} className="relative mx-auto min-w-0 w-full max-w-full sm:max-w-lg lg:mx-0">
              <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-5 shadow-2xl backdrop-blur-md sm:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <DarumaIcon className="h-4 w-4 text-brand-600" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Preview Materi Interaktif</p>
                      <h2 className="text-xs font-black text-ink-900">Kartu Kosakata & Kanji</h2>
                    </div>
                  </div>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
                    {currentCard.level}
                  </span>
                </div>

                <div className="my-3 rounded-xl border border-brand-100 bg-[#F7FAF8] p-4 text-center">
                  <p className="text-xs font-bold text-brand-700">{currentCard.furigana}</p>
                  <p className="my-1 font-sans text-4xl font-black text-ink-900">{currentCard.kanji}</p>
                  <p className="text-[11px] font-mono font-medium text-ink-500">[{currentCard.romaji}]</p>
                  <p className="mt-2 text-xs font-bold text-ink-800">{currentCard.meaning}</p>
                  
                  <div className="mt-3 rounded-lg border border-white bg-white/90 p-2.5 text-left text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink-900">{currentCard.sentence}</span>
                      <button
                        type="button"
                        onClick={() => handleSpeak(currentCard.sentence)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-brand-50 px-2 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
                        title="Dengarkan pengucapan audio"
                      >
                        <VolumeUpIcon sx={{ fontSize: 15 }} className={isPlayingAudio ? 'animate-pulse text-brand-600' : ''} />
                        Suara
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-600 italic">{currentCard.sentenceMeaning}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSpeak(currentCard.kanji)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                    Pelafalan
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700"
                  >
                    <CheckIcon sx={{ fontSize: 16 }} />
                    Kartu Berikutnya
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-ink-600">
                  <span className="flex items-center gap-1.5">
                    <LocalFireDepartmentIcon sx={{ fontSize: 15 }} className="text-amber-500" />
                    <strong>{studiedCount}</strong> kosakata diulang hari ini
                  </span>
                  <span className="font-bold text-brand-700">Streak Aktif 6 Hari</span>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-3 hidden items-center gap-2.5 rounded-xl border border-brand-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-black text-brand-700">N3</div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-ink-500">Standar Kurikulum</p>
                  <p className="text-xs font-black text-ink-900">JLPT N5 – N3 Terpadu</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>


        <SeigaihaBand />

        <motion.section {...reveal} id="demo-belajar" className="scroll-mt-24 bg-[#102D29] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 grid gap-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-300">
                  <ToriiIcon className="h-4 w-4 text-brand-300" /> Satu ekosistem belajar
                </p>
                <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                  Dari memilih kelas sampai melihat progres.
                </h2>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-white/70 lg:justify-self-end sm:text-sm">
                Setiap aktivitas tetap berada dalam konteks roadmap yang sama, sehingga siswa tidak perlu menebak apa yang harus dikerjakan berikutnya.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {learningSteps.map((step) => (
                <article
                  key={step.number}
                  className="group relative rounded-xl border border-white/15 bg-white/[0.04] p-5 transition-all duration-300 hover:border-brand-300/40 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-brand-300">{step.number}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-300 transition-colors group-hover:bg-brand-500/20 group-hover:text-white">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-[#F7FAF8] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-brand-700"><ScrollIcon className="h-4 w-4" /> Roadmap mingguan</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">Belajar dengan urutan yang terlihat jelas.</h2>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-ink-600 sm:text-sm">Materi disusun per minggu agar PPT, kosakata, flashcard, latihan, dan evaluasi tidak terpisah menjadi menu yang membingungkan.</p>
              <Button
                href="/roadmap"
                variant="secondary"
                className="mt-5 !h-10 !min-h-[40px] !rounded-lg !bg-[#2D3742] !px-4 !text-xs !font-bold !text-white hover:!translate-y-0 hover:!bg-[#1F2933]"
              >
                Lihat roadmap lengkap
                <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 16 }} />
              </Button>
            </div>

            <div className="relative border border-[var(--toku-border)] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                <div><p className="text-xs font-bold text-ink-600">JLPT N3 Mingguan</p><h3 className="mt-0.5 text-base font-bold text-ink-900">Perjalanan belajar Anda</h3></div>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">1 dari 4</span>
              </div>
              <div className="relative space-y-2.5 before:absolute before:bottom-6 before:left-[1.1rem] before:top-6 before:w-px before:bg-gray-200">
                {roadmapWeeks.map((item, index) => (
                  <div key={item.week} className={`relative grid gap-2.5 border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center ${index === 0 ? 'border-brand-200 bg-brand-50/[0.45]' : 'border-gray-100 bg-white'}`}>
                    <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${weekTone[item.tone]}`}>{item.week}</span>
                    <div><h4 className="text-xs font-bold text-ink-900">{item.title}</h4><p className="mt-0.5 text-[11px] leading-4 text-ink-600">{item.detail}</p></div>
                    <span className="text-[11px] font-semibold text-ink-600 sm:text-right">{item.state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div className="relative border border-[var(--toku-border)] bg-[#F7FAF8] p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
                <div><p className="text-xs font-bold uppercase text-learning-700">Progress minggu ini</p><h3 className="mt-1 text-xl font-bold text-ink-900">Tetap fokus pada langkah berikutnya.</h3></div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><BoltIcon sx={{ fontSize: 20 }} /></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ['Materi selesai', '8/12', 'text-brand-700'],
                  ['Kuis terbaik', '88%', 'text-learning-700'],
                  ['Streak aktif', '6 hari', 'text-achievement-700'],
                ].map(([label, value, color]) => (
                  <div key={label} className="border-l-2 border-gray-200 pl-3"><p className="text-xs font-medium text-ink-600">{label}</p><p className={`mt-1 text-xl font-bold ${color}`}>{value}</p></div>
                ))}
              </div>
              <div className="mt-6 border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between text-xs"><span className="font-bold text-ink-900">Minggu 1 - Fondasi N3</span><span className="font-bold text-brand-700">67%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-2/3 rounded-full bg-brand-600" /></div>
              </div>
            </div>

            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-achievement-700"><SakuraIcon className="h-4 w-4 text-pink-400" /> Mengapa TOKU-UP</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl">Satu tampilan untuk belajar, mengulang, dan berkembang.</h2>
              <div className="mt-6 space-y-5">
                {benefits.map((item) => (
                  <div key={item.title} className="group flex gap-3.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>{item.icon}</span>
                    <div><h3 className="text-sm font-bold text-ink-900">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-ink-600">{item.description}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <SeigaihaBand />

        {/* Section Testimoni Siswa */}
        <motion.section {...reveal} className="bg-[#F7FAF8] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm">
                <ToriiIcon className="h-3.5 w-3.5" />
                <span>Cerita Pembelajar TOKU-UP</span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Dipercaya Siswa dengan Berbagai Target Belajar
              </h2>
              <p className="mt-2 text-xs text-ink-600 sm:text-sm">
                Pengalaman nyata dari pembelajar mandiri hingga alumni persiapan kerja dan ujian JLPT.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand-200 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(item.rating)].map((_, i) => (
                        <StarIcon key={i} sx={{ fontSize: 16 }} />
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-700 italic">
                      "{item.comment}"
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${item.avatarTone}`}>
                      {item.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-brand-700">{item.tag}</span>
                        <span className="text-[10px] text-ink-400">· {item.batch}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <SeigaihaBand />

        <motion.section {...reveal} className="bg-[#0F171B] px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-300">
                  <ToriiIcon className="h-4 w-4" /> Kelas TOKU-UP
                </p>
                <h2 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                  Pilih cara belajar yang sesuai dengan ritme Anda.
                </h2>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-white/70">
                Harga, durasi, dan jenis akses selalu mengikuti pengaturan kelas yang sedang tersedia.
              </p>
            </div>
            <div className={`grid gap-5 ${publicPlans.length > 2 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {publicPlans.length > 0 ? publicPlans.map((plan, index) => (
                <article
                  key={`${plan.programId}-${plan.id}`}
                  className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                    index === 0
                      ? 'border-brand-300/60 bg-[#183B37] shadow-lg shadow-black/20'
                      : 'border-white/10 bg-white/[0.045] hover:border-white/25'
                  }`}
                >
                  {index === 0 && (
                    <span className="absolute right-5 top-5 rounded-full border border-brand-300/40 bg-brand-300/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-300">
                      Pilihan Favorit
                    </span>
                  )}
                  <p className="pr-24 text-[10px] font-bold uppercase tracking-wider text-achievement-100">{plan.programTitle}</p>
                  <h3 className="mt-2 text-lg font-black text-white">{plan.name}</h3>
                  <p className="mt-3 text-2xl font-black text-white">{plan.price_formatted}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-white/70">
                    <span className="rounded-md bg-white/10 px-2 py-0.5">{plan.scope_label}</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5">{formatDuration(plan.duration_days)}</span>
                  </div>
                  {plan.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/80">{plan.description}</p>}
                  <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-4 p-0">
                    {(plan.features || []).slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-white/90">
                        <CheckIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-brand-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/20 px-5 py-10 text-center sm:col-span-2">
                  <p className="text-base font-bold text-white">Paket kelas sedang disiapkan</p>
                  <p className="mt-1.5 text-xs text-white/60">Daftar untuk membuka preview kelas yang tersedia.</p>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
              <p className="max-w-xl text-xs leading-relaxed text-white/70">
                Bandingkan materi, tipe pendampingan, dan masa akses sebelum menentukan kelas.
              </p>
              <Button href="/pricing" className="!h-10 !min-h-[40px] !rounded-xl !bg-[#D9FFB8] !px-5 !text-xs !font-bold !text-ink-950 hover:!bg-white shadow-sm">
                Lihat kelas dan harga <ArrowForwardIcon aria-hidden="true" sx={{ fontSize: 16 }} />
              </Button>
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
