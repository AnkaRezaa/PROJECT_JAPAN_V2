import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

function values(settings) {
    const local = settings.opens_at ? new Date(new Date(settings.opens_at).getTime() + 7 * 3600000).toISOString().slice(0, 16) : '';
    return { enabled: settings.enabled, registration_open: settings.registration_open, opens_at: local };
}

export default function BetaSettingsForm({ settings }) {
    const form = useForm(values(settings));
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    useEffect(() => { form.setData(values(settings)); }, [settings.enabled, settings.registration_open, settings.opens_at]);
    const save = (extra = {}) => {
        form.transform(data => ({ ...data, ...extra }));
        form.put(route('superadmin.system.beta.update'), { preserveScroll: true, onFinish: closeConfirm });
    };
    const confirm = (disable = false) => openConfirm({ title: disable ? 'Nonaktifkan mode beta?' : 'Buka akses sekarang?', message: disable ? 'Pendaftaran normal akan berlaku dan pembatasan akses beta dilepas.' : 'Peserta beta dapat mengakses aplikasi sesuai hak kelasnya. Akses tidak dapat dikunci kembali dari menu ini.', confirmLabel: disable ? 'Nonaktifkan' : 'Buka Sekarang', onConfirm: () => { setConfirmProcessing(true); save(disable ? { confirm_disable: true } : { open_now: true }); } });
    return <section className="border-y border-gray-200 py-6 text-gray-900 dark:border-gray-700 dark:text-white">
        <h2 className="text-lg font-bold">Beta</h2>
        <p className="mt-2 text-sm">Peserta: {settings.participants} / {settings.limit}</p>
        <p className="mt-1 text-sm font-semibold">{!settings.enabled ? 'Mode beta nonaktif' : settings.released ? 'Akses aplikasi dibuka' : 'Akses aplikasi belum dibuka'}</p>
        {settings.backup?.updated_at && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Backup Excel otomatis terakhir diperbarui: {settings.backup.updated_at}</p>
        )}
        <form onSubmit={event => { event.preventDefault(); settings.enabled && !form.data.enabled ? confirm(true) : save(); }} className="mt-5 grid gap-4 sm:grid-cols-2">
            {[['enabled', 'Mode beta'], ['registration_open', 'Pendaftaran beta']].map(([key, label]) => <div key={key}><label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold"><input type="checkbox" role="switch" checked={form.data[key]} disabled={form.processing} onChange={event => form.setData(key, event.target.checked)} aria-invalid={Boolean(form.errors[key])} aria-describedby={form.errors[key] ? `beta-${key}-error` : undefined} />{label}</label>{form.errors[key] && <p id={`beta-${key}-error`} className="text-sm text-red-600">{form.errors[key]}</p>}</div>)}
            <label className="block text-sm font-semibold">Jadwal buka akses (WIB)<input type="datetime-local" disabled={form.processing || settings.released} value={form.data.opens_at} onChange={event => form.setData('opens_at', event.target.value)} aria-invalid={Boolean(form.errors.opens_at)} aria-describedby={form.errors.opens_at ? 'beta-opens-at-error' : undefined} className="mt-2 block min-h-[44px] w-full min-w-0 rounded-md border border-gray-300 bg-transparent px-3 dark:border-gray-600" />{form.errors.opens_at && <span id="beta-opens-at-error" className="mt-2 block text-sm text-red-600">{form.errors.opens_at}</span>}</label>
            <div className="flex flex-wrap items-end gap-3">
                <button disabled={form.processing} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><SaveOutlinedIcon fontSize="small" />Simpan</button>
                <button type="button" disabled={form.processing || settings.released || !form.data.enabled} onClick={() => confirm()} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold disabled:opacity-50"><PlayArrowIcon fontSize="small" />Buka Sekarang</button>
                <a href={route('superadmin.system.beta.export-xlsx')} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-emerald-600 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><DownloadOutlinedIcon fontSize="small" />Unduh Backup Excel (.xlsx)</a>
            </div>
            <div role="alert" className="text-sm text-red-600 sm:col-span-2">{Object.entries(form.errors).filter(([key]) => !['enabled', 'registration_open', 'opens_at'].includes(key)).map(([, message]) => message).join(' ')}</div>
            <p role="status" className="text-sm text-green-700 dark:text-green-300 sm:col-span-2">{form.recentlySuccessful ? 'Pengaturan beta tersimpan.' : ''}</p>
        </form>
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    </section>;
}
