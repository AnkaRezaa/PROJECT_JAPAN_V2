import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import { QuizActionButton, QuizErrorMessage } from '@/Components/UI/QuizUI';
const TITLES = {
  vocab: 'Kosakata',
  grammar: 'Grammar',
  dokkai: 'Dokkai'
};
const STAGES = {
  transformation: 'Transformasi',
  sentence_builder: 'Susun kata',
  context_choice: 'Konteks'
};
const fieldClass = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:ring-emerald-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';
const splitCount = count => ({
  transformation: Math.ceil(count / 3),
  sentence_builder: Math.ceil((count - Math.ceil(count / 3)) / 2),
  context_choice: Math.floor((count - Math.ceil(count / 3)) / 2)
});
function initialForm(data, type) {
  const count = data.settings?.count || (type === 'grammar' ? 15 : 10);
  return {
    level: String(data.level || '').match(/N[1-5]/)?.[0] || 'N5',
    input: type === 'grammar' ? {
      pattern: '',
      formula: '',
      meaning: '',
      examples: [],
      ...data.input
    } : type === 'vocab' ? {
      mode: 'word_to_meaning',
      category: '',
      content_type: 'all',
      status: 'published',
      ...data.input
    } : {
      source_quiz_id: ''
    },
    settings: {
      count,
      counts: splitCount(count),
      difficulty: 'mixed',
      target_form: 'auto',
      useDistractors: true,
      autoMeaning: true,
      ...data.settings
    }
  };
}
export default function UnifiedQuizGeneratorModal({
  open,
  onClose,
  type,
  onApplyDraft,
  initialData = {}
}) {
  const initialRef = useRef(initialData);
  initialRef.current = initialData;
  const [form, setForm] = useState(() => initialForm(initialData, type));
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [regenerating, setRegenerating] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sources, setSources] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const requestRef = useRef(null);
  const epoch = useRef(0);
  const {
    confirmState,
    openConfirm,
    closeConfirm
  } = useConfirmAction();
  const invalidate = () => {
    epoch.current++;
    requestRef.current?.abort();
    setDraft(null);
    setError('');
    setBusy(false);
    setRegenerating(null);
  };
  useEffect(() => {
    invalidate();
    if (open) {
      setForm(initialForm(initialRef.current, type));
      setSearch('');
      setPage(1);
      setSources([]);
    }
    return () => {
      epoch.current++;
      requestRef.current?.abort();
    };
  }, [open, type]);
  useEffect(() => {
    if (!open || type !== 'dokkai') return;
    const abort = new AbortController();
    setSourcesLoading(true);
    const timer = setTimeout(async () => {
      try {
        const {
          data
        } = await window.axios.get(route('admin.dokkai-quizzes.picker'), {
          params: {
            summary: 1,
            level: form.level,
            search,
            page
          },
          signal: abort.signal
        });
        if (!abort.signal.aborted) {
          setSources(data.data);
          setHasMore(data.has_more);
        }
      } catch (err) {
        if (!abort.signal.aborted) setError(err.response?.data?.message || 'Bank wacana gagal dimuat.');
      } finally {
        if (!abort.signal.aborted) setSourcesLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [open, type, form.level, search, page]);
  const change = (group, key, value) => {
    invalidate();
    setForm(current => group ? {
      ...current,
      [group]: {
        ...current[group],
        [key]: value
      }
    } : {
      ...current,
      [key]: value
    });
  };
  const changeCount = value => {
    invalidate();
    setForm(current => ({
      ...current,
      settings: {
        ...current.settings,
        count: value,
        ...(type === 'grammar' ? {
          counts: splitCount(value)
        } : {})
      }
    }));
  };
  const run = async (questionId = null) => {
    if (busy) return;
    const version = ++epoch.current;
    requestRef.current?.abort();
    const abort = new AbortController();
    requestRef.current = abort;
    setBusy(true);
    setRegenerating(questionId);
    setError('');
    try {
      const input = {
        ...form.input
      };
      if (type === 'grammar') input.examples = (input.examples || []).filter(example => example.japanese?.trim());
      const {
        data
      } = await window.axios.post(route('admin.quiz-generator', type), {
        operation: questionId ? 'regenerate' : 'generate',
        quiz_id: initialRef.current.quizId || null,
        module_day_id: initialRef.current.moduleDayId || null,
        level: form.level,
        input,
        settings: type === 'grammar' ? form.settings : {
          count: form.settings.count
        },
        ...(questionId ? {
          question_id: questionId,
          existing_questions: draft.questions
        } : {})
      }, {
        signal: abort.signal,
        timeout: 20000
      });
      if (version !== epoch.current || abort.signal.aborted) return;
      if (questionId) setDraft(current => ({
        ...current,
        questions: current.questions.map(q => q.id === questionId ? data.draft.questions[0] : q)
      }));else setDraft(data.draft);
    } catch (err) {
      if (version !== epoch.current || abort.signal.aborted) return;
      setError(Object.values(err.response?.data?.errors || {}).flat().join(' ') || err.response?.data?.message || 'Draf gagal dibuat. Coba lagi.');
    } finally {
      if (version === epoch.current) {
        setBusy(false);
        setRegenerating(null);
      }
    }
  };
  const apply = () => {
    const applyNow = () => {
      closeConfirm();
      onApplyDraft(draft, form.settings);
      onClose();
    };
    if (!initialRef.current.hasContent) {
      applyNow();
      return;
    }
    openConfirm({
      variant: 'warning',
      zIndex: 'z-[10200]',
      title: 'Ganti isi draf editor?',
      message: 'Materi dan soal pada editor akan diganti. Perubahan baru disimpan setelah kamu menekan Simpan.',
      confirmLabel: 'Ganti Draf',
      cancelLabel: 'Batal',
      onConfirm: applyNow
    });
  };
  const examples = form.input.examples || [];
  return <>
        <Dialog open={open && !confirmState.show} onClose={onClose} className="relative z-[10100]">
            <div className="fixed inset-0 bg-gray-950/65" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-5">
                <DialogPanel className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                        <DialogTitle className="text-lg font-bold">Generator Soal {TITLES[type]}</DialogTitle>
                        <button type="button" onClick={onClose} aria-label="Tutup generator" title="Tutup generator" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><CloseIcon /></button>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                        <QuizErrorMessage className="mb-4">{error}</QuizErrorMessage>
                        <fieldset disabled={busy} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-semibold">Level JLPT
                                    <select className={fieldClass} value={form.level} onChange={e => {
                    change(null, 'level', e.target.value);
                    if (type === 'dokkai') {
                      setPage(1);
                      change('input', 'source_quiz_id', '');
                    }
                  }}>
                                        {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => <option key={level}>{level}</option>)}
                                    </select>
                                </label>
                                <div><label className="text-sm font-semibold" htmlFor="generator-count">Jumlah soal</label>
                                    {type === 'dokkai' ? <input id="generator-count" className={fieldClass} type="number" min="1" max="15" value={form.settings.count} onChange={e => changeCount(Number(e.target.value))} /> : <div className="mt-1 flex h-10 gap-2" role="group" aria-label="Jumlah soal">{[5, 10, 15].map(count => <button key={count} type="button" aria-pressed={form.settings.count === count} onClick={() => changeCount(count)} className={`min-w-14 rounded-lg border px-4 text-sm font-bold ${form.settings.count === count ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-300 dark:border-gray-700'}`}>{count}</button>)}</div>}
                                </div>
                            </div>
                            {type === 'vocab' && <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-semibold">Mode soal<select className={fieldClass} value={form.input.mode} onChange={e => change('input', 'mode', e.target.value)}><option value="word_to_meaning">Kata ke arti</option><option value="meaning_to_word">Arti ke kata</option><option value="reading_to_word">Cara baca ke kata</option></select></label>
                                <label className="text-sm font-semibold">Kategori<input className={fieldClass} value={form.input.category} onChange={e => change('input', 'category', e.target.value)} /></label>
                                <label className="text-sm font-semibold">Jenis konten<select className={fieldClass} value={form.input.content_type} onChange={e => change('input', 'content_type', e.target.value)}><option value="all">Semua</option><option value="kosakata">Kosakata</option><option value="kanji">Kanji</option><option value="bunpo">Bunpo</option></select></label>
                                <label className="text-sm font-semibold">Status sumber<select className={fieldClass} value={form.input.status} onChange={e => change('input', 'status', e.target.value)}><option value="published">Published</option><option value="draft">Draft</option><option value="all">Semua</option></select></label>
                            </div>}
                            {type === 'grammar' && <>
                                <div className="grid gap-4 sm:grid-cols-2">{[['pattern', 'Pola'], ['formula', 'Rumus'], ['meaning', 'Arti']].map(([key, label]) => <label key={key} className="text-sm font-semibold">{label}<input className={fieldClass} value={form.input[key] || ''} onChange={e => change('input', key, e.target.value)} /></label>)}
                                    <label className="text-sm font-semibold">Kesulitan<select className={fieldClass} value={form.settings.difficulty} onChange={e => change('settings', 'difficulty', e.target.value)}>{[['easy', 'Mudah'], ['medium', 'Sedang'], ['hard', 'Sulit'], ['mixed', 'Campuran']].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                                    <label className="text-sm font-semibold">Bentuk transformasi<select className={fieldClass} value={form.settings.target_form} onChange={e => change('settings', 'target_form', e.target.value)}>{['auto', 'te', 'ba', 'nai', 'ta', 'dict', 'stem', 'potential', 'passive', 'causative'].map(value => <option key={value}>{value}</option>)}</select></label>
                                </div>
                                <div className="grid grid-cols-3 gap-3">{Object.entries(STAGES).map(([id, title]) => <label key={id} className="min-w-0 text-sm font-semibold">{title}<input type="number" min="1" max="13" className={fieldClass} value={form.settings.counts[id]} onChange={e => {
                      invalidate();
                      const counts = {
                        ...form.settings.counts,
                        [id]: Number(e.target.value)
                      };
                      setForm(current => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          counts,
                          count: Object.values(counts).reduce((a, b) => a + b, 0)
                        }
                      }));
                    }} /></label>)}</div>
                                <div className="flex flex-wrap gap-4">{[['useDistractors', 'Gunakan pengecoh'], ['autoMeaning', 'Sertakan arti']].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.settings[key]} onChange={e => change('settings', key, e.target.checked)} />{label}</label>)}</div>
                                <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Contoh kalimat</h3><button type="button" title="Tambah contoh" aria-label="Tambah contoh" disabled={examples.length >= 20} onClick={() => change('input', 'examples', [...examples, {
                      japanese: '',
                      translation: ''
                    }])} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700"><AddIcon /></button></div>
                                    {examples.map((example, index) => <div key={index} className="flex items-start gap-2"><div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2"><label className="text-xs">Bahasa Jepang<textarea className={fieldClass} value={example.japanese} onChange={e => change('input', 'examples', examples.map((ex, i) => i === index ? {
                          ...ex,
                          japanese: e.target.value,
                          reading: ''
                        } : ex))} /></label><label className="text-xs">Arti<input className={fieldClass} value={example.translation || ''} onChange={e => change('input', 'examples', examples.map((ex, i) => i === index ? {
                          ...ex,
                          translation: e.target.value
                        } : ex))} /></label></div><button type="button" title="Hapus contoh" aria-label={`Hapus contoh ${index + 1}`} onClick={() => change('input', 'examples', examples.filter((_, i) => i !== index))} className="mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"><DeleteOutlineIcon /></button></div>)}
                                </div>
                            </>}
                            {type === 'dokkai' && <div className="space-y-3">
                                <label className="block text-sm font-semibold">Cari judul atau tema<input className={fieldClass} value={search} onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }} /></label>
                                <div role="radiogroup" aria-label="Wacana sumber" className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                                    {sourcesLoading ? <p role="status" className="p-4 text-sm">Memuat wacana...</p> : sources.length ? sources.map(source => <label key={source.id} className="flex cursor-pointer items-center gap-3 p-3 text-sm"><input type="radio" name="generator-source" value={source.id} checked={Number(form.input.source_quiz_id) === source.id} onChange={() => {
                      change('input', 'source_quiz_id', source.id);
                      changeCount(Math.max(1, Math.min(10, source.question_count)));
                    }} /><span className="min-w-0 flex-1 break-words">{source.title}</span><span className="shrink-0 text-xs text-gray-500">{source.question_count} soal</span></label>) : <p className="p-4 text-sm text-gray-500">Tidak ada wacana untuk filter ini.</p>}
                                </div>
                                <div className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</button><span>{page}</span><button type="button" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>Berikutnya</button></div>
                            </div>}
                        </fieldset>
                        {busy && <div role="status" className="mt-5 flex items-center gap-2 rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800"><RefreshIcon className="animate-spin" />{regenerating ? 'Memperbarui soal...' : 'Menyusun draf soal...'}</div>}
                        {draft && <section className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800"><h3 className="mb-3 font-bold">Pratinjau: {draft.questions.length} soal</h3>
                            {draft.warnings.map(warning => <p key={warning} className="mb-3 text-sm text-amber-800 dark:text-amber-300">{warning}</p>)}
                            {type === 'dokkai' && <details className="mb-3 border-b border-gray-200 pb-3 dark:border-gray-800"><summary className="cursor-pointer text-sm font-semibold">{draft.material.passage.title}</summary><div className="mt-3 space-y-3 text-sm" lang="ja">{draft.material.paragraphs.map(p => <p key={p.paragraph_number} className="whitespace-pre-wrap break-words">{p.content_raw}</p>)}</div></details>}
                            <div className="divide-y divide-gray-200 dark:divide-gray-800">{draft.questions.map((question, index) => <details key={question.id} className="py-3"><summary className="cursor-pointer break-words text-sm font-semibold">{index + 1}. {question.prompt}</summary><div className="mt-3 space-y-2 pl-3 text-sm">
                                {question.japanese && <p lang="ja">{question.japanese}</p>}
                                {question.kind === 'sentence_builder' ? <p>{question.answer.correct_order.map(id => question.tokens.find(t => t.id === id)?.text).join(' ')}</p> : <ul className="space-y-1">{question.choices.map(choice => <li key={choice.id} className={choice.id === question.answer.choice_id ? 'font-bold text-emerald-800 dark:text-emerald-300' : ''}>{choice.text}{choice.id === question.answer.choice_id ? ' (benar)' : ''}</li>)}</ul>}
                                {question.evidence && <p>Paragraf {question.evidence.paragraph_number}: {question.evidence.quote}</p>}
                                {question.explanation && <p className="text-gray-600 dark:text-gray-300">{question.explanation}</p>}
                                <button type="button" disabled={busy} onClick={() => run(question.id)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"><RefreshIcon fontSize="small" />Variasi Baru</button>
                            </div></details>)}</div>
                        </section>}
                    </div>
                    <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-800">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">Batal</button>
                        <QuizActionButton disabled={busy} onClick={() => run()} className="inline-flex items-center gap-2"><AutoAwesomeIcon fontSize="small" />Buat Draf</QuizActionButton>
                        {draft && <QuizActionButton disabled={busy} onClick={apply}>Terapkan ke Builder</QuizActionButton>}
                    </footer>
                </DialogPanel>
            </div>
        </Dialog>
        <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
    </>;
}
