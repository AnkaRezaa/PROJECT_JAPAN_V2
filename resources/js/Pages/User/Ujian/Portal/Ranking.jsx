import React from 'react';
import { Head, router } from '@inertiajs/react';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ExamPortalLayout from '@/Layouts/ExamPortalLayout';
import { EmptyState, FieldLabel, PageHeading, examCategoryLabel, inputClassName } from '@/Components/Features/ExamPortal/ExamPortalUI';

const initials = (name = '') => String(name || '').trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export default function Ranking({ ranking = [], ranking_sessions = [], ranking_session_id }) {
    const session = ranking_sessions.find((item) => item.id === Number(ranking_session_id));
    const filtered = ranking;
    const sections = filtered[0]?.sections || [];
    const podium = [filtered[1], filtered[0], filtered[2]];

    return (
        <ExamPortalLayout>
            <Head title="Ranking Ujian" />
            <section className="border-b border-[#dbe5df] bg-white dark:border-white/10 dark:bg-[#111b16]">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                    <PageHeading eyebrow="Hasil simulasi" title="Ranking Ujian" description="Bandingkan hasil pada sesi, level, dan naskah simulasi yang sama." />
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
                <div className="rounded-lg border border-[#dbe5df] bg-white p-4 dark:border-white/10 dark:bg-[#142019] sm:p-5">
                    <label><FieldLabel>Sesi ujian</FieldLabel><select value={session?.id || ''} disabled={!ranking_sessions.length} onChange={(event) => router.get(route('user.exams.ranking'), { session_id: event.target.value }, { preserveScroll: true })} className={inputClassName}><option value="" disabled>Pilih sesi</option>{ranking_sessions.map((item) => <option key={item.id} value={item.id}>{item.exam_title} · {item.name} · {examCategoryLabel(item)}</option>)}</select></label>
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
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.total}/{item.max_score}</p>
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
                                <div><h2 className="font-black">Papan peringkat</h2><p className="text-xs text-gray-500 dark:text-gray-400">Simulasi penuh · {session?.name} · {session ? examCategoryLabel(session) : ''}</p></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-[760px] w-full text-left text-sm">
                                    <thead className="bg-[#f1f6f3] text-xs uppercase text-gray-600 dark:bg-white/5 dark:text-gray-300"><tr><th className="px-5 py-3">#</th><th className="px-5 py-3">Peserta</th>{sections.map((section) => <th key={section.key} className="px-4 py-3">{section.title}</th>)}<th className="px-4 py-3">Total</th><th className="px-5 py-3">Durasi</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                                        {filtered.map((item) => (
                                            <tr key={item.rank} className="hover:bg-[#f7faf8] dark:hover:bg-white/5">
                                                <td className="px-5 py-4 font-black text-brand-700 dark:text-green-300">{item.rank}</td>
                                                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f8ec] text-xs font-black text-brand-800 dark:bg-green-950/50 dark:text-green-200">{initials(item.name)}</span><strong>{item.name}</strong></div></td>
                                                {sections.map((section) => <td key={section.key} className="px-4 py-4">{item.sections?.find((score) => score.key === section.key)?.score ?? '-'}</td>)}<td className="px-4 py-4 font-black">{item.total}/{item.max_score}</td><td className="px-5 py-4 text-gray-500 dark:text-gray-400">{item.duration}</td>
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
