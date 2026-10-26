import React, { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import QuizField from '@/Components/UI/QuizField';
import UnifiedQuizGeneratorModal from '@/Components/Features/Quiz/Shared/UnifiedQuizGeneratorModal';
import { dokkaiMaterialFromDraft } from '@/Components/Features/Quiz/Shared/generatorDraftAdapters';
import { OptionEditorRow, QuestionNavItem, AudioAttachmentField, UnifiedQuizBuilderShell, UnifiedQuestionEditorCanvas } from '@/Components/Features/Quiz/Shared';

import QuickQuestionParserDialog from './QuickQuestionParserDialog';
import QuickVocabParserDialog from './QuickVocabParserDialog';
import AutoSplitParagraphDialog from './AutoSplitParagraphDialog';
import DokkaiPreviewDialog from './DokkaiPreviewDialog';
import DokkaiImportDialog from './DokkaiImportDialog';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
        paragraph_number: v.paragraph_number || paragraphIdToNumber[v.paragraph_id] || null,
        word: v.word || '',
        furigana: v.furigana || '',
        romaji: v.romaji || '',
        meaning: v.meaning || '',
        pitch_accent: v.pitch_accent || '',
        part_of_speech: v.part_of_speech || 'noun',
        jlpt_level: v.jlpt_level || normalizedPassage.jlpt_level || 'N3',
        example_sentence: v.example_sentence || '',
        example_translation: v.example_translation || '',
        audio_url: v.audio_url || '',
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
                    option_translation: opt.option_translation || '',
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
    const cleanSnapshotRef = useRef('');
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    const currentSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
    const hasUnsavedChanges = Boolean(cleanSnapshotRef.current && currentSnapshot !== cleanSnapshotRef.current);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleRequestClose = () => {
        if (hasUnsavedChanges) {
            openConfirm({
                title: 'Tutup Builder Dokkai?',
                message: 'Ada perubahan yang belum disimpan pada draf wacana Dokkai. Perubahan akan hilang jika Anda keluar sekarang.',
                confirmLabel: 'Keluar Tanpa Menyimpan',
                variant: 'danger',
                onConfirm: () => {
                    closeConfirm();
                    onClose();
                },
            });
            return;
        }
        onClose();
    };


    const fetchLessons = async () => {
        if (!day?.id) return;
        try {
            const res = await window.axios.get(`/admin/module-days/${day.id}/dokkai-quizzes`);
            const available = res.data.lessons || [];
            setLessons(available);
            return available;
        } catch {
            setError('Gagal memuat data wacana Dokkai.');
        }
    };

    useEffect(() => {
        if (!open || !day?.id) return;
        let active = true;
        setError('');
        setFieldErrors({});
        setSuccessMessage('');

        fetchLessons().then((available) => {
            if (!active || !available) return;
            const initial = available.length > 0
                ? normalizeDraft(available[0], day, defaultLevel)
                : makeDraft(day, defaultLevel);
            setDraft(initial);
            cleanSnapshotRef.current = JSON.stringify(initial);
        });

        return () => {
            active = false;
        };
    }, [open, day?.id, defaultLevel]);

    const handleCreateNew = () => {
        const create = () => {
            const nextDraft = makeDraft(day, defaultLevel);
            setDraft(nextDraft);
            cleanSnapshotRef.current = JSON.stringify(nextDraft);
            setActiveTab('metadata');
            setError('');
            setFieldErrors({});
            setSuccessMessage('');
        };
        if (hasUnsavedChanges) {
            openConfirm({
                title: 'Buat Wacana Baru?',
                message: 'Perubahan pada wacana saat ini belum disimpan dan akan hilang. Buat wacana baru?',
                confirmLabel: 'Lanjutkan',
                variant: 'warning',
                onConfirm: () => {
                    closeConfirm();
                    create();
                },
            });
            return;
        }
        create();
    };

    const handleSelectQuiz = (quizItem) => {
        const select = () => {
            const nextDraft = normalizeDraft(quizItem, day, defaultLevel);
            setDraft(nextDraft);
            cleanSnapshotRef.current = JSON.stringify(nextDraft);
            setActiveTab('metadata');
            setError('');
            setFieldErrors({});
            setSuccessMessage('');
        };
        if (hasUnsavedChanges) {
            openConfirm({
                title: 'Beralih ke Wacana Lain?',
                message: 'Perubahan pada wacana saat ini belum disimpan dan akan hilang. Lanjutkan beralih?',
                confirmLabel: 'Lanjutkan Beralih',
                variant: 'warning',
                onConfirm: () => {
                    closeConfirm();
                    select();
                },
            });
            return;
        }
        select();
    };

    const [showGenerator, setShowGenerator] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showQuestionParser, setShowQuestionParser] = useState(false);
    const [showVocabParser, setShowVocabParser] = useState(false);
    const [showSplitParagraph, setShowSplitParagraph] = useState(false);
    const [showStudentPreview, setShowStudentPreview] = useState(false);
    const [openDistractorIndices, setOpenDistractorIndices] = useState({});
    const [localDraftAvailable, setLocalDraftAvailable] = useState(false);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    useEffect(() => {
        if (activeQuestionIndex >= draft.questions.length) {
            setActiveQuestionIndex(Math.max(0, draft.questions.length - 1));
        }
    }, [activeQuestionIndex, draft.questions.length]);
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
        const removedNum = index + 1;
        const updated = draft.paragraphs
            .filter((_, idx) => idx !== index)
            .map((p, idx) => ({ ...p, paragraph_number: idx + 1, label: p.label || `Paragraf ${idx + 1}` }));

        const updatedQuestions = (draft.questions || []).map((q) => {
            const currentEv = Number(q.evidence_paragraph_number || 1);
            if (currentEv === removedNum) {
                return { ...q, evidence_paragraph_number: 1 };
            }
            if (currentEv > removedNum) {
                return { ...q, evidence_paragraph_number: currentEv - 1 };
            }
            return q;
        });

        setDraft({ ...draft, paragraphs: updated, questions: updatedQuestions });
    };
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
        setActiveQuestionIndex(draft.questions.length);
    };

    const duplicateQuestion = (index) => {
        const item = draft.questions[index];
        if (!item) return;
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = null;
        const nextQuestions = [...draft.questions];
        nextQuestions.splice(index + 1, 0, copy);
        const renumbered = nextQuestions.map((q, idx) => ({ ...q, question_number: idx + 1 }));
        setDraft({ ...draft, questions: renumbered });
        setActiveQuestionIndex(index + 1);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...draft.questions];
        updated[index] = { ...updated[index], [field]: value };
        setDraft({ ...draft, questions: updated });
    };

    const updateQuestionOption = (qIndex, optIndex, field, value) => {
        const updated = [...draft.questions];
        const currentOptions = updated[qIndex].options || [];
        const options = field === 'is_correct'
            ? currentOptions.map((opt, idx) => ({ ...opt, is_correct: idx === optIndex }))
            : currentOptions.map((opt, idx) => (idx === optIndex ? { ...opt, [field]: value } : opt));
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
        setActiveQuestionIndex((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
    };

    const moveQuestion = (fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= draft.questions.length) return;
        const nextQuestions = [...draft.questions];
        const temp = nextQuestions[fromIndex];
        nextQuestions[fromIndex] = nextQuestions[toIndex];
        nextQuestions[toIndex] = temp;
        const renumbered = nextQuestions.map((q, idx) => ({ ...q, question_number: idx + 1 }));
        setDraft({ ...draft, questions: renumbered });
        setActiveQuestionIndex(toIndex);
    };

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
            paragraph_number: v.paragraph_number || undefined,
            word: v.word?.trim() || '',
            furigana: v.furigana?.trim() || '',
            romaji: v.romaji?.trim() || null,
            meaning: v.meaning?.trim() || '',
            pitch_accent: v.pitch_accent?.trim() || null,
            part_of_speech: v.part_of_speech || 'noun',
            jlpt_level: v.jlpt_level || draft.passage.jlpt_level,
            example_sentence: v.example_sentence?.trim() || null,
            example_translation: v.example_translation?.trim() || null,
            audio_url: v.audio_url?.trim() || null,
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
                option_translation: opt.option_translation?.trim() || null,
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

        for (let i = 0; i < (draft.questions || []).length; i += 1) {
            const q = draft.questions[i];
            const filledOptions = (q.options || []).filter((opt) => Boolean(opt.option_text?.trim()));
            if (filledOptions.length < 2) {
                setError(`Soal #${i + 1} wajib memiliki minimal 2 pilihan jawaban yang terisi.`);
                setActiveTab('questions');
                setActiveQuestionIndex(i);
                return;
            }
            const hasCorrect = (q.options || []).some((opt) => Boolean(opt.is_correct));
            if (!hasCorrect) {
                setError(`Kunci jawaban untuk soal #${i + 1} belum dipilih.`);
                setActiveTab('questions');
                setActiveQuestionIndex(i);
                return;
            }
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
            cleanSnapshotRef.current = JSON.stringify(normalizedSaved);
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
                const firstErrKey = Object.keys(errData.errors)[0] || '';
                if (firstErrKey.startsWith('questions')) {
                    setActiveTab('questions');
                } else if (firstErrKey.startsWith('paragraphs')) {
                    setActiveTab('paragraphs');
                } else if (firstErrKey.startsWith('vocabularies')) {
                    setActiveTab('vocabularies');
                } else {
                    setActiveTab('metadata');
                }
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

    const handleDelete = () => {
        if (!draft.quiz?.id && !draft.id) return;
        const quizId = draft.quiz?.id || draft.id;

        openConfirm({
            title: 'Hapus Wacana Dokkai?',
            message: 'Hapus wacana Dokkai ini beserta seluruh paragraf, kosakata, dan bank soalnya? Tindakan ini tidak dapat dibatalkan.',
            confirmLabel: 'Hapus Wacana',
            variant: 'danger',
            onConfirm: async () => {
                closeConfirm();
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
            },
        });
    };

    if (!open) return null;

    const quizId = draft.quiz?.id || draft.id;
    const currentStatus = draft.quiz?.status || draft.status || 'draft';
    const isPublished = currentStatus === 'published';

    return (
        <UnifiedQuizBuilderShell
            open={open}
            isModal={true}
            title={draft.passage?.title || 'Wacana Dokkai Baru'}
            subtitle={`M${module?.week_number || 1} · H${day?.day_number || 1}: ${day?.title || ''}`}
            categoryBadge="Dokkai Builder"
            status={isPublished ? 'published' : 'draft'}
            savedAt={savedAt}
            saving={saving}
            hasUnsavedChanges={hasUnsavedChanges}
            onBack={showGenerator ? undefined : handleRequestClose}
            onSave={handleSave}
            onToggleStatus={quizId ? () => handleToggleStatus(isPublished ? 'draft' : 'published') : undefined}
            onPreview={() => setShowStudentPreview(true)}
            extraActions={
                quizId && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        title="Hapus Wacana"
                        aria-label="Hapus Wacana"
                        className="flex min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-400"
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                    </button>
                )
            }
            subHeader={
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
                                            ? 'bg-emerald-600 text-white shadow-xs'
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
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 shrink-0"
                        >
                            <AddIcon sx={{ fontSize: 14 }} />
                            <span>Tambah Wacana</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGenerator(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0"
                        >
                            <BoltIcon sx={{ fontSize: 14 }} />
                            <span>Generator Soal</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowImportDialog(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0"
                        >
                            <UploadFileIcon sx={{ fontSize: 14 }} />
                            <span>Import Excel/CSV</span>
                        </button>
                    </div>

                    {savedAt && (
                        <span className="text-[11px] font-semibold text-gray-400 shrink-0 hidden md:block">
                            Tersimpan pukul {savedAt}
                        </span>
                    )}
                </div>
            }
            tabs={[
                { id: 'metadata', label: '1. Metadata Wacana', icon: AutoStoriesIcon },
                { id: 'paragraphs', label: '2. Teks & Paragraf', icon: FormatListBulletedIcon, count: draft.paragraphs?.length || 0 },
                { id: 'vocabularies', label: '3. Glosarium Kosakata', icon: MenuBookIcon, count: draft.vocabularies?.length || 0 },
                { id: 'questions', label: '4. Bank Soal & Eviden', icon: QuizOutlinedIcon, count: draft.questions?.length || 0 },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unstyled={true}
            extraModals={
                <>
                    <UnifiedQuizGeneratorModal open={showGenerator} onClose={() => setShowGenerator(false)} type="dokkai"
                        initialData={{ quizId: draft.id ? Number(draft.id) : null, moduleDayId: day.id, level: draft.passage?.jlpt_level,
                            hasContent: Boolean(draft.passage?.title?.trim() || draft.questions.some(q => q.question_text?.trim())) }}
                        onApplyDraft={generated => {
                            const material = dokkaiMaterialFromDraft(generated);
                            setDraft(current => normalizeDraft({ ...current, ...material, passage: { ...current.passage, ...material.passage, xp_reward: current.passage.xp_reward } }, day, defaultLevel));
                            setActiveTab('questions'); setActiveQuestionIndex(0); setError(''); setSuccessMessage('Draf diterapkan ke editor.');
                        }} />
                    <DokkaiImportDialog
                        open={showImportDialog}
                        day={day}
                        onClose={() => setShowImportDialog(false)}
                        onImportSuccess={(data) => {
                            fetchLessons();
                            if (data?.message) {
                                setSuccessMessage(data.message);
                            }
                        }}
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
                    <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
                </>
            }
        >
            <div className="space-y-6">
                {/* NOTIFICATIONS */}
                {localDraftAvailable && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-center gap-1.5">
                            <WarningAmberIcon sx={{ fontSize: 16 }} className="text-amber-600 dark:text-amber-400" />
                            <span>Ditemukan draf tersimpan lokal untuk wacana ini.</span>
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
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                        <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                        <span>{successMessage}</span>
                    </div>
                )}
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

                                <AudioAttachmentField
                                    value={draft.passage?.audio_url || ''}
                                    onChange={(url) => setDraft({ ...draft, passage: { ...draft.passage, audio_url: url } })}
                                    label="Berkas / URL Audio Pelafalan Wacana (Opsional)"
                                    placeholder="https://... atau klik Unggah Audio MP3"
                                    tooltip="Jika dikosongkan, murid dapat memanfaatkan pemutar pelafalan otomatis (Google Web Speech TTS) kalimat per kalimat."
                                />
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
                                                            aria-label={`Hapus ${paragraph.label || `Paragraf ${index + 1}`}`}
                                                            title={`Hapus ${paragraph.label || `Paragraf ${index + 1}`}`}
                                                            className="flex min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
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
                                                    lang="ja"
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
                                                    aria-label={`Hapus kosakata #${index + 1}`}
                                                    title={`Hapus kosakata #${index + 1}`}
                                                    className="flex min-h-[44px] min-w-[44px] sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"
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
                                                        lang="ja"
                                                    />
                                                </QuizField>

                                                <QuizField label="Furigana (Cara Baca)" required tooltip="Hiragana pelafalan kata.">
                                                    <input
                                                        className={`${inputClass} font-japanese`}
                                                        value={vocab.furigana || ''}
                                                        onChange={(e) => updateVocabulary(index, 'furigana', e.target.value)}
                                                        placeholder="さくら"
                                                        lang="ja"
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

                        {/* TAB 4: QUESTIONS (MASTER-DETAIL 2-KOLOM SERAGAM) */}
                        {activeTab === 'questions' && (() => {
                            const activeQuestion = draft.questions[activeQuestionIndex] || draft.questions[0] || null;
                            const currentQIndex = draft.questions[activeQuestionIndex] ? activeQuestionIndex : 0;

                            return (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                                Bank Soal Pemahaman Dokkai ({draft.questions.length} Butir Soal)
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Kelola pertanyaan pilihan ganda, rujukan paragraf eviden wacana, dan analisis logika jebakan.
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

                                    <div className="grid gap-6 lg:grid-cols-12 items-start">
                                        {/* Kolom Kiri: Sidebar Navigator Soal (4 cols) */}
                                        <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 px-1 dark:border-gray-800">
                                                <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                    Daftar Soal ({draft.questions.length})
                                                </span>
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    {draft.questions.filter(q => q.question_text?.trim() && (q.options || []).some(o => o.is_correct && o.option_text?.trim())).length}/{draft.questions.length} Siap
                                                </span>
                                            </div>
                                            <div className="mt-2.5 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                                                {draft.questions.map((q, idx) => {
                                                    const correctOpt = (q.options || []).find(o => o.is_correct);
                                                    const isReady = Boolean(q.question_text?.trim()) && Boolean(correctOpt?.option_text?.trim());
                                                    return (
                                                        <QuestionNavItem
                                                            key={idx}
                                                            index={idx}
                                                            isSelected={idx === currentQIndex}
                                                            isReady={isReady}
                                                            title={q.question_text || ''}
                                                            subtitle={correctOpt ? `Kunci: Opsi ${correctOpt.option_label}` : 'Kunci belum dipilih'}
                                                            typeLabel={`P${q.evidence_paragraph_number || 1}`}
                                                            canMoveUp={idx > 0}
                                                            canMoveDown={idx < draft.questions.length - 1}
                                                            canDuplicate={true}
                                                            canDelete={draft.questions.length > 1}
                                                            onSelect={() => setActiveQuestionIndex(idx)}
                                                            onMoveUp={() => moveQuestion(idx, -1)}
                                                            onMoveDown={() => moveQuestion(idx, 1)}
                                                            onDuplicate={() => duplicateQuestion(idx)}
                                                            onDelete={() => removeQuestion(idx)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Kolom Kanan: Form Editor In-Place Soal Aktif (8 cols) */}
                                        <div className="lg:col-span-8">
                                            {activeQuestion ? (
                                                <UnifiedQuestionEditorCanvas
                                                    questionNumber={currentQIndex + 1}
                                                    title={`Editor Soal Nomor ${currentQIndex + 1}`}
                                                    subtitle={`Eviden Paragraf ${activeQuestion.evidence_paragraph_number || 1}`}
                                                    speechText={activeQuestion?.question_text}
                                                    canDelete={draft.questions.length > 1}
                                                    onDuplicate={() => duplicateQuestion(currentQIndex)}
                                                    onDelete={() => removeQuestion(currentQIndex)}
                                                >

                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <QuizField label="Pertanyaan (Bahasa Jepang)" required tooltip="Teks pertanyaan dalam bahasa Jepang.">
                                                            <textarea
                                                                rows={2}
                                                                className={`${inputClass} font-japanese`}
                                                                value={activeQuestion.question_text || ''}
                                                                onChange={(e) => updateQuestion(currentQIndex, 'question_text', e.target.value)}
                                                                placeholder="本文の内容と合っているものはどれか。"
                                                                lang="ja"
                                                            />
                                                        </QuizField>

                                                        <QuizField label="Terjemahan Pertanyaan (Indonesia)" tooltip="Bantuan terjemahan pertanyaan saat mode review.">
                                                            <textarea
                                                                rows={2}
                                                                className={inputClass}
                                                                value={activeQuestion.question_translation || ''}
                                                                onChange={(e) => updateQuestion(currentQIndex, 'question_translation', e.target.value)}
                                                                placeholder="Manakah pernyataan yang sesuai dengan isi bacaan?"
                                                            />
                                                        </QuizField>
                                                    </div>

                                                    {/* PILIHAN GANDA (DENGAN SHARED ATOMS OptionEditorRow) */}
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                                Pilihan Jawaban (Klik bulatan untuk memilih kunci jawaban benar)
                                                            </label>
                                                            {activeQuestion.options?.find(o => o.is_correct)?.option_text && (
                                                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    Kunci: {activeQuestion.options.find(o => o.is_correct).option_label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-2.5">
                                                            {(activeQuestion.options || []).map((opt, optIdx) => (
                                                                <OptionEditorRow
                                                                    key={optIdx}
                                                                    index={optIdx}
                                                                    label={opt.option_label}
                                                                    value={opt.option_text || ''}
                                                                    reading=""
                                                                    isCorrect={Boolean(opt.is_correct)}
                                                                    showReading={false}
                                                                    accent="indigo"
                                                                    placeholder={`Pernyataan pilihan ${opt.option_label}...`}
                                                                    onTextChange={(val) => updateQuestionOption(currentQIndex, optIdx, 'option_text', val)}
                                                                    onSelectCorrect={() => updateQuestionOption(currentQIndex, optIdx, 'is_correct', true)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* EVIDEN & PEMBAHASAN */}
                                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3">
                                                        <div className="grid gap-3 sm:grid-cols-3">
                                                            <QuizField label="Rujukan Paragraf Eviden" tooltip="Paragraf di mana kalimat bukti ditemukan.">
                                                                <select
                                                                    className={inputClass}
                                                                    value={activeQuestion.evidence_paragraph_number || 1}
                                                                    onChange={(e) => updateQuestion(currentQIndex, 'evidence_paragraph_number', Number(e.target.value))}
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
                                                                        value={activeQuestion.evidence_quote || ''}
                                                                        onChange={(e) => updateQuestion(currentQIndex, 'evidence_quote', e.target.value)}
                                                                        placeholder="Kutipan kalimat bukti dari paragraf..."
                                                                        lang="ja"
                                                                    />
                                                                </QuizField>
                                                            </div>
                                                        </div>

                                                        <QuizField label="Pembahasan Mengapa Jawaban Benar" tooltip="Penjelasan rinci teknik parafrasa atau penalaran logika jawaban benar.">
                                                            <textarea
                                                                rows={2}
                                                                className={inputClass}
                                                                value={activeQuestion.explanation_correct || ''}
                                                                onChange={(e) => updateQuestion(currentQIndex, 'explanation_correct', e.target.value)}
                                                                placeholder="Penjelasan mengapa opsi ini benar berdasarkan teks wacana..."
                                                            />
                                                        </QuizField>

                                                        {/* ALASAN PENGECOH / DISTRACTOR TRAPS (OPSIONAL & COLLAPSIBLE) */}
                                                        <div className="border-t border-indigo-100/60 pt-2 dark:border-indigo-900/40">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleDistractors(currentQIndex)}
                                                                aria-expanded={Boolean(openDistractorIndices[currentQIndex])}
                                                                aria-controls={`distractor-panel-${currentQIndex}`}
                                                                className="flex items-center gap-1 text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300 hover:underline min-h-[44px] sm:min-h-0 py-1"
                                                            >
                                                                <ExpandMoreIcon
                                                                    sx={{ fontSize: 16 }}
                                                                    className={`transition-transform duration-200 ${openDistractorIndices[currentQIndex] ? 'rotate-180' : ''}`}
                                                                />
                                                                <span>
                                                                    Alasan Jebakan Pengecoh (Opsional)
                                                                    {Object.values(activeQuestion.explanation_distractors || {}).some(Boolean) ? ' · Terisi' : ''}
                                                                </span>
                                                            </button>

                                                            {openDistractorIndices[currentQIndex] && (
                                                                <div id={`distractor-panel-${currentQIndex}`} className="grid gap-2 sm:grid-cols-2 pt-2">
                                                                    {['A', 'B', 'C', 'D'].map((lbl) => (
                                                                        <div key={lbl} className="flex items-center gap-2">
                                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-200 text-[10px] font-black text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                                {lbl}
                                                                            </span>
                                                                            <input
                                                                                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                                                                value={activeQuestion.explanation_distractors?.[lbl] || ''}
                                                                                onChange={(e) => updateQuestionDistractor(currentQIndex, lbl, e.target.value)}
                                                                                placeholder={`Alasan pengecoh opsi ${lbl}...`}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </UnifiedQuestionEditorCanvas>
                                            ) : (
                                                <div className="flex h-64 flex-col items-center justify-center text-center">
                                                    <p className="text-sm font-bold text-gray-400">Pilih butir soal dari sidebar atau klik Tambah Soal.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                </div>
            </UnifiedQuizBuilderShell>
        );
}
