import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ScrollIcon, KabutoIcon, ShurikenIcon, HitodamaIcon, DarumaIcon } from '@/Components/UI/JapaneseIcons';
import { Head, Link } from '@inertiajs/react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import theme from '@/Components/theme/themes';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import LockIcon from '@mui/icons-material/Lock';
import DiamondIcon from '@mui/icons-material/Diamond';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// Kategori visual per tipe kuis
const QUIZ_TYPE_META = {
    multiple_choice: { emoji: <ShurikenIcon className="w-6 h-6" />, label: 'Pilihan Ganda', color: 'from-brand-500 to-rose-600', glow: 'shadow-brand-400/30 dark:shadow-green-950/30', badge: 'bg-brand-50 text-brand-600 dark:bg-[#12351f] dark:text-green-200' },
    fill_blank:      { emoji: <ScrollIcon className="w-6 h-6" />, label: 'Isi Jawaban',   color: 'from-rose-500 to-violet-600', glow: 'shadow-indigo-400/30 dark:shadow-indigo-900/30', badge: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
    listening:       { emoji: <HitodamaIcon className="w-6 h-6" />, label: 'Menyimak',      color: 'from-violet-500 to-purple-600', glow: 'shadow-violet-400/30 dark:shadow-violet-900/30', badge: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
    default:         { emoji: <ScrollIcon className="w-6 h-6" />, label: 'Kuis',          color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-400/30 dark:shadow-amber-900/30', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
};

const getQuizMeta = (type) => QUIZ_TYPE_META[type] || QUIZ_TYPE_META.default;

// Difficulty stars based on question count
const DifficultyStars = ({ count }) => {
    const d = count <= 5 ? 1 : count <= 15 ? 2 : 3;
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3].map(i => (
                <span key={i} className={`text-xs transition-colors duration-300 ${i <= d ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}><ShurikenIcon className="w-3 h-3" /></span>
            ))}
        </div>
    );
};

export default function DaftarKuis({ quizzes = [] }) {
    const [hoveredId, setHoveredId] = useState(null);
    const [filter, setFilter] = useState('all');

    const available = quizzes.filter(q => q.status === 'available').length;
    const totalXP = available * 50;

    const filtered = filter === 'all' ? quizzes
        : filter === 'available' ? quizzes.filter(q => q.status === 'available')
        : quizzes.filter(q => q.status === 'locked');

    return (
        <MotionConfig reducedMotion="user">
        <AuthenticatedLayout>
            <Head title="Arena Kuis" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">

                {/* ── HERO BANNER ── */}
                <div className="relative overflow-hidden">
                    {/* Background layers */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.heroBg} dark:from-gray-900 dark:via-brand-950/40 dark:to-gray-950 transition-colors duration-300`} />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.07] transition-opacity duration-300"
                        style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                    {/* Giant kanji watermark */}
                    <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 text-[280px] font-black leading-none text-black/[0.03] select-none transition-colors duration-300 sm:block dark:text-white/[0.04]">
                        試
                    </div>

                    <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-14">
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className={`mb-5 inline-flex items-center gap-2 rounded-full ${theme.landingBadgeBg} dark:bg-brand-500/20 border dark:border-brand-500/30 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] ${theme.landingBadgeText} dark:text-brand-400 transition-colors duration-300`}>
                            <span className={`w-2 h-2 rounded-full ${theme.landingBadgeDot} dark:bg-brand-400 animate-pulse transition-colors duration-300`} />
                                    ARENA EVALUASI
                        </motion.div>

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
                            <div className="flex-1">
                                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                                    className="mb-2 text-2xl font-black leading-tight tracking-normal text-gray-900 transition-colors duration-300 sm:mb-3 sm:text-5xl lg:text-6xl dark:text-white">
                                    Uji <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.landingGradText} dark:from-brand-400 dark:to-amber-400`}>実力</span>mu
                                    <br className="hidden sm:block" /> Sekarang!
                                </motion.h1>
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                                    className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium max-w-lg leading-relaxed transition-colors duration-300">
                                    Kumpulkan XP dari setiap kuis yang berhasil kamu taklukkan. Skor sempurna memberikan <span className="text-amber-500 dark:text-amber-400 font-black transition-colors duration-300">bonus XP</span> tambahan!
                                </motion.p>
                            </div>

                            {/* Stats row */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                                className="grid w-full shrink-0 grid-cols-3 gap-2 sm:w-auto sm:gap-4">
                                <div className="min-w-0 rounded-2xl border border-black/5 bg-white/60 px-2 py-3 text-center shadow-sm backdrop-blur transition-colors duration-300 sm:px-5 sm:py-4 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                                    <p className="text-xl font-black text-gray-900 transition-colors duration-300 sm:text-2xl dark:text-white">{available}</p>
                                    <p className="mt-0.5 break-words text-[9px] font-black uppercase tracking-[0.08em] text-gray-500 transition-colors duration-300 sm:text-[10px] sm:tracking-widest dark:text-gray-400">Tersedia</p>
                                </div>
                                <div className="min-w-0 rounded-2xl border border-black/5 bg-white/60 px-2 py-3 text-center shadow-sm backdrop-blur transition-colors duration-300 sm:px-5 sm:py-4 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                                    <p className="flex justify-center gap-1 break-words text-xl font-black text-amber-500 transition-colors duration-300 sm:text-2xl dark:text-amber-400"><BoltIcon sx={{ fontSize: 18 }} />{totalXP}</p>
                                    <p className="mt-0.5 break-words text-[9px] font-black uppercase tracking-[0.08em] text-gray-500 transition-colors duration-300 sm:text-[10px] sm:tracking-widest dark:text-gray-400">Max XP</p>
                                </div>
                                <div className="min-w-0 rounded-2xl border border-black/5 bg-white/60 px-2 py-3 text-center shadow-sm backdrop-blur transition-colors duration-300 sm:px-5 sm:py-4 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                                    <p className="text-xl font-black text-gray-900 transition-colors duration-300 sm:text-2xl dark:text-white">{quizzes.length}</p>
                                    <p className="mt-0.5 break-words text-[9px] font-black uppercase tracking-[0.08em] text-gray-500 transition-colors duration-300 sm:text-[10px] sm:tracking-widest dark:text-gray-400">Total Kuis</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="relative z-10 -mt-5 min-h-[60vh] rounded-t-3xl bg-white transition-colors duration-300 sm:-mt-6 sm:rounded-t-[2.5rem] dark:bg-gray-950">
                    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">

                        {/* Filter bar */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
                            {[
                                { key: 'all',       label: 'Semua Kuis',  count: quizzes.length },
                                { key: 'available', label: ' Tersedia', count: quizzes.filter(q => q.status === 'available').length },
                                { key: 'locked',    label: ' Terkunci', count: quizzes.filter(q => q.status === 'locked').length },
                            ].map(f => (
                                <button key={f.key} onClick={() => setFilter(f.key)}
                                    className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-sm font-black transition-all border
                                        ${filter === f.key
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-md'
                                            : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}>
                                    {f.label}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors duration-300 ${filter === f.key ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        {f.count}
                                    </span>
                                </button>
                            ))}
                        </motion.div>

                        {/* Empty state */}
                        {filtered.length === 0 && (
                            <div className="text-center py-24 transition-colors duration-300">
                                <div className="flex justify-center mb-4"><DarumaIcon className="w-16 h-16 text-gray-300" /></div>
                                <p className="font-black text-gray-400 text-xl transition-colors duration-300">Tidak ada kuis untuk ditampilkan.</p>
                            </div>
                        )}

                        {/* Quiz grid */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((quiz, idx) => {
                                    const meta = getQuizMeta(quiz.type);
                                    const isLocked = quiz.status === 'locked';
                                    const isPremiumLock = ['premium', 'subscription_required'].includes(quiz.lockReason);
                                    const lockLabel = quiz.lockReason === 'kloter_locked'
                                            ? 'Menunggu jadwal kloter'
                                            : 'Selesaikan materi dulu';
                                    const isHovered = hoveredId === quiz.id;

                                    return (
                                        <motion.div
                                            key={quiz.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onHoverStart={() => !isLocked && setHoveredId(quiz.id)}
                                            onHoverEnd={() => setHoveredId(null)}
                                            className={`relative group rounded-3xl border overflow-hidden transition-all duration-300
                                                ${isLocked
                                                    ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:-translate-y-1.5 hover:shadow-2xl hover:border-transparent'
                                                }`}
                                            style={!isLocked && isHovered ? {
                                                boxShadow: `0 20px 60px -15px rgba(220,38,38,0.25)`
                                            } : {}}
                                        >
                                            {/* Top accent bar */}
                                            <div className={`h-1 w-full bg-gradient-to-r transition-colors duration-300 ${isLocked ? 'from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800' : meta.color}`} />

                                            <div className={`p-4 sm:p-6 transition-opacity duration-300 ${isLocked ? 'opacity-70' : ''}`}>

                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-4 gap-3">
                                                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-colors duration-300 ${isLocked ? 'bg-gray-200 dark:bg-gray-800 grayscale' : `bg-gradient-to-br ${meta.color} ${meta.glow} shadow-lg`}`}>
                                                        {isLocked ? (isPremiumLock ? '' : '') : meta.emoji}
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 items-end">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors duration-300 ${isLocked ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : meta.badge}`}>
                                                            {meta.label}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase transition-colors duration-300">
                                                    {quiz.level || 'Latihan'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 className={`font-black text-base leading-snug mb-2 line-clamp-2 transition-colors duration-300 ${isLocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {quiz.title}
                                                </h3>

                                                {/* Desc */}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem] transition-colors duration-300">
                                            {quiz.description || `Evaluasi pemahaman ${meta.label.toLowerCase()} materi kelas.`}
                                                </p>

                                                {/* Stats row */}
                                                <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                                                    <span className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                                        <AccessTimeIcon sx={{ fontSize: 14 }} />{quiz.durationEstimate || '10 Menit'}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                                        <QuizIcon sx={{ fontSize: 14 }} />{quiz.totalQuestions ?? 0} Soal
                                                    </span>
                                                    <DifficultyStars count={quiz.totalQuestions ?? 0} />
                                                    <span className="ml-auto flex items-center gap-1 text-xs font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg transition-colors duration-300">
                                                        <BoltIcon sx={{ fontSize: 12 }} />+{quiz.xpReward ?? 50} XP
                                                    </span>
                                                </div>

                                                {/* CTA */}
                                                {isLocked ? (
                                                    isPremiumLock ? (
                                                        <Link href={route('pricing')}
                                                            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${theme.ctaBg || 'from-yellow-400 to-amber-500'} px-4 py-3 text-sm font-black text-white shadow-md shadow-amber-300/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:from-yellow-500 dark:to-amber-600`}>
                                                            <DiamondIcon sx={{ fontSize: 16 }} /> Upgrade Premium
                                                        </Link>
                                                    ) : (
                                                        <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-black text-gray-500 transition-colors duration-300 dark:bg-gray-800 dark:text-gray-400">
                                                            <LockIcon sx={{ fontSize: 14 }} /> {lockLabel}
                                                        </div>
                                                    )
                                                ) : (
                                                    <Link href={route('user.quizzes.show', quiz.id)}
                                                        className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${meta.color} px-4 py-3.5 text-sm font-black text-white shadow-md transition-all duration-300 hover:brightness-110 active:scale-[0.98] ${meta.glow}`}
                                                    >
                                                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                                                        Mulai Kuis
                                                    </Link>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Leaderboard teaser */}
                        {quizzes.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                className="mt-12 rounded-3xl overflow-hidden">
                                <div className={`bg-gradient-to-r ${theme.heroBg} dark:from-gray-900 dark:to-gray-800 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/30">
                                            <KabutoIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 dark:text-white text-base transition-colors duration-300">Cek Peringkatmu</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium transition-colors duration-300">Lihat seberapa jauh kamu dibanding peserta lain</p>
                                        </div>
                                    </div>
                                    <Link href={route('user.leaderboard')}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-black/10 dark:border-white/20 text-gray-900 dark:text-white font-black text-sm hover:bg-white/80 dark:hover:bg-white/20 transition-all duration-300 whitespace-nowrap shadow-sm dark:shadow-none backdrop-blur-sm`}>
                                        <EmojiEventsIcon sx={{ fontSize: 16 }} /> Buka Leaderboard
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
        </MotionConfig>
    );
}
