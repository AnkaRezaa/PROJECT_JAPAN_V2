import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function BulletCircle({
    jp,
    jpSmall = false,
    furigana,
    label,
    gradient,
    ringActive = false,
    locked = false,
    done = false,
    badge = null,
    href = null,
    onClick = null,
}) {
    const inner = (
        <>
            <span
                className={`relative flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full text-white transition-transform duration-150 group-active:scale-95 ${
                    locked
                        ? 'bg-gradient-to-b from-gray-300 to-gray-400 text-gray-600 shadow-sm dark:from-gray-700 dark:to-gray-800 dark:text-gray-300'
                        : 'shadow-[0_4px_10px_rgba(25,35,25,0.28)] group-hover:-translate-y-0.5'
                } ${ringActive ? 'ring-[3px] ring-white outline outline-[2.5px] outline-indigo-700 dark:ring-gray-900' : ''}`}
                style={locked ? undefined : { background: gradient }}
            >
                <span className={`font-extrabold leading-[1.12] text-center whitespace-pre-line ${jpSmall ? 'text-[14px]' : 'text-[16px]'}`}>
                    {jp}
                </span>
                {furigana && (
                    <span className="mt-0.5 text-[7.5px] font-bold opacity-95 leading-none">{furigana}</span>
                )}
                {locked && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-600 shadow dark:bg-gray-900 dark:text-gray-300">
                        <LockIcon sx={{ fontSize: 12 }} />
                    </span>
                )}
                {!locked && done && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-600 shadow dark:bg-gray-900 dark:text-emerald-400">
                        <CheckCircleIcon sx={{ fontSize: 14 }} />
                    </span>
                )}
                {!locked && !done && badge !== null && badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-gray-900 shadow dark:bg-gray-900 dark:text-white">
                        {badge}
                    </span>
                )}
            </span>
            <span className="mt-1 max-w-[78px] text-center text-[10px] font-extrabold leading-tight text-gray-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.85)] dark:text-white dark:drop-shadow-none">
                {label}
            </span>
        </>
    );

    const commonClass = `group flex min-w-[68px] flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl p-0.5 ${
        locked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
    }`;

    if (href && !locked) {
        return (
            <Link href={href} className={commonClass} aria-label={label}>
                {inner}
            </Link>
        );
    }

    return (
        <button
            type="button"
            disabled={locked}
            onClick={onClick}
            aria-label={label}
            className={commonClass}
        >
            {inner}
        </button>
    );
}

export default function DayBulletPopup({
    day,
    onClose,
    onOpenGrammarQuiz,
    onOpenDokkai,
    onShowFullDetail,
}) {
    const [mojiExpanded, setMojiExpanded] = useState(false);

    const dayLocked = ['locked', 'unavailable'].includes(day.status);
    const quizLocked = dayLocked || Boolean(day.checkpoint_summary?.locked) || !day.quiz_url;
    const kanjiUrl = day.moji_goi?.kanji_url || day.quiz_url;
    const kotobaUrl = day.moji_goi?.kotoba_url || day.quiz_url;
    const kanjiDone = Boolean(day.moji_goi?.kanji_done);
    const kotobaDone = Boolean(day.moji_goi?.kotoba_done);
    const vocabPassed = day.moji_goi?.moji_goi_done ?? (day.checkpoint_summary?.progress_status === 'passed');

    const grammarLessons = day.grammar_lessons || [];
    const hasGrammar = grammarLessons.length > 0;
    const grammarDone = hasGrammar && grammarLessons.every((lesson) => lesson.done);

    const mixedSummary = day.mixed_quiz_summary;
    const mixedLocked = mixedSummary
        ? mixedSummary.locked
        : (dayLocked || Boolean(day.checkpoint_summary?.locked));
    const mixedDone = Boolean(mixedSummary?.is_done);

    const dokkaiLessons = day.dokkai_lessons || [];
    const exam = day.exam_summary;

    const handleGrammarClick = () => {
        if (!hasGrammar || dayLocked) return;
        if (grammarLessons.length === 1) {
            onClose?.();
            onOpenGrammarQuiz?.(day.id, grammarLessons[0].id);
            return;
        }
        onShowFullDetail?.();
    };

    const handleDokkaiClick = () => {
        if (dokkaiLessons.length === 0 || dayLocked) return;
        if (dokkaiLessons.length === 1) {
            onClose?.();
            onOpenDokkai?.(dokkaiLessons[0].id);
            return;
        }
        onShowFullDetail?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={`Menu cepat Hari ${day.day_number}`}
            className="flex flex-col items-center gap-2 rounded-3xl border border-white/70 bg-white/85 px-2.5 py-3 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-900/90"
        >
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-black text-brand-800 dark:bg-green-900/60 dark:text-green-200">
                Hari {day.day_number}
            </span>

            <BulletCircle
                jp={'文字\n語彙'}
                jpSmall
                furigana="もじごい"
                label="Moji-Goi"
                gradient="linear-gradient(180deg, #818CF8, #4338CA)"
                ringActive={mojiExpanded}
                locked={quizLocked}
                done={vocabPassed}
                onClick={() => setMojiExpanded((prev) => !prev)}
            />

            <AnimatePresence initial={false}>
                {mojiExpanded && !quizLocked && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center gap-2 overflow-hidden py-0.5"
                    >
                        <BulletCircle
                            jp="漢字"
                            furigana="かんじ"
                            label="Kanji"
                            gradient="linear-gradient(180deg, #A78BFA, #6D28D9)"
                            done={kanjiDone}
                            badge={day.moji_goi?.kanji_count || null}
                            href={kanjiUrl}
                        />
                        <BulletCircle
                            jp="言葉"
                            furigana="ことば"
                            label="Kotoba"
                            gradient="linear-gradient(180deg, #F472B6, #DB2777)"
                            done={kotobaDone}
                            badge={day.moji_goi?.kotoba_count || null}
                            href={kotobaUrl}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {hasGrammar && (
                <BulletCircle
                    jp="文法"
                    furigana="ぶんぽう"
                    label="Grammar"
                    gradient="linear-gradient(180deg, #38BDF8, #0284C7)"
                    locked={dayLocked}
                    done={grammarDone}
                    badge={grammarLessons.length > 1 ? grammarLessons.length : null}
                    onClick={handleGrammarClick}
                />
            )}

            {dokkaiLessons.length > 0 && (
                <BulletCircle
                    jp="読解"
                    furigana="どっかい"
                    label="Dokkai"
                    gradient="linear-gradient(180deg, #34D399, #059669)"
                    locked={dayLocked}
                    done={dokkaiLessons.every((item) => item.done)}
                    badge={dokkaiLessons.length > 1 ? dokkaiLessons.length : null}
                    onClick={handleDokkaiClick}
                />
            )}

            <BulletCircle
                jp="総合"
                furigana="そうごう"
                label="Kuis Campuran"
                gradient="linear-gradient(180deg, #FBBF24, #F97316)"
                locked={mixedLocked}
                done={mixedDone}
                href={!mixedLocked ? route('user.kuis-campuran.show', day.id) : null}
            />

            {exam && (
                <BulletCircle
                    jp="試験"
                    furigana="しけん"
                    label="Ujian"
                    gradient="linear-gradient(180deg, #FDE047, #CA8A04)"
                    locked={Boolean(exam.locked) || !exam.url}
                    href={!exam.locked && exam.url ? exam.url : null}
                />
            )}

            <button
                type="button"
                onClick={onShowFullDetail}
                className="mt-0.5 inline-flex min-h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
                <InfoOutlinedIcon sx={{ fontSize: 13 }} />
                Detail
            </button>
        </motion.div>
    );
}
