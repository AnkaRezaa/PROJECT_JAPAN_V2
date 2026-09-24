import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import Card from '@/Components/UI/Card';
import StatCard from '@/Components/Features/Dashboard/StatCard';
import { DEFAULT_THEME, THEME_PRESETS } from '@/Components/theme/themes';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

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
    stats = [],
    themeSettings = { activeTheme: DEFAULT_THEME, customTheme: {} },
    analyticsStatus = { gtm: { enabled: false, id: null }, ga4: { configured: false, url: null } },
}) {
    const savedTheme = themeSettings.activeTheme || DEFAULT_THEME;
    const savedCustomTheme = themeSettings.customTheme || {};
    const [selectedTheme, setSelectedTheme] = useState(savedTheme);
    const [customTheme, setCustomTheme] = useState(savedCustomTheme);
    const [showAdvanced, setShowAdvanced] = useState(false);
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

    return (
        <AuthenticatedLayout>
            <Head title="Superadmin - Sistem" />

            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">Superadmin</p>
                            <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">Pengaturan Sistem</h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">
                                Kontrol global yang aman untuk operasional: status aplikasi, konfigurasi ringan, dan tema frontend.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                            Perubahan tema berlaku global setelah disimpan
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                    {stats.length === 0 && (
                        <Card className="sm:col-span-2 xl:col-span-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Belum ada snapshot sistem.</p>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                    <div className="space-y-6">
                        <Card>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Status Operasional</h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Panel ini sengaja ringan, bukan pengganti monitoring server penuh.
                            </p>
                            <div className="mt-5 space-y-3">
                                <InfoRow label="Aplikasi" value="TOKU-UP" />
                                <InfoRow label="Scope aktif" value="N3 + Gamification" />
                                <InfoRow label="Queue" value="Database worker" />
                                <InfoRow label="Storage" value="Public / Local" />
                                <InfoRow
                                    label="Google Tag Manager"
                                    value={analyticsStatus?.gtm?.enabled ? (analyticsStatus.gtm.id || 'Aktif') : 'Non-aktif'}
                                />
                                <InfoRow
                                    label="Google Analytics 4"
                                    value={analyticsStatus?.ga4?.configured ? 'Terkoneksi' : 'Belum diatur'}
                                />
                            </div>
                        </Card>

                        <Card>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Maintenance</h2>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    Tidak ada maintenance terjadwal dari sistem.
                                </div>
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                                    Mode maintenance penuh tetap lewat konfigurasi Laravel, bukan toggle UI.
                                </div>
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
