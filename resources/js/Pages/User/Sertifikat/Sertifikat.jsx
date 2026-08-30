import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { MedalIcon, ScrollIcon, KabutoIcon } from '@/Components/JapaneseIcons';
import { motion, MotionConfig, useInView } from 'framer-motion';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LockIcon from '@mui/icons-material/Lock';
import DownloadIcon from '@mui/icons-material/Download';
import theme from '@/Components/theme/themes';

/* ─── Animated Progress Bar ─────────────────────────────────── */
function AnimatedBar({ value, unlocked }) {
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true });
    return (
        <div ref={ref} className="cert-progress-track bg-slate-200 dark:bg-gray-800/80 transition-colors duration-300 w-full h-[6px] rounded-full overflow-hidden">
            <motion.div
                className={`cert-progress-fill h-full rounded-full transition-colors duration-300 ${unlocked ? 'cert-progress-gold bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-gray-600 dark:to-gray-700'}`}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${value}%` : 0 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
        </div>
    );
}

/* ─── Corner Ornament ────────────────────────────────────────── */
function CornerOrnament({ pos }) {
    const style = {
        'tl': { top: 10, left: 10 },
        'tr': { top: 10, right: 10 },
        'bl': { bottom: 10, left: 10 },
        'br': { bottom: 10, right: 10 },
    }[pos];
    return (
        <div style={{ position: 'absolute', ...style, width: 18, height: 18 }}>
            <div style={{
                width: '100%', height: '100%',
                border: '2px solid',
                borderColor: '#d4a017',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)',
                opacity: 0.7,
            }} />
        </div>
    );
}

/* ─── Certificate Card ───────────────────────────────────────── */
function CertCard({ item, idx }) {
    const isUnlocked = item.certificate !== null;
    const dateStr = isUnlocked
        ? new Date(item.certificate.issued_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={isUnlocked ? { y: -6, scale: 1.01 } : { scale: 1.005 }}
            className="cursor-default"
        >
            {isUnlocked ? (
                /* ── UNLOCKED: Physical certificate mock-up ── */
                <div className="relative rounded-[20px] overflow-hidden flex flex-col aspect-[7/5] p-6 pb-5 transition-colors duration-300 cert-unlocked bg-gradient-to-br from-[#fffbeb] via-[#ffffff] to-[#fef9ec] shadow-[0_0_0_2px_transparent,0_0_0_2px_#d4a017,0_20px_60px_-10px_rgba(212,160,23,0.4),0_4px_16px_rgba(0,0,0,0.2)]">
                    {/* Golden border gradient via pseudo via box shadow trick */}
                    <div className="absolute inset-0 rounded-[20px] p-[2px] bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#fbbf24] pointer-events-none" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />

                    {/* Corner ornaments */}
                    <CornerOrnament pos="tl" />
                    <CornerOrnament pos="tr" />
                    <CornerOrnament pos="bl" />
                    <CornerOrnament pos="br" />

                    {/* Watermark kanji 証 */}
                    <div className="absolute text-[200px] font-black text-amber-700/5 -right-5 -bottom-8 leading-none pointer-events-none select-none" style={{ fontFamily: '"Noto Serif JP", serif' }}>証</div>

                    {/* Header strip */}
                    <div className="flex justify-between items-center mb-2.5 relative z-10">
                        <span className="text-[9px] font-black tracking-[0.15em] text-amber-900 uppercase">★ HALL OF FAME ★</span>
                        <span className="text-[9px] font-semibold text-amber-700">Sertifikat Resmi TOKU-UP</span>
                    </div>

                    {/* Icon */}
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2.5 relative z-10 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-[0_4px_16px_rgba(217,119,6,0.5)]">
                        <WorkspacePremiumIcon sx={{ fontSize: 36 }} />
                    </div>

                    {/* Main content */}
                    <div className="text-center flex-1 relative z-10">
                        <p className="text-[10px] text-amber-900 font-semibold tracking-wider uppercase mb-1">Ini adalah bukti bahwa</p>
                        <h3 className="text-[1.7rem] font-black text-slate-900 tracking-tight leading-tight mb-1">Level {item.level_name}</h3>
                        <p className="text-[10px] text-amber-900 italic">telah berhasil diselesaikan dengan sempurna</p>
                    </div>

                    {/* Divider ornament */}
                    <div className="flex items-center gap-2 my-2.5 relative z-10">
                        <span className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                        <span className="text-amber-600 text-xs">✦</span>
                        <span className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end gap-4 mb-3.5 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold tracking-widest uppercase text-amber-900">Diterbitkan</span>
                            <span className="text-xs font-bold text-amber-950">{dateStr}</span>
                        </div>
                        <div className="flex-1 max-w-[180px]">
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-amber-900 uppercase tracking-wider">Progres</span>
                                <span className="text-[9px] font-extrabold text-amber-700">{item.progress}%</span>
                            </div>
                            <AnimatedBar value={item.progress} unlocked />
                        </div>
                    </div>

                    {/* CTA */}
                    <Link
                        href={`/user/certificates/${item.certificate.id}/download`}
                        className="relative z-10 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-amber-500 to-amber-700 text-white font-extrabold text-[13px] tracking-wider rounded-xl shadow-[0_4px_0_#92400e,0_6px_20px_rgba(217,119,6,0.4)] transition-all duration-150 hover:brightness-110 hover:-translate-y-px hover:shadow-[0_6px_0_#92400e,0_8px_24px_rgba(217,119,6,0.5)] active:translate-y-[2px] active:shadow-[0_2px_0_#92400e]"
                    >
                        <DownloadIcon sx={{ fontSize: 18 }} />
                        Unduh Sertifikat
                    </Link>
                </div>
            ) : (
                /* ── LOCKED ── */
                <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-end p-0 overflow-hidden aspect-[7/5] rounded-[20px] transition-colors duration-300">
                    {/* Blur overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-[#030712]/60 backdrop-blur-[2px] z-[2] p-6 transition-colors duration-300">
                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 border-2 border-slate-200 dark:border-gray-700 flex items-center justify-center text-slate-400 dark:text-gray-500 mb-3 shadow-lg dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-colors duration-300">
                            <LockIcon sx={{ fontSize: 48 }} />
                        </div>
                        <p className="text-[12px] text-slate-500 dark:text-gray-500 text-center max-w-[200px] leading-[1.5] transition-colors duration-300">Selesaikan semua materi untuk membuka sertifikat ini</p>
                    </div>

                    {/* Background content (blurred) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center filter blur-sm opacity-30 pointer-events-none">
                        <div className="absolute text-[200px] font-black text-amber-700/5 -right-5 -bottom-8 leading-none pointer-events-none select-none" style={{ fontFamily: '"Noto Serif JP", serif' }}>証</div>
                        <div className="w-14 h-14 rounded-full bg-slate-700 text-slate-500 flex items-center justify-center mb-2.5 transition-colors duration-300">
                            <WorkspacePremiumIcon sx={{ fontSize: 36 }} />
                        </div>
                        <h3 className="text-[1.5rem] font-black text-slate-500 dark:text-gray-500 text-center transition-colors duration-300">Level {item.level_name}</h3>
                    </div>

                    {/* Progress section (visible) */}
                    <div className="relative z-[3] bg-slate-50 dark:bg-[#0d1117] border-t border-slate-200 dark:border-gray-800 py-3.5 px-5 transition-colors duration-300">
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider transition-colors duration-300">Progres</span>
                            <span className="text-[10px] font-extrabold text-slate-700 dark:text-gray-400 transition-colors duration-300">{item.progress}%</span>
                        </div>
                        <AnimatedBar value={item.progress} unlocked={false} />
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-1.5 italic transition-colors duration-300">
                            {item.progress < 100
                                ? `Kurang ${100 - item.progress}% lagi untuk membuka sertifikat`
                                : 'Kuis belum dikerjakan — selesaikan sekarang!'}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

/* ─── Step Card ──────────────────────────────────────────────── */
function StepCard({ num, emoji, title, desc, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] p-8 relative text-center transition-all duration-300 shadow-sm hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-500/5 dark:hover:border-amber-500/30"
        >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                {num}
            </div>
            <div className="text-[40px] mb-4 block">{emoji}</div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-gray-100 mb-2 transition-colors duration-300">{title}</h4>
            <p className="text-[13px] text-slate-500 dark:text-gray-400 leading-[1.6] transition-colors duration-300">{desc}</p>
        </motion.div>
    );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function Certificate({ certificates = [] }) {
    return (
        <MotionConfig reducedMotion="user">
        <AuthenticatedLayout
            header={
                <h2 className="font-extrabold text-2xl text-slate-900 dark:text-gray-100 leading-tight tracking-tight transition-colors duration-300">
                    Koleksi Sertifikat
                </h2>
            }
        >
            <Head title="Sertifikat | TOKU-UP" />

            <div className="min-h-screen bg-surface-muted pb-20 font-['Inter','Noto_Sans_JP',sans-serif] transition-colors duration-300">

                {/* ── HERO ── */}
                <motion.div
                    className="relative w-full overflow-hidden px-6 pt-16 pb-20 flex flex-col items-center text-center bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50 dark:from-[#030712] dark:via-[#111827] dark:to-[#1c1006] border-b border-amber-200/50 dark:border-amber-500/15 transition-colors duration-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.18) 0%, transparent 70%)' }} />
                    <div className="absolute text-[340px] font-black text-amber-700/5 dark:text-amber-500/5 -right-[60px] -top-[40px] leading-none pointer-events-none select-none transition-colors duration-300" style={{ fontFamily: '"Noto Serif JP", serif' }}>証</div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.7 }}
                        className="relative z-10"
                    >
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-amber-400/10 dark:from-amber-500/15 dark:to-amber-400/15 border border-amber-500/30 dark:border-amber-500/40 rounded-full px-5 py-1.5 text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase mb-6 transition-colors duration-300">
                            <WorkspacePremiumIcon sx={{ fontSize: 14 }} />
                            Hall of Fame
                        </div>
                        <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-4 transition-colors duration-300">
                            Koleksi <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 dark:from-amber-400 dark:via-amber-500 dark:to-amber-300 bg-clip-text text-transparent transition-colors duration-300">Sertifikat</span>
                        </h1>
                        <p className="text-[1.05rem] text-slate-600 dark:text-gray-400 max-w-[520px] mx-auto leading-[1.7] transition-colors duration-300">
                            Setiap sertifikat adalah bukti nyata kerja kerasmu. Selesaikan semua level dan raih sertifikat resmi TOKU-UP.
                        </p>
                    </motion.div>
                </motion.div>

                {/* ── Cards ── */}
                <div className="max-w-6xl mx-auto px-6 pt-16">
                    {certificates.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="flex justify-center mb-6">
                                <ScrollIcon className="w-24 h-24 text-amber-500 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-pulse" />
                            </div>
                            <h2 className="text-[1.8rem] font-black text-slate-900 dark:text-gray-50 mb-3 transition-colors duration-300">Belum Ada Sertifikat</h2>
                            <p className="text-base text-slate-600 dark:text-gray-400 mb-8 leading-[1.7] transition-colors duration-300">
                                Mulai perjalanan belajar Bahasa Jepang-mu sekarang.<br />
                                Selesaikan materi dan kuis untuk mendapatkan sertifikat pertamamu!
                            </p>
                            <Link href="/user/kelas" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-br from-amber-500 to-amber-700 text-white font-extrabold rounded-xl text-[15px] shadow-[0_4px_0_#92400e,0_8px_24px_rgba(217,119,6,0.4)] transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5">
                                <ScrollIcon className="w-5 h-5" /> Mulai Belajar Sekarang
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-600 dark:text-amber-400 mb-2 transition-colors duration-300">Pencapaianmu</p>
                            <h2 className="text-[1.8rem] font-black text-slate-900 dark:text-gray-50 mb-10 transition-colors duration-300">Sertifikat Anda</h2>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-8 mb-20">
                                {certificates.map((item, idx) => (
                                    <CertCard key={item.level_id} item={item} idx={idx} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── How To ── */}
                <div className="mt-8 py-16 px-6 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent dark:via-amber-500/[0.04] border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-[11px] font-extrabold tracking-widest uppercase text-amber-600 dark:text-amber-400 mb-2 transition-colors duration-300">Panduan</p>
                        <h2 className="text-[1.6rem] font-black text-slate-900 dark:text-gray-50 mb-10 transition-colors duration-300">Cara Mendapatkan Sertifikat</h2>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
                            <StepCard
                                num="1"
                                emoji={<ScrollIcon className="w-8 h-8 text-indigo-500" />}
                                title="Selesaikan Materi"
                                desc="Pelajari seluruh konten pada setiap level hingga progres mencapai 100%."
                                delay={0}
                            />
                            <StepCard
                                num="2"
                                emoji={<KabutoIcon className="w-8 h-8 text-orange-500" />}
                                title="Kerjakan Kuis"
                                desc="Uji pemahamanmu dengan mengerjakan kuis di akhir setiap level pembelajaran."
                                delay={0.1}
                            />
                            <StepCard
                                num="3"
                                emoji={<EmojiEventsIcon className="w-8 h-8 text-yellow-500" />}
                                title="Raih Sertifikat"
                                desc="Sertifikat diterbitkan otomatis setelah semua materi dan kuis diselesaikan."
                                delay={0.2}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
        </MotionConfig>
    );
}
