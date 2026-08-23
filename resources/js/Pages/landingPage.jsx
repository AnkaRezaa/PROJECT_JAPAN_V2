import React from 'react';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import Card from '@/Components/UI/Card';
import Avatar from '@/Components/UI/Avatar';
import GuestNavbar from '@/Components/Layout/GuestNavbar';
import Footer from '@/Components/Layout/GuestFooter';
import WhatsAppContact from '@/Components/Marketing/WhatsAppContact';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HeadsetIcon from '@mui/icons-material/Headset';
import StarIcon from '@mui/icons-material/Star';
import CheckIcon from '@mui/icons-material/Check';
import rawTheme from '@/Components/theme/themes';
import FallEffect from '@/Components/theme/FallEffect';
import SeoHead from '@/Components/SEO/SeoHead';
import heroStaticImage from '@/../Images/Mount-Fuji-New.jpg';

// Map theme keys ke format yang dipakai landingPage
const theme = {
  heroBg: rawTheme.landingHeroBg,
  heroGradText: rawTheme.landingGradText,
  heroBadgeBg: rawTheme.landingBadgeBg,
  heroBadgeDot: rawTheme.landingBadgeDot,
  heroBadgeText: rawTheme.landingBadgeText,
  heroGlow: rawTheme.landingGlow,
  featureCardGlow: rawTheme.landingCardGlow,
  highlightBorder: rawTheme.landingHighlightBorder,
  highlightBadgeBg: rawTheme.landingHighlightBadge,
  highlightBtnBg: rawTheme.landingHighlightBtn,
  highlightLevel: rawTheme.landingHighlightLevel,
  leagueBg: rawTheme.landingLeagueBg,
  ctaBg: rawTheme.landingCtaBg,
  ctaProBg: rawTheme.landingProBg,
};


const steps = [
  { icon: <AssignmentIcon />, title: 'Masuk Kelas N3', desc: 'Pilih kelas JLPT N3 dan mulai dari week yang tersedia untuk akun Anda.' },
  { icon: <BoltIcon />, title: 'Misi Mingguan', desc: 'Selesaikan PPT, kosakata, flashcard, dan kuis dalam satu jalur belajar yang jelas.' },
  { icon: <EmojiEventsIcon />, title: 'Kumpulkan Progress', desc: 'XP, streak, badge, dan leaderboard membantu siswa melihat perkembangan belajarnya.' },
];

const testimonials = [
  { quote: 'Saya akhirnya lulus N3 setelah bertahun-tahun kesulitan dengan buku teks. Pendekatan gamifikasi ini membuat belajar jadi adiktif!', name: 'Sarah Jenkins', role: 'Lulus N3' },
  { quote: 'Kualitas audionya luar biasa. Mendengar penutur asli sangat membantu pelafalan saya.', name: 'Michael Chen', role: 'Siswa N4' },
  { quote: 'Investasi terbaik untuk belajar bahasa Jepang. Jalur terstruktur membuat saya tidak merasa kewalahan.', name: 'Jessica Lee', role: 'Peserta N2' },
];

const formatDuration = (days) => {
  if (!days) return 'Mengikuti ketentuan kelas';
  if (days >= 365) return `${Math.round(days / 365)} tahun`;
  if (days >= 30) return `${Math.round(days / 30)} bulan`;
  return `${days} hari`;
};

const LandingPage = ({ programs = [], seo = {} }) => {
  const scrollToDemo = () => {
    document.getElementById('demo-belajar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const publicPlans = programs.flatMap((program) => (program.payment_plans || []).map((plan) => ({
    ...plan,
    programId: program.id,
    programTitle: program.title,
  })));

  return (
    <>
      <FallEffect />
      <SeoHead seo={seo} />
      <GuestNavbar />

      {/* Hero */}
      <section className={`relative flex flex-col lg:flex-row items-center justify-between px-6 py-16 lg:px-24 lg:py-32 ${theme.heroBg} gap-12 lg:gap-16 overflow-hidden`}>
        <img
          src={heroStaticImage}
          alt="Gunung Fuji Japanlingo"
          className="absolute inset-0 h-full w-full object-cover opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/88 via-white/62 to-white/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-white/78" />
        <div className="absolute inset-x-0 top-0 h-full w-full opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        </div>

        <div className="max-w-xl lg:max-w-xl relative z-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1 ${theme.heroBadgeBg} rounded-full mb-6 border`}>
            <span className={`w-2 h-2 rounded-full ${theme.heroBadgeDot} animate-pulse`}></span>
            <span className={`text-xs font-bold ${theme.heroBadgeText} uppercase tracking-wider`}>Roadmap Belajar Bahasa Jepang</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] mb-6 text-[#1A1A1A] tracking-tight">
            Belajar Bahasa <br />
            <span className={`bg-gradient-to-r ${theme.heroGradText} bg-clip-text text-transparent`}>
              Jepang Terstruktur &amp; Gamified
            </span>
          </h1>

          <p className="text-lg lg:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg">
            Kuasai JLPT N3 dengan roadmap mingguan, flashcard, kuis, PPT, dan progress belajar yang saling terhubung.
          </p>

          <div className="flex flex-wrap gap-4 mb-10">
            <Button size="lg" href="/register" className="!rounded-full !px-8 !py-4 shadow-lg">
              Mulai Belajar Gratis ➔
            </Button>
            <Button size="lg" variant="outline" type="button" onClick={scrollToDemo} className="!rounded-full !px-8 !py-4 !bg-white">
              <PlayCircleIcon className="mr-2" sx={{ fontSize: 24 }} />
              Lihat Demo
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span>Bergabunglah dengan <strong className="text-gray-900 font-bold">komunitas pembelajar</strong> Japanlingo</span>
          </div>
        </div>

        {/* Floating Card UI */}
        <div className="w-full max-w-lg relative lg:mr-10">
          <div className={`absolute -inset-4 bg-gradient-to-tr ${theme.heroGlow} blur-3xl rounded-full opacity-50`}></div>

          <div className="relative animate-float">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 leading-none flex items-center gap-2">
                    <VideogameAssetIcon className="text-red-600" sx={{ fontSize: 20 }} />
                    Target Harian
                  </h4>
                  <p className="text-sm text-gray-400 mt-1.5 font-medium">Jaga streak Anda tetap aktif!</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg">
                  <LocalFireDepartmentIcon className="text-orange-500" />
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                        <span className="font-bold">あ</span>
                      </div>
                      <span className="font-bold text-gray-800">Latihan Kanji</span>
                    </div>
                    <span className="font-bold text-red-600">80%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full w-[80%]"></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                        <HeadsetIcon sx={{ fontSize: 18 }} />
                      </div>
                      <span className="font-bold text-gray-800">Mendengar N3</span>
                    </div>
                    <span className="font-bold text-red-600">45%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full w-[45%]"></div>
                  </div>
                </div>
              </div>

              <Button className="w-full !rounded-2xl !py-5 !bg-[#1A1A1A] !text-white !font-bold text-lg hover:!bg-black transition-colors" href="/register">
                Lanjutkan Belajar
              </Button>
            </div>

            <div className="absolute -left-12 -bottom-6 hidden animate-float-delayed sm:block">
              <div className="bg-[#E4E2D5] rounded-3xl p-4 shadow-xl border border-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/50 border border-white flex items-center justify-center overflow-hidden">
                  <div className="w-6 h-6 bg-[#C4C1B1] rounded-sm"></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-tighter text-gray-500 font-bold">Tingkat Saat Ini</div>
                  <div className="text-sm font-black text-red-700">JLPT N3</div>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 -top-8 hidden animate-float-fast sm:block">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckIcon sx={{ fontSize: 16 }} />
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Akurasi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo-belajar" className="scroll-mt-24 bg-white px-6 py-16 lg:px-24 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <Badge color="red" className="mb-4">Demo Alur Belajar</Badge>
            <h2 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Satu jalur belajar dari kelas sampai progress
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-500 sm:text-base">
              Preview ini menunjukkan cara Japanlingo menghubungkan kelas, roadmap mingguan, flashcard, kuis, dan progress tanpa membuat siswa berpindah-pindah konteks.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['1', 'Pilih Kelas', 'Siswa masuk ke kelas JLPT N3 yang tersedia atau aktif setelah pembayaran/access key.'],
              ['2', 'Ikuti Roadmap', 'Setiap week berisi PPT, kosakata, flashcard, dan kuis yang dibuka bertahap.'],
              ['3', 'Latihan Repetisi', 'Flashcard dan kuis memakai review berulang agar kosakata yang belum kuat muncul lagi.'],
              ['4', 'Pantau Progress', 'XP, streak, modul selesai, kuis selesai, dan aktivitas belajar tersimpan otomatis.'],
            ].map(([step, title, desc]) => (
              <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                  {step}
                </div>
                <h3 className="text-base font-black text-gray-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="px-6 lg:px-20 py-16 sm:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <Badge color="red" className="mb-4">PETA PERJALANAN</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Roadmap JLPT N3 Mingguan</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10 sm:mb-16">
            Fokus belajar dibuat per minggu agar siswa tahu urutan PPT, kosakata, flashcard, dan kuis yang harus diselesaikan.
          </p>

          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-5 text-left sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {[
              { level: 'W1', title: 'Fondasi N3', desc: 'Preview awal berisi pengantar kelas, pola belajar, kosakata dasar N3, dan kuis pembuka.', color: 'bg-red-500', label: 'Preview Gratis', highlight: true },
              { level: 'W2', title: 'Grammar & Kotoba', desc: 'Latihan pola kalimat dan kosakata harian dengan flashcard repetisi.', color: 'bg-orange-500', label: 'Premium' },
              { level: 'W3', title: 'Kanji & Bacaan', desc: 'Penguatan kanji, contoh kalimat, dan latihan membaca bertahap.', color: 'bg-amber-500', label: 'Premium' },
              { level: 'W4', title: 'Review & Kuis', desc: 'Rekap materi mingguan, kuis adaptif, dan evaluasi progress siswa.', color: 'bg-gray-800', label: 'Premium' },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative flex h-full w-[min(82vw,20rem)] shrink-0 snap-center flex-col rounded-[1.5rem] p-5 text-left transition-all duration-300 sm:w-auto sm:rounded-[2rem] sm:p-6 ${item.highlight
                  ? theme.highlightBorder
                  : 'bg-gray-50/50 border border-gray-100 hover:border-gray-200'
                  }`}
              >
                {item.highlight && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 ${theme.highlightBadgeBg} text-[10px] font-black text-white rounded-full whitespace-nowrap tracking-wider`}>
                    PALING POPULER
                  </div>
                )}

                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black mb-4 ${item.highlight ? theme.highlightLevel : 'bg-gray-100 text-gray-400'}`}>
                  {item.level}
                </div>

                <h3 className="text-lg font-black text-gray-900 mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 flex-grow">{item.desc}</p>

                <div className="mt-auto">
                  <div className={`h-1.5 w-full rounded-full mb-4 ${item.color} opacity-80`}></div>
                  {item.highlight ? (
                    <Button className={`w-full !rounded-xl !py-2 ${theme.highlightBtnBg} !text-white !text-xs !font-bold`} href="/register">
                      Mulai Week 1
                    </Button>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Japanlingo Section */}
      <section className="px-6 lg:px-20 py-24 bg-gray-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <Badge color="red" className="mb-4">MENGAPA JAPANLINGO?</Badge>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-[1.2]">
                Belajar bahasa Jepang tidak harus terasa melelahkan.
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed italic">
                Kami memadukan metode pembelajaran yang terbukti secara ilmiah dengan mekanika game agar Anda tetap termotivasi setiap hari.
              </p>

              <div className="space-y-8">
                {[
                  { icon: <VideogameAssetIcon />, title: 'Kuis Tergamifikasi', desc: 'Dapatkan XP, buka lencana, dan bersaing di papan peringkat sembari menguasai tata bahasa dan kosakata.', color: 'bg-red-100 text-red-600' },
                  { icon: <AutoAwesomeIcon />, title: 'Audio Pendamping', desc: 'Dengarkan pelafalan saat mempelajari kosakata, flashcard, dan latihan bahasa Jepang.', color: 'bg-orange-100 text-orange-600' },
                  { icon: <ListAltIcon />, title: 'Kurikulum Terstruktur', desc: 'Tidak ada lagi belajar acak. Ikuti jalur jelas yang dirancang untuk membantu Anda lulus JLPT.', color: 'bg-red-100 text-red-600' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full ${theme.featureCardGlow} blur-[120px] rounded-full`}></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="animate-float">
                  <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 translate-y-10">
                    <div className="text-red-500 mb-2">
                      <AutoAwesomeIcon sx={{ fontSize: 24 }} />
                    </div>
                    <div className="text-sm font-bold text-gray-900">Streak: 42 Hari</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
                      Anda luar biasa! <LocalFireDepartmentIcon sx={{ fontSize: 14 }} className="text-orange-500" />
                    </div>
                  </div>
                </div>

                <div className="animate-float-fast">
                  <div className={`${theme.leagueBg} rounded-3xl p-6 shadow-2xl text-white relative h-full`}>
                    <div className="absolute top-4 right-4 text-[8px] font-bold bg-black/20 px-2 py-0.5 rounded-full">TOP 1%</div>
                    <div className="text-2xl mb-8">
                      <EmojiEventsIcon sx={{ fontSize: 32 }} />
                    </div>
                    <div className="text-lg font-black">Liga Emas</div>
                    <div className="text-xs opacity-80 mt-1">Terus belajar untuk tetap memimpin peringkat.</div>
                  </div>
                </div>

                <div className="col-span-1 animate-float-delayed">
                  <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
                    <img src="https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=300&fit=crop" className="w-full h-24 object-cover" alt="Konteks" />
                    <div className="p-4">
                      <div className="text-xs font-bold text-gray-900">Konteks Dunia Nyata</div>
                    </div>
                  </div>
                </div>

                <div className="animate-float">
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-xl flex flex-col gap-3 -translate-y-10 border border-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 overflow-hidden">
                        <img src="https://i.pravatar.cc/100?u=ken" className="w-full h-full object-cover" alt="Ken" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold leading-none">Sensei Ken</div>
                        <div className="text-[8px] text-green-500">Sedang Online</div>
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-2xl p-3 text-[9px] text-gray-600 leading-relaxed">
                      Jangan lupa, partikel 'wa' menandai topik pembicaraan!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 lg:px-20 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">Apa Kata Mereka?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} hover>
              <div className="text-amber-400 flex gap-0.5 mb-4">
                {[...Array(5)].map((_, idx) => (
                  <StarIcon key={idx} sx={{ fontSize: 16 }} />
                ))}
              </div>
              <blockquote className="text-sm text-gray-700 leading-relaxed mb-5 italic">"{t.quote}"</blockquote>
              <div className="flex items-center gap-3">
                <Avatar name={t.name} size="md" />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA + Pricing */}
      <section className="px-4 sm:px-6 lg:px-20 py-12 sm:py-16 lg:py-20">
        <div className={`${theme.ctaBg} rounded-2xl sm:rounded-3xl px-5 sm:px-6 lg:px-16 py-10 sm:py-14 text-center text-white`}>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3">Pilih paket kelas yang tersedia</h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto mb-7 sm:mb-10">Harga, durasi, dan jenis akses di bawah mengikuti pengaturan kelas yang sama dengan halaman harga.</p>
          <div className={`grid gap-4 sm:gap-6 ${publicPlans.length > 2 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'} max-w-5xl mx-auto`}>
            {publicPlans.length > 0 ? publicPlans.map((plan, index) => (
              <article key={`${plan.programId}-${plan.id}`} className={`${index === 0 ? theme.ctaProBg : 'bg-gray-800/50'} relative rounded-2xl border border-white/10 p-5 text-left sm:p-6`}>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-200">{plan.programTitle}</p>
                <h3 className="mt-2 text-lg font-black text-white">{plan.name}</h3>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-3xl font-black text-white">{plan.price_formatted}</p>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">{plan.scope_label}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-white/70">{formatDuration(plan.duration_days)}</p>
                {plan.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/80">{plan.description}</p>}
                <ul className="mt-4 space-y-2 list-none p-0">
                  {(plan.features || []).slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-white/85"><CheckIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-emerald-300" />{feature}</li>
                  ))}
                </ul>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/30 bg-white/5 px-6 py-10 sm:col-span-2">
                <p className="text-lg font-black text-white">Paket kelas sedang disiapkan</p>
                <p className="mt-2 text-sm text-white/75">Silakan daftar untuk membuka preview kelas yang tersedia.</p>
              </div>
            )}
          </div>
          <Button href="/pricing" className="mt-7 !bg-white !text-gray-900 hover:!bg-gray-100">Lihat detail kelas dan harga</Button>
        </div>
      </section>

      <WhatsAppContact />
      <Footer />
    </>
  );
};

export default LandingPage;
