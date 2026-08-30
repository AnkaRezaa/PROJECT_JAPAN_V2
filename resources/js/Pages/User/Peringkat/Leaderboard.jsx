import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DarumaIcon, KabutoIcon, SakuraIcon, ScrollIcon, ShurikenIcon, ToriiIcon } from '@/Components/JapaneseIcons';
import LeagueIcon from '@/Components/Gamification/LeagueIcon';
import { motion, MotionConfig } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StarsIcon from '@mui/icons-material/Stars';
import { MascotGuide } from '@/Components/User/UserVisuals';

const hashColor = (name) => {
    const colors = [
        'from-violet-500 to-purple-700',
        'from-cyan-500 to-brand-700',
        'from-emerald-500 to-green-700',
        'from-rose-500 to-pink-700',
        'from-orange-500 to-brand-700',
        'from-teal-500 to-cyan-700',
        'from-rose-500 to-violet-700',
        'from-fuchsia-500 to-pink-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ name, src, size = 'md', gradient }) => {
    const sizes = { sm: 'w-10 h-10 text-base', md: 'w-12 h-12 text-lg', lg: 'h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl', xl: 'h-14 w-14 text-2xl sm:h-20 sm:w-20 sm:text-3xl' };
    const bg = gradient || hashColor(name);
    const avatarIcons = [DarumaIcon, ToriiIcon, SakuraIcon, ScrollIcon, ShurikenIcon, KabutoIcon];
    const iconIndex = Math.abs([...name].reduce((total, character) => total + character.charCodeAt(0), 0)) % avatarIcons.length;
    const Icon = avatarIcons[iconIndex];
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div
            title={name}
            aria-label={`Avatar ${name}`}
            className={`${sizes[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-white shadow-lg transition-colors duration-300 ${bg}`}
        >
            {src && !imageFailed ? (
                <img
                    src={src}
                    alt={`Foto profil ${name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="h-full w-full rounded-full object-cover"
                />
            ) : (
                <Icon className="h-[58%] w-[58%]" />
            )}
        </div>
    );
};

const TABS = [
    { key: 'week', label: 'Weekly' },
    { key: 'all', label: 'All Time' },
];

const medalEmoji = (rank) => {
    if (rank === 1) return <KabutoIcon className="w-5 h-5 inline-block text-yellow-500" />;
    if (rank === 2) return <KabutoIcon className="w-5 h-5 inline-block text-gray-300" />;
    if (rank === 3) return <KabutoIcon className="w-5 h-5 inline-block text-amber-600" />;
    return null;
};

const rowVariants = {
    hidden: { opacity: 0, x: -24 },
    visible: (i) => ({ opacity: 1, x: 0, transition: { delay: Math.min(i * 0.025, 0.25), duration: 0.4, ease: 'easeOut' } }),
};

export default function Leaderboard({
    players = [],
    leagues = [],
    period = 'week',
    my_position: myPosition = null,
}) {
    const [activeLeague, setActiveLeague] = useState('all');
    const visiblePlayers = players
        .filter((player) => activeLeague === 'all' || player.league?.name === activeLeague)
        .map((player, index) => ({
            ...player,
            displayRank: index + 1,
        }));
    const leagueCounts = leagues.map((league) => ({
        ...league,
        count: players.filter((player) => player.league?.name === league.name).length,
    }));
    const top3 = visiblePlayers.filter(p => p.displayRank <= 3).sort((a, b) => a.displayRank - b.displayRank);

    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

    const podiumStyles = {
        1: { height: 'h-28 sm:h-40', gradient: 'from-amber-400 to-yellow-600', ring: 'ring-amber-400', glow: 'shadow-amber-400/50', avatarGrad: 'from-amber-300 to-yellow-500' },
        2: { height: 'h-20 sm:h-28', gradient: 'from-slate-400 to-slate-600 dark:from-slate-300 dark:to-gray-500', ring: 'ring-slate-400', glow: 'shadow-slate-400/30', avatarGrad: 'from-slate-400 to-slate-600 dark:from-slate-300 dark:to-gray-500' },
        3: { height: 'h-16 sm:h-20', gradient: 'from-amber-600 to-orange-800 dark:from-amber-700 dark:to-orange-900', ring: 'ring-amber-700', glow: 'shadow-amber-700/30', avatarGrad: 'from-amber-600 to-orange-700 dark:from-amber-700 dark:to-orange-800' },
    };
    const mePlayer = myPosition || visiblePlayers.find((player) => player.isMe) || players.find((player) => player.isMe);
    const playerAboveMe = mePlayer?.displayRank > 1
        ? visiblePlayers.find((player) => player.displayRank === mePlayer.displayRank - 1)
        : null;
    const xpToCatchUp = myPosition?.xp_to_next_rank ?? (playerAboveMe ? Math.max(0, (playerAboveMe.xp || 0) - (mePlayer?.xp || 0) + 1) : 0);
    const sortedLeagues = [...leagues].sort((a, b) => Number(a.min_xp || 0) - Number(b.min_xp || 0));
    const currentLeagueIndex = mePlayer?.league
        ? sortedLeagues.findIndex((league) => league.name === mePlayer.league.name)
        : -1;
    const nextLeague = currentLeagueIndex >= 0 ? sortedLeagues[currentLeagueIndex + 1] : null;
    const xpToNextLeague = nextLeague && mePlayer ? Math.max(0, Number(nextLeague.min_xp || 0) - Number(mePlayer.total_xp ?? mePlayer.xp ?? 0)) : null;

    const changePeriod = (nextPeriod) => {
        router.get(route('user.leaderboard'), { period: nextPeriod }, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    };

    return (
        <MotionConfig reducedMotion="user">
        <AuthenticatedLayout>
            <Head title="Papan Peringkat - TOKU-UP" />

            <div className="relative min-h-screen overflow-hidden bg-[#f5eadb] text-slate-900 transition-colors duration-300 dark:bg-gray-950 dark:text-white">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(245,158,11,0.18)_0%,transparent_28%),linear-gradient(230deg,rgba(220,38,38,0.10)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(120,53,15,0.05)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(120,53,15,0.04)_0_1px,transparent_1px_74px)] dark:bg-[linear-gradient(140deg,rgba(245,158,11,0.12)_0%,transparent_28%),linear-gradient(230deg,rgba(220,38,38,0.12)_0%,transparent_34%),repeating-linear-gradient(90deg,rgba(255,255,255,0.032)_0_1px,transparent_1px_74px),repeating-linear-gradient(0deg,rgba(255,255,255,0.026)_0_1px,transparent_1px_74px)]" />
                <div className="pointer-events-none absolute left-8 top-32 hidden text-[12rem] font-black leading-none text-amber-900/[0.055] dark:text-white/[0.035] lg:block">勝</div>
                <div className="pointer-events-none absolute right-8 top-[620px] hidden text-[12rem] font-black leading-none text-brand-900/[0.04] dark:text-white/[0.03] lg:block">位</div>
                {/* HERO */}
                <div className="relative z-10 px-4 pt-10 pb-8 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <EmojiEventsIcon className="text-amber-500 dark:text-amber-400" style={{ fontSize: 32 }} />
                            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 to-yellow-500 dark:from-amber-300 dark:to-yellow-500 bg-clip-text text-transparent transition-colors duration-300">
                                Papan Peringkat
                            </h1>
                            <EmojiEventsIcon className="text-amber-500 dark:text-amber-400" style={{ fontSize: 32 }} />
                        </div>
                        <p className="text-slate-500 dark:text-gray-400 text-sm mb-5 transition-colors duration-300">Bersaing dengan pemain lain dan raih posisi teratas!</p>

                        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 sm:pb-0">
                            <button
                                type="button"
                                onClick={() => setActiveLeague('all')}
                                className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                                    activeLeague === 'all'
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950'
                                        : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                Semua Liga
                            </button>
                            {leagueCounts.map((league) => (
                                <button
                                    key={league.name}
                                    type="button"
                                    onClick={() => setActiveLeague(league.name)}
                                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                                        activeLeague === league.name
                                            ? 'bg-gradient-to-r from-amber-400 to-brand-500 text-white shadow-lg shadow-brand-500/20'
                                            : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <LeagueIcon iconKey={league.icon} className="h-4 w-4" />
                                    {league.name}
                                    <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px]">{league.count}</span>
                                </button>
                            ))}
                        </div>

                    </div>
                </div>

                <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <main className="min-w-0">
                    <div className="my-6">
                        <MascotGuide
                            tone="amber"
                            title="Liga Mingguan"
                            message="Peringkat naik dari XP dan konsistensi. Selesaikan quest modul mingguan untuk mengejar posisi podium."
                        />
                    </div>
                    {/* Period tabs */}
                    <div className="flex gap-2 my-6 rounded-2xl border border-white/70 bg-white/60 p-1.5 shadow-xl shadow-amber-900/5 backdrop-blur-md transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/60">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => changePeriod(tab.key)}
                                aria-pressed={period === tab.key}
                                className={`min-h-11 flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-300 ${
                                    period === tab.key
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 dark:from-amber-500 dark:to-yellow-500 text-slate-900 dark:text-gray-950 shadow-lg shadow-amber-500/30'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* PODIUM */}
                    {podiumOrder.length >= 3 && (
                        <div className="relative mb-8 flex items-end justify-center gap-3 rounded-[2rem] border border-white/70 bg-white/35 px-4 pt-8 shadow-2xl shadow-amber-900/5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/35">
                            {podiumOrder.map((player) => {
                                const st = podiumStyles[player.displayRank];
                                const isFirst = player.displayRank === 1;
                                return (
                                    <motion.div
                                        key={`${player.name}-${player.displayRank}`}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: player.displayRank === 1 ? 0 : 0.15 }}
                                        className="flex flex-col items-center gap-2 flex-1"
                                    >
                                        {/* Crown for rank 1 */}
                                        {isFirst && (
                                            <motion.div
                                                animate={{ scale: [1, 1.15, 1] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                className="text-3xl"
                                            >
                                                <KabutoIcon className="w-5 h-5 inline-block text-yellow-400" />
                                            </motion.div>
                                        )}

                                        {/* Avatar + glow ring */}
                                        <div className={`relative ${isFirst ? 'ring-4 ring-offset-2 ring-offset-[#F8FAFC] dark:ring-offset-gray-950 ring-amber-400 rounded-full shadow-2xl shadow-amber-400/50 transition-colors duration-300' : ''}`}>
                                            {isFirst && (
                                                <motion.div
                                                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="absolute inset-0 rounded-full bg-amber-400/30 blur-md"
                                                />
                                            )}
                                            <Avatar name={player.name} src={player.avatar} size={isFirst ? 'xl' : 'lg'} gradient={st.avatarGrad} />
                                        </div>

                                        {/* Name + XP */}
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[80px] transition-colors duration-300">{player.name}</p>
                                            <span className={`text-xs font-bold bg-gradient-to-r ${st.gradient} bg-clip-text text-transparent`}>
                                                {player.xp?.toLocaleString()} XP
                                            </span>
                                        </div>

                                        {/* Podium base */}
                                        <div className={`w-full ${st.height} bg-gradient-to-t ${st.gradient} rounded-t-xl flex items-start justify-center pt-2 shadow-sm transition-colors duration-300`}>
                                            <span className="text-lg font-black text-white/90 dark:text-white/80">#{player.displayRank}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* RANKING TABLE */}
                    {podiumOrder.length > 0 && podiumOrder.length < 3 && (
                        <div className="mb-8 grid gap-3 sm:grid-cols-2">
                            {podiumOrder.map((player, index) => {
                                const st = podiumStyles[player.displayRank] || podiumStyles[3];

                                return (
                                    <motion.div
                                        key={`${player.name}-${player.displayRank}`}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, delay: index * 0.08 }}
                                        className="rounded-[1.75rem] border border-white/70 bg-white/72 p-4 shadow-xl shadow-amber-900/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/72"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg font-black text-white shadow-lg">
                                                #{player.displayRank}
                                            </div>
                                            <Avatar name={player.name} src={player.avatar} size="lg" gradient={st.avatarGrad} />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-900 dark:text-white">{player.name}</p>
                                                <p className="text-xs font-bold text-amber-600 dark:text-amber-300">{player.xp?.toLocaleString()} XP</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-gray-800">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${st.gradient}`}
                                                style={{ width: `${Math.min(100, Math.max(16, Number(player.progress || 0)))}%` }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {podiumOrder.length === 0 && (
                        <div className="mb-8 rounded-[2rem] border border-dashed border-amber-200 bg-white/60 p-6 text-center shadow-xl shadow-amber-900/5 backdrop-blur-md dark:border-amber-900/40 dark:bg-gray-900/60">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                                <EmojiEventsIcon />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">Belum ada peserta di liga ini</p>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                Peringkat akan terisi setelah pengguna menyelesaikan kuis atau flashcard.
                            </p>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 shadow-2xl shadow-amber-900/5 backdrop-blur-md transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/72">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center gap-2 transition-colors duration-300">
                            <StarsIcon className="text-amber-500 dark:text-amber-400" style={{ fontSize: 18 }} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300 transition-colors duration-300">Peringkat Lengkap</span>
                        </div>

                        {/* Sticky "isMe" row if in rest */}
                        {(() => {
                            const meRow = visiblePlayers.find(p => p.isMe && p.displayRank > 3);
                            if (!meRow) return null;
                            return (
                                <div className="sticky top-0 z-10 border-l-4 border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-gray-800 transition-colors duration-300">
                                    <span className="w-6 text-center text-sm font-bold text-amber-600 dark:text-amber-400 transition-colors duration-300">#{meRow.displayRank}</span>
                                    <Avatar name={meRow.name} src={meRow.avatar} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-amber-600 dark:text-amber-300 flex items-center gap-1 transition-colors duration-300">
                                            {meRow.name} <span className="text-xs bg-amber-200/50 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full transition-colors duration-300">Kamu</span>
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 transition-colors duration-300">{meRow.level}</p>
                                    </div>
                                    {meRow.streak > 0 && (
                                        <span className="flex items-center gap-0.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 px-2 py-1 rounded-full transition-colors duration-300">
                                            <LocalFireDepartmentIcon style={{ fontSize: 13 }} /> {meRow.streak}
                                        </span>
                                    )}
                                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 transition-colors duration-300">{meRow.xp?.toLocaleString()}</span>
                                </div>
                            );
                        })()}

                        {/* All rows */}
                        <div>
                            {visiblePlayers.map((player, i) => {
                                const medal = medalEmoji(player.displayRank);
                                const isTop3 = player.displayRank <= 3;
                                return (
                                    <motion.div
                                        key={`${player.name}-${player.displayRank}`}
                                        custom={i}
                                        variants={rowVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-gray-800/60 last:border-0 transition-colors duration-300 cursor-default
                                            ${player.isMe ? 'border-l-4 border-amber-400 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50' : 'hover:bg-slate-50 dark:hover:bg-gray-800'}
                                        `}
                                    >
                                        {/* Rank */}
                                        <div className="w-8 text-center flex-shrink-0">
                                            {medal ? (
                                                <span className="text-xl">{medal}</span>
                                            ) : (
                                                <span className={`text-sm font-bold ${player.isMe ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-gray-500'} transition-colors duration-300`}>
                                                    #{player.displayRank}
                                                </span>
                                            )}
                                        </div>

                                        {/* Avatar */}
                                        <Avatar name={player.name} src={player.avatar} size="sm" gradient={isTop3 ? podiumStyles[player.displayRank]?.avatarGrad : undefined} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${player.isMe ? 'text-amber-600 dark:text-amber-300' : 'text-slate-800 dark:text-white'} transition-colors duration-300`}>
                                                {player.name}
                                                {player.isMe && (
                                                    <span className="ml-1.5 text-xs bg-amber-200/50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-normal transition-colors duration-300">Kamu</span>
                                                )}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <p className="text-xs text-slate-500 dark:text-gray-500 truncate transition-colors duration-300">{player.level}</p>
                                                {player.league && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                                        <LeagueIcon iconKey={player.league.icon} className="h-3 w-3" />
                                                        {player.league.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Streak */}
                                        {player.streak > 0 && (
                                            <span className="flex items-center gap-0.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-2 py-1 rounded-full flex-shrink-0 transition-colors duration-300">
                                                <LocalFireDepartmentIcon style={{ fontSize: 13 }} />
                                                {player.streak}
                                            </span>
                                        )}

                                        {/* XP */}
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-base font-extrabold ${player.isMe ? 'text-amber-600 dark:text-amber-400' : isTop3 ? 'text-amber-500 dark:text-yellow-400' : 'text-slate-800 dark:text-white'} transition-colors duration-300`}>
                                                {player.xp?.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-gray-600 transition-colors duration-300">XP</p>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {visiblePlayers.length === 0 && (
                                <div className="py-16 text-center text-slate-500 dark:text-gray-600 transition-colors duration-300">
                                    <EmojiEventsIcon style={{ fontSize: 48 }} className="mb-3 opacity-30" />
                                    <p>Belum ada pemain</p>
                                </div>
                            )}
                        </div>
                    </div>
                    </main>

                    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                        <div className="rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-2xl shadow-amber-900/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/72">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Posisi Saya</p>
                            {mePlayer ? (
                                <div className="mt-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={mePlayer.name} src={mePlayer.avatar} size="lg" />
                                        <div className="min-w-0">
                                            <p className="truncate text-lg font-black text-slate-900 dark:text-white">{mePlayer.name}</p>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">Rank #{mePlayer.displayRank || mePlayer.rank}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30">
                                            <p className="text-lg font-black text-amber-600 dark:text-amber-300">{Number(mePlayer.xp || 0).toLocaleString()}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">XP</p>
                                        </div>
                                        <div className="rounded-2xl bg-orange-50 p-3 dark:bg-orange-950/30">
                                            <p className="text-lg font-black text-orange-600 dark:text-orange-300">{mePlayer.streak || 0}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Streak</p>
                                        </div>
                                    </div>
                                    {mePlayer.league && (
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                            <LeagueIcon iconKey={mePlayer.league.icon} className="h-4 w-4" />
                                            {mePlayer.league.name}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-400">Data posisi kamu belum tersedia di leaderboard.</p>
                            )}
                        </div>

                        <div className="rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-2xl shadow-amber-900/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/72">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">Target Berikutnya</p>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950/60">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">Kejar Peringkat</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                                        {myPosition?.next_rank_name
                                            ? `${xpToCatchUp.toLocaleString()} XP lagi untuk mengejar ${myPosition.next_rank_name}.`
                                            : playerAboveMe
                                            ? `${xpToCatchUp.toLocaleString()} XP lagi untuk mengejar ${playerAboveMe.name}.`
                                            : 'Kamu sudah di posisi teratas pada filter ini.'}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950/60">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">Liga Berikutnya</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                                        {nextLeague && xpToNextLeague !== null ? `${xpToNextLeague.toLocaleString()} XP menuju ${nextLeague.name}.` : 'Kamu berada di liga tertinggi atau liga belum tersedia.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
        </MotionConfig>
    );
}
