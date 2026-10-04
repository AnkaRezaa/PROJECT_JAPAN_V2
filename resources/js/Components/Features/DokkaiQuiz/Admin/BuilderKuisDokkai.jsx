import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/scrollLock';
import QuizField from '@/Components/UI/QuizField';
import DokkaiBankPickerDialog from './DokkaiBankPickerDialog';
import QuickQuestionParserDialog from './QuickQuestionParserDialog';
import QuickVocabParserDialog from './QuickVocabParserDialog';
import AutoSplitParagraphDialog from './AutoSplitParagraphDialog';
import DokkaiPreviewDialog from './DokkaiPreviewDialog';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BoltIcon from '@mui/icons-material/Bolt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-indigo-900/30';

const THEME_OPTIONS = [
    'Budaya & Tradisi',
    'Kehidupan Sehari-hari',
    'Sosial & Masyarakat',
    'Sains & Teknologi',
    'Alam & Lingkungan',
    'Cerita Rakyat & Fabel',
    'Opini & Esai',
];

const POS_OPTIONS = [
    { value: 'noun', label: 'Nomina (Kata Benda)' },
    { value: 'verb_godan', label: 'Verba Godan (Golongan 1)' },
    { value: 'verb_ichidan', label: 'Verba Ichidan (Golongan 2)' },
    { value: 'verb_irregular', label: 'Verba Kuru / Suru (Golongan 3)' },
    { value: 'adj_i', label: 'Adjektiva-i (Kata Sifat-i)' },
    { value: 'adj_na', label: 'Adjektiva-na (Kata Sifat-na)' },
    { value: 'adverb', label: 'Adverbia (Kata Keterangan)' },
    { value: 'particle', label: 'Partikel (Joshi)' },
    { value: 'expression', label: 'Ungkapan / Frasa' },
];

function makeDraft(day, defaultLevel = 'N3') {
    return {
        id: null,
        status: 'draft',
        time_limit: 300,
        passing_score: 70,
        passage: {
            title: '',
            sub_title: '',
            theme_category: 'Budaya & Tradisi',
            jlpt_level: defaultLevel || 'N3',
            estimated_reading_time: 5,
            xp_reward: 80,
            audio_url: '',
        },
        paragraphs: [
            {
                id: null,
                paragraph_number: 1,
                label: 'Paragraf 1',
                content_raw: '',
            },
        ],
        vocabularies: [
            {
                id: null,
                word: '',
                furigana: '',
                romaji: '',
                meaning: '',
                pitch_accent: '',
                part_of_speech: 'noun',
                jlpt_level: defaultLevel || 'N3',
                example_sentence: '',
                example_translation: '',
            },
        ],
        questions: [
            {
                id: null,
                question_number: 1,
                question_text: '',
                question_translation: '',
                evidence_paragraph_number: 1,
                evidence_quote: '',
                explanation_correct: '',
                explanation_distractors: { A: '', B: '', C: '', D: '' },
                options: [
                    { id: 1, option_label: 'A', option_text: '', is_correct: true },
                    { id: 2, option_label: 'B', option_text: '', is_correct: false },
                    { id: 3, option_label: 'C', option_text: '', is_correct: false },
                    { id: 4, option_label: 'D', option_text: '', is_correct: false },
                ],
            },
        ],
    };
}

function normalizeDraft(item, day, defaultLevel = 'N3') {
    if (!item) return makeDraft(day, defaultLevel);

    const quiz = item.quiz || {};
    const passage = item.passage || {};

    const id = item.id || quiz.id || null;
    const status = item.status || quiz.status || 'draft';
    const time_limit = item.time_limit ?? quiz.time_limit ?? 300;
    const passing_score = item.passing_score ?? quiz.passing_score ?? 70;

    const normalizedPassage = {
        title: passage.title ?? quiz.title ?? '',
        sub_title: passage.sub_title ?? quiz.sub_title ?? '',
        theme_category: passage.theme_category ?? quiz.theme_category ?? 'Budaya & Tradisi',
        jlpt_level: passage.jlpt_level ?? quiz.jlpt_level ?? defaultLevel ?? 'N3',
        estimated_reading_time: passage.estimated_reading_time ?? quiz.estimated_reading_time ?? 5,
        xp_reward: passage.xp_reward ?? quiz.xp_reward ?? 80,
        audio_url: passage.audio_url ?? quiz.audio_url ?? '',
    };

    const paragraphs = (item.paragraphs && item.paragraphs.length > 0)
        ? item.paragraphs.map((p, idx) => ({
            id: p.id || null,
            paragraph_number: p.paragraph_number || idx + 1,
            label: p.label || `Paragraf ${idx + 1}`,
            content_raw: p.content_raw || '',
        }))
        : [{ id: null, paragraph_number: 1, label: 'Paragraf 1', content_raw: '' }];

    const paragraphIdToNumber = {};
    paragraphs.forEach((p, idx) => {
        if (p.id) paragraphIdToNumber[p.id] = p.paragraph_number || idx + 1;
    });

    const vocabularies = (item.vocabularies || []).map((v) => ({
        id: v.id || null,
        paragraph_id: v.paragraph_id || null,
        word: v.word || '',
        furigana: v.furigana || '',
        romaji: v.romaji || '',
        meaning: v.meaning || '',
        pitch_accent: v.pitch_accent || '',
        part_of_speech: v.part_of_speech || 'noun',
        jlpt_level: v.jlpt_level || normalizedPassage.jlpt_level || 'N3',
        example_sentence: v.example_sentence || '',
        example_translation: v.example_translation || '',
    }));

    const questions = (item.questions && item.questions.length > 0)
        ? item.questions.map((q, idx) => {
            const evNum = q.evidence_paragraph_number
                || (q.evidence_paragraph_id ? paragraphIdToNumber[q.evidence_paragraph_id] : null)
                || 1;

            const distractors = typeof q.explanation_distractors === 'object' && q.explanation_distractors !== null
                ? q.explanation_distractors
                : { A: '', B: '', C: '', D: '' };

            const options = (q.options && q.options.length > 0)
                ? q.options.map((opt, oIdx) => ({
                    id: opt.id || oIdx + 1,
                    option_label: opt.option_label || ['A', 'B', 'C', 'D'][oIdx] || 'A',
                    option_text: opt.option_text || '',
                    is_correct: Boolean(opt.is_correct),
                }))
                : [
                    { id: 1, option_label: 'A', option_text: '', is_correct: true },
                    { id: 2, option_label: 'B', option_text: '', is_correct: false },
                    { id: 3, option_label: 'C', option_text: '', is_correct: false },
                    { id: 4, option_label: 'D', option_text: '', is_correct: false },
                ];

            return {
                id: q.id || null,
                question_number: q.question_number || idx + 1,
                question_text: q.question_text || '',
                question_translation: q.question_translation || '',
                evidence_paragraph_number: Number(evNum),
                evidence_paragraph_id: q.evidence_paragraph_id || null,
                evidence_quote: q.evidence_quote || '',
                explanation_correct: q.explanation_correct || '',
                explanation_distractors: distractors,
                options,
            };
        })
        : [
            {
                id: null,
                question_number: 1,
                question_text: '',
                question_translation: '',
                evidence_paragraph_number: 1,
                evidence_quote: '',
                explanation_correct: '',
                explanation_distractors: { A: '', B: '', C: '', D: '' },
                options: [
                    { id: 1, option_label: 'A', option_text: '', is_correct: true },
                    { id: 2, option_label: 'B', option_text: '', is_correct: false },
                    { id: 3, option_label: 'C', option_text: '', is_correct: false },
                    { id: 4, option_label: 'D', option_text: '', is_correct: false },
                ],
            },
        ];

    return {
        id,
        status,
        time_limit,
        passing_score,
        passage: normalizedPassage,
        paragraphs,
        vocabularies,
        questions,
    };
}

export default function BuilderKuisDokkai({ open, module, day, onClose }) {
    const defaultLevel = useMemo(() => {
        const code = module?.program?.level?.code || module?.level?.code || 'N3';
        return code.replace(/^JLPT\s*/i, '');
    }, [module]);

    const [lessons, setLessons] = useState([]);
    const [draft, setDraft] = useState(() => makeDraft(day, defaultLevel));
    const [activeTab, setActiveTab] = useState('metadata');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [savedAt, setSavedAt] = useState('');

    useScrollLock(open);

    useEffect(() => {
        if (!open || !day?.id) return;
        let active = true;
        setError('');
        setFieldErrors({});
        setSuccessMessage('');

        window.axios
            .get(`/admin/module-days/${day.id}/dokkai-quizzes`)
            .then((res) => {
                if (!active) return;
                const available = res.data.lessons || [];
                setLessons(available);
                if (available.length > 0) {
                    setDraft(normalizeDraft(available[0], day, defaultLevel));
                } else {
                    setDraft(makeDraft(day, defaultLevel));
                }
            })
            .catch(() => {
                if (active) setError('Gagal memuat data wacana Dokkai.');
            });

        return () => {
            active = false;
        };
    }, [open, day?.id, defaultLevel]);

    const handleCreateNew = () => {
        setDraft(makeDraft(day, defaultLevel));
        setActiveTab('metadata');
        setError('');
        setFieldErrors({});
        setSuccessMessage('');
    };

    const handleSelectQuiz = (quizItem) => {
        setDraft(normalizeDraft(quizItem, day, defaultLevel));
        setActiveTab('metadata');
        setError('');
        setFieldErrors({});
        setSuccessMessage('');
    };

    const [showBankPicker, setShowBankPicker] = useState(false);
    const [showQuestionParser, setShowQuestionParser] = useState(false);
    const [showVocabParser, setShowVocabParser] = useState(false);
    const [showSplitParagraph, setShowSplitParagraph] = useState(false);
    const [showStudentPreview, setShowStudentPreview] = useState(false);
    const [openDistractorIndices, setOpenDistractorIndices] = useState({});
    const [localDraftAvailable, setLocalDraftAvailable] = useState(false);

    // --- AUTOSAVE LOCALSTORAGE ---
    const storageKey = useMemo(() => {
        if (!day?.id) return null;
        return `dokkai_autosave_${day.id}_${draft?.id || 'new'}`;
    }, [day?.id, draft?.id]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.passage?.title && parsed.passage?.title !== draft.passage?.title) {
                    setLocalDraftAvailable(true);
                }
            }
        } catch {
            // ignore
        }
    }, [storageKey]);

    useEffect(() => {
        if (!storageKey || !draft?.passage?.title) return;
        const handler = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(draft));
            } catch {
                // ignore
            }
        }, 800);
        return () => clearTimeout(handler);
    }, [draft, storageKey]);

    const handleRestoreLocalDraft = () => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                setDraft(parsed);
                setSuccessMessage('Draf berhasil dipulihkan dari penyimpanan lokal.');
                setLocalDraftAvailable(false);
            }
        } catch {
            setError('Gagal memulihkan draf lokal.');
        }
    };

    const handleDismissLocalDraft = () => {
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
        setLocalDraftAvailable(false);
    };

    const handleSelectFromBank = (selectedItem) => {
        const copy = JSON.parse(JSON.stringify(selectedItem));
        copy.id = null;
        if (copy.quiz) copy.quiz.id = null;
        if (copy.passage) copy.passage.id = null;
        (copy.paragraphs || []).forEach((p) => { p.id = null; });
        (copy.vocabularies || []).forEach((v) => { v.id = null; });
        (copy.questions || []).forEach((q) => { q.id = null; });
        const normalized = normalizeDraft(copy, day, defaultLevel);
        normalized.id = null;
        setDraft(normalized);
        setActiveTab('metadata');
        setSuccessMessage(`Berhasil menyalin wacana "${normalized.passage?.title || ''}" dari Bank. Silakan sesuaikan dan klik Simpan.`);
    };

    const handleApplyQuestions = (newQuestions, replace = false) => {
        if (replace) {
            setDraft({
                ...draft,
                questions: newQuestions.map((q, idx) => ({ ...q, question_number: idx + 1 })),
            });
        } else {
            const startNum = draft.questions.length;
            const formatted = newQuestions.map((q, idx) => ({ ...q, question_number: startNum + idx + 1 }));
            setDraft({
                ...draft,
                questions: [...draft.questions, ...formatted],
            });
        }
        setSuccessMessage(`${newQuestions.length} butir soal berhasil ditambahkan ke Bank Soal.`);
    };

    const handleApplyVocabularies = (newVocabs, replace = false) => {
        if (replace) {
            setDraft({ ...draft, vocabularies: newVocabs });
        } else {
            setDraft({ ...draft, vocabularies: [...draft.vocabularies, ...newVocabs] });
        }
        setSuccessMessage(`${newVocabs.length} kosakata berhasil ditambahkan ke Glosarium.`);
    };

    const handleApplyParagraphs = (newParagraphs) => {
        setDraft({ ...draft, paragraphs: newParagraphs });
        setSuccessMessage(`Teks berhasil dipecah menjadi ${newParagraphs.length} paragraf.`);
    };

    const toggleDistractors = (qIdx) => {
        setOpenDistractorIndices((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
    };

    // --- PARAGRAPH HELPERS ---
    const addParagraph = () => {
        const nextNum = draft.paragraphs.length + 1;
        setDraft({
            ...draft,
            paragraphs: [
                ...draft.paragraphs,
                {
                    id: null,
                    paragraph_number: nextNum,
                    label: `Paragraf ${nextNum}`,
                    content_raw: '',
                },
            ],
        });
    };

    const updateParagraph = (index, field, value) => {
        const updated = [...draft.paragraphs];
        updated[index] = { ...updated[index], [field]: value };
        setDraft({ ...draft, paragraphs: updated });
    };

    const removeParagraph = (index) => {
        if (draft.paragraphs.length <= 1) return;
        const updated = draft.paragraphs
            .filter((_, idx) => idx !== index)
            .map((p, idx) => ({ ...p, paragraph_number: idx + 1, label: p.label || `Paragraf ${idx + 1}` }));
        setDraft({ ...draft, paragraphs: updated });
    };

    // --- VOCABULARY HELPERS ---
    const addVocabulary = () => {
        setDraft({
            ...draft,
            vocabularies: [
                ...draft.vocabularies,
                {
                    id: null,
                    word: '',
                    furigana: '',
                    romaji: '',
                    meaning: '',
                    pitch_accent: '',
                    part_of_speech: 'noun',
                    jlpt_level: draft.passage.jlpt_level || defaultLevel,
                    example_sentence: '',
                    example_translation: '',
                },
            ],
        });
    };

    const updateVocabulary = (index, field, value) => {
        const updated = [...draft.vocabularies];
        updated[index] = { ...updated[index], [field]: value };
        setDraft({ ...draft, vocabularies: updated });
    };

    const removeVocabulary = (index) => {
        if (draft.vocabularies.length <= 1) return;
        const updated = draft.vocabularies.filter((_, idx) => idx !== index);
        setDraft({ ...draft, vocabularies: updated });
    };

    // --- QUESTION HELPERS ---
    const addQuestion = () => {
        const nextNum = draft.questions.length + 1;
        setDraft({
            ...draft,
            questions: [
                ...draft.questions,
                {
                    id: null,
                    question_number: nextNum,
                    question_text: '',
                    question_translation: '',
                    evidence_paragraph_number: 1,
                    evidence_quote: '',
                    explanation_correct: '',
                    explanation_distractors: { A: '', B: '', C: '', D: '' },
                    options: [
                        { id: 1, option_label: 'A', option_text: '', is_correct: true },
                        { id: 2, option_label: 'B', option_text: '', is_correct: false },
                        { id: 3, option_label: 'C', option_text: '', is_correct: false },
                        { id: 4, option_label: 'D', option_text: '', is_correct: false },
                    ],
                },
            ],
        });
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...draft.questions];
        updated[index] = { ...updated[index], [field]: value };
        setDraft({ ...draft, questions: updated });
    };

    const updateQuestionOption = (qIndex, optIndex, field, value) => {
        const updated = [...draft.questions];
        const options = [...updated[qIndex].options];
        if (field === 'is_correct') {
            options.forEach((opt, idx) => {
                opt.is_correct = idx === optIndex;
            });
        } else {
            options[optIndex] = { ...options[optIndex], [field]: value };
        }
        updated[qIndex] = { ...updated[qIndex], options };
        setDraft({ ...draft, questions: updated });
    };

    const updateQuestionDistractor = (qIndex, label, value) => {
        const updated = [...draft.questions];
        const distractors = { ...(updated[qIndex].explanation_distractors || {}) };
        distractors[label] = value;
        updated[qIndex] = { ...updated[qIndex], explanation_distractors: distractors };
        setDraft({ ...draft, questions: updated });
    };

    const removeQuestion = (index) => {
        if (draft.questions.length <= 1) return;
        const updated = draft.questions
            .filter((_, idx) => idx !== index)
            .map((q, idx) => ({ ...q, question_number: idx + 1 }));
        setDraft({ ...draft, questions: updated });
    };

    // --- SAVE / STATUS ---
    const buildPayload = () => ({
        passing_score: Number(draft.passing_score || 70),
        time_limit: Number(draft.time_limit || 300),
        passage: {
            title: draft.passage.title?.trim() || '',
            sub_title: draft.passage.sub_title?.trim() || null,
            theme_category: draft.passage.theme_category || 'Budaya & Tradisi',
            jlpt_level: draft.passage.jlpt_level || defaultLevel,
            estimated_reading_time: Number(draft.passage.estimated_reading_time || 5),
            xp_reward: Number(draft.passage.xp_reward || 80),
            audio_url: draft.passage.audio_url?.trim() || null,
        },
        paragraphs: (draft.paragraphs || []).map((p, idx) => ({
            id: p.id || undefined,
            paragraph_number: idx + 1,
            label: p.label?.trim() || `Paragraf ${idx + 1}`,
            content_raw: p.content_raw?.trim() || '',
        })),
        vocabularies: (draft.vocabularies || []).map((v) => ({
            id: v.id || undefined,
            word: v.word?.trim() || '',
            furigana: v.furigana?.trim() || '',
            romaji: v.romaji?.trim() || null,
            meaning: v.meaning?.trim() || '',
            pitch_accent: v.pitch_accent?.trim() || null,
            part_of_speech: v.part_of_speech || 'noun',
            jlpt_level: v.jlpt_level || draft.passage.jlpt_level,
            example_sentence: v.example_sentence?.trim() || null,
            example_translation: v.example_translation?.trim() || null,
        })),
        questions: (draft.questions || []).map((q, idx) => ({
            id: q.id || undefined,
            question_number: idx + 1,
            question_text: q.question_text?.trim() || '',
            question_translation: q.question_translation?.trim() || null,
            evidence_paragraph_number: Number(q.evidence_paragraph_number || 1),
            evidence_quote: q.evidence_quote?.trim() || null,
            explanation_correct: q.explanation_correct?.trim() || null,
            explanation_distractors: q.explanation_distractors || {},
            options: (q.options || []).map((opt) => ({
                id: opt.id,
                option_label: opt.option_label,
                option_text: opt.option_text?.trim() || '',
                is_correct: Boolean(opt.is_correct),
            })),
        })),
    });

    const handleSave = async () => {
        setError('');
        setFieldErrors({});
        setSuccessMessage('');

        if (!draft.passage.title?.trim()) {
            setError('Judul Wacana Dokkai wajib diisi.');
            setActiveTab('metadata');
            return;
        }

        const emptyParagraphs = draft.paragraphs.some((p) => !p.content_raw?.trim());
        if (emptyParagraphs) {
            setError('Seluruh paragraf wacana wajib memiliki isi teks.');
            setActiveTab('paragraphs');
            return;
        }

        const emptyVocabs = draft.vocabularies.some((v) => !v.word?.trim() || !v.meaning?.trim());
        if (emptyVocabs) {
            setError('Seluruh butir kosakata wajib memiliki kata Jepang dan arti Indonesia.');
            setActiveTab('vocabularies');
            return;
        }

        const emptyQuestions = draft.questions.some((q) => !q.question_text?.trim());
        if (emptyQuestions) {
            setError('Seluruh butir soal Dokkai wajib memiliki teks pertanyaan.');
            setActiveTab('questions');
            return;
        }

        setSaving(true);
        try {
            const payload = buildPayload();
            const res = draft.id
                ? await window.axios.put(`/admin/dokkai-quizzes/${draft.id}`, payload)
                : await window.axios.post(`/admin/module-days/${day.id}/dokkai-quizzes`, payload);

            const saved = res.data.lesson;
            const normalizedSaved = normalizeDraft(saved, day, defaultLevel);
            setDraft(normalizedSaved);
            setLessons((prev) => {
                const targetId = normalizedSaved.id;
                const filtered = prev.filter((item) => (item.id || item.quiz?.id) !== targetId);
                return [saved, ...filtered];
            });

            if (storageKey) {
                try {
                    localStorage.removeItem(storageKey);
                } catch {
                    // ignore
                }
            }
            setLocalDraftAvailable(false);

            setSavedAt(new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()));
            setSuccessMessage(res.data.message || 'Wacana Dokkai berhasil disimpan.');
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.errors) {
                setFieldErrors(errData.errors);
                setError(Object.values(errData.errors).flat()[0] || 'Validasi data Dokkai gagal.');
            } else {
                setError(errData?.message || 'Gagal menyimpan wacana Dokkai.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (targetStatus) => {
        if (!draft.quiz?.id && !draft.id) return;
        const quizId = draft.quiz?.id || draft.id;
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const res = await window.axios.patch(`/admin/dokkai-quizzes/${quizId}/status`, { status: targetStatus });
            const updated = {
                ...draft,
                status: targetStatus,
                quiz: draft.quiz ? { ...draft.quiz, status: targetStatus } : undefined,
            };
            setDraft(updated);
            setLessons((prev) => prev.map((item) => ((item.quiz?.id || item.id) === quizId ? updated : item)));
            setSuccessMessage(res.data.message || `Status berhasil diubah menjadi ${targetStatus}.`);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memperbarui status wacana.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!draft.quiz?.id && !draft.id) return;
        const quizId = draft.quiz?.id || draft.id;
        if (!window.confirm('Hapus wacana Dokkai ini beserta seluruh paragraf, kosakata, dan bank soalnya?')) return;

        setSaving(true);
        setError('');
        try {
            await window.axios.delete(`/admin/dokkai-quizzes/${quizId}`);
            const remaining = lessons.filter((item) => (item.quiz?.id || item.id) !== quizId);
            setLessons(remaining);
            if (remaining.length > 0) {
                setDraft(normalizeDraft(remaining[0], day, defaultLevel));
            } else {
                setDraft(makeDraft(day, defaultLevel));
            }
            setSuccessMessage('Wacana Dokkai berhasil dihapus.');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menghapus wacana Dokkai.');
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const quizId = draft.quiz?.id || draft.id;
    const currentStatus = draft.quiz?.status || draft.status || 'draft';
    const isPublished = currentStatus === 'published';

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex flex-col bg-gray-950/80 backdrop-blur-sm">
            <div className="flex h-full w-full flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                {/* TOP BAR */}
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    Dokkai Builder
                                </span>
                                <span className="text-xs font-semibold text-gray-400">
                                    M{module?.week_number || 1} · H{day?.day_number || 1}: {day?.title}
                                </span>
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                        isPublished
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                >
                                    {isPublished ? 'Terbit' : 'Draf'}
                                </span>
                            </div>
                            <h2 className="truncate text-base font-black text-gray-900 dark:text-white">
                                {draft.passage?.title || 'Wacana Dokkai Baru'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowStudentPreview(true)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                            <span className="hidden sm:inline">Pratinjau Siswa</span>
                        </button>
                        {quizId && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleToggleStatus(isPublished ? 'draft' : 'published')}
                                    disabled={saving}
                                    className={`hidden sm:inline-flex h-9 items-center rounded-xl border px-3 text-xs font-bold transition disabled:opacity-50 ${
                                        isPublished
                                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300'
                                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300'
                                    }`}
                                >
                                    {isPublished ? 'Jadikan Draf' : 'Terbitkan'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    title="Hapus Wacana"
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-400"
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                            <span>{saving ? 'Menyimpan...' : 'Simpan Draf'}</span>
                        </button>
                    </div>
                </header>

                {/* LESSON SWITCHER BAR (Jika ada beberapa wacana di hari ini) */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-950/60 overflow-x-auto gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                            Wacana:
                        </span>
                        {lessons.map((item, idx) => {
                            const isCur = (item.quiz?.id || item.id) === quizId;
                            return (
                                <button
                                    key={item.quiz?.id || item.id || idx}
                                    type="button"
                                    onClick={() => handleSelectQuiz(item)}
                                    className={`truncate max-w-[200px] rounded-lg px-2.5 py-1 text-xs font-bold transition shrink-0 ${
                                        isCur
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
                                    }`}
                                >
                                    {item.quiz?.title || item.passage?.title || `Wacana #${idx + 1}`}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleCreateNew}
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shrink-0"
                        >
                            <AddIcon sx={{ fontSize: 14 }} />
                            <span>Tambah Wacana</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowBankPicker(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 shrink-0"
                        >
                            <BoltIcon sx={{ fontSize: 14 }} />
                            <span>Salin dari Bank</span>
                        </button>
                    </div>

                    {savedAt && (
                        <span className="text-[11px] font-semibold text-gray-400 shrink-0 hidden md:block">
                            Tersimpan pukul {savedAt}
                        </span>
                    )}
                </div>

                {/* NOTIFICATIONS */}
                {localDraftAvailable && (
                    <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-center gap-1.5">
                            <span>⚠️ Ditemukan draf tersimpan lokal untuk wacana ini.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRestoreLocalDraft}
                                className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-amber-700"
                            >
                                Pulihkan Draf
                            </button>
                            <button
                                type="button"
                                onClick={handleDismissLocalDraft}
                                className="text-[11px] text-amber-700 underline dark:text-amber-300"
                            >
                                Abaikan
                            </button>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* TAB NAVIGATION */}
                <div className="flex shrink-0 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
                    <nav className="flex space-x-4 overflow-x-auto">
                        {[
                            { key: 'metadata', label: '1. Metadata Wacana', icon: AutoStoriesIcon },
                            { key: 'paragraphs', label: `2. Teks & Paragraf (${draft.paragraphs?.length || 0})`, icon: FormatListBulletedIcon },
                            { key: 'vocabularies', label: `3. Glosarium Kosakata (${draft.vocabularies?.length || 0})`, icon: MenuBookIcon },
                            { key: 'questions', label: `4. Bank Soal & Eviden (${draft.questions?.length || 0})`, icon: QuizOutlinedIcon },
                        ].map((t) => {
                            const Icon = t.icon;
                            const isActive = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex items-center gap-1.5 border-b-2 py-3 px-2 text-xs font-bold transition whitespace-nowrap ${
                                        isActive
                                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                    }`}
                                >
                                    <Icon sx={{ fontSize: 16 }} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-950/40">
                    <div className="mx-auto max-w-5xl space-y-6">
                        {/* TAB 1: METADATA */}
                        {activeTab === 'metadata' && (
                            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                        Informasi Umum Wacana
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Tentukan judul, tema, level JLPT, dan target waktu baca untuk materi pemahaman membaca siswa.
                                    </p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <QuizField label="Judul Wacana (Jepang / Indonesia)" required tooltip="Judul bacaan yang tampil di header dan katalog wacana.">
                                        <input
                                            className={inputClass}
                                            value={draft.passage?.title || ''}
                                            onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, title: e.target.value } })}
                                            placeholder="Contoh: 日本の四季と祭り (Empat Musim dan Festival di Jepang)"
                                        />
                                    </QuizField>

                                    <QuizField label="Kategori Tema" tooltip="Kategori topik wacana.">
                                        <select
                                            className={inputClass}
                                            value={draft.passage?.theme_category || 'Budaya & Tradisi'}
                                            onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, theme_category: e.target.value } })}
                                        >
                                            {THEME_OPTIONS.map((theme) => (
                                                <option key={theme} value={theme}>{theme}</option>
                                            ))}
                                        </select>
                                    </QuizField>
                                </div>

                                <QuizField label="Sub-Judul / Sinopsis Singkat" tooltip="Penjelasan 1-2 kalimat gambaran isi bacaan.">
                                    <textarea
                                        rows={2}
                                        className={inputClass}
                                        value={draft.passage?.sub_title || ''}
                                        onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, sub_title: e.target.value } })}
                                        placeholder="Ringkasan atau pengantar wacana..."
                                    />
                                </QuizField>

                                <div className="grid gap-4 sm:grid-cols-4">
                                    <QuizField label="Target Level JLPT" tooltip="Level kemahiran ujian.">
                                        <select
                                            className={inputClass}
                                            value={draft.passage?.jlpt_level || 'N3'}
                                            onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, jlpt_level: e.target.value } })}
                                        >
                                            {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                    </QuizField>

                                    <QuizField label="Estimasi Baca (Menit)" tooltip="Perkiraan waktu baca siswa.">
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            className={inputClass}
                                            value={draft.passage?.estimated_reading_time || 5}
                                            onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, estimated_reading_time: Number(e.target.value) } })}
                                        />
                                    </QuizField>

                                    <QuizField label="Reward XP" tooltip="Poin pengalaman saat tuntas membaca dan lulus kuis.">
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputClass}
                                            value={draft.passage?.xp_reward || 80}
                                            onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, xp_reward: Number(e.target.value) } })}
                                        />
                                    </QuizField>

                                    <QuizField label="Batas Nilai KKM (%)" tooltip="Skor minimum untuk dinyatakan lulus kuis wacana.">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            className={inputClass}
                                            value={draft.passing_score || 70}
                                            onChange={(e) => setDraft({ ...draft, passing_score: Number(e.target.value) })}
                                        />
                                    </QuizField>
                                </div>

                                <QuizField label="URL Audio Narasi (Opsional)" tooltip="Jika kosong, sistem akan menggunakan sintesis Web Speech API suara Jepang otomatis.">
                                    <input
                                        className={inputClass}
                                        value={draft.passage?.audio_url || ''}
                                        onChange={(e) => setDraft({ ...draft, passage: { ...draft.passage, audio_url: e.target.value } })}
                                        placeholder="https://example.com/audio/dokkai_01.mp3"
                                    />
                                </QuizField>
                            </section>
                        )}

                        {/* TAB 2: PARAGRAPHS */}
                        {activeTab === 'paragraphs' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                            Paragraf Teks Wacana
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Bagi wacana menjadi paragraf-paragraf terpisah agar siswa mudah merujuk eviden soal.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowSplitParagraph(true)}
                                            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                                        >
                                            <BoltIcon sx={{ fontSize: 16 }} />
                                            <span>Pecah Teks Otomatis</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addParagraph}
                                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                                        >
                                            <AddIcon sx={{ fontSize: 16 }} />
                                            <span>Tambah Paragraf</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {draft.paragraphs.map((paragraph, index) => {
                                        const charCount = (paragraph.content_raw || '').replace(/\s+/g, '').length;
                                        return (
                                            <div
                                                key={index}
                                                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                                            {index + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={paragraph.label || `Paragraf ${index + 1}`}
                                                            onChange={(e) => updateParagraph(index, 'label', e.target.value)}
                                                            className="rounded-lg border border-transparent px-2 py-0.5 text-xs font-bold text-gray-700 hover:border-gray-300 focus:border-indigo-400 focus:bg-white dark:text-gray-200"
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-semibold text-gray-400">
                                                            {charCount} Karakter
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={draft.paragraphs.length <= 1}
                                                            onClick={() => removeParagraph(index)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
                                                        >
                                                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <textarea
                                                    rows={4}
                                                    value={paragraph.content_raw || ''}
                                                    onChange={(e) => updateParagraph(index, 'content_raw', e.target.value)}
                                                    placeholder="Ketik atau tempel teks bahasa Jepang untuk paragraf ini..."
                                                    className={`${inputClass} font-japanese leading-relaxed text-sm`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: VOCABULARIES */}
                        {activeTab === 'vocabularies' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                            Daftar Kosakata Wacana (Glosarium)
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Kata-kata ini akan terdeteksi di teks wacana dan dapat diklik siswa untuk melihat popover arti.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowVocabParser(true)}
                                            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                                        >
                                            <BoltIcon sx={{ fontSize: 16 }} />
                                            <span>Tempel Glosarium Cepat</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addVocabulary}
                                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                                        >
                                            <AddIcon sx={{ fontSize: 16 }} />
                                            <span>Tambah Kata</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {draft.vocabularies.map((vocab, index) => (
                                        <div
                                            key={index}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-gray-400">
                                                    Kata #{index + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={draft.vocabularies.length <= 1}
                                                    onClick={() => removeVocabulary(index)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                </button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-4">
                                                <QuizField label="Kata (Kanji/Kana)" required tooltip="Bentuk kata seperti tertulis di teks wacana.">
                                                    <input
                                                        className={`${inputClass} font-japanese`}
                                                        value={vocab.word || ''}
                                                        onChange={(e) => updateVocabulary(index, 'word', e.target.value)}
                                                        placeholder="桜"
                                                    />
                                                </QuizField>

                                                <QuizField label="Furigana (Cara Baca)" required tooltip="Hiragana pelafalan kata.">
                                                    <input
                                                        className={`${inputClass} font-japanese`}
                                                        value={vocab.furigana || ''}
                                                        onChange={(e) => updateVocabulary(index, 'furigana', e.target.value)}
                                                        placeholder="さくら"
                                                    />
                                                </QuizField>

                                                <QuizField label="Romaji" tooltip="Transkripsi abjad romaji.">
                                                    <input
                                                        className={inputClass}
                                                        value={vocab.romaji || ''}
                                                        onChange={(e) => updateVocabulary(index, 'romaji', e.target.value)}
                                                        placeholder="sakura"
                                                    />
                                                </QuizField>

                                                <QuizField label="Arti Bahasa Indonesia" required tooltip="Makna kosakata dalam konteks wacana.">
                                                    <input
                                                        className={inputClass}
                                                        value={vocab.meaning || ''}
                                                        onChange={(e) => updateVocabulary(index, 'meaning', e.target.value)}
                                                        placeholder="Bunga sakura"
                                                    />
                                                </QuizField>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <QuizField label="Golongan Kata">
                                                    <select
                                                        className={inputClass}
                                                        value={vocab.part_of_speech || 'noun'}
                                                        onChange={(e) => updateVocabulary(index, 'part_of_speech', e.target.value)}
                                                    >
                                                        {POS_OPTIONS.map((pos) => (
                                                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                                                        ))}
                                                    </select>
                                                </QuizField>

                                                <QuizField label="Pitch Accent (Opsional)" tooltip="Pola intonasi kata, misal: [0], [1], heiban, atamadaka.">
                                                    <input
                                                        className={inputClass}
                                                        value={vocab.pitch_accent || ''}
                                                        onChange={(e) => updateVocabulary(index, 'pitch_accent', e.target.value)}
                                                        placeholder="[0] heiban"
                                                    />
                                                </QuizField>

                                                <QuizField label="Level JLPT">
                                                    <select
                                                        className={inputClass}
                                                        value={vocab.jlpt_level || 'N3'}
                                                        onChange={(e) => updateVocabulary(index, 'jlpt_level', e.target.value)}
                                                    >
                                                        {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                                                            <option key={lvl} value={lvl}>{lvl}</option>
                                                        ))}
                                                    </select>
                                                </QuizField>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: QUESTIONS */}
                        {activeTab === 'questions' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                            Bank Soal & Eviden Wacana
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Susun soal pilihan ganda, tandai kunci jawaban benar, kutipan eviden wacana, dan analisis pengecoh.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowQuestionParser(true)}
                                            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                                        >
                                            <BoltIcon sx={{ fontSize: 16 }} />
                                            <span>Tempel Soal Cepat</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                                        >
                                            <AddIcon sx={{ fontSize: 16 }} />
                                            <span>Tambah Soal</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {draft.questions.map((question, qIdx) => (
                                        <div
                                            key={qIdx}
                                            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4"
                                        >
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white">
                                                        Q{qIdx + 1}
                                                    </span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                                        Soal Nomor {qIdx + 1}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={draft.questions.length <= 1}
                                                    onClick={() => removeQuestion(qIdx)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                </button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <QuizField label="Pertanyaan (Bahasa Jepang)" required tooltip="Teks pertanyaan dalam bahasa Jepang.">
                                                    <textarea
                                                        rows={2}
                                                        className={`${inputClass} font-japanese`}
                                                        value={question.question_text || ''}
                                                        onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                                                        placeholder="本文の内容と合っているものはどれか。"
                                                    />
                                                </QuizField>

                                                <QuizField label="Terjemahan Pertanyaan (Indonesia)" tooltip="Bantuan terjemahan pertanyaan saat mode review.">
                                                    <textarea
                                                        rows={2}
                                                        className={inputClass}
                                                        value={question.question_translation || ''}
                                                        onChange={(e) => updateQuestion(qIdx, 'question_translation', e.target.value)}
                                                        placeholder="Manakah pernyataan yang sesuai dengan isi bacaan?"
                                                    />
                                                </QuizField>
                                            </div>

                                            {/* PILIHAN GANDA */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                                                    Pilihan Jawaban (Klik radio button untuk memilih kunci jawaban benar)
                                                </label>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {(question.options || []).map((opt, optIdx) => (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                                                                opt.is_correct
                                                                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 dark:border-emerald-700 dark:bg-emerald-950/30'
                                                                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                                                            }`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuestionOption(qIdx, optIdx, 'is_correct', true)}
                                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                                                                    opt.is_correct
                                                                        ? 'bg-emerald-600 text-white'
                                                                        : 'border border-gray-300 text-gray-400 hover:border-gray-400'
                                                                }`}
                                                            >
                                                                {opt.option_label}
                                                            </button>
                                                            <input
                                                                className="w-full bg-transparent text-xs font-japanese font-semibold text-gray-900 outline-none dark:text-white"
                                                                value={opt.option_text || ''}
                                                                onChange={(e) => updateQuestionOption(qIdx, optIdx, 'option_text', e.target.value)}
                                                                placeholder={`Pernyataan opsi ${opt.option_label}...`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* EVIDEN & PEMBAHASAN */}
                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3">
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <QuizField label="Rujukan Paragraf Eviden" tooltip="Paragraf di mana kalimat bukti ditemukan.">
                                                        <select
                                                            className={inputClass}
                                                            value={question.evidence_paragraph_number || 1}
                                                            onChange={(e) => updateQuestion(qIdx, 'evidence_paragraph_number', Number(e.target.value))}
                                                        >
                                                            {draft.paragraphs.map((p, idx) => (
                                                                <option key={idx} value={p.paragraph_number || idx + 1}>
                                                                    {p.label || `Paragraf ${idx + 1}`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </QuizField>

                                                    <div className="sm:col-span-2">
                                                        <QuizField label="Kutipan Kalimat Eviden (Evidence Quote)" tooltip="Potongan kalimat persis dari teks wacana yang menjadi alasan pembenar.">
                                                            <input
                                                                className={`${inputClass} font-japanese`}
                                                                value={question.evidence_quote || ''}
                                                                onChange={(e) => updateQuestion(qIdx, 'evidence_quote', e.target.value)}
                                                                placeholder="Kutipan kalimat bukti dari paragraf..."
                                                            />
                                                        </QuizField>
                                                    </div>
                                                </div>

                                                <QuizField label="Pembahasan Mengapa Jawaban Benar" tooltip="Penjelasan rinci teknik parafrasa atau penalaran logika jawaban benar.">
                                                    <textarea
                                                        rows={2}
                                                        className={inputClass}
                                                        value={question.explanation_correct || ''}
                                                        onChange={(e) => updateQuestion(qIdx, 'explanation_correct', e.target.value)}
                                                        placeholder="Penjelasan mengapa opsi ini benar berdasarkan teks wacana..."
                                                    />
                                                </QuizField>

                                                {/* ALASAN PENGECOH / DISTRACTOR TRAPS (OPSIONAL & COLLAPSIBLE) */}
                                                <div className="border-t border-indigo-100/60 pt-2 dark:border-indigo-900/40">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDistractors(qIdx)}
                                                        className="flex items-center gap-1 text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300 hover:underline"
                                                    >
                                                        <ExpandMoreIcon
                                                            sx={{ fontSize: 16 }}
                                                            className={`transition-transform duration-200 ${openDistractorIndices[qIdx] ? 'rotate-180' : ''}`}
                                                        />
                                                        <span>
                                                            Alasan Jebakan Pengecoh (Opsional)
                                                            {Object.values(question.explanation_distractors || {}).some(Boolean) ? ' • Terisi' : ''}
                                                        </span>
                                                    </button>

                                                    {openDistractorIndices[qIdx] && (
                                                        <div className="grid gap-2 sm:grid-cols-2 pt-2">
                                                            {['A', 'B', 'C', 'D'].map((lbl) => (
                                                                <div key={lbl} className="flex items-center gap-2">
                                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-200 text-[10px] font-black text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                        {lbl}
                                                                    </span>
                                                                    <input
                                                                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                                        value={question.explanation_distractors?.[lbl] || ''}
                                                                        onChange={(e) => updateQuestionDistractor(qIdx, lbl, e.target.value)}
                                                                        placeholder={`Alasan pengecoh opsi ${lbl}...`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL DIALOG HELPERS */}
                <DokkaiBankPickerDialog
                    open={showBankPicker}
                    onClose={() => setShowBankPicker(false)}
                    onSelect={handleSelectFromBank}
                    initialLevel={draft.passage?.jlpt_level || defaultLevel}
                />

                <QuickQuestionParserDialog
                    open={showQuestionParser}
                    onClose={() => setShowQuestionParser(false)}
                    onApply={handleApplyQuestions}
                />

                <QuickVocabParserDialog
                    open={showVocabParser}
                    onClose={() => setShowVocabParser(false)}
                    onApply={handleApplyVocabularies}
                    defaultLevel={draft.passage?.jlpt_level || defaultLevel}
                />

                <AutoSplitParagraphDialog
                    open={showSplitParagraph}
                    onClose={() => setShowSplitParagraph(false)}
                    onApply={handleApplyParagraphs}
                />

                <DokkaiPreviewDialog
                    open={showStudentPreview}
                    onClose={() => setShowStudentPreview(false)}
                    draft={draft}
                />
            </div>
        </div>,
        document.body
    );
}
