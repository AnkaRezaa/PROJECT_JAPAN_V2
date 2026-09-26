import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LockClockRoundedIcon from '@mui/icons-material/LockClockRounded';
import OutboxRoundedIcon from '@mui/icons-material/OutboxRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminDialog from '@/Components/UI/AdminDialog';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { AdminExamHeader, AdminExamTabs, AdminPagination, Metric, StatusBadge, apiErrorMessage, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

const emptySession = { id: null, exam_version_id: '', name: '', starts_at: '', ends_at: '', status: 'scheduled', attempt_limit_override: '', ranking_enabled: true, cohort_ids: [] };

function Field({ label, children, hint }) {
    return <label className="block"><span className="text-xs font-black text-gray-700 dark:text-gray-300">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs font-medium text-gray-400">{hint}</span>}</label>;
}

export default function Sessions({ sessions = [], exam_packages = [], cohort_options = [], pagination = {} }) {
    const [status, setStatus] = useState('all');
    const [editor, setEditor] = useState(null);
    const [editorError, setEditorError] = useState('');
    const [inspectSession, setInspectSession] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const publishedExams = exam_packages.filter((item) => item.status === 'published' && item.published_version_id).map((item) => ({ ...item, version_id: item.published_version_id }));
    const visible = useMemo(() => sessions.filter((item) => status === 'all' || item.status === status), [sessions, status]);
    const selectedExam = publishedExams.find((item) => String(item.version_id) === String(editor?.exam_version_id));
    const selectedAccess = selectedExam?.access || editor?.exam_access;

    const openEditor = (session = null) => {
        setEditorError('');
        setEditor(session ? {
            id: session.id,
            exam_version_id: String(session.exam_version_id),
            exam_title: session.exam_title,
            exam_level: session.level,
            exam_access: session.access,
            name: session.name,
            starts_at: session.starts_at_value || '',
            ends_at: session.ends_at_value || '',
            status: session.status,
            attempt_limit_override: session.attempt_limit_override ?? '',
            ranking_enabled: Boolean(session.ranking_enabled),
            cohort_ids: (session.cohort_ids || []).map(Number),
        } : { ...emptySession });
    };

    const saveSession = async () => {
        setEditorError('');
        if (!editor.exam_version_id) {
            setEditorError('Silakan pilih paket ujian yang sudah diterbitkan.');
            return;
        }
        if (!editor.name || editor.name.trim().length < 3) {
            setEditorError('Nama sesi wajib diisi (minimal 3 karakter).');
            return;
        }
        if (editor.starts_at && editor.ends_at && new Date(editor.ends_at) <= new Date(editor.starts_at)) {
            setEditorError('Waktu berakhir sesi harus lebih lambat dari waktu mulai.');
            return;
        }
        if (selectedAccess === 'cohort' && (!editor.cohort_ids || editor.cohort_ids.length === 0)) {
            setEditorError('Pilih minimal satu kloter yang berhak mengikuti sesi ujian ini.');
            return;
        }

        setBusy(true); setError(''); setMessage('');
        const payload = {
            name: editor.name.trim(),
            starts_at: editor.starts_at || null,
            ends_at: editor.ends_at || null,
            status: editor.status,
            attempt_limit_override: editor.attempt_limit_override === '' ? null : Number(editor.attempt_limit_override),
            ranking_enabled: Boolean(editor.ranking_enabled),
            cohort_ids: selectedAccess === 'cohort' ? editor.cohort_ids : [],
        };
        try {
            if (editor.id) await window.axios.patch(route('admin.exam-sessions.update', editor.id), payload);
            else await window.axios.post(route('admin.exam-versions.sessions.store', editor.exam_version_id), payload);
            setEditor(null);
            setMessage(editor.id ? 'Sesi berhasil diperbarui.' : 'Sesi berhasil dibuat.');
            router.reload({ only: ['sessions', 'exam_packages', 'cohort_options'], preserveScroll: true });
        } catch (requestError) {
            const msg = apiErrorMessage(requestError);
            setEditorError(msg);
            setError(msg);
        } finally {
            setBusy(false);
        }
    };

    const runConfirmed = async () => {
        const action = confirmState.onConfirm;
        setConfirmProcessing(true); setError(''); setMessage('');
        try {
            await action();
            setMessage(confirmState.confirmLabel?.includes('Tutup') ? 'Sesi telah ditutup.' : 'Hasil ujian berhasil diterbitkan ke Portal Siswa.');
            closeConfirm();
            router.reload({ only: ['sessions'], preserveScroll: true });
        } catch (requestError) {
            setError(apiErrorMessage(requestError));
            setConfirmProcessing(false);
        }
    };

    const confirmClose = (session) => openConfirm({
        variant: 'warning',
        title: 'Tutup sesi ujian?',
        message: 'Peserta tidak dapat lagi memulai pengerjaan. Attempt peserta yang sedang berlangsung akan diselesaikan otomatis (timeout).',
        confirmLabel: 'Tutup sesi',
        details: [{ label: 'Sesi', value: session.name }, { label: 'Peserta Mengerjakan', value: `${session.participants} orang` }],
        onConfirm: () => window.axios.post(route('admin.exam-sessions.close', session.id)),
    });

    const confirmRelease = (session) => openConfirm({
        variant: 'info',
        title: 'Rilis hasil ujian ke Portal Siswa?',
        message: 'Hasil ujian, skor kelulusan, dan pembahasan kunci jawaban akan langsung terbit ke akun seluruh peserta di menu Ujian (/user/exams).',
        confirmLabel: 'Ya, Rilis Hasil ke Peserta',
        details: [
            { label: 'Sesi', value: session.name },
            { label: 'Paket Ujian', value: `${session.exam_title} (${session.level})` },
            { label: 'Peserta', value: `${session.participants} orang` },
        ],
        onConfirm: () => window.axios.post(route('admin.exam-sessions.release-results', session.id)),
    });

    const toggleCohort = (id) => setEditor((current) => ({ ...current, cohort_ids: current.cohort_ids.includes(id) ? current.cohort_ids.filter((item) => item !== id) : [...current.cohort_ids, id] }));

    return <AuthenticatedLayout><Head title="Sesi Ujian" /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl space-y-6">
        <AdminExamHeader eyebrow="Distribusi & jadwal" title="Sesi dan akses ujian" description="Atur periode pengerjaan, cakupan peserta, dan rilis hasil ujian ke portal siswa." action={<button type="button" disabled={publishedExams.length === 0} onClick={() => openEditor()} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45"><AddRoundedIcon fontSize="small" /> Buat sesi</button>} />
        <AdminExamTabs />
        {(message || error) && <div className={`border px-4 py-3 text-sm font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>{error || message}</div>}
        {publishedExams.length === 0 && <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Terbitkan minimal satu paket ujian sebelum membuat sesi.</div>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Total sesi" value={sessions.length} /><Metric label="Sedang berjalan" value={sessions.filter((item) => item.status === 'active').length} /><Metric label="Terjadwal" value={sessions.filter((item) => item.status === 'scheduled').length} /><Metric label="Total peserta" value={sessions.reduce((total, item) => total + item.participants, 0)} detail="Attempt pada seluruh sesi" /></div>
        <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-gray-950 dark:text-white">Daftar sesi</h2><p className="mt-1 text-xs font-semibold text-gray-500">Satu paket dapat dipakai pada beberapa periode pengerjaan.</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClassName} mt-0 sm:w-44`}><option value="all">Semua status</option><option value="draft">Draft</option><option value="active">Berjalan</option><option value="scheduled">Terjadwal</option><option value="closed">Selesai</option><option value="cancelled">Dibatalkan</option></select></div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map((session) => <article key={session.id} className="grid gap-4 p-4 lg:grid-cols-[44px_minmax(0,1fr)_210px_105px_130px_150px] lg:items-center"><span className="grid h-11 w-11 place-items-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"><EventOutlinedIcon fontSize="small" /></span><div><div className="flex flex-wrap items-center gap-2"><p role="button" tabIndex={0} onClick={() => setInspectSession(session)} className="cursor-pointer font-black text-gray-950 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">{session.name}</p></div><p className="mt-0.5 text-xs font-semibold text-gray-500">{session.exam_title} · {session.level}</p>{session.result_released_at ? <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Hasil Dirilis ke Peserta</span> : session.status === 'closed' ? <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">⏳ Menunggu Rilis Hasil</span> : null}</div><div className="text-xs font-semibold leading-5 text-gray-600 dark:text-gray-300"><p>{session.starts_at || 'Mulai tanpa jadwal'}</p><p>{session.ends_at ? `sampai ${session.ends_at}` : 'Tanpa batas akhir'}</p></div><p className="text-sm font-black tabular-nums text-gray-800 dark:text-gray-200">{session.participants} peserta</p><div><StatusBadge status={session.status} /></div><div className="flex justify-end gap-1"><button type="button" onClick={() => setInspectSession(session)} className="grid h-9 w-9 place-items-center rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30" title="Buka info & demo sesi"><InfoOutlinedIcon fontSize="small" /></button><button type="button" disabled={session.participants > 0 || !['draft', 'scheduled'].includes(session.status)} onClick={() => openEditor(session)} className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800" title="Edit sesi"><EditCalendarRoundedIcon fontSize="small" /></button>{!['closed', 'cancelled'].includes(session.status) && <button type="button" onClick={() => confirmClose(session)} className="grid h-9 w-9 place-items-center rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" title="Tutup sesi"><LockClockRoundedIcon fontSize="small" /></button>}{session.status === 'closed' && !session.result_released_at && <button type="button" onClick={() => confirmRelease(session)} className="grid h-9 w-9 place-items-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" title="Rilis hasil ke portal siswa"><OutboxRoundedIcon fontSize="small" /></button>}</div></article>)}{visible.length === 0 && <p className="px-4 py-12 text-center text-sm font-semibold text-gray-500">Belum ada sesi dengan status ini.</p>}</div>
            <AdminPagination links={pagination.sessions} />
        </section>
    </div></div>

    {/* Modal Detail / Info Demo Sesi Terbuka */}
    <AdminDialog open={Boolean(inspectSession)} onClose={() => setInspectSession(null)} eyebrow="Info Sesi & Akses Demo" title={inspectSession?.name || 'Detail Sesi Ujian'} description="Ringkasan pengaturan sesi, status publikasi hasil, dan simulasi demo pengerjaan." maxWidth="max-w-2xl" footer={<div className="flex flex-wrap items-center justify-between w-full gap-2"><div className="text-xs text-gray-500">{inspectSession?.participants || 0} peserta telah berpartisipasi</div><div className="flex gap-2"><button type="button" onClick={() => setInspectSession(null)} className="h-10 rounded-md border border-gray-300 px-4 text-xs font-black dark:border-gray-700">Tutup</button>{inspectSession && <Link href={route('admin.exams.preview', inspectSession.exam_slug)} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-xs font-black text-white hover:bg-brand-700"><PlayCircleOutlineRoundedIcon fontSize="small" /> Buka Simulasi Demo Ujian</Link>}</div></div>}>
        {inspectSession && <div className="space-y-4">
            <div className="rounded-lg border border-gray-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-500">Status Sesi & Hasil:</span>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={inspectSession.status} />
                        {inspectSession.result_released_at ? (
                            <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Hasil Dirilis ke Portal Siswa ({inspectSession.result_released_at_formatted || 'Aktif'})
                            </span>
                        ) : (
                            <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                ⏳ Hasil Ditahan (Peserta belum melihat nilai/kunci)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Paket Ujian</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{inspectSession.exam_title} ({inspectSession.level})</p>
                </div>
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Hak Akses</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">
                        {inspectSession.access === 'cohort' ? `Kloter Khusus (${inspectSession.cohort_names?.join(', ') || 'Belum dipilih'})` : inspectSession.access === 'premium' ? 'Hanya Siswa Premium' : 'Semua Siswa Terdaftar'}
                    </p>
                </div>
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Jadwal Mulai</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{inspectSession.starts_at || 'Bebas / Tanpa Batas Awal'}</p>
                </div>
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Jadwal Berakhir</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{inspectSession.ends_at || 'Bebas / Tanpa Batas Akhir'}</p>
                </div>
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Batas Percobaan Pengerjaan</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{inspectSession.attempt_limit_override ? `${inspectSession.attempt_limit_override} kali` : 'Mengikuti kebijakan paket default'}</p>
                </div>
                <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
                    <p className="font-bold text-gray-500">Pemeringkatan (Leaderboard)</p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">{inspectSession.ranking_enabled ? 'Aktif (Masuk Peringkat)' : 'Nonaktif'}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link href={route('admin.exam-sessions.results', inspectSession.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <AssessmentOutlinedIcon fontSize="small" /> Rekap Hasil {inspectSession.participants} Peserta
                </Link>
                {inspectSession.status === 'closed' && !inspectSession.result_released_at && (
                    <button type="button" onClick={() => { setInspectSession(null); confirmRelease(inspectSession); }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700">
                        <OutboxRoundedIcon fontSize="small" /> Rilis Hasil ke Peserta Sekarang
                    </button>
                )}
            </div>
        </div>}
    </AdminDialog>

    {/* Modal Buat / Edit Sesi */}
    <AdminDialog open={Boolean(editor)} onClose={() => !busy && setEditor(null)} eyebrow="Sesi ujian" title={editor?.id ? 'Edit sesi' : 'Buat sesi baru'} description="Tentukan paket terbit, periode jadwal pengerjaan, dan cakupan kloter siswa." footer={<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setEditor(null)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black dark:border-gray-700">Batal</button><button type="button" disabled={busy || !editor?.exam_version_id || !editor?.name} onClick={saveSession} className="h-10 rounded-md bg-brand-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy ? 'Menyimpan...' : 'Simpan sesi'}</button></div>}>
        {editor && <div className="grid gap-4 sm:grid-cols-2">
            {editorError && <div className="sm:col-span-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{editorError}</div>}
            <div className="sm:col-span-2"><Field label="Paket ujian"><select disabled={Boolean(editor.id)} className={fieldClassName} value={editor.exam_version_id} onChange={(event) => setEditor({ ...editor, exam_version_id: event.target.value, cohort_ids: [] })}><option value="">Pilih paket terbit</option>{editor.id && !selectedExam && <option value={editor.exam_version_id}>{editor.exam_level} · {editor.exam_title}</option>}{publishedExams.map((item) => <option key={item.version_id} value={item.version_id}>{item.level} · {item.title}</option>)}</select></Field></div><div className="sm:col-span-2"><Field label="Nama sesi"><input className={fieldClassName} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="Contoh: Simulasi N3 September" /></Field></div><Field label="Mulai"><input type="datetime-local" className={fieldClassName} value={editor.starts_at} onChange={(event) => setEditor({ ...editor, starts_at: event.target.value })} /></Field><Field label="Berakhir"><input type="datetime-local" className={fieldClassName} value={editor.ends_at} onChange={(event) => setEditor({ ...editor, ends_at: event.target.value })} /></Field><Field label="Status"><select className={fieldClassName} value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value })}><option value="draft">Draft</option><option value="scheduled">Terjadwal</option><option value="active">Berjalan</option><option value="closed">Selesai</option><option value="cancelled">Dibatalkan</option></select></Field><Field label="Batas percobaan sesi" hint="Kosongkan untuk mengikuti aturan paket default."><input type="number" min="1" max="100" className={fieldClassName} value={editor.attempt_limit_override} onChange={(event) => setEditor({ ...editor, attempt_limit_override: event.target.value })} /></Field><label className="sm:col-span-2 flex items-center gap-3 border border-gray-200 p-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200"><input type="checkbox" checked={editor.ranking_enabled} onChange={(event) => setEditor({ ...editor, ranking_enabled: event.target.checked })} /> Masukkan hasil sesi ke peringkat</label>{selectedAccess === 'cohort' && <div className="sm:col-span-2"><p className="text-xs font-black text-gray-700 dark:text-gray-300">Kloter yang mendapat akses</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{cohort_options.map((item) => <label key={item.id} className="flex items-center gap-3 border border-gray-200 p-3 text-sm font-semibold dark:border-gray-700"><input type="checkbox" checked={editor.cohort_ids.includes(Number(item.id))} onChange={() => toggleCohort(Number(item.id))} /> <span>{item.nama}<small className="ml-1 text-gray-400">({item.kode})</small></span></label>)}</div>{cohort_options.length === 0 && <p className="mt-2 text-sm font-semibold text-amber-600">Belum ada kloter aktif.</p>}</div>}</div>}
    </AdminDialog>
    <ConfirmActionDialog {...confirmState} onConfirm={runConfirmed} onCancel={closeConfirm} />
    </AuthenticatedLayout>;
}
