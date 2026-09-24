import React, { useEffect, useState } from 'react';
import { analyticsConfig, getAnalyticsConsent, initializeAnalytics, pushPageView, setAnalyticsConsent } from '@/lib/analytics';

export default function AnalyticsConsentBanner() {
    const [choice, setChoice] = useState(() => getAnalyticsConsent());
    const config = analyticsConfig();

    useEffect(() => {
        if (choice === 'granted' && initializeAnalytics()) pushPageView();
    }, [choice]);

    if (!config.enabled || choice) return null;

    const decide = (value) => {
        setAnalyticsConsent(value);
        setChoice(value);
    };

    return (
        <section aria-label="Persetujuan analitik" className="fixed inset-x-3 bottom-3 z-[140] mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:flex sm:items-center sm:gap-4">
            <p className="flex-1 text-sm leading-6 text-gray-700 dark:text-gray-200">
                TOKU-UP memakai analitik anonim untuk memperbaiki alur belajar. Nilai, jawaban, dan komentar tidak dikirim.
            </p>
            <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                <button type="button" onClick={() => decide('denied')} className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200">Tolak</button>
                <button type="button" onClick={() => decide('granted')} className="min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700">Izinkan</button>
            </div>
        </section>
    );
}
