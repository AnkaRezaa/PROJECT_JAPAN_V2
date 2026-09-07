import React, { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { EmptyState, FieldLabel, PageHeading, PrototypeBadge, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';

const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export default function Ranking({ ranking = [], sessions = [], levels = [], active_exam }) {
    const [session, setSession] = useState(active_exam?.session || sessions[0] || '');
    const [level, setLevel] = useState(active_exam?.level || levels[0] || '');
    const filtered = useMemo(
        () => ranking.filter((item) => item.level === level && session === active_exam?.session),
        [active_exam?.session, level, ranking, session],
    );
    const podium = [filtered[1], filtered[0], filtered[2]];

    return (
        <ExamPortalLayout>
            <Head title="Ranking Ujian" />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                    <PageHeading eyebrow="Hasil simulasi" title="Ranking Ujian" description="Bandingkan hasil pada sesi, level, dan naskah simulasi yang sama." action={<PrototypeBadge />} />
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
                <div className="grid gap-4 rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:grid-cols-2 sm:p-5">
                    <label><FieldLabel>Sesi ujian</FieldLabel><select value={session} onChange={(event) => setSession(event.target.value)} className={inputClassName}>{sessions.filter((item) => item !== 'Paket Latihan').map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label><FieldLabel>Level</FieldLabel><select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClassName}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>

                {filtered.length > 0 ? (
                    <>
                        <section className="mt-8 border-y border-[#dbe5df] py-8 dark:border-white/10" aria-label="Tiga peringkat teratas">
                            <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-5">
                                {podium.map((item, index) => {
                                    if (!item) return <div key={index} />;
                                    const place = [2, 1, 3][index];
                                    const height = place === 1 ? 'h-36 sm:h-44' : place === 2 ? 'h-28 sm:h-36' : 'h-24 sm:h-32';
                                    return (
                                        <div key={item.rank} className="text-center">
                                            <span className={`mx-auto grid place-items-center rounded-full border-4 border-white text-sm font-black shadow-md dark:border-[#142019] ${place === 1 ? 'h-16 w-16 bg-[#f5bd32] text-[#483400] sm:h-20 sm:w-20' : 'h-12 w-12 bg-[#dff5e5] text-brand-800 sm:h-16 sm:w-16 dark:bg-green-950/60 dark:text-green-200'}`}>{initials(item.name)}</span>
                                            <p className="mt-3 truncate text-xs font-black sm:text-sm">{item.name}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.total}/180</p>
                                            <div className={`mt-3 flex ${height} items-start justify-center rounded-t-lg border border-b-0 border-[#c8ded0] pt-4 dark:border-white/10 ${place === 1 ? 'bg-[#f5bd32] text-[#483400]' : 'bg-[#dff5e5] text-brand-800 dark:bg-green-950/50 dark:text-green-200'}`}>
                                                <span className="text-2xl font-black sm:text-4xl">{place}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="mt-8 overflow-hidden rounded-lg border border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#142019]">
                            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
                                <EmojiEventsRoundedIcon className="text-[#d39a00]" />
                                <div><h2 className="font-black">Papan peringkat</h2><p className="text-xs text-gray-500 dark:text-gray-400">Simulasi penuh · {session} · JLPT {level}</p></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-[760px] w-full text-left text-sm">
                                    <thead className="bg-[#f1f6f3] text-xs uppercase text-gray-600 dark:bg-white/5 dark:text-gray-300"><tr><th className="px-5 py-3">#</th><th className="px-5 py-3">Peserta</th><th className="px-4 py-3">Kosakata</th><th className="px-4 py-3">Tata Bahasa</th><th className="px-4 py-3">Listening</th><th className="px-4 py-3">Total</th><th className="px-5 py-3">Durasi</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                                        {filtered.map((item) => (
                                            <tr key={item.rank} className="hover:bg-[#f7faf8] dark:hover:bg-white/5">
                                                <td className="px-5 py-4 font-black text-brand-700 dark:text-green-300">{item.rank}</td>
                                                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f8ec] text-xs font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{initials(item.name)}</span><strong>{item.name}</strong></div></td>
                                                <td className="px-4 py-4">{item.vocabulary}</td><td className="px-4 py-4">{item.grammar_reading}</td><td className="px-4 py-4">{item.listening}</td><td className="px-4 py-4 font-black">{item.total}</td><td className="px-5 py-4 text-gray-500 dark:text-gray-400">{item.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                ) : <div className="mt-8"><EmptyState title="Ranking belum tersedia" description="Belum ada hasil valid untuk kombinasi sesi dan level ini." /></div>}
            </div>
        </ExamPortalLayout>
    );
}
