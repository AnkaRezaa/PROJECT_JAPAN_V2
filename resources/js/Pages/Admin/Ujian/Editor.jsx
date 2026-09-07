import React, { useMemo, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PrototypeNotice, StatusBadge, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';

const steps = ['Identitas', 'Struktur', 'Naskah soal', 'Validasi', 'Preview'];

function Field({ label, children, hint }) {
    return <label className="block"><span className="text-xs font-black text-gray-700 dark:text-gray-300">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs font-medium text-gray-400">{hint}</span>}</label>;
}

function IdentityStep({ form, setForm, levels }) {
    return <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Nama paket ujian"><input className={fieldClassName} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Simulasi JLPT N3 September" /></Field>
        <Field label="Level"><select className={fieldClassName} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>{levels.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Jenis"><select className={fieldClassName} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="simulation">Simulasi JLPT</option><option value="practice">Latihan ujian</option></select></Field>
        <Field label="Hak akses"><select className={fieldClassName} value={form.access} onChange={(event) => setForm({ ...form, access: event.target.value })}><option value="premium">Pengguna premium</option><option value="all">Semua pengguna</option><option value="cohort">Kloter tertentu</option></select></Field>
        <div className="lg:col-span-2"><Field label="Deskripsi peserta" hint="Tampil pada detail ujian sebelum peserta memulai."><textarea rows="4" className={`${fieldClassName} h-auto py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
    </div>;
}

function StructureStep({ sections, setSections }) {
    const update = (index, key, value) => setSections(sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [key]: Number(value) } : section));
    return <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-gray-950 dark:text-white">Bagian ujian</h2><p className="mt-1 text-sm text-gray-500">Urutan ini juga menjadi navigasi saat peserta mengerjakan.</p></div><button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><AddRoundedIcon fontSize="small" /> Tambah bagian</button></div>
        <div className="mt-5 divide-y divide-gray-100 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {sections.map((section, index) => <div key={section.key} className="grid gap-4 py-4 md:grid-cols-[36px_minmax(0,1fr)_150px_150px] md:items-center">
                <DragIndicatorRoundedIcon className="text-gray-400" />
                <div><p className="text-sm font-black text-gray-950 dark:text-white">{index + 1}. {section.short_label}</p><p className="mt-1 text-xs text-gray-500">{section.label}</p></div>
                <Field label="Durasi (menit)"><input type="number" min="1" className={fieldClassName} value={section.duration_minutes} onChange={(event) => update(index, 'duration_minutes', event.target.value)} /></Field>
                <Field label="Target soal"><input type="number" min="1" className={fieldClassName} value={section.question_count} onChange={(event) => update(index, 'question_count', event.target.value)} /></Field>
            </div>)}
        </div>
    </div>;
}

function QuestionsStep({ questions, selected, setSelected, importInput, importedFile, setImportedFile }) {
    const allSelected = selected.length === questions.length;
    const toggleAll = () => setSelected(allSelected ? [] : questions.map((item) => item.id));
    const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
    return <div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div><h2 className="font-black text-gray-950 dark:text-white">Naskah soal</h2><p className="mt-1 text-sm text-gray-500">Gunakan bank soal untuk pemakaian ulang, atau impor untuk input massal.</p></div>
            <div className="flex flex-wrap gap-2">
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><LibraryBooksRoundedIcon fontSize="small" /> Pilih bank soal</button>
                <button type="button" onClick={() => importInput.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><UploadFileRoundedIcon fontSize="small" /> Import CSV/XLSX</button>
                <input ref={importInput} type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => setImportedFile(event.target.files?.[0]?.name || '')} />
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-xs font-black text-white hover:bg-brand-700"><AddRoundedIcon fontSize="small" /> Tambah manual</button>
            </div>
        </div>
        {importedFile && <div className="mt-4 flex items-center justify-between border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200"><span>{importedFile} siap dipreview. Belum disimpan.</span><button type="button" onClick={() => setImportedFile('')} className="text-xs underline">Batalkan</button></div>}
        <div className="mt-5 overflow-x-auto border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th><th className="px-3 py-3">Kode & pertanyaan</th><th className="px-3 py-3">Bagian</th><th className="px-3 py-3">Tipe</th><th className="px-3 py-3">Jawaban</th><th className="px-3 py-3">Validasi</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{questions.map((question) => <tr key={question.id}><td className="px-4 py-4"><input type="checkbox" checked={selected.includes(question.id)} onChange={() => toggle(question.id)} /></td><td className="max-w-md px-3 py-4"><p className="text-xs font-black text-brand-600">{question.code}</p><p className="mt-1 font-semibold text-gray-900 dark:text-white">{question.prompt}</p></td><td className="px-3 py-4 text-gray-600 dark:text-gray-300">{question.section}</td><td className="px-3 py-4 text-gray-600 dark:text-gray-300">{question.type}</td><td className="px-3 py-4 font-bold text-gray-800 dark:text-gray-200">{question.answer}</td><td className="px-3 py-4">{question.status === 'valid' ? <span className="text-xs font-black text-emerald-600">Siap</span> : <span className="text-xs font-black text-amber-600">Audio belum ada</span>}</td></tr>)}</tbody></table>
        </div>
        <p className="mt-3 text-xs font-semibold text-gray-500">{selected.length} soal dipilih · aksi massal akan tersedia setelah backend diaktifkan.</p>
    </div>;
}

function ValidationStep({ form, sections, questions }) {
    const checks = [
        ['Identitas paket lengkap', Boolean(form.title && form.level && form.description)],
        ['Semua bagian memiliki durasi', sections.every((item) => item.duration_minutes > 0)],
        ['Setiap bagian memiliki soal', sections.every((item) => item.question_count > 0)],
        ['Semua soal memiliki jawaban', questions.every((item) => item.answer)],
        ['Audio listening tersedia', questions.filter((item) => item.type === 'Audio').every((item) => item.status === 'valid')],
    ];
    return <div><h2 className="font-black text-gray-950 dark:text-white">Checklist sebelum terbit</h2><p className="mt-1 text-sm text-gray-500">Paket hanya dapat diterbitkan jika seluruh pemeriksaan wajib lolos.</p><div className="mt-5 divide-y divide-gray-100 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">{checks.map(([label, valid]) => <div key={label} className="flex items-center justify-between gap-4 py-4"><span className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</span>{valid ? <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-600"><CheckCircleRoundedIcon fontSize="small" /> Lolos</span> : <span className="inline-flex items-center gap-2 text-xs font-black text-amber-600"><ErrorOutlineRoundedIcon fontSize="small" /> Perlu diperbaiki</span>}</div>)}</div></div>;
}

function PreviewStep({ form, sections }) {
    const duration = sections.reduce((total, item) => total + item.duration_minutes, 0);
    const questions = sections.reduce((total, item) => total + item.question_count, 0);
    return <div className="mx-auto max-w-3xl"><div className="border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-black text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">{form.level}</span><span className="text-xs font-bold text-gray-500">{form.type === 'simulation' ? 'Simulasi JLPT' : 'Latihan ujian'}</span></div><h2 className="mt-4 text-2xl font-black text-gray-950 dark:text-white">{form.title || 'Paket ujian tanpa judul'}</h2><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{form.description || 'Deskripsi belum diisi.'}</p><div className="mt-5 grid grid-cols-3 border-y border-gray-200 py-4 text-center dark:border-gray-700"><div><strong className="block text-lg">{sections.length}</strong><span className="text-xs text-gray-500">Bagian</span></div><div><strong className="block text-lg">{questions}</strong><span className="text-xs text-gray-500">Soal</span></div><div><strong className="block text-lg">{duration}</strong><span className="text-xs text-gray-500">Menit</span></div></div><ol className="mt-5 space-y-3">{sections.map((section, index) => <li key={section.key} className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3 text-sm last:border-0 dark:border-gray-700"><span className="font-black">{index + 1}. {section.short_label}</span><span className="text-gray-500">{section.question_count} soal · {section.duration_minutes} menit</span></li>)}</ol></div></div>;
}

export default function Editor({ exam, mode = 'create', levels = [], section_templates = [], question_samples = [] }) {
    const [step, setStep] = useState(0);
    const [saved, setSaved] = useState(false);
    const [selected, setSelected] = useState([]);
    const [importedFile, setImportedFile] = useState('');
    const importInput = useRef(null);
    const [form, setForm] = useState({ title: exam?.title || '', level: exam?.level || 'N3', type: exam?.type || 'simulation', access: exam?.access || 'premium', description: exam?.description || '' });
    const [sections, setSections] = useState(exam?.sections?.length ? exam.sections : section_templates);
    const hasBlockingIssue = useMemo(() => question_samples.some((item) => item.status !== 'valid') || !form.title || !form.description, [form, question_samples]);
    const saveLocal = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2400); };

    return <AuthenticatedLayout><Head title={mode === 'create' ? 'Buat Ujian' : `Edit ${exam.title}`} /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><Link href="/admin/exams" className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-300 text-gray-600 hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><ArrowBackRoundedIcon fontSize="small" /></Link><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-gray-950 dark:text-white">{mode === 'create' ? 'Buat paket ujian' : form.title}</h1><PrototypeNotice />{exam && <StatusBadge status={exam.status} />}</div><p className="mt-1 text-sm text-gray-500">Workspace terpisah dari builder Evaluasi Week.</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={saveLocal} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><SaveOutlinedIcon fontSize="small" /> Simpan draft</button>{exam && <Link href={`/admin/exams/${exam.slug}/preview`} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><VisibilityOutlinedIcon fontSize="small" /> Preview peserta</Link>}</div></div>
        {saved && <div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Draft tersimpan pada tampilan ini. Persistensi backend belum diaktifkan.</div>}
        <div className="mt-6 grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]"><aside className="self-start border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-24"><ol className="space-y-1">{steps.map((label, index) => <li key={label}><button type="button" onClick={() => setStep(index)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-black ${step === index ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${step === index ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>{index + 1}</span>{label}</button></li>)}</ol></aside>
            <main className="min-w-0 border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                {step === 0 && <IdentityStep form={form} setForm={setForm} levels={levels} />}
                {step === 1 && <StructureStep sections={sections} setSections={setSections} />}
                {step === 2 && <QuestionsStep questions={question_samples} selected={selected} setSelected={setSelected} importInput={importInput} importedFile={importedFile} setImportedFile={setImportedFile} />}
                {step === 3 && <ValidationStep form={form} sections={sections} questions={question_samples} />}
                {step === 4 && <PreviewStep form={form} sections={sections} />}
                <footer className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5 dark:border-gray-800"><button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">Kembali</button>{step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="h-10 rounded-md bg-brand-600 px-5 text-sm font-black text-white hover:bg-brand-700">Lanjut</button> : <button type="button" disabled={hasBlockingIssue} title={hasBlockingIssue ? 'Selesaikan validasi terlebih dahulu' : 'Backend publikasi belum tersedia'} className="h-10 rounded-md bg-brand-600 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">Publikasikan</button>}</footer>
            </main></div>
    </div></div></AuthenticatedLayout>;
}
