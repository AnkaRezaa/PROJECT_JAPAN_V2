import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Field from '@/Components/UI/QuizField';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-emerald-900/30';

export default function IntroEditor({ draft, onChange, onOpenBankPicker, fieldErrors = {}, onClearError }) {
    const updateIntro = (field, value) => onChange({ ...draft, intro: { ...draft.intro, [field]: value } });
    const updateExample = (index, field, value) => updateIntro('examples', draft.intro.examples.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
    )));
    const addExample = () => updateIntro('examples', [...draft.intro.examples, { japanese: '', reading: '', translation: '' }]);
    const removeExample = (index) => updateIntro('examples', draft.intro.examples.filter((_, itemIndex) => itemIndex !== index));

    const levels = ['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'JLPT N1'];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                    <MenuBookIcon sx={{ fontSize: 16 }} className="text-emerald-700 dark:text-emerald-300" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Sumber Materi:
                    </span>
                    {onOpenBankPicker && (
                        <button
                            type="button"
                            onClick={onOpenBankPicker}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white shadow-2xs transition hover:bg-emerald-700"
                        >
                            <MenuBookIcon sx={{ fontSize: 13 }} />
                            Pilih dari Bank Grammar
                        </button>
                    )}
                </div>
            </div>

            <div>
                <span className="mb-1.5 block text-xs font-black text-gray-600 dark:text-gray-300">Level JLPT <span className="text-rose-500 font-black">*</span></span>
                <div className="flex flex-wrap gap-1.5">
                    {levels.map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            onClick={() => onChange({ ...draft, level: lvl })}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                                draft.level === lvl
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Pola Grammar"
                    required
                    error={fieldErrors['lesson.pattern'] || fieldErrors.pattern}
                    tooltip="Pola tata bahasa utama yang dipelajari, misal: 〜ば〜ほど atau 〜てはいけない."
                >
                    <input
                        className={`${inputClass} font-japanese ${(fieldErrors['lesson.pattern'] || fieldErrors.pattern) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.pattern}
                        onChange={(event) => {
                            onChange({ ...draft, pattern: event.target.value });
                            onClearError?.('pattern', 'lesson.pattern');
                        }}
                        placeholder="Contoh: ～ば～ほど"
                    />
                </Field>
                <Field
                    label="Arti Pola"
                    required
                    error={fieldErrors['lesson.meaning'] || fieldErrors.meaning}
                    tooltip="Makna atau arti umum dari pola ini dalam bahasa Indonesia, misal: Semakin..., semakin..."
                >
                    <input
                        className={`${inputClass} ${(fieldErrors['lesson.meaning'] || fieldErrors.meaning) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.intro.meaning}
                        onChange={(event) => {
                            updateIntro('meaning', event.target.value);
                            onClearError?.('meaning', 'lesson.meaning');
                        }}
                        placeholder="Contoh: Semakin..., semakin..."
                    />
                </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Judul Materi"
                    required
                    error={fieldErrors['lesson.title'] || fieldErrors.title}
                    tooltip="Judul ringkas materi pelajaran yang ditampilkan pada kartu awal lesson siswa."
                >
                    <input
                        className={`${inputClass} ${(fieldErrors['lesson.title'] || fieldErrors.title) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.title}
                        onChange={(event) => {
                            onChange({ ...draft, title: event.target.value });
                            onClearError?.('title', 'lesson.title');
                        }}
                        placeholder="Judul ringkas materi"
                    />
                </Field>
                <Field
                    label="Rumus Pola"
                    required
                    error={fieldErrors['lesson.formula'] || fieldErrors.formula}
                    tooltip="Aturan pembentukan kalimat, misal: V-ば + V-辞書形 + ほど atau V-て + はいけない."
                >
                    <input
                        className={`${inputClass} font-japanese ${(fieldErrors['lesson.formula'] || fieldErrors.formula) ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                        value={draft.intro.formula}
                        onChange={(event) => {
                            updateIntro('formula', event.target.value);
                            onClearError?.('formula', 'lesson.formula');
                        }}
                        placeholder="Contoh: V-ば + V-辞書形 + ほど"
                    />
                </Field>
            </div>

            <Field
                label="Penjelasan Singkat"
                tooltip="Penjelasan kontekstual mengenai nuansa dan situasi penggunaan pola ini."
            >
                <textarea className={`${inputClass} min-h-20 resize-y`} value={draft.intro.explanation} onChange={(event) => updateIntro('explanation', event.target.value)} placeholder="Penjelasan nuansa dan cara penggunaan..." />
            </Field>

            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white">Contoh Kalimat (3-5 butir)</p>
                        <p className="text-[11px] font-medium text-gray-400">Gunakan tanda | jika ingin menentukan potongan segmen kalimat secara spesifik.</p>
                    </div>
                    <button type="button" onClick={addExample} className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <AddIcon sx={{ fontSize: 14 }} />Tambah contoh
                    </button>
                </div>
                <div className="mt-2.5 space-y-2.5">
                    {draft.intro.examples.map((example, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-gray-400">Contoh {index + 1}</span>
                                <button type="button" title="Hapus contoh" disabled={draft.intro.examples.length <= 1} onClick={() => removeExample(index)} className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30">
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <Field
                                    label="Kalimat Jepang"
                                    required
                                    error={fieldErrors[`lesson.examples.${index}.japanese`]}
                                    tooltip="Kalimat bahasa Jepang lengkap. Beri tanda | untuk memotong kata jika ingin dijadikan bahan soal susun kalimat (Sentence Builder)."
                                >
                                    <input
                                        className={`${inputClass} !py-2 text-xs font-japanese ${fieldErrors[`lesson.examples.${index}.japanese`] ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                        value={example.japanese}
                                        onChange={(event) => {
                                            updateExample(index, 'japanese', event.target.value);
                                            onClearError?.(`lesson.examples.${index}.japanese`);
                                        }}
                                        placeholder="日本語例文"
                                    />
                                </Field>
                                <Field
                                    label="Cara Baca"
                                    tooltip="Cara baca kalimat (hiragana atau romaji) untuk mempermudah siswa."
                                >
                                    <input className={`${inputClass} !py-2 text-xs`} value={example.reading} onChange={(event) => updateExample(index, 'reading', event.target.value)} placeholder="yomikata" />
                                </Field>
                                <Field
                                    label="Arti Indonesia"
                                    required
                                    error={fieldErrors[`lesson.examples.${index}.translation`]}
                                    tooltip="Terjemahan wajar kalimat contoh ke dalam bahasa Indonesia."
                                >
                                    <input
                                        className={`${inputClass} !py-2 text-xs ${fieldErrors[`lesson.examples.${index}.translation`] ? 'border-rose-400 focus:border-rose-500' : ''}`}
                                        value={example.translation}
                                        onChange={(event) => {
                                            updateExample(index, 'translation', event.target.value);
                                            onClearError?.(`lesson.examples.${index}.translation`);
                                        }}
                                        placeholder="Terjemahan..."
                                    />
                                </Field>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
