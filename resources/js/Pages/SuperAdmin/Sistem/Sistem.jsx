import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import { DEFAULT_THEME, THEME_PRESETS } from '@/Components/theme/themes';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import RefreshIcon from '@mui/icons-material/Refresh';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LinkIcon from '@mui/icons-material/Link';
import SpeedIcon from '@mui/icons-material/Speed';
import LayersIcon from '@mui/icons-material/Layers';

function getTelemetryIcon(key) {
    switch (key) {
        case 'app':
            return <DnsIcon className="text-blue-500" fontSize="small" />;
        case 'db':
            return <StorageIcon className="text-emerald-500" fontSize="small" />;
        case 'queue':
            return <CloudQueueIcon className="text-amber-500" fontSize="small" />;
        case 'storage':
            return <FolderSharedIcon className="text-purple-500" fontSize="small" />;
        default:
            return <DnsIcon className="text-gray-500" fontSize="small" />;
    }
}

function Field({ label, children, helper }) {
    return (
        <label className="block rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{label}</span>
            <div className="mt-3">{children}</div>
            {helper && <span className="mt-2 block text-xs font-semibold text-gray-400">{helper}</span>}
        </label>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
            <span className="font-bold text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-right font-black text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}

export default function System({
    telemetry = [],
    diagnostics = {},
    stats = [],
    themeSettings = { activeTheme: DEFAULT_THEME, customTheme: {} },
    analyticsStatus = { gtm: { enabled: false, id: null }, ga4: { configured: false, url: null } },
}) {
    const savedTheme = themeSettings.activeTheme || DEFAULT_THEME;
    const savedCustomTheme = themeSettings.customTheme || {};
    const [selectedTheme, setSelectedTheme] = useState(savedTheme);
    const [customTheme, setCustomTheme] = useState(savedCustomTheme);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [maintenanceProcessing, setMaintenanceProcessing] = useState(false);
    const [activeMaintenanceAction, setActiveMaintenanceAction] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();
    const themeKeys = Object.keys(THEME_PRESETS);

    const presetTheme = THEME_PRESETS[selectedTheme] || THEME_PRESETS[DEFAULT_THEME];
    const previewTheme = useMemo(() => ({
        ...presetTheme,
        ...customTheme,
    }), [presetTheme, customTheme]);

    const isDirty = selectedTheme !== savedTheme || JSON.stringify(customTheme) !== JSON.stringify(savedCustomTheme);

    const updateCustom = (key, value) => {
        setCustomTheme((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const clearOverrides = () => {
        setCustomTheme({});
    };

    const applyTheme = () => {
        router.post(route('superadmin.system.theme.update'), {
            active_theme: selectedTheme,
            custom_theme: customTheme,
        }, {
            preserveScroll: true,
            onSuccess: () => window.location.reload(),
        });
    };

    const resetTheme = () => {
        openConfirm({
            variant: 'warning',
            title: 'Reset Tema Global?',
            message: 'Tema frontend akan dikembalikan ke preset default untuk semua user.',
            confirmLabel: 'Iya, Reset',
            details: [
                { label: 'Tema aktif', value: selectedTheme },
                { label: 'Dampak', value: 'Custom warna global akan dihapus.' },
            ],
            onConfirm: () => router.delete(route('superadmin.system.theme.reset'), {
                preserveScroll: true,
                onSuccess: () => window.location.reload(),
                onFinish: closeConfirm,
            }),
        });
    };

    const handleRefreshDiagnostics = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['telemetry', 'diagnostics'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const confirmMaintenance = (action, title, message) => {
        openConfirm({
            variant: 'warning',
            title,
            message,
            confirmLabel: 'Jalankan',
            onConfirm: () => {
                setMaintenanceProcessing(true);
                setActiveMaintenanceAction(action);
                router.post(route('superadmin.system.maintenance'), { action }, {
                    preserveScroll: true,
                    onFinish: () => {
                        setMaintenanceProcessing(false);
                        setActiveMaintenanceAction(null);
                        closeConfirm();
                    },
                });
            },
        });
    };

    const defaultTelemetry = [
        { label: 'Status Aplikasi', value: 'Stabil (HTTP 200)', subvalue: 'ENV: ' + (diagnostics.app_env || 'production'), status: 'healthy', badge: 'ONLINE', key: 'app' },
        { label: 'Database Engine', value: diagnostics.database?.connected ? 'Terkoneksi' : 'Terputus', subvalue: 'Driver: ' + (diagnostics.database?.connection || 'mysql'), status: diagnostics.database?.connected ? 'healthy' : 'danger', badge: 'MYSQL', key: 'db' },
        { label: 'Antrean Queue', value: (diagnostics.queue?.pending_jobs || 0) + ' Job', subvalue: 'Driver: ' + (diagnostics.queue?.driver || 'database'), status: 'healthy', badge: 'IDLE', key: 'queue' },
        { label: 'Storage & Media', value: diagnostics.storage?.symlink_exists ? 'Public Linked' : 'Unlinked', subvalue: 'Driver: ' + (diagnostics.storage?.driver || 'public'), status: diagnostics.storage?.symlink_exists ? 'healthy' : 'warning', badge: 'MOUNTED', key: 'storage' },
    ];

    const telemetryItems = telemetry.length > 0 ? telemetry : defaultTelemetry;

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Sistem" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                            <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Pengaturan & Diagnostik Sistem</h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                                Status real-time server, diagnostik operasional, kontrol pemeliharaan cache, dan tema frontend global.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                            Perubahan tema berlaku global setelah disimpan
                        </div>
                    </div>
                </section>

                {/* System-like Telemetry Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {telemetryItems.map((item) => {
                        const isHealthy = item.status === 'healthy';
                        const isWarning = item.status === 'warning';
                        return (
                            <div
                                key={item.key || item.label}
                                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                                            {getTelemetryIcon(item.key)}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black font-mono tracking-wider ${
                                        isHealthy
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                            : isWarning
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/60'
                                    }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${
                                            isHealthy ? 'bg-emerald-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-red-500'
                                        }`} />
                                        {item.badge || (isHealthy ? 'ONLINE' : isWarning ? 'WARNING' : 'OFFLINE')}
                                    </span>
                                </div>
                                <div className="text-xl font-black text-gray-900 dark:text-white">
                                    {item.value}
                                </div>
                                <div className="mt-1 font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {item.subvalue}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="space-y-6">
                        <Card>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Status Operasional</h2>
                                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Diagnostik server, koneksi database, dan runtime live.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRefreshDiagnostics}
                                    disabled={isRefreshing}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-black text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    title="Uji latency dan refresh telemetri server"
                                >
                                    <RefreshIcon fontSize="inherit" className={`text-sm ${isRefreshing ? 'animate-spin text-brand-600' : ''}`} />
                                    <span>{isRefreshing ? 'Menguji...' : 'Uji Ping & Refresh'}</span>
                                </button>
                            </div>

                            {/* Live Latency Bar */}
                            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-950/60">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
                                        <SpeedIcon fontSize="inherit" className="text-emerald-500 text-sm" />
                                        Database Query Latency
                                    </span>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                        {diagnostics.database?.latency || '0 ms'}
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, Math.max(10, parseFloat(diagnostics.database?.latency || '1') * 5))}%` }}
                                    />
                                </div>
                            </div>

                            {/* System Diagnostics Table */}
                            <div className="mt-4 divide-y divide-gray-100 text-xs dark:divide-gray-800 font-mono">
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Environment</span>
                                    <span className="rounded-md bg-gray-100 px-2 py-0.5 font-bold uppercase text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                        {diagnostics.app_env || 'production'} {diagnostics.app_debug ? '(DEBUG)' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">PHP Runtime</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        PHP {diagnostics.php_version || '8.2'} · Mem {diagnostics.memory_limit || '512M'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Laravel Version</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {diagnostics.laravel_version || 'v11.x'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Database Engine</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {diagnostics.database?.connection?.toUpperCase() || 'MYSQL'} {diagnostics.database?.connected ? '(Connected)' : '(Error)'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Queue Worker</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {diagnostics.queue?.driver?.toUpperCase() || 'SYNC'} ({diagnostics.queue?.pending_jobs ?? 0} pending)
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Public Storage</span>
                                    <span className={`font-bold ${diagnostics.storage?.symlink_exists ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                                        {diagnostics.storage?.symlink_exists ? 'LINKED (storage/app/public)' : 'UNLINKED'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Google Tag Manager</span>
                                    <span className={`font-bold ${analyticsStatus?.gtm?.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                        {analyticsStatus?.gtm?.enabled ? (analyticsStatus.gtm.id || 'Aktif') : 'Non-aktif'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Waktu Server</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {diagnostics.server_time || '-'}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Maintenance</h2>
                                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Pemeliharaan cache, optimasi route/views, dan symlink media storage.
                                    </p>
                                </div>
                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    4 ACTIONS
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {[
                                    {
                                        action: 'optimize_clear',
                                        title: 'Bersihkan Cache Aplikasi',
                                        desc: 'Hapus seluruh cache config, route, dan views.',
                                        command: 'optimize:clear',
                                        buttonLabel: 'Clear Cache',
                                        confirmTitle: 'Bersihkan Cache Aplikasi?',
                                        confirmMsg: 'Seluruh cache compiled config, route, dan views akan dibersihkan.',
                                        icon: <CleaningServicesIcon fontSize="inherit" />,
                                    },
                                    {
                                        action: 'cache_clear',
                                        title: 'Bersihkan App Cache Store',
                                        desc: 'Hapus data key-value cache runtime di database / redis.',
                                        command: 'cache:clear',
                                        buttonLabel: 'Purge Cache',
                                        confirmTitle: 'Bersihkan App Cache?',
                                        confirmMsg: 'Seluruh item cache aplikasi yang tersimpan sementara akan dikosongkan.',
                                        icon: <DeleteSweepIcon fontSize="inherit" />,
                                    },
                                    {
                                        action: 'view_clear',
                                        title: 'Bersihkan View Template',
                                        desc: 'Hapus file cache compiled template Blade.',
                                        command: 'view:clear',
                                        buttonLabel: 'Clear Views',
                                        confirmTitle: 'Bersihkan Cache View?',
                                        confirmMsg: 'Template Blade akan di-compile ulang pada request pertama berikutnya.',
                                        icon: <LayersIcon fontSize="inherit" />,
                                    },
                                    {
                                        action: 'storage_link',
                                        title: 'Sinkronisasi Storage Link',
                                        desc: 'Hubungkan symbolic link public/storage ke storage/app/public.',
                                        command: 'storage:link',
                                        buttonLabel: 'Link Storage',
                                        confirmTitle: 'Sinkronisasi Link Storage?',
                                        confirmMsg: 'Sistem akan membuat atau memastikan symlink public storage tersambung.',
                                        icon: <LinkIcon fontSize="inherit" />,
                                    },
                                ].map((item) => {
                                    const isCurrentProcessing = maintenanceProcessing && activeMaintenanceAction === item.action;
                                    return (
                                        <div
                                            key={item.action}
                                            className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950/40 dark:hover:bg-gray-950/70"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                                                    <p className="text-xs font-black text-gray-900 dark:text-white">{item.title}</p>
                                                    <span className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        {item.command}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] font-semibold text-gray-400">{item.desc}</p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={maintenanceProcessing}
                                                onClick={() => confirmMaintenance(item.action, item.confirmTitle, item.confirmMsg)}
                                                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                            >
                                                {isCurrentProcessing && (
                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                                                )}
                                                <span>{isCurrentProcessing ? 'Menjalankan...' : item.buttonLabel}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">Theme Control</p>
                                <h2 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Tema Frontend Global</h2>
                                <p className="mt-1 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Pilih preset cepat untuk landing, roadmap, dan komponen user. Override detail hanya dipakai saat benar-benar perlu.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={resetTheme}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={applyTheme}
                                    disabled={!isDirty}
                                    className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700"
                                >
                                    {isDirty ? 'Simpan Tema' : 'Sudah Tersimpan'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_420px]">
                            <div className="space-y-5">
                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Preset Cepat</p>
                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            Aktif: {selectedTheme}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {themeKeys.map((key) => {
                                            const item = THEME_PRESETS[key];
                                            const active = selectedTheme === key;

                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelectedTheme(key)}
                                                    className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-900/20' : 'border-gray-200 bg-white hover:border-brand-200 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-900/40'}`}
                                                >
                                                    <div className="mb-3 flex items-center gap-2">
                                                        {[item.activeColor, item.doneColor, item.activeShadow].map((color) => (
                                                            <span key={color} className="h-7 w-7 rounded-xl border border-white shadow-sm" style={{ backgroundColor: color }} />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm font-black capitalize text-gray-900 dark:text-white">{key}</p>
                                                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        {active ? 'Preset sedang dipilih' : 'Klik untuk memakai preset ini'}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white">Advanced Override</h3>
                                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                Pakai ini hanya kalau preset belum cukup.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={clearOverrides}
                                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
                                            >
                                                Bersihkan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvanced((value) => !value)}
                                                className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                                            >
                                                {showAdvanced ? 'Tutup' : 'Buka'}
                                            </button>
                                        </div>
                                    </div>

                                    {showAdvanced && (
                                        <div className="mt-4 space-y-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                {[
                                                    ['primaryColor', 'Tombol utama'],
                                                    ['primaryHover', 'Tombol saat hover'],
                                                    ['primarySoft', 'Latar aksen lembut'],
                                                    ['brandColor', 'Aksen merek'],
                                                    ['inkColor', 'Teks utama'],
                                                    ['infoColor', 'Informasi dan progres'],
                                                    ['achievementColor', 'XP dan pencapaian'],
                                                    ['surfaceColor', 'Permukaan kartu'],
                                                    ['surfaceMuted', 'Latar halaman'],
                                                    ['borderColor', 'Border lembut'],
                                                    ['activeColor', 'Warna aktif'],
                                                    ['activeShadow', 'Shadow aktif'],
                                                    ['doneColor', 'Warna selesai'],
                                                    ['doneShadow', 'Shadow selesai'],
                                                ].map(([key, label]) => (
                                                    <Field key={key} label={label}>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="color"
                                                                value={previewTheme[key] || '#15803D'}
                                                                onChange={(event) => updateCustom(key, event.target.value)}
                                                                className="h-10 w-12 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={previewTheme[key] || ''}
                                                                onChange={(event) => updateCustom(key, event.target.value)}
                                                                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                                            />
                                                        </div>
                                                    </Field>
                                                ))}
                                            </div>

                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950/50">
                                <div className="relative overflow-hidden rounded-lg border p-6" style={{ backgroundColor: previewTheme.surfaceMuted, borderColor: previewTheme.borderColor }}>
                                    <div className="relative">
                                        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: previewTheme.primaryColor }}>Preview</p>
                                        <h3 className="mt-3 text-3xl font-black" style={{ color: previewTheme.inkColor }}>Tema TOKU-UP</h3>
                                        <p className="mt-2 text-sm font-medium text-gray-600">Simulasi warna tombol, progres, dan pencapaian.</p>
                                        <button
                                            type="button"
                                            className="mt-6 min-h-11 rounded-lg px-5 py-3 text-sm font-black text-white shadow-md"
                                            style={{ backgroundColor: previewTheme.primaryColor }}
                                        >
                                            Mulai Belajar
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
                                        <p className="text-xs font-black text-gray-400">Belajar</p>
                                        <div className="mt-3 h-10 rounded-lg" style={{ backgroundColor: previewTheme.infoColor }} />
                                    </div>
                                    <div className="rounded-lg bg-white p-4 dark:bg-gray-900">
                                        <p className="text-xs font-black text-gray-400">Level Up</p>
                                        <div className="mt-3 h-10 rounded-lg" style={{ backgroundColor: previewTheme.achievementColor }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
