import React from 'react';
import { motion } from 'framer-motion';
import theme from '@/Components/theme/themes';
import { DarumaIcon, SakuraIcon, ToriiIcon, KabutoIcon, ShurikenIcon, ScrollIcon, HitodamaIcon } from '@/Components/UI/JapaneseIcons';

const themeGradient = theme.ctaBg || 'from-brand-600 to-brand-700';

export function SeasonalScene({ title, subtitle, label = 'TOKU-UP Quest', icon = 'torii', children, compact = false }) {
    const Icon = icon === 'daruma' ? DarumaIcon : icon === 'kabuto' ? KabutoIcon : icon === 'scroll' ? ScrollIcon : ToriiIcon;

    return (
        <section className={`relative overflow-hidden rounded-lg border border-white/70 bg-gradient-to-br ${theme.heroBg || 'from-brand-100 via-brand-300 to-learning-100'} p-6 ${theme.heroText || 'text-white'} shadow-lg dark:border-white/10 ${compact ? 'lg:p-6' : 'lg:p-8'}`}>
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            <SakuraIcon className="absolute right-8 top-8 h-8 w-8 rotate-12 text-white/35" />
            <ToriiIcon className="absolute bottom-5 right-10 h-24 w-24 text-white/10" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] backdrop-blur">
                        <Icon className="h-4 w-4" />
                        {label}
                    </div>
                    <h1 className={`${compact ? 'text-2xl' : 'text-3xl lg:text-5xl'} font-black leading-tight tracking-tight`}>
                        {title}
                    </h1>
                    {subtitle && <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-white/80">{subtitle}</p>}
                </div>
                {children}
            </div>
        </section>
    );
}

export function MascotGuide({ title = 'Sensei Daruma', message, tone = 'red' }) {
    const toneClass = tone === 'green'
        ? 'from-emerald-100 to-teal-50 text-emerald-700 border-emerald-100'
        : tone === 'amber'
            ? 'from-amber-100 to-orange-50 text-amber-700 border-amber-100'
            : 'from-brand-100 to-brand-50 text-brand-700 border-brand-100';

    return (
        <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${toneClass} p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950`}>
            <div className="absolute -right-6 -bottom-8 text-8xl opacity-10">学</div>
            <div className="relative flex items-start gap-4">
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-900"
                >
                    <DarumaIcon className="h-8 w-8" />
                </motion.div>
                <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{title}</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">{message}</p>
                </div>
            </div>
        </div>
    );
}

export function LearningStatBadge({ icon, label, value, color = 'red' }) {
    const colorClass = {
        red: 'from-brand-500 to-brand-700 shadow-brand-500/20',
        brand: 'from-brand-500 to-brand-700 shadow-brand-500/20',
        amber: 'from-amber-400 to-orange-500 shadow-amber-500/20',
        green: 'from-emerald-400 to-teal-500 shadow-emerald-500/20',
        violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/20',
    }[color] || 'from-brand-500 to-brand-700 shadow-brand-500/20';

    return (
        <div className="rounded-2xl border border-gray-100 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${colorClass} text-white shadow-lg`}>
                {icon}
            </div>
            <p className="text-2xl font-black text-gray-950 dark:text-white">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        </div>
    );
}

export function RewardSummary({ title, message, stats = [], status = 'success' }) {
    const Icon = status === 'success' ? KabutoIcon : status === 'review' ? ShurikenIcon : HitodamaIcon;

    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${themeGradient}`} />
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-yellow-200/30 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
                <motion.div
                    initial={{ scale: 0.8, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`mb-5 flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br ${themeGradient} text-white shadow-xl`}
                >
                    <Icon className="h-10 w-10" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-950 dark:text-white">{title}</h2>
                <p className="mt-2 max-w-md text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">{message}</p>
                {stats.length > 0 && (
                    <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                        {stats.map((item) => (
                            <div key={item.label} className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950">
                                <p className="text-xl font-black text-gray-950 dark:text-white">{item.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{item.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function FloatingLearningDecor() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <SakuraIcon className="absolute left-[8%] top-[18%] h-6 w-6 rotate-12 text-pink-300/50" />
            <ShurikenIcon className="absolute right-[12%] top-[28%] h-7 w-7 text-brand-300/30" />
            <ScrollIcon className="absolute bottom-[14%] left-[16%] h-8 w-8 -rotate-12 text-amber-300/40" />
        </div>
    );
}
