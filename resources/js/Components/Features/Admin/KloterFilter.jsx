import React from 'react';
import { router } from '@inertiajs/react';

export default function KloterFilter({ routeName, kloters = [], filters = {}, adminScope = 'global', className = '' }) {
    const changeKloter = (event) => {
        router.get(route(routeName), {
            ...filters,
            kloter: event.target.value || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <label className={`block w-full sm:max-w-xs ${className}`}>
            <span className="mb-1.5 block text-xs font-black uppercase text-gray-500 dark:text-gray-400">
                {adminScope === 'kloter' ? 'Kloter yang diampu' : 'Filter kloter'}
            </span>
            <select
                value={filters.kloter || ''}
                onChange={changeKloter}
                disabled={kloters.length === 0}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 focus:border-focus focus:ring-focus disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
            >
                <option value="">{kloters.length === 0 ? 'Belum ada kloter' : 'Semua kloter dalam cakupan'}</option>
                {kloters.map((kloter) => (
                    <option key={kloter.id} value={kloter.id}>
                        {kloter.name} - {kloter.program_name || 'Tanpa program'}{kloter.is_read_only ? ' (Arsip)' : ''}
                    </option>
                ))}
            </select>
        </label>
    );
}
