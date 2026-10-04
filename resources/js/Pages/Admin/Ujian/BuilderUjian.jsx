import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminDialog from '@/Components/UI/AdminDialog';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { StatusBadge, apiErrorMessage, fieldClassName } from '@/Components/Features/AdminExam/AdminExamUI';
import Field from '@/Components/UI/QuizField';

const steps = ['Identitas', 'Struktur', 'Naskah soal', 'Validasi', 'Preview'];
const questionTypes = [
    ['multiple_choice', 'Pilihan ganda'],
    ['fill_blank', 'Isian singkat'],
    ['typing', 'Ketik jawaban'],
    ['listening', 'Mendengarkan'],
    ['sentence_builder', 'Susun kalimat'],
];

const emptyQuestion = (sectionKey = 'vocabulary') => ({
    local_id: `new-${Date.now()}`,
    id: null,
    section_key: sectionKey,
    code: '',
    type: 'multiple_choice',
    points: 1,
    prompt: '',
    question_reading: '',
    options_text: '',
    answer: '',
    correct_answer_reading: '',
    explanation: '',
    explanation_reading: '',
    audio_path: '',
});
const normalizeSections = (items) => items.map((item) => ({ ...item, estimated_max_score: item.estimated_max_score ?? 60, estimated_pass_score: item.estimated_pass_score ?? 19 }));
const normalizeQuestions = (items) => items.map((item) => ({ ...item, local_id: String(item.id), options_text: (item.options || []).join('\n') }));

function ActionMessage({ notice, error }) {
    if (!notice && !error) return null;

    return <div className={`mt-4 border px-4 py-3 text-sm font-bold ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>{error || notice}</div>;
}

function IdentityStep({ form, setForm, levels, readOnly }) {
    return <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Nama paket ujian" required tooltip="Judul resmi paket ujian yang tampil pada daftar ujian peserta."><input disabled={readOnly} className={fieldClassName} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Simulasi JLPT N3 September" /></Field>
        <Field label="Level" required tooltip="Tingkat kemahiran JLPT sasaran untuk paket ujian ini (N5 hingga N1)."><select disabled={readOnly} className={fieldClassName} value={form.level_id} onChange={(event) => setForm({ ...form, level_id: event.target.value })}><option value="">Pilih level</option>{levels.map((item) => <option key={item.id} value={item.id}>{item.level_name}</option>)}</select></Field>
        <Field label="Jenis" required tooltip="Simulasi JLPT mencakup batasan waktu dan skor ketat, sedangkan Latihan Ujian lebih fleksibel."><select disabled={readOnly} className={fieldClassName} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="simulation">Simulasi JLPT</option><option value="practice">Latihan ujian</option></select></Field>
        <Field label="Hak akses" required tooltip="Tentukan apakah paket dapat diakses semua siswa, hanya pengguna premium, atau kloter tertentu."><select disabled={readOnly} className={fieldClassName} value={form.access_type} onChange={(event) => setForm({ ...form, access_type: event.target.value })}><option value="premium">Pengguna premium</option><option value="all">Semua pengguna</option><option value="cohort">Kloter tertentu</option></select></Field>
        <Field label="Batas percobaan" hint="Kosongkan jika percobaan tidak dibatasi." tooltip="Berapa kali peserta diizinkan mengulang ujian ini. Kosongkan jika tanpa batasan."><input disabled={readOnly} type="number" min="1" max="100" className={fieldClassName} value={form.attempt_limit} onChange={(event) => setForm({ ...form, attempt_limit: event.target.value })} /></Field>
        <Field label="Rilis hasil" required tooltip="Kapan skor dan status kelulusan diumumkan kepada peserta ujian."><select disabled={readOnly} className={fieldClassName} value={form.result_release_policy} onChange={(event) => setForm({ ...form, result_release_policy: event.target.value })}><option value="immediate">Langsung setelah selesai</option><option value="after_session">Setelah sesi ditutup</option><option value="manual">Dirilis admin</option></select></Field>
        <Field label="Pembahasan peserta" required tooltip="Kebijakan menampilkan kunci jawaban dan ulasan soal setelah ujian selesai."><select disabled={readOnly} className={fieldClassName} value={form.review_policy} onChange={(event) => setForm({ ...form, review_policy: event.target.value })}><option value="none">Tidak ditampilkan</option><option value="wrong_only">Hanya jawaban salah</option><option value="full">Semua jawaban</option></select></Field>
        <Field label="Peringkat" required tooltip="Aturan pencatatan skor peserta ke papan peringkat (leaderboard) global."><select disabled={readOnly} className={fieldClassName} value={form.ranking_policy} onChange={(event) => setForm({ ...form, ranking_policy: event.target.value })}><option value="disabled">Tidak masuk peringkat</option><option value="first_attempt">Percobaan pertama</option></select></Field>
        {form.type === 'simulation' && <Field label="Estimasi batas lulus total" required hint="Nilai 1-180 dan tidak boleh melebihi total skor bagian." tooltip="Nilai total minimal (1-180) yang harus dicapai peserta untuk dinyatakan lulus simulasi."><input disabled={readOnly} type="number" min="1" max="180" className={fieldClassName} value={form.estimated_total_pass_score} onChange={(event) => setForm({ ...form, estimated_total_pass_score: event.target.value })} /></Field>}
        <div className="lg:col-span-2"><Field label="Deskripsi peserta" hint="Tampil pada detail ujian sebelum peserta memulai." tooltip="Instruksi, silabus singkat, atau informasi awal yang dibaca peserta sebelum mulai mengerjakan."><textarea disabled={readOnly} rows="4" className={`${fieldClassName} h-auto py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
    </div>;
}

function StructureStep({ sections, setSections, templates, readOnly }) {
    const update = (index, key, value) => setSections(sections.map((section, current) => current === index ? { ...section, [key]: value } : section));
    const addSection = () => {
        const template = templates.find((item) => !sections.some((section) => section.key === item.key));
        if (template) setSections([...sections, { ...template, duration_minutes: 30, question_count: 0, estimated_max_score: 60, estimated_pass_score: 19 }]);
    };

    return <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-gray-950 dark:text-white">Bagian ujian</h2><p className="mt-1 text-sm text-gray-500">Gunakan bagian JLPT yang diperlukan dan atur durasi serta batas nilainya.</p></div><button type="button" disabled={readOnly || sections.length >= templates.length} onClick={addSection} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"><AddRoundedIcon fontSize="small" /> Tambah bagian</button></div>
        <div className="mt-5 divide-y divide-gray-100 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {sections.map((section, index) => <div key={section.key} className="grid gap-4 py-4 lg:grid-cols-[minmax(220px,1fr)_120px_130px_130px_42px] lg:items-end">
                <div><p className="text-sm font-black text-gray-950 dark:text-white">{index + 1}. {section.short_label}</p><p className="mt-1 text-xs text-gray-500">{section.label}</p></div>
                <Field label="Durasi (menit)" required tooltip="Alokasi waktu pengerjaan untuk bagian ujian ini."><input disabled={readOnly} type="number" min="1" className={fieldClassName} value={section.duration_minutes} onChange={(event) => update(index, 'duration_minutes', event.target.value)} /></Field>
                <Field label="Skor maksimal" required tooltip="Nilai tertinggi yang bisa diraih pada bagian ujian ini (standar JLPT: 60 per bagian)."><input disabled={readOnly} type="number" min="1" max="180" className={fieldClassName} value={section.estimated_max_score} onChange={(event) => update(index, 'estimated_max_score', event.target.value)} /></Field>
                <Field label="Batas lulus" required tooltip="Nilai batas ambang lulus (sectional benchmark) yang wajib dipenuhi pada bagian ini agar tidak gugur otomatis."><input disabled={readOnly} type="number" min="0" max="180" className={fieldClassName} value={section.estimated_pass_score} onChange={(event) => update(index, 'estimated_pass_score', event.target.value)} /></Field>
                <button type="button" disabled={readOnly || sections.length === 1} onClick={() => setSections(sections.filter((_, current) => current !== index))} className="grid h-11 w-10 place-items-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30" title="Hapus bagian"><DeleteOutlineRoundedIcon fontSize="small" /></button>
            </div>)}
        </div>
    </div>;
}

function QuestionsStep({ questions, setQuestions, sections, readOnly, onImport, importInput, onOpenQuestion, onOpenPicker, onDuplicateQuestion, onMoveQuestion, onDeleteQuestion }) {
    return <div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-black text-gray-950 dark:text-white">Naskah soal</h2><p className="mt-1 text-sm text-gray-500">Tambah soal manual, duplikasi, geser urutan, tarik dari bank soal, atau impor massal XLSX.</p></div>{!readOnly && <div className="flex flex-wrap gap-2"><a href={route('admin.exam-versions.template')} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-200"><DownloadRoundedIcon fontSize="small" /> Template XLSX</a><button type="button" onClick={() => importInput.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-black text-gray-700 dark:border-gray-700 dark:text-gray-200"><UploadFileRoundedIcon fontSize="small" /> Impor XLSX</button><input ref={importInput} type="file" accept=".xlsx" className="hidden" onChange={onImport} /><button type="button" onClick={onOpenPicker} className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-3 text-xs font-black text-white hover:bg-amber-700 shadow-sm"><FolderOpenOutlinedIcon fontSize="small" /> Tarik dari Bank Soal</button><button type="button" onClick={() => onOpenQuestion()} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-3 text-xs font-black text-white hover:bg-brand-700"><AddRoundedIcon fontSize="small" /> Tambah manual</button></div>}</div>
        <div className="mt-5 overflow-x-auto border border-gray-200 dark:border-gray-800"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60"><tr><th className="w-12 px-3 py-3 text-center">No</th><th className="px-4 py-3">Kode & pertanyaan</th><th className="px-3 py-3">Bagian</th><th className="px-3 py-3">Tipe</th><th className="px-3 py-3">Jawaban</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {questions.map((question, index) => <tr key={question.local_id}><td className="px-3 py-4 text-center font-bold text-gray-400">{index + 1}</td><td className="max-w-md px-4 py-4"><p className="text-xs font-black text-brand-600">{question.code || 'TANPA KODE'}</p><p className="mt-1 font-semibold text-gray-900 dark:text-white line-clamp-2">{question.prompt}</p></td><td className="px-3 py-4 text-gray-600 dark:text-gray-300">{sections.find((item) => item.key === question.section_key)?.short_label || question.section_key}</td><td className="px-3 py-4 text-gray-600 dark:text-gray-300">{questionTypes.find(([value]) => value === question.type)?.[1]}</td><td className="max-w-[160px] truncate px-3 py-4 font-bold text-gray-800 dark:text-gray-200">{question.answer}</td><td className="px-3 py-4">{question.type !== 'listening' || question.audio_path ? <span className="text-xs font-black text-emerald-600">Siap</span> : <span className="text-xs font-black text-amber-600">Audio belum ada</span>}</td><td className="px-3 py-4">{!readOnly && <div className="flex items-center justify-end gap-1"><button type="button" disabled={index === 0} onClick={() => onMoveQuestion(index, -1)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-20 dark:hover:bg-gray-800" title="Geser ke atas"><ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} /></button><button type="button" disabled={index === questions.length - 1} onClick={() => onMoveQuestion(index, 1)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-20 dark:hover:bg-gray-800" title="Geser ke bawah"><ArrowDownwardRoundedIcon sx={{ fontSize: 18 }} /></button><button type="button" onClick={() => onDuplicateQuestion(question)} className="grid h-8 w-8 place-items-center rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30" title="Duplikasi soal ini"><ContentCopyRoundedIcon sx={{ fontSize: 17 }} /></button><button type="button" onClick={() => onOpenQuestion(question)} className="grid h-8 w-8 place-items-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" title="Edit isi soal"><EditOutlinedIcon sx={{ fontSize: 18 }} /></button><button type="button" onClick={() => onDeleteQuestion(question)} className="grid h-8 w-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Hapus soal"><DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} /></button></div>}</td></tr>)}
            {questions.length === 0 && <tr><td colSpan="7" className="px-4 py-12 text-center font-semibold text-gray-500">Belum ada soal. Tambahkan manual atau impor XLSX.</td></tr>}
        </tbody></table></div>
        <p className="mt-3 text-xs font-semibold text-gray-500">{questions.length} soal pada draft ini. Urutan pengerjaan soal mengikuti baris tabel.</p>
    </div>;
}

function ValidationStep({ readiness, onValidate, busy }) {
    return <div><div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-gray-950 dark:text-white">Pemeriksaan server</h2><p className="mt-1 text-sm text-gray-500">Validasi memakai aturan backend yang sama dengan proses publikasi.</p></div><button type="button" disabled={busy} onClick={onValidate} className="h-10 rounded-md bg-brand-600 px-4 text-sm font-black text-white disabled:opacity-50">Periksa sekarang</button></div>{readiness ? <div className={`mt-5 border p-5 ${readiness.valid ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20'}`}><p className={`inline-flex items-center gap-2 font-black ${readiness.valid ? 'text-emerald-700' : 'text-amber-700'}`}>{readiness.valid ? <CheckCircleRoundedIcon /> : <ErrorOutlineRoundedIcon />}{readiness.valid ? 'Paket siap diterbitkan' : 'Masih ada yang perlu diperbaiki'}</p>{readiness.errors?.map((item) => <p key={item} className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{item}</p>)}</div> : <div className="mt-5 border border-dashed border-gray-300 p-8 text-center text-sm font-semibold text-gray-500 dark:border-gray-700">Simpan perubahan, lalu jalankan pemeriksaan.</div>}</div>;
}

function PreviewStep({ form, sections, questions }) {
    const duration = sections.reduce((total, item) => total + Number(item.duration_minutes || 0), 0);

    return <div className="mx-auto max-w-3xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-black text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">{form.level_name}</span><span className="text-xs font-bold text-gray-500">{form.type === 'simulation' ? 'Simulasi JLPT' : 'Latihan ujian'}</span></div><h2 className="mt-4 text-2xl font-black text-gray-950 dark:text-white">{form.title || 'Paket ujian tanpa judul'}</h2><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{form.description || 'Deskripsi belum diisi.'}</p><div className="mt-5 grid grid-cols-3 border-y border-gray-200 py-4 text-center dark:border-gray-700"><div><strong className="block text-lg">{sections.length}</strong><span className="text-xs text-gray-500">Bagian</span></div><div><strong className="block text-lg">{questions.length}</strong><span className="text-xs text-gray-500">Soal</span></div><div><strong className="block text-lg">{duration}</strong><span className="text-xs text-gray-500">Menit</span></div></div><ol className="mt-5 space-y-3">{sections.map((section, index) => <li key={section.key} className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3 text-sm last:border-0 dark:border-gray-700"><span className="font-black">{index + 1}. {section.short_label}</span><span className="text-gray-500">{questions.filter((item) => item.section_key === section.key).length} soal · {section.duration_minutes} menit</span></li>)}</ol></div>;
}

export default function Editor({ exam, mode = 'create', level_options = [], section_templates = [], question_samples = [] }) {
    const [step, setStep] = useState(0);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [readiness, setReadiness] = useState(null);
    const [questionEditor, setQuestionEditor] = useState(null);
    const [questionDialogError, setQuestionDialogError] = useState('');
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerBanks, setPickerBanks] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerSelectedQuestions, setPickerSelectedQuestions] = useState(new Set());
    const [pickerTargetSection, setPickerTargetSection] = useState('');
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const importInput = useRef(null);
    const readOnly = Boolean(exam && (exam.status === 'archived' || exam.version_status !== 'draft'));
    const [form, setForm] = useState({
        title: exam?.title || '', description: exam?.description || '', level_id: exam?.level_id || '', level_name: exam?.level || '', type: exam?.type || 'simulation', access_type: exam?.access || 'premium',
        attempt_limit: exam?.attempt_limit ?? '', result_release_policy: exam?.result_release_policy || 'manual', review_policy: exam?.review_policy || 'wrong_only', ranking_policy: exam?.ranking_policy || 'first_attempt', estimated_total_pass_score: exam?.estimated_total_pass_score ?? '',
    });
    const [sections, setSections] = useState(normalizeSections(exam?.sections?.length ? exam.sections : section_templates));
    const [questions, setQuestions] = useState(normalizeQuestions(question_samples));

    const openPicker = async () => {
        setPickerOpen(true);
        setPickerLoading(true);
        setPickerSelectedQuestions(new Set());
        setPickerTargetSection(sections[0]?.key || 'vocabulary');
        try {
            const res = await window.axios.get(route('admin.exams.question-banks.picker'), {
                params: { level_id: form.level_id || undefined },
            });
            setPickerBanks(res.data.banks || []);
        } catch (e) {
            alert('Gagal memuat bank soal.');
        } finally {
            setPickerLoading(false);
        }
    };

    const handleInsertPickedQuestions = () => {
        const picked = [];
        pickerBanks.forEach((b) => {
            (b.wrappers || []).forEach((w) => {
                (w.questions || []).forEach((q) => {
                    if (pickerSelectedQuestions.has(q.id)) {
                        picked.push({
                            ...q,
                            wrapper_title: w.title,
                            stimulus_text: w.stimulus_text,
                            audio_url: q.audio_url || w.audio_url,
                        });
                    }
                });
            });
            (b.standalone_questions || []).forEach((q) => {
                if (pickerSelectedQuestions.has(q.id)) {
                    picked.push(q);
                }
            });
        });

        if (!picked.length) return;

        const newItems = picked.map((bq) => ({
            local_id: `bank-${bq.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            id: null,
            section_key: pickerTargetSection || sections[0]?.key || 'vocabulary',
            code: bq.code || '',
            type: bq.type || 'multiple_choice',
            points: Number(bq.points) || 1,
            prompt: bq.question_text,
            question_reading: bq.stimulus_text
                ? `【${bq.wrapper_title}】\n${bq.stimulus_text}\n\n${bq.question_reading || ''}`
                : (bq.question_reading || ''),
            options_text: (bq.options || []).join('\n'),
            answer: bq.correct_answer,
            correct_answer_reading: bq.correct_answer_reading || '',
            explanation: bq.explanation || '',
            explanation_reading: bq.explanation_reading || '',
            audio_path: bq.audio_url || '',
        }));

        setQuestions((current) => [...current, ...newItems]);
        setPickerOpen(false);
        setNotice(`${newItems.length} butir soal berhasil ditarik dari Bank Soal ke bagian ${sections.find((s) => s.key === pickerTargetSection)?.short_label || pickerTargetSection}.`);
    };

    useEffect(() => setQuestions(normalizeQuestions(question_samples)), [question_samples]);
    useEffect(() => {
        const selected = level_options.find((item) => String(item.id) === String(form.level_id));
        if (selected && selected.level_name !== form.level_name) setForm((current) => ({ ...current, level_name: selected.level_name }));
    }, [form.level_id, form.level_name, level_options]);

    const versionPayload = () => ({ attempt_limit: form.attempt_limit === '' ? null : Number(form.attempt_limit), result_release_policy: form.result_release_policy, review_policy: form.review_policy, ranking_policy: form.ranking_policy, estimated_total_pass_score: form.type === 'simulation' && form.estimated_total_pass_score !== '' ? Number(form.estimated_total_pass_score) : null });
    const identityPayload = (status = exam?.status || 'draft') => ({ title: form.title, description: form.description || null, level_id: Number(form.level_id), type: form.type, access_type: form.access_type, status });
    const run = async (action, success) => {
        setBusy(true); setError(''); setNotice('');
        try { await action(); setNotice(success); return true; } catch (requestError) { setError(apiErrorMessage(requestError)); return false; } finally { setBusy(false); }
    };

    const saveIdentity = async () => {
        if (mode === 'create') {
            router.post(route('admin.exams.store'), { ...identityPayload('draft'), ...versionPayload() }, { preserveScroll: true, onStart: () => setBusy(true), onError: (errors) => setError(Object.values(errors).flat()[0] || 'Data ujian belum valid.'), onFinish: () => setBusy(false) });
            return;
        }
        if (readOnly) return;
        const saved = await run(async () => {
            await window.axios.patch(route('admin.exam-versions.update', exam.version_id), versionPayload(), { headers: { Accept: 'application/json' } });
            await window.axios.patch(route('admin.exams.update', exam.slug), identityPayload(), { headers: { Accept: 'application/json' } });
        }, 'Identitas dan aturan ujian tersimpan.');
        if (saved) router.reload({ only: ['exam_packages'], preserveScroll: true });
    };

    const saveSections = () => run(async () => {
        const response = await window.axios.put(route('admin.exam-versions.sections.sync', exam.version_id), { sections: sections.map((item, index) => ({ key: item.key, title: item.label, short_title: item.short_label, sort_order: index + 1, time_limit_seconds: Number(item.duration_minutes) * 60, estimated_max_score: Number(item.estimated_max_score), estimated_pass_score: Number(item.estimated_pass_score) })) });
        const saved = response.data.version.sections;
        setSections(normalizeSections(saved.map((item) => ({ id: item.id, key: item.key, label: item.title, short_label: item.short_title || item.title, duration_minutes: Math.ceil(item.time_limit_seconds / 60), question_count: item.questions?.length || 0, estimated_max_score: item.estimated_max_score, estimated_pass_score: item.estimated_pass_score }))));
        setQuestions((current) => current.filter((item) => saved.some((section) => section.key === item.section_key)));
        setReadiness(null);
    }, 'Struktur ujian tersimpan.');

    const saveQuestions = () => run(async () => {
        for (const section of sections) {
            if (!section.id) throw new Error('Simpan struktur sebelum menyimpan soal.');
            const payload = questions.filter((item) => item.section_key === section.key).map((item, index) => ({
                ...(item.id ? { id: item.id } : {}), code: item.code || null, type: item.type, sort_order: index + 1, points: Number(item.points), question_text: item.prompt, question_reading: item.question_reading || null,
                options: ['multiple_choice', 'listening', 'sentence_builder'].includes(item.type) ? item.options_text.split('\n').map((value) => value.trim()).filter(Boolean) : null,
                option_readings: item.option_readings || null, correct_answer: item.answer, correct_answer_reading: item.correct_answer_reading || null, explanation: item.explanation || null, explanation_reading: item.explanation_reading || null, audio_path: item.audio_path || null,
            }));
            await window.axios.put(route('admin.exam-sections.questions.sync', section.id), { questions: payload });
        }
        setReadiness(null);
        router.reload({ only: ['exam_packages', 'question_samples'], preserveScroll: true });
    }, 'Naskah soal tersimpan.');

    const saveCurrentStep = () => {
        if (step === 0) return saveIdentity();
        if (!exam || readOnly) return;
        if (step === 1) return saveSections();
        if (step === 2) return saveQuestions();
    };
    const validate = () => run(async () => { const response = await window.axios.post(route('admin.exam-versions.validate', exam.version_id)); setReadiness(response.data); }, 'Pemeriksaan selesai.');
    const createRevision = () => run(async () => { await window.axios.post(route('admin.exams.versions.store', exam.slug)); router.reload({ preserveScroll: true }); }, 'Draft revisi dibuat.');

    const runConfirmed = async () => {
        setConfirmProcessing(true); setError('');
        try { await confirmState.onConfirm(); closeConfirm(); } catch (requestError) { setError(apiErrorMessage(requestError)); setConfirmProcessing(false); }
    };
    const confirmPublish = () => openConfirm({ variant: 'success', title: 'Terbitkan versi ujian?', message: 'Versi yang terbit menjadi tetap dan perubahan berikutnya harus dibuat sebagai draft revisi.', confirmLabel: 'Publikasikan', details: [{ label: 'Paket', value: form.title }], onConfirm: async () => { await window.axios.post(route('admin.exam-versions.publish', exam.version_id)); router.visit(route('admin.exams.index')); } });
    const confirmArchive = () => openConfirm({ variant: 'warning', title: 'Arsipkan paket ujian?', message: 'Paket tidak lagi tersedia bagi peserta, tetapi seluruh versi dan riwayat hasil tetap disimpan.', confirmLabel: 'Arsipkan', details: [{ label: 'Paket', value: form.title }], onConfirm: async () => { await window.axios.patch(route('admin.exams.update', exam.slug), { status: 'archived' }, { headers: { Accept: 'application/json' } }); router.visit(route('admin.exams.index')); } });

    const handleDuplicateQuestion = (question) => {
        const index = questions.findIndex((item) => item.local_id === question.local_id);
        const copy = {
            ...question,
            id: null,
            local_id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            code: question.code ? `${question.code}-COPY` : '',
            prompt: `${question.prompt} (Salinan)`,
        };
        const next = [...questions];
        next.splice(index + 1, 0, copy);
        setQuestions(next);
        setReadiness(null);
        setNotice('Butir soal berhasil diduplikasi.');
    };

    const handleMoveQuestion = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= questions.length) return;
        const next = [...questions];
        const [item] = next.splice(index, 1);
        next.splice(targetIndex, 0, item);
        setQuestions(next);
        setReadiness(null);
    };

    const handleDeleteQuestion = (question) => {
        openConfirm({
            variant: 'warning',
            title: 'Hapus Soal dari Naskah?',
            message: `Hapus butir soal "${(question.prompt || 'Soal').substring(0, 50)}..."? Soal akan terhapus dari draft naskah ini.`,
            confirmLabel: 'Ya, Hapus',
            isDestructive: true,
            onConfirm: () => {
                setQuestions((current) => current.filter((item) => item.local_id !== question.local_id));
                setReadiness(null);
                setNotice('Butir soal dihapus dari draft.');
            },
        });
    };

    const saveQuestionLocal = () => {
        setQuestionDialogError('');
        if (!questionEditor.prompt?.trim() || !questionEditor.answer?.trim()) {
            setQuestionDialogError('Pertanyaan dan kunci jawaban benar wajib diisi.');
            return;
        }
        const options = (questionEditor.options_text || '').split('\n').map((item) => item.trim()).filter(Boolean);
        if (['multiple_choice', 'sentence_builder'].includes(questionEditor.type) && options.length < 2) {
            setQuestionDialogError('Pilihan ganda dan susun kalimat memerlukan minimal dua opsi pilihan.');
            return;
        }
        if (questionEditor.type === 'multiple_choice' && !options.includes(questionEditor.answer.trim())) {
            setQuestionDialogError('Jawaban benar pilihan ganda harus sama persis dengan salah satu opsi pilihan di atas.');
            return;
        }
        setQuestions((current) => current.some((item) => item.local_id === questionEditor.local_id) ? current.map((item) => item.local_id === questionEditor.local_id ? questionEditor : item) : [...current, questionEditor]);
        setQuestionEditor(null);
        setReadiness(null);
        setError('');
        setQuestionDialogError('');
    };
    const previewImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportFile(file);
        const data = new FormData(); data.append('file', file);
        await run(async () => { const response = await window.axios.post(route('admin.exam-versions.import.preview', exam.version_id), data); setImportPreview(response.data); }, 'Berkas selesai diperiksa.');
        event.target.value = '';
    };
    const commitImport = () => run(async () => {
        const data = new FormData(); data.append('file', importFile);
        await window.axios.post(route('admin.exam-versions.import', exam.version_id), data);
        setImportPreview(null); setImportFile(null);
        router.reload({ only: ['exam_packages', 'question_samples'], preserveScroll: true });
    }, 'Berkas berhasil diimpor.');

    return <AuthenticatedLayout><Head title={mode === 'create' ? 'Buat Ujian' : `Edit ${exam.title}`} /><div className="min-h-screen bg-slate-50 px-4 py-7 dark:bg-[#0b1121] sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><Link href={route('admin.exams.index')} className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"><ArrowBackRoundedIcon fontSize="small" /></Link><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-gray-950 dark:text-white">{mode === 'create' ? 'Buat paket ujian' : form.title}</h1>{exam && <StatusBadge status={exam.status} />}</div><p className="mt-1 text-sm text-gray-500">Paket ujian global, terpisah dari kuis kelas dan evaluasi mingguan.</p></div></div><div className="flex flex-wrap gap-2">{exam && <Link href={route('admin.exams.preview', exam.slug)} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-black text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><VisibilityOutlinedIcon fontSize="small" /> Preview</Link>}{exam && exam.status !== 'archived' && <button type="button" disabled={busy} onClick={confirmArchive} className="h-10 rounded-md border border-rose-200 px-4 text-sm font-black text-rose-700 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300">Arsipkan</button>}{exam && readOnly && exam.status !== 'archived' && <button type="button" disabled={busy} onClick={createRevision} className="h-10 rounded-md bg-brand-600 px-4 text-sm font-black text-white disabled:opacity-50">Buat draft revisi</button>}</div></div>
        <ActionMessage notice={notice} error={error} />
        {readOnly && <div className="mt-4 border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">Versi terbit atau arsip tidak dapat diubah. Buat draft revisi untuk memperbarui konten tanpa mengubah riwayat peserta.</div>}
        <div className="mt-6 grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]"><aside className="self-start border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 xl:sticky xl:top-24"><ol className="space-y-1">{steps.map((label, index) => <li key={label}><button type="button" disabled={!exam && index > 0} onClick={() => setStep(index)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-black disabled:opacity-35 ${step === index ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${step === index ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>{index + 1}</span>{label}</button></li>)}</ol></aside>
            <main className="min-w-0 border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                {step === 0 && <IdentityStep form={form} setForm={setForm} levels={level_options} readOnly={readOnly} />}
                {step === 1 && <StructureStep sections={sections} setSections={setSections} templates={section_templates} readOnly={readOnly} />}
                {step === 2 && <QuestionsStep questions={questions} setQuestions={setQuestions} sections={sections} readOnly={readOnly} onImport={previewImport} importInput={importInput} onOpenQuestion={(question = null) => { setQuestionDialogError(''); setQuestionEditor(question ? { ...question } : emptyQuestion(sections[0]?.key)); }} onDuplicateQuestion={handleDuplicateQuestion} onMoveQuestion={handleMoveQuestion} onDeleteQuestion={handleDeleteQuestion} onOpenPicker={openPicker} />}
                {step === 3 && <ValidationStep readiness={readiness} onValidate={validate} busy={busy} />}
                {step === 4 && <PreviewStep form={form} sections={sections} questions={questions} />}
                <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-800"><button type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">Kembali</button><div className="flex gap-2">{!readOnly && step <= 2 && <button type="button" disabled={busy} onClick={saveCurrentStep} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-black text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"><SaveOutlinedIcon fontSize="small" /> {mode === 'create' ? 'Buat draft' : 'Simpan draft'}</button>}{step < steps.length - 1 ? <button type="button" disabled={!exam && step === 0} onClick={() => setStep((value) => value + 1)} className="h-10 rounded-md bg-brand-600 px-5 text-sm font-black text-white disabled:opacity-40">Lanjut</button> : !readOnly && <button type="button" disabled={busy || !readiness?.valid} onClick={confirmPublish} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-black text-white disabled:opacity-40"><PublishRoundedIcon fontSize="small" /> Publikasikan</button>}</div></footer>
            </main>
        </div>
    </div></div>
    <AdminDialog open={Boolean(questionEditor)} onClose={() => setQuestionEditor(null)} eyebrow="Naskah soal" title={questionEditor?.id ? 'Edit soal' : 'Tambah soal'} description="Perubahan baru tersimpan ke server saat Simpan draft ditekan." maxWidth="max-w-3xl" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setQuestionEditor(null)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black dark:border-gray-700">Batal</button><button type="button" onClick={saveQuestionLocal} className="h-10 rounded-md bg-brand-600 px-4 text-sm font-black text-white hover:bg-brand-700">Simpan soal</button></div>}>
        {questionEditor && <div className="grid gap-4 sm:grid-cols-2">
            {questionDialogError && <div className="sm:col-span-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{questionDialogError}</div>}
            <Field label="Bagian" required tooltip="Bagian ujian JLPT tempat butir soal ini dikelompokkan (Goi, Dokkai, atau Choukai)."><select className={fieldClassName} value={questionEditor.section_key} onChange={(event) => setQuestionEditor({ ...questionEditor, section_key: event.target.value })}>{sections.map((item) => <option key={item.key} value={item.key}>{item.short_label}</option>)}</select></Field>
            <Field label="Tipe soal" required tooltip="Format soal ujian (Pilihan ganda standar, listening audio, atau susun kalimat)."><select className={fieldClassName} value={questionEditor.type} onChange={(event) => setQuestionEditor({ ...questionEditor, type: event.target.value })}>{questionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Kode soal" tooltip="Kode unik butir soal (misal: N3-GOI-01) untuk memudahkan identifikasi dan penataan kisi-kisi."><input className={fieldClassName} value={questionEditor.code} onChange={(event) => setQuestionEditor({ ...questionEditor, code: event.target.value })} /></Field>
            <Field label="Bobot" required tooltip="Bobot nilai/poin yang diperoleh peserta jika menjawab butir soal ini dengan benar."><input type="number" min="1" max="100" className={fieldClassName} value={questionEditor.points} onChange={(event) => setQuestionEditor({ ...questionEditor, points: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Pertanyaan" required tooltip="Pertanyaan atau kalimat pokok soal yang akan dikerjakan peserta."><textarea rows="3" className={`${fieldClassName} h-auto py-3`} value={questionEditor.prompt} onChange={(event) => setQuestionEditor({ ...questionEditor, prompt: event.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Bacaan pertanyaan" hint="Opsional." tooltip="Teks bacaan pendukung atau stimulus wacana panjang untuk soal pemahaman bacaan (Dokkai)."><textarea rows="2" className={`${fieldClassName} h-auto py-3`} value={questionEditor.question_reading} onChange={(event) => setQuestionEditor({ ...questionEditor, question_reading: event.target.value })} /></Field></div>
            {['multiple_choice', 'listening', 'sentence_builder'].includes(questionEditor.type) && <div className="sm:col-span-2"><Field label="Pilihan jawaban" required={['multiple_choice', 'sentence_builder'].includes(questionEditor.type)} hint="Satu pilihan per baris. Untuk susun kalimat, isi satu potongan per baris." tooltip="Daftar opsi pilihan jawaban. Tulis satu opsi per baris baru."><textarea rows="5" className={`${fieldClassName} h-auto py-3`} value={questionEditor.options_text} onChange={(event) => setQuestionEditor({ ...questionEditor, options_text: event.target.value })} /></Field></div>}
            <div className="sm:col-span-2"><Field label="Jawaban benar" required tooltip="Kunci jawaban benar. Pada pilihan ganda, harus sama persis dengan salah satu baris opsi di atas."><textarea rows="2" className={`${fieldClassName} h-auto py-3`} value={questionEditor.answer} onChange={(event) => setQuestionEditor({ ...questionEditor, answer: event.target.value })} /></Field></div>
            {questionEditor.type === 'listening' && <div className="sm:col-span-2"><Field label="Path audio" required={questionEditor.type === 'listening'} hint="Gunakan path media yang sudah tersedia di server." tooltip="Lokasi atau nama file audio listening yang sudah diunggah di server."><input className={fieldClassName} value={questionEditor.audio_path} onChange={(event) => setQuestionEditor({ ...questionEditor, audio_path: event.target.value })} placeholder="audio/exams/n3/listening-01.mp3" /></Field></div>}
            <div className="sm:col-span-2"><Field label="Pembahasan" hint="Opsional dan mengikuti kebijakan pembahasan paket." tooltip="Penjelasan rinci mengapa jawaban tersebut benar untuk dibaca siswa setelah ujian selesai."><textarea rows="3" className={`${fieldClassName} h-auto py-3`} value={questionEditor.explanation} onChange={(event) => setQuestionEditor({ ...questionEditor, explanation: event.target.value })} /></Field></div>
        </div>}
    </AdminDialog>
    <AdminDialog open={Boolean(importPreview)} onClose={() => { setImportPreview(null); setImportFile(null); }} eyebrow="Impor massal" title="Konfirmasi impor XLSX" description="Impor mengganti struktur dan naskah pada draft versi ini." footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => { setImportPreview(null); setImportFile(null); }} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black dark:border-gray-700">Batal</button><button type="button" disabled={busy || !importPreview?.valid} onClick={commitImport} className="h-10 rounded-md bg-brand-600 px-4 text-sm font-black text-white disabled:opacity-40">Impor sekarang</button></div>}><p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{importFile?.name}</p>{importPreview?.valid && <p className="mt-3 text-sm font-black text-emerald-700">{importPreview.summary.sections} bagian dan {importPreview.summary.questions} soal siap diimpor.</p>}{importPreview?.errors?.map((item) => <p key={item} className="mt-2 text-sm font-semibold text-rose-600">{item}</p>)}</AdminDialog>
    <AdminDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        eyebrow="Integrasi Bank Soal"
        title="Tarik Soal dari Bank Soal"
        description="Pilih butir-butir pertanyaan dari bank soal yang tersedia untuk disisipkan ke bagian ujian ini."
        maxWidth="max-w-4xl"
        footer={
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPickerOpen(false)} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-black dark:border-gray-700">
                    Batal
                </button>
                <button
                    type="button"
                    disabled={pickerSelectedQuestions.size === 0}
                    onClick={handleInsertPickedQuestions}
                    className="h-10 rounded-md bg-brand-600 px-5 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-40"
                >
                    Tarik {pickerSelectedQuestions.size} Soal ke Draf
                </button>
            </div>
        }
    >
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-100 p-3 dark:bg-gray-800">
                <label className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-gray-300">
                    Masukkan ke Bagian Ujian:
                    <select
                        value={pickerTargetSection}
                        onChange={(e) => setPickerTargetSection(e.target.value)}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                        {sections.map((s) => (
                            <option key={s.key} value={s.key}>{s.short_label || s.title || s.key}</option>
                        ))}
                    </select>
                </label>
                <span className="text-xs font-bold text-gray-500">
                    {pickerSelectedQuestions.size} butir terpilih
                </span>
            </div>

            {pickerLoading ? (
                <div className="py-12 text-center text-sm font-bold text-gray-400">Memuat bank soal...</div>
            ) : pickerBanks.length === 0 ? (
                <div className="py-12 text-center text-sm font-bold text-gray-400">Belum ada bank soal terbit untuk level ini.</div>
            ) : (
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                    {pickerBanks.map((b) => (
                        <div key={b.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                            <h3 className="font-black text-gray-950 dark:text-white">{b.title}</h3>
                            <p className="text-xs text-gray-500">{b.source || 'Sumber Mandiri'} · Level {b.level}</p>

                            <div className="mt-3 space-y-3">
                                {(b.wrappers || []).map((w) => (
                                    <div key={w.id} className="rounded border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-gray-800/80 dark:bg-gray-800/40">
                                        <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                                            <span>{w.mondai_number ? `[${w.mondai_number}] ` : ''}{w.title}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = new Set(pickerSelectedQuestions);
                                                    const allSelected = (w.questions || []).every((q) => next.has(q.id));
                                                    (w.questions || []).forEach((q) => {
                                                        if (allSelected) next.delete(q.id);
                                                        else next.add(q.id);
                                                    });
                                                    setPickerSelectedQuestions(next);
                                                }}
                                                className="text-[11px] font-black text-brand-600 underline"
                                            >
                                                Pilih Semua di Wacana Ini
                                            </button>
                                        </div>

                                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-brand-400">
                                            {(w.questions || []).map((q) => {
                                                const checked = pickerSelectedQuestions.has(q.id);
                                                return (
                                                    <label key={q.id} className="flex items-start gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                const next = new Set(pickerSelectedQuestions);
                                                                if (checked) next.delete(q.id);
                                                                else next.add(q.id);
                                                                setPickerSelectedQuestions(next);
                                                            }}
                                                            className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        <span className="font-japanese leading-relaxed text-gray-900 dark:text-gray-100">
                                                            {q.question_text}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {(b.standalone_questions || []).length > 0 && (
                                    <div className="rounded border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-gray-800/80 dark:bg-gray-800/40">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">Soal Mandiri:</span>
                                        <div className="mt-2 space-y-1.5 pl-2">
                                            {(b.standalone_questions || []).map((q) => {
                                                const checked = pickerSelectedQuestions.has(q.id);
                                                return (
                                                    <label key={q.id} className="flex items-start gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                const next = new Set(pickerSelectedQuestions);
                                                                if (checked) next.delete(q.id);
                                                                else next.add(q.id);
                                                                setPickerSelectedQuestions(next);
                                                            }}
                                                            className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        <span className="font-japanese leading-relaxed text-gray-900 dark:text-gray-100">
                                                            {q.question_text}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </AdminDialog>
    <ConfirmActionDialog {...confirmState} onConfirm={runConfirmed} onCancel={closeConfirm} />
    </AuthenticatedLayout>;
}
