import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

function values(settings) {
    const local = settings.opens_at ? new Date(new Date(settings.opens_at).getTime() + 7 * 3600000).toISOString().slice(0, 16) : '';
    return { enabled: settings.enabled, registration_open: settings.registration_open, opens_at: local };
}

export default function BetaSettingsForm({ settings }) {
    const form = useForm(values(settings));
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    useEffect(() => { form.setData(values(settings)); }, [settings.enabled, settings.registration_open, settings.opens_at]);
    const save = (extra = {}) => form.transform(data => ({ ...data, ...extra })).put(route('superadmin.system.beta.update'), { preserveScroll: true, onFinish: closeConfirm });
    const confirm = (disable = false) => openConfirm({ title: disable ? 'Nonaktifkan mode beta?' : 'Buka akses sekarang?', message: disable ? 'Pendaftaran normal akan berlaku dan pembatasan akses beta dilepas.' : 'Peserta beta dapat mengakses aplikasi sesuai hak kelasnya. Akses tidak dapat dikunci kembali dari menu ini.', confirmLabel: disable ? 'Nonaktifkan' : 'Buka Sekarang', onConfirm: () => { setConfirmProcessing(true); save(disable ? { confirm_disable: true } : { open_now: true }); } });
    return <section className="border-y border-gray-200 py-6 text-gray-900 dark:border-gray-700 dark:text-white">
        <h2 className="text-lg font-bold">Beta</h2>
        <p className="mt-2 text-sm">Peserta: {settings.participants} / {settings.limit}{settings.released ? ' · Akses dibuka' : ''}</p>
        <form onSubmit={event => { event.preventDefault(); settings.enabled && !form.data.enabled ? confirm(true) : save(); }} className="mt-5 grid gap-4 sm:grid-cols-2">
            {[['enabled', 'Mode beta'], ['registration_open', 'Pendaftaran']].map(([key, label]) => <label key={key} className="flex min-h-[44px] items-center gap-3 text-sm font-semibold"><input type="checkbox" role="switch" checked={form.data[key]} disabled={form.processing} onChange={event => form.setData(key, event.target.checked)} />{label}</label>)}
            <label className="block text-sm font-semibold">Jadwal buka (WIB)<input type="datetime-local" disabled={form.processing || settings.released} value={form.data.opens_at} onChange={event => form.setData('opens_at', event.target.value)} className="mt-2 block min-h-[44px] w-full min-w-0 rounded-md border border-gray-300 bg-transparent px-3 dark:border-gray-600" /></label>
            <div className="flex flex-wrap items-end gap-3"><button disabled={form.processing} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><SaveOutlinedIcon fontSize="small" />Simpan</button><button type="button" disabled={form.processing || settings.released || !form.data.enabled} onClick={() => confirm()} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold disabled:opacity-50"><PlayArrowIcon fontSize="small" />Buka Sekarang</button></div>
            <div role="alert" className="text-sm text-red-600 sm:col-span-2">{Object.values(form.errors).join(' ')}</div>
        </form>
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    </section>;
}
