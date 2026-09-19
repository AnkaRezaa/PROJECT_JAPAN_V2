import React from 'react';
import { Link } from '@inertiajs/react';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';

export default function BankSoalNavbar({ activeTab = 'grammar', stats = {}, action = null }) {
    const tabs = [
        {
            key: 'grammar',
            href: route('admin.bank-soal-konten.index'),
            label: 'Bank Grammar (Tata Bahasa)',
            shortLabel: 'Grammar',
            count: stats.total_grammar,
            icon: <AutoStoriesIcon sx={{ fontSize: 18 }} />,
            activeColor: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60',
            badgeActiveColor: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-gray-950',
            badgeInactiveColor: 'bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        },
        {
            key: 'vocabulary',
            href: route('admin.vocabulary.index'),
            label: 'Bank Kosakata & Kanji',
            shortLabel: 'Kosakata & Kanji',
            count: stats.total_vocabulary,
            icon: <LibraryBooksIcon sx={{ fontSize: 18 }} />,
            activeColor: 'bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/60',
            badgeActiveColor: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-gray-950',
            badgeInactiveColor: 'bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        },
        {
            key: 'exams',
            href: route('admin.exams.question-banks.index'),
            label: 'Bank Soal Ujian (CBT)',
            shortLabel: 'Soal Ujian (CBT)',
            count: stats.total_exam_banks,
            icon: <FactCheckOutlinedIcon sx={{ fontSize: 18 }} />,
            activeColor: 'bg-sky-50 text-sky-800 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/60',
            badgeActiveColor: 'bg-sky-600 text-white dark:bg-sky-500 dark:text-gray-950',
            badgeInactiveColor: 'bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        },
    ];

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/90 pb-4 dark:border-gray-800">
            <nav className="flex w-full overflow-x-auto rounded-2xl bg-gray-100/90 p-1.5 dark:bg-gray-900/80 sm:w-auto" aria-label="Navigasi Pusat Bank Konten & Soal">
                <div className="flex min-w-max items-center gap-1.5">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                                    isActive
                                        ? `bg-white shadow-xs ring-1 ${tab.activeColor} dark:bg-gray-800`
                                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white'
                                }`}
                            >
                                <span className={`flex shrink-0 items-center justify-center ${isActive ? '' : 'opacity-75 group-hover:opacity-100'}`}>
                                    {tab.icon}
                                </span>
                                <span className="hidden md:inline">{tab.label}</span>
                                <span className="md:hidden">{tab.shortLabel}</span>

                                {typeof tab.count !== 'undefined' && tab.count !== null && (
                                    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                                        isActive ? tab.badgeActiveColor : tab.badgeInactiveColor
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {action && (
                <div className="flex shrink-0 items-center gap-2">
                    {action}
                </div>
            )}
        </div>
    );
}
