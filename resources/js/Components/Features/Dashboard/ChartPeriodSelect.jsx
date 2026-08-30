import React from 'react';
import { router } from '@inertiajs/react';

const periods = [
    { value: 7, label: '7 hari' },
    { value: 30, label: '30 hari' },
    { value: 90, label: '90 hari' },
];

export default function ChartPeriodSelect({ routeName, routeParams, filters = {} }) {
    const value = Number(filters.period || 30);

    return (
        <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
            <span className="sr-only">Periode chart</span>
            <select
                value={value}
                onChange={(event) => router.get(
                    route(routeName, routeParams),
                    { ...filters, period: Number(event.target.value) },
                    { preserveScroll: true, preserveState: true, replace: true }
                )}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-black text-gray-700 outline-none transition hover:border-brand-200 focus:border-focus dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
                {periods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
            </select>
        </label>
    );
}
