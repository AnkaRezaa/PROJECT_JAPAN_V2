import React, { useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BoardCanvas from '@/Components/Features/Board/BoardCanvas';
import FabricSlideCanvas from '@/Components/Features/Presentation/FabricSlideCanvas';
import PdfCarousel from '@/Components/Features/Presentation/PdfCarousel';
import EmbedFrame from '@/Components/Features/Presentation/EmbedFrame';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import TuneIcon from '@mui/icons-material/Tune';

const createSlideKey = () => `slide-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const canvasText = (text, left, top, width, fontSize, options = {}) => ({
    kind: 'textbox',
    text,
    left,
    top,
    width,
    height: options.height || Math.max(70, fontSize * 1.4),
    fontSize,
    fill: options.fill || '#111827',
    fontWeight: options.fontWeight || '700',
    textAlign: options.textAlign || 'left',
});
const canvasShape = (left, top, width, height, options = {}) => ({
    kind: 'shape',
    shapeType: options.shapeType || 'rounded',
    left,
    top,
    width,
    height,
    fill: options.fill || '#FFF1E8',
    stroke: options.stroke || '#22C55E',
    strokeWidth: options.strokeWidth || 2,
});
const templateCanvas = (layout, title, content = '') => {
    const lines = String(content).split('\n').filter(Boolean);
    const base = { version: 1, width: 1280, height: 720, backgroundColor: '#FFFFFF', objects: [] };

    if (layout === 'title') {
        return { ...base, backgroundColor: '#FFF7ED', objects: [
            canvasText('TOKU-UP', 90, 120, 1080, 24, { fill: '#22C55E', fontWeight: '900' }),
            canvasText(title, 90, 190, 1080, 68, { fontWeight: '900' }),
            canvasText(content, 90, 310, 880, 30, { fill: '#4B5563' }),
        ] };
    }

    if (layout === 'content') {
        const points = lines.length ? lines : ['Poin materi pertama', 'Poin materi kedua', 'Poin materi ketiga'];
        return { ...base, objects: [
            canvasText(title, 72, 55, 1130, 52, { fontWeight: '900' }),
            ...points.flatMap((line, index) => [
                canvasShape(72, 155 + index * 135, 1130, 104, { fill: index % 2 ? '#F8FAFC' : '#FFF7ED' }),
                canvasText(line, 105, 184 + index * 135, 1050, 28),
            ]),
        ] };
    }

    if (layout === 'vocabulary') {
        return { ...base, backgroundColor: '#ECFEFF', objects: [
            canvasText('KOSAKATA', 90, 60, 1100, 22, { fill: '#22C55E', fontWeight: '900', textAlign: 'center' }),
            canvasText(title, 90, 125, 1100, 112, { fontWeight: '900', textAlign: 'center' }),
            canvasText(lines[0] || 'reading', 90, 300, 1100, 38, { fill: '#475569', textAlign: 'center' }),
            canvasText(lines[1] || 'arti', 90, 385, 1100, 48, { fontWeight: '900', textAlign: 'center' }),
            canvasText(lines[2] || 'Contoh kalimat', 140, 500, 1000, 28, { fill: '#475569', textAlign: 'center' }),
        ] };
    }

    if (layout === 'kanji') {
        return { ...base, backgroundColor: '#FFFBEB', objects: [
            canvasShape(80, 115, 360, 390, { fill: '#FFFFFF', stroke: '#F59E0B' }),
            canvasText(title, 100, 185, 320, 160, { fontWeight: '900', textAlign: 'center' }),
            canvasText(lines.join('\n') || 'Arti:\nOnyomi:\nKunyomi:\nContoh:', 520, 150, 660, 36, { height: 390 }),
        ] };
    }

    if (layout === 'question') {
        return { ...base, backgroundColor: '#FFF1F2', objects: [
            canvasText('PERTANYAAN PEMANTIK', 90, 100, 1100, 22, { fill: '#22C55E', fontWeight: '900', textAlign: 'center' }),
            canvasText(title, 110, 200, 1060, 62, { fontWeight: '900', textAlign: 'center' }),
            canvasText(content, 180, 380, 920, 34, { fill: '#4B5563', textAlign: 'center' }),
        ] };
    }

    if (layout === 'media') {
        return { ...base, backgroundColor: 'transparent', objects: [
            canvasShape(40, 35, 520, 82, { fill: 'rgba(17,24,39,0.82)', stroke: 'rgba(255,255,255,0.3)' }),
            canvasText(title, 65, 55, 470, 30, { fill: '#FFFFFF', fontWeight: '900' }),
        ] };
    }

    return { ...base, objects: [
        canvasText(title || 'Papan Interaktif', 72, 55, 1130, 46, { fontWeight: '900' }),
        canvasText(content || 'Gunakan toolbar untuk menambahkan catatan.', 72, 130, 900, 26, { fill: '#64748B' }),
    ] };
};

const emptySlide = {
    id: null,
    title: 'Slide Baru',
    layout: 'canvas',
    content: '',
    media_url: '',
    background: 'light',
    accent_color: '#22C55E',
    speaker_notes: '',
    board_data: { strokes: [] },
    snapshot_data: null,
    snapshot_url: null,
    canvas_json: { version: 1, width: 1280, height: 720, backgroundColor: '#FFFFFF', objects: [] },
    source_type: 'manual',
    source_meta: null,
    _clientKey: createSlideKey(),
};

const templates = [
    { label: 'Sampul', layout: 'title', title: 'Judul Presentasi', content: 'Subjudul atau tujuan pembelajaran.', background: 'sunrise' },
    { label: 'Materi', layout: 'content', title: 'Poin Utama', content: 'Poin materi pertama\nPoin materi kedua\nPoin materi ketiga', background: 'grid' },
    { label: 'Kosakata', layout: 'vocabulary', title: '会議', content: 'かいぎ\nrapat\n今日は一時から会議があります。', background: 'ocean' },
    { label: 'Kanji', layout: 'kanji', title: '割', content: 'Arti: membagi\nOnyomi: カツ\nKunyomi: わる\nContoh: 割引 - diskon', background: 'paper' },
    { label: 'Media', layout: 'media', title: 'Gambar atau Video', content: '', media_url: '', background: 'dark' },
    { label: 'Pertanyaan', layout: 'question', title: 'Pertanyaan Pemantik', content: 'Apa yang kamu pahami dari materi ini?', background: 'rose' },
    { label: 'Papan Kosong', layout: 'canvas', title: 'Papan Interaktif', content: '', background: 'light' },
].map((template) => ({
    ...template,
    canvas_json: templateCanvas(template.layout, template.title, template.content),
}));

const backgroundClass = {
    light: 'bg-white text-gray-950',
    dark: 'bg-gray-950 text-white',
    sunrise: 'bg-gradient-to-br from-orange-100 via-amber-50 to-white text-gray-950',
    sakura: 'bg-gradient-to-br from-pink-100 via-white to-rose-50 text-gray-950',
    ocean: 'bg-gradient-to-br from-cyan-100 via-white to-brand-100 text-gray-950',
    forest: 'bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-gray-950',
    paper: 'bg-[linear-gradient(#ffffff,#fff7ed)] text-gray-950',
    grid: 'bg-white text-gray-950 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:28px_28px]',
    indigo: 'bg-gradient-to-br from-indigo-950 via-gray-950 to-brand-950 text-white',
    matcha: 'bg-gradient-to-br from-lime-100 via-white to-emerald-100 text-gray-950',
    rose: 'bg-gradient-to-br from-rose-100 via-white to-orange-50 text-gray-950',
};

const backgroundOptions = [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['sunrise', 'Sunrise'],
    ['sakura', 'Sakura'],
    ['ocean', 'Ocean'],
    ['forest', 'Forest'],
    ['paper', 'Paper'],
    ['grid', 'Grid'],
    ['indigo', 'Indigo'],
    ['matcha', 'Matcha'],
    ['rose', 'Rose'],
];

const csrfToken = () => {
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
};

const slideDimensions = (slide = {}) => {
    const sourceWidth = Number(slide.source_meta?.canvas_width || slide.source_meta?.width || slide.canvas_json?.width);
    const sourceHeight = Number(slide.source_meta?.canvas_height || slide.source_meta?.height || slide.canvas_json?.height);

    if (sourceWidth > 0 && sourceHeight > 0) {
        return {
            width: sourceWidth,
            height: sourceHeight,
        };
    }

    return {
        width: 16,
        height: 9,
    };
};

const slideAspectStyle = (slide) => {
    const size = slideDimensions(slide);

    return { aspectRatio: `${size.width} / ${size.height}` };
};

const mapDeckSlides = (items = []) => items.map((slide) => ({
    ...slide,
    board_data: slide.jamboard_data || slide.board_data || { strokes: [] },
    snapshot_data: slide.jamboard_snapshot || slide.snapshot_data || null,
    jamboard_data: slide.jamboard_data || slide.board_data || { strokes: [] },
    jamboard_snapshot: slide.jamboard_snapshot || slide.snapshot_data || null,
    snapshot_url: slide.snapshot_url || null,
    canvas_json: slide.canvas_json || (slide.layout === 'pdf'
        ? null
        : templateCanvas(slide.layout, slide.title || 'Slide Presentasi', slide.content || '')),
    source_type: slide.source_type || 'manual',
    source_meta: slide.source_meta || null,
    _clientKey: `slide-id-${slide.id}`,
}));

const builderSnapshot = (slides, status, placement = {}) => JSON.stringify({
    status,
    placement,
    slides: slides.map(({ _clientKey, ...slide }) => slide),
});

function SlidePreview({ slide, small = false }) {
    const lines = String(slide.content || '').split('\n').filter(Boolean);
    const accent = slide.accent_color || '#22C55E';
    const visualUrl = slide.snapshot_url || slide.snapshot_data || slide.media_url;
    const framePadding = small ? 'p-2' : 'p-5 sm:p-6';
    const titleSize = small ? 'text-xs' : 'text-2xl';
    const headingSize = small ? 'text-sm' : 'text-3xl';

    return (
        <div style={slideAspectStyle(slide)} className={`${backgroundClass[slide.background] || backgroundClass.light} ${small ? 'rounded-xl' : 'rounded-2xl'} relative flex overflow-hidden border border-gray-200 shadow-sm dark:border-gray-800`}>
            <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-20" style={{ backgroundColor: accent }} />
            <div className={`relative z-10 flex h-full w-full flex-col ${framePadding}`}>
                {slide.layout === 'title' && (
                    <div className="my-auto">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>TOKU-UP</p>
                        <h2 className={`${small ? 'text-base' : 'text-3xl sm:text-4xl'} font-black tracking-tight`}>{slide.title || 'Untitled'}</h2>
                        <p className={`${small ? 'mt-1 text-[10px]' : 'mt-3 text-sm'} max-w-2xl font-bold opacity-70`}>{slide.content}</p>
                    </div>
                )}
                {slide.layout === 'content' && (
                    <div>
                        <h2 className={`${small ? 'text-xl' : 'text-4xl'} font-black`}>{slide.title || 'Poin Utama'}</h2>
                        <div className={`${small ? 'mt-2 space-y-1' : 'mt-4 space-y-2'}`}>
                            {(lines.length ? lines : ['Tulis poin materi di sini.']).map((line, index) => (
                                <div key={`${line}-${index}`} className={`${small ? 'text-[10px]' : 'text-sm'} rounded-xl bg-white/60 p-2 font-bold shadow-sm dark:bg-gray-900/50`}>
                                    {line}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {slide.layout === 'vocabulary' && (
                    <div className="my-auto text-center">
                        <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: accent }}>Vocabulary</p>
                        <h2 className={`${small ? 'text-4xl' : 'text-7xl'} mt-4 font-black`}>{slide.title || '単語'}</h2>
                        <p className={`${small ? 'mt-2 text-sm' : 'mt-5 text-3xl'} font-bold opacity-70`}>{lines[0] || 'reading'}</p>
                        <p className={`${small ? 'mt-3 text-base' : 'mt-8 text-4xl'} font-black`}>{lines[1] || 'arti'}</p>
                        {!small && <p className="mx-auto mt-6 max-w-2xl text-lg italic opacity-70">{lines[2] || 'Contoh kalimat akan tampil di sini.'}</p>}
                    </div>
                )}
                {slide.layout === 'kanji' && (
                    <div className="grid flex-1 place-items-center gap-6 sm:grid-cols-[220px_1fr]">
                        <div className={`${small ? 'h-24 w-24 text-5xl' : 'h-48 w-48 text-8xl'} grid place-items-center rounded-[2rem] bg-white/70 font-black shadow-lg dark:bg-gray-900/60`}>
                            {slide.title || '漢'}
                        </div>
                        <div className="space-y-3">
                            {(lines.length ? lines : ['Arti: ...', 'Reading: ...', 'Contoh: ...']).map((line, index) => (
                                <p key={`${line}-${index}`} className={`${small ? 'text-xs' : 'text-xl'} font-black opacity-80`}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}
                {slide.layout === 'media' && (
                    <div className="flex h-full min-h-0 flex-col">
                        {!small && <h2 className={`${titleSize} mb-5 font-black`}>{slide.title || 'Media'}</h2>}
                        {visualUrl ? (
                            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-gray-950">
                                <EmbedFrame url={visualUrl} title={slide.title || 'Media'} compact={small} />
                            </div>
                        ) : (
                            <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border-2 border-dashed border-gray-300 font-black opacity-50">Media URL</div>
                        )}
                        {!small && <p className="mt-5 text-lg font-bold opacity-70">{slide.content}</p>}
                    </div>
                )}
                {slide.layout === 'question' && (
                    <div className="my-auto text-center">
                        <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: accent }}>Question</p>
                        <h2 className={`${small ? 'text-2xl' : 'text-5xl'} mt-5 font-black`}>{slide.title || 'Pertanyaan'}</h2>
                        <p className={`${small ? 'mt-3 text-sm' : 'mt-8 text-2xl'} mx-auto max-w-3xl font-bold opacity-70`}>{slide.content}</p>
                    </div>
                )}
                {slide.layout === 'board' && (
                    <div>
                        <h2 className={`${small ? 'text-xl' : 'text-4xl'} mb-5 font-black`}>{slide.title || 'Jamboard'}</h2>
                        <BoardCanvas
                            strokes={slide.jamboard_data?.strokes || slide.board_data?.strokes || []}
                            className={small ? 'rounded-xl shadow-none' : 'rounded-3xl'}
                        />
                        {!small && <p className="mt-5 text-lg font-bold opacity-70">{slide.content || 'Jamboard interaktif untuk sesi ajar.'}</p>}
                    </div>
                )}
                {slide.layout === 'canvas' && (
                    <div className="flex h-full min-h-0 flex-col">
                        {!small && <h2 className={`${titleSize} mb-5 font-black`}>{slide.title || 'Canvas Slide'}</h2>}
                        {visualUrl ? (
                            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm">
                                <img src={visualUrl} alt={slide.title || 'Canvas'} className="h-full w-full object-contain" />
                            </div>
                        ) : (
                            <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border-2 border-dashed border-gray-300 font-black opacity-50">{small ? (slide.title || 'Canvas') : 'Canvas'}</div>
                        )}
                        {!small && slide.source_type === 'pptx' && <p className="mt-5 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700">Import PPTX adalah draft. Cek ulang layout sebelum publish.</p>}
                    </div>
                )}
                {slide.layout === 'pdf' && (
                    <div className="flex h-full min-h-0 flex-col">
                        {!small && <h2 className={`${titleSize} mb-5 font-black`}>{slide.title || 'PDF'}</h2>}
                        <div className="grid min-h-0 flex-1 place-items-center rounded-2xl bg-brand-50 font-black text-brand-700">
                            PDF
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const deckSlotKey = (deck) => deck.week_slot === 'after_day'
    ? `after_day:${deck.day?.id || deck.module_day_id}`
    : (deck.week_slot || 'opening');

const parseSlotKey = (slotKey) => slotKey.startsWith('after_day:')
    ? { week_slot: 'after_day', module_day_id: Number(slotKey.split(':')[1]) }
    : { week_slot: slotKey === 'closing' ? 'closing' : 'opening', module_day_id: null };

const slotLabel = (slotKey, days) => {
    if (slotKey === 'opening') return days.length > 0 ? 'Sebelum Hari 1' : 'Awal Week';
    if (slotKey === 'closing') return 'Akhir Week';

    const day = days.find((item) => Number(item.id) === Number(slotKey.split(':')[1]));
    return day ? `Setelah Hari ${day.day_number}` : 'Setelah Hari';
};

function TimelineDropTarget({ slotKey, index, visible }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `drop:${slotKey}:${index}`,
        data: { slotKey, index },
    });

    return (
        <div ref={setNodeRef} className={`grid overflow-hidden transition-all ${visible || isOver ? 'min-h-9 py-1' : 'min-h-3'} ${isOver ? 'scale-[1.01]' : ''}`}>
            <span className={`place-self-stretch rounded-md border border-dashed text-center text-[10px] font-bold transition ${
                isOver
                    ? 'border-orange-500 bg-orange-50 py-2 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                    : visible
                        ? 'border-gray-300 py-1.5 text-gray-400 dark:border-gray-700'
                        : 'border-transparent'
            }`}>
                {(visible || isOver) && 'Letakkan di sini'}
            </span>
        </div>
    );
}

function TimelineDeckCard({ item, selected, moving, onOpen, onMoveMenu }) {
    const draggableId = item.isDraft ? 'draft' : `deck:${item.id}`;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: draggableId,
        data: { item },
    });

    return (
        <div
            ref={setNodeRef}
            style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
            className={`relative rounded-lg border bg-white p-3 shadow-sm transition dark:bg-gray-900 ${
                item.isDraft
                    ? 'border-orange-400 ring-1 ring-orange-400'
                    : selected
                        ? 'border-orange-300'
                        : 'border-gray-200 dark:border-gray-700'
            } ${isDragging ? 'z-20 opacity-30' : ''}`}
        >
            <div className="flex items-center gap-3">
                <button type="button" {...listeners} {...attributes} title="Geser posisi presentasi" className="grid h-9 w-8 shrink-0 cursor-grab place-items-center rounded-md border border-gray-200 text-sm font-black tracking-[-3px] text-gray-500 active:cursor-grabbing dark:border-gray-700 dark:text-gray-300">
                    ::
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{item.title || 'Presentasi tanpa judul'}</p>
                        {item.isDraft && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">Baru</span>}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{item.isDraft ? 'Belum dibuat' : `${item.slides_count || 0} slide - ${item.status === 'published' ? 'Terbit' : 'Draft'}`}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {!item.isDraft && <button type="button" onClick={() => onOpen(item.id)} className="rounded-md px-2 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Edit</button>}
                    <button type="button" onClick={() => onMoveMenu(draggableId)} className={`rounded-md px-2 py-1.5 text-xs font-bold ${moving ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                        Pindahkan
                    </button>
                </div>
            </div>
        </div>
    );
}

function TimelineAnchor({ eyebrow, title, tone = 'day' }) {
    const toneClass = tone === 'exam'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
        : 'border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

    return (
        <div className={`rounded-lg border px-3 py-2.5 ${toneClass}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-65">{eyebrow}</p>
            <p className="mt-0.5 text-sm font-black">{title}</p>
        </div>
    );
}

function WeekPlacementEditor({ days, decks, draft = null, selectedDeckId = null, busy = false, onMoveDeck, onMoveDraft, onOpenDeck }) {
    const [activeItem, setActiveItem] = useState(null);
    const [moveMenuId, setMoveMenuId] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const slotKeys = ['opening', ...days.map((day) => `after_day:${day.id}`), 'closing'];
    const itemForId = (id) => id === 'draft'
        ? draft
        : decks.find((item) => `deck:${item.id}` === id) || null;
    const itemsInSlot = (slotKey) => {
        const stored = decks
            .filter((item) => deckSlotKey(item) === slotKey)
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id));

        if (!draft || draft.slotKey !== slotKey) return stored;
        const next = [...stored];
        next.splice(Math.min(Number(draft.sort_order || 0), next.length), 0, draft);
        return next;
    };
    const moveItem = (item, targetSlotKey, targetIndex = null) => {
        if (!item || busy) return;
        if (item.isDraft) onMoveDraft(targetSlotKey, targetIndex);
        else onMoveDeck(item.id, targetSlotKey, targetIndex);
        setMoveMenuId(null);
    };
    const renderSlot = (slotKey) => {
        const items = itemsInSlot(slotKey);
        const dragging = Boolean(activeItem);

        return (
            <div key={slotKey} className="ml-4 border-l-2 border-gray-200 pl-4 dark:border-gray-700 sm:ml-6 sm:pl-5">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">{slotLabel(slotKey, days)}</p>
                {items.map((item, index) => {
                    const itemId = item.isDraft ? 'draft' : `deck:${item.id}`;
                    return (
                        <React.Fragment key={itemId}>
                            <TimelineDropTarget slotKey={slotKey} index={index} visible={dragging} />
                            <TimelineDeckCard item={item} selected={!item.isDraft && Number(item.id) === Number(selectedDeckId)} moving={moveMenuId === itemId} onOpen={onOpenDeck} onMoveMenu={(id) => setMoveMenuId((current) => current === id ? null : id)} />
                            {moveMenuId === itemId && (
                                <div className="mt-2 grid gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-950 sm:grid-cols-2">
                                    {items.length > 1 && (
                                        <>
                                            <button type="button" disabled={index === 0} onClick={() => moveItem(item, slotKey, index - 1)} className="rounded-md bg-white px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                                                Naikkan urutan
                                            </button>
                                            <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(item, slotKey, index + 1)} className="rounded-md bg-white px-3 py-2 text-left text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                                                Turunkan urutan
                                            </button>
                                        </>
                                    )}
                                    {slotKeys.map((targetSlotKey) => (
                                        <button key={targetSlotKey} type="button" onClick={() => moveItem(item, targetSlotKey)} className={`rounded-md px-3 py-2 text-left text-xs font-bold transition ${targetSlotKey === slotKey ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                                            {slotLabel(targetSlotKey, days)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                <TimelineDropTarget slotKey={slotKey} index={items.length} visible={dragging} />
            </div>
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveItem(itemForId(active.id))}
            onDragCancel={() => setActiveItem(null)}
            onDragEnd={({ active, over }) => {
                const item = itemForId(active.id);
                setActiveItem(null);
                if (!item || !over?.data?.current) return;
                moveItem(item, over.data.current.slotKey, over.data.current.index);
            }}
        >
            <div className="space-y-3">
                <TimelineAnchor eyebrow="Mulai" title="Pembuka Week" />
                {renderSlot('opening')}
                {days.map((day) => (
                    <React.Fragment key={day.id}>
                        <TimelineAnchor eyebrow={`Hari ${day.day_number}`} title={day.title || `Materi Hari ${day.day_number}`} />
                        {renderSlot(`after_day:${day.id}`)}
                    </React.Fragment>
                ))}
                {renderSlot('closing')}
                <TimelineAnchor eyebrow="Selesai" title="Akhir Week" />
            </div>
            <DragOverlay>
                {activeItem && (
                    <div className="w-72 rounded-lg border border-orange-400 bg-white p-3 shadow-xl dark:bg-gray-900">
                        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{activeItem.title}</p>
                        <p className="mt-1 text-xs font-medium text-gray-500">Pindahkan ke celah yang dipilih</p>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}

export default function BuilderPresentasi({
    deck = null,
    decks = [],
    days = [],
    module = null,
    createMode = false,
    activePlacement = 'opening',
    audienceScope = 'shared',
    canEdit = true,
    canCreate = true,
    returnUrl = null,
    returnContext = null,
}) {
    const moduleContext = module || deck?.module || {};
    const programId = moduleContext.program?.id || deck?.module?.program_pembelajaran_id;
    const builderReturnUrl = returnUrl || (programId
        ? route('admin.modules.index', {
            program_id: programId,
            week_id: moduleContext.id || deck.module.id,
            focus: 'presentation',
        })
        : route('admin.programs.index'));
    const isMentorDeck = audienceScope === 'mentor_session' || deck?.audience_scope === 'mentor_session';
    const [slides, setSlides] = useState(mapDeckSlides(deck?.slides || []));
    const [activeIndex, setActiveIndex] = useState(0);
    const [status, setStatus] = useState(deck?.status || 'draft');
    const [deckPlacement, setDeckPlacement] = useState(deck?.week_slot || 'opening');
    const [deckDayId, setDeckDayId] = useState(deck?.module_day_id || '');
    const [deckSortOrder, setDeckSortOrder] = useState(deck?.sort_order || 0);
    const [newDeckTitle, setNewDeckTitle] = useState('');
    const initialDraftSlot = activePlacement === 'after_day' && days[0]
        ? `after_day:${days[0].id}`
        : (activePlacement === 'closing' ? 'closing' : 'opening');
    const [draftSlotKey, setDraftSlotKey] = useState(initialDraftSlot);
    const [draftSortOrder, setDraftSortOrder] = useState(0);
    const [timelineDecks, setTimelineDecks] = useState(decks);
    const [isPositionSaving, setIsPositionSaving] = useState(false);
    const [showPlacementEditor, setShowPlacementEditor] = useState(false);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const [showDeckSettings, setShowDeckSettings] = useState(false);
    const [showDeckActions, setShowDeckActions] = useState(false);
    const [pptxFile, setPptxFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [embedUrl, setEmbedUrl] = useState('');
    const [embedTitle, setEmbedTitle] = useState('');
    const [mediaMode, setMediaMode] = useState('link');
    const [mediaFile, setMediaFile] = useState(null);
    const [isMediaUploading, setIsMediaUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showTemplatePanel, setShowTemplatePanel] = useState(true);
    const [showEditPanel, setShowEditPanel] = useState(true);
    const pendingImportStartIndexRef = useRef(null);
    const cleanSnapshotRef = useRef(builderSnapshot(
        mapDeckSlides(deck?.slides || []),
        deck?.status || 'draft',
        {
            week_slot: deck?.week_slot || 'opening',
            module_day_id: deck?.module_day_id || '',
            sort_order: Number(deck?.sort_order || 0),
        },
    ));
    const activeSlide = slides[activeIndex] || null;
    const currentPlacement = {
        week_slot: deckPlacement,
        module_day_id: deckPlacement === 'after_day' ? deckDayId : '',
        sort_order: Number(deckSortOrder || 0),
    };
    const hasUnsavedChanges = Boolean(deck)
        && builderSnapshot(slides, status, currentPlacement) !== cleanSnapshotRef.current;
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    useEffect(() => {
        const mappedSlides = mapDeckSlides(deck?.slides || []);
        const nextStatus = deck?.status || 'draft';
        const nextPlacement = deck?.week_slot || 'opening';
        const nextDayId = deck?.module_day_id || '';
        const nextSortOrder = Number(deck?.sort_order || 0);

        setSlides(mappedSlides);
        setStatus(nextStatus);
        setDeckPlacement(nextPlacement);
        setDeckDayId(nextDayId);
        setDeckSortOrder(nextSortOrder);
        cleanSnapshotRef.current = builderSnapshot(mappedSlides, nextStatus, {
            week_slot: nextPlacement,
            module_day_id: nextPlacement === 'after_day' ? nextDayId : '',
            sort_order: nextSortOrder,
        });

        if (pendingImportStartIndexRef.current !== null) {
            const targetIndex = Math.min(pendingImportStartIndexRef.current, Math.max(0, mappedSlides.length - 1));
            setActiveIndex(targetIndex);
            pendingImportStartIndexRef.current = null;
            return;
        }

        setActiveIndex((current) => Math.min(current, Math.max(0, mappedSlides.length - 1)));
    }, [deck?.id, deck?.slides, deck?.status]);

    useEffect(() => {
        setNewDeckTitle(`Presentasi - ${moduleContext.title || `Minggu ${moduleContext.week_number || ''}`}`.trim());
    }, [moduleContext.id, moduleContext.title, moduleContext.week_number]);

    useEffect(() => {
        setTimelineDecks(decks);
    }, [decks]);

    useEffect(() => {
        const warnBeforeLeave = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warnBeforeLeave);

        return () => window.removeEventListener('beforeunload', warnBeforeLeave);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (!showPlacementEditor) return undefined;

        const closePlacementEditor = (event) => {
            if (event.key !== 'Escape') return;

            event.preventDefault();
            setShowPlacementEditor(false);
        };

        window.addEventListener('keydown', closePlacementEditor);

        return () => window.removeEventListener('keydown', closePlacementEditor);
    }, [showPlacementEditor]);

    const visitDeck = (deckId) => {
        if (hasUnsavedChanges && !window.confirm('Perubahan pada presentasi ini belum disimpan. Buang perubahan dan lanjutkan?')) {
            return;
        }

        router.get(route('admin.modules.presentations.builder', moduleContext.id), {
            deck_id: deckId,
            audience_scope: audienceScope,
            return_context: returnContext?.type,
            kloter_id: returnContext?.kloter_id,
        }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const openCreateDeck = (nextPlacement = 'opening') => {
        if (hasUnsavedChanges && !window.confirm('Perubahan pada presentasi ini belum disimpan. Buang perubahan dan lanjutkan?')) {
            return;
        }

        router.get(route('admin.modules.presentations.builder', moduleContext.id), {
            create: 1,
            placement: nextPlacement,
            audience_scope: audienceScope,
            return_context: returnContext?.type,
            kloter_id: returnContext?.kloter_id,
        }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const moveDraft = (targetSlotKey, targetIndex = null) => {
        const count = timelineDecks.filter((item) => deckSlotKey(item) === targetSlotKey).length;
        setDraftSlotKey(targetSlotKey);
        setDraftSortOrder(Math.max(0, Math.min(targetIndex ?? count, count)));
    };

    const moveDeck = async (deckId, targetSlotKey, targetIndex = null) => {
        if (isPositionSaving) return;

        const previous = timelineDecks;
        const movingDeck = previous.find((item) => Number(item.id) === Number(deckId));
        if (!movingDeck) return;

        const target = parseSlotKey(targetSlotKey);
        const patchedDeck = {
            ...movingDeck,
            ...target,
            day: target.module_day_id
                ? days.find((item) => Number(item.id) === Number(target.module_day_id)) || null
                : null,
        };
        const remaining = previous.filter((item) => Number(item.id) !== Number(deckId));
        const targetItems = remaining
            .filter((item) => deckSlotKey(item) === targetSlotKey)
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id));
        const storedTargetIndex = !deck
            && draftSlotKey === targetSlotKey
            && targetIndex !== null
            && Number(draftSortOrder) < Number(targetIndex)
            ? Number(targetIndex) - 1
            : targetIndex;
        targetItems.splice(Math.max(0, Math.min(storedTargetIndex ?? targetItems.length, targetItems.length)), 0, patchedDeck);

        const targetIds = new Set(targetItems.map((item) => Number(item.id)));
        const merged = [
            ...remaining.filter((item) => !targetIds.has(Number(item.id))),
            ...targetItems,
        ];
        const slotKeys = ['opening', ...days.map((day) => `after_day:${day.id}`), 'closing'];
        const normalized = slotKeys.flatMap((slot) => merged
            .filter((item) => deckSlotKey(item) === slot)
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id))
            .map((item, index) => ({ ...item, sort_order: index })));

        setTimelineDecks(normalized);
        setIsPositionSaving(true);

        try {
            await window.axios.patch(route('admin.modules.presentations.reorder', moduleContext.id), {
                positions: normalized.map((item) => ({
                    deck_id: item.id,
                    week_slot: item.week_slot,
                    module_day_id: item.week_slot === 'after_day' ? item.module_day_id : null,
                    sort_order: item.sort_order,
                })),
            });

            if (Number(deck?.id) === Number(deckId)) {
                const savedActiveDeck = normalized.find((item) => Number(item.id) === Number(deckId));
                const savedSortOrder = Number(savedActiveDeck?.sort_order || 0);
                setDeckPlacement(target.week_slot);
                setDeckDayId(target.module_day_id || '');
                setDeckSortOrder(savedSortOrder);
                cleanSnapshotRef.current = builderSnapshot(slides, status, {
                    week_slot: target.week_slot,
                    module_day_id: target.week_slot === 'after_day' ? target.module_day_id : '',
                    sort_order: savedSortOrder,
                });
            }
        } catch (error) {
            setTimelineDecks(previous);
            window.alert(error.response?.data?.message || 'Posisi presentasi belum tersimpan. Coba pindahkan kembali.');
        } finally {
            setIsPositionSaving(false);
        }
    };

    const leaveWorkspace = () => {
        if (hasUnsavedChanges && !window.confirm('Perubahan pada presentasi ini belum disimpan. Tetap keluar?')) {
            return;
        }

        router.visit(builderReturnUrl);
    };

    const createDeck = () => {
        const title = newDeckTitle.trim();
        if (!title || !moduleContext.id) return;

        const target = parseSlotKey(draftSlotKey);

        router.post(route('admin.presentations.store'), {
            title,
            description: '',
            level_id: moduleContext.level_id || null,
            module_id: moduleContext.id,
            module_day_id: target.module_day_id,
            week_slot: target.week_slot,
            sort_order: Number(draftSortOrder || 0),
            status: 'draft',
            audience_scope: audienceScope,
            return_context: returnContext?.type,
            kloter_belajar_id: returnContext?.kloter_id,
        });
    };

    const deleteDeck = () => {
        if (!deck) return;

        const slotLabel = deck.week_slot === 'closing'
            ? 'Akhir Minggu'
            : deck.week_slot === 'after_day'
                ? `Setelah Day ${deck.day?.day_number || '-'}`
                : 'Awal Minggu';

        openConfirm({
            variant: 'danger',
            title: 'Hapus Presentasi?',
            message: 'Deck, seluruh slide, serta file import yang dikelola aplikasi akan dihapus permanen. Presentasi pada tab lain tidak berubah.',
            confirmLabel: 'Hapus Presentasi',
            details: [
                { label: 'Judul', value: deck.title },
                { label: 'Posisi', value: slotLabel },
                { label: 'Jumlah slide', value: `${slides.length} slide` },
            ],
            onConfirm: () => router.delete(route('admin.presentations.destroy', {
                presentationDeck: deck.id,
                workspace: 1,
            }), {
                preserveScroll: true,
                onFinish: closeConfirm,
            }),
        });
    };

    const updateSlide = (field, value) => {
        setSlides((current) => current.map((slide, index) => (
            index === activeIndex ? { ...slide, [field]: value } : slide
        )));
    };

    const changeSlideLayout = (layout) => {
        setSlides((current) => current.map((slide, index) => (
            index === activeIndex
                ? {
                    ...slide,
                    layout,
                    canvas_json: templateCanvas(layout, slide.title || 'Slide Presentasi', slide.content || ''),
                    snapshot_data: null,
                }
                : slide
        )));
    };

    const addSlide = (template = emptySlide) => {
        const next = { ...emptySlide, ...template, id: null, _clientKey: createSlideKey() };
        setSlides((current) => [...current, next]);
        setActiveIndex(slides.length);
    };

    const duplicateSlide = () => {
        if (!activeSlide) return;
        addSlide({ ...activeSlide, title: `${activeSlide.title || 'Slide'} Copy` });
    };

    const removeSlide = () => {
        if (!activeSlide) return;

        openConfirm({
            variant: 'danger',
            title: 'Hapus Slide Aktif?',
            message: 'Slide ini akan dihapus dari draft builder. Simpan deck setelahnya agar perubahan tersimpan.',
            confirmLabel: 'Iya, Hapus',
            details: [
                { label: 'Slide', value: `${activeIndex + 1}. ${activeSlide.title || 'Untitled'}` },
                { label: 'Layout', value: activeSlide.layout || '-' },
            ],
            onConfirm: () => {
                const next = slides.filter((_, index) => index !== activeIndex);
                setSlides(next);
                setActiveIndex(Math.max(0, activeIndex - 1));
                closeConfirm();
            },
        });
    };

    const removeAllSlides = () => {
        if (!slides.length) return;

        openConfirm({
            variant: 'danger',
            title: 'Hapus Semua Slide?',
            message: 'Semua slide akan dihapus dan langsung tersimpan. Setelah reload, slide tidak akan muncul lagi.',
            confirmLabel: 'Iya, Hapus Semua',
            details: [
                { label: 'Deck', value: deck.title },
                { label: 'Total slide', value: `${slides.length} slide` },
            ],
            onConfirm: () => {
                router.post(route('admin.presentations.builder.update', deck.id), {
                    status,
                    ...currentPlacement,
                    slides: [],
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSlides([]);
                        setActiveIndex(0);
                    },
                    onFinish: closeConfirm,
                });
            },
        });
    };

    const moveSlide = (direction) => {
        const nextIndex = activeIndex + direction;
        if (nextIndex < 0 || nextIndex >= slides.length) return;

        const next = [...slides];
        [next[activeIndex], next[nextIndex]] = [next[nextIndex], next[activeIndex]];
        setSlides(next);
        setActiveIndex(nextIndex);
    };

    const saveSlides = () => {
        router.post(route('admin.presentations.builder.update', deck.id), {
            status,
            ...currentPlacement,
            slides: slides.map((slide) => ({
                id: slide.id,
                title: slide.title || '',
                layout: slide.layout || 'content',
                content: slide.content || '',
                media_url: slide.media_url || '',
                background: slide.background || 'light',
                accent_color: slide.accent_color || '#22C55E',
                speaker_notes: slide.speaker_notes || '',
                board_data: slide.board_data || { strokes: [] },
                snapshot_data: slide.snapshot_data || null,
                jamboard_data: slide.jamboard_data || slide.board_data || { strokes: [] },
                jamboard_snapshot: slide.jamboard_snapshot || slide.snapshot_data || null,
                snapshot_url: slide.snapshot_url || null,
                canvas_json: slide.canvas_json || null,
                source_type: slide.source_type || 'manual',
                source_meta: slide.source_meta || null,
            })),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                cleanSnapshotRef.current = builderSnapshot(slides, status, currentPlacement);
            },
        });
    };

    const blockImportForUnsavedChanges = () => {
        if (!hasUnsavedChanges) return false;

        window.alert('Simpan perubahan slide terlebih dahulu sebelum mengimpor file.');

        return true;
    };

    const importPptx = (event) => {
        event.preventDefault();
        if (blockImportForUnsavedChanges()) return;
        if (!pptxFile) return;

        pendingImportStartIndexRef.current = slides.length;
        setIsImporting(true);
        router.post(route('admin.presentations.import.pptx', deck.id), {
            pptx_file: pptxFile,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowImportMenu(false);
                setPptxFile(null);
            },
            onFinish: () => setIsImporting(false),
        });
    };

    const importPdf = (event) => {
        event.preventDefault();
        if (blockImportForUnsavedChanges()) return;
        if (!pdfFile) return;

        pendingImportStartIndexRef.current = slides.length;
        setIsImporting(true);
        router.post(route('admin.presentations.import.pdf', deck.id), {
            pdf_file: pdfFile,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setPdfFile(null);
            },
            onFinish: () => setIsImporting(false),
        });
    };

    const importImages = (event) => {
        event.preventDefault();
        if (blockImportForUnsavedChanges()) return;
        if (!imageFiles.length) return;

        pendingImportStartIndexRef.current = slides.length;
        setIsImporting(true);
        router.post(route('admin.presentations.import.images', deck.id), {
            image_files: imageFiles,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowImportMenu(false);
                setImageFiles([]);
            },
            onFinish: () => setIsImporting(false),
        });
    };

    const importEmbedLink = (event) => {
        event.preventDefault();
        const url = embedUrl.trim();
        if (!url) return;

        const nextSlide = {
            ...emptySlide,
            id: null,
            title: embedTitle.trim() || 'Slide Embed',
            layout: 'media',
            content: 'Konten dari link eksternal. Pastikan link sudah public/embed agar bisa dilihat user.',
            media_url: url,
            background: 'dark',
            source_type: 'embed',
            source_meta: { provider: 'external_link' },
            _clientKey: createSlideKey(),
        };

        setSlides((current) => [...current, nextSlide]);
        setActiveIndex(slides.length);
        setEmbedUrl('');
        setEmbedTitle('');
        setShowImportMenu(false);
    };

    const uploadBackgroundImage = async (file) => {
        const formData = new FormData();
        formData.append('background_image', file);

        const response = await fetch(route('admin.presentations.background.upload', deck.id), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': csrfToken(),
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Background gagal diupload.');
        }

        const payload = await response.json();
        return payload.url;
    };

    const uploadMedia = async () => {
        if (!mediaFile || !deck) return;

        const formData = new FormData();
        formData.append('media', mediaFile);
        setIsMediaUploading(true);

        try {
            const response = await fetch(route('admin.presentations.media.upload', deck.id), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                body: formData,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.message || 'Video gagal diupload.');
            }

            const payload = await response.json();
            updateSlide('media_url', payload.url);
            updateSlide('source_type', 'video');
            setMediaFile(null);
        } catch (error) {
            window.alert(error.message || 'Video gagal diupload.');
        } finally {
            setIsMediaUploading(false);
        }
    };

    const openPresenter = () => {
        if (hasUnsavedChanges && !window.confirm('Perubahan belum disimpan dan tidak akan tampil di mode Present. Tetap buka?')) {
            return;
        }

        router.visit(route('admin.presentations.presenter', deck.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Presentasi Minggu ${moduleContext.week_number || '-'} - ${moduleContext.title || 'Builder'}`} />

            <div className="min-h-screen bg-surface-muted">
                {deck && isImporting && (
                <div className="fixed inset-0 z-[110] grid place-items-center bg-gray-950/45 px-4 backdrop-blur-sm">
                        <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-white p-5 text-center shadow-2xl dark:bg-gray-900">
                            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />
                            <h2 className="text-base font-black text-gray-900 dark:text-white">Mengolah file import</h2>
                            <p className="mt-2 text-xs font-bold leading-5 text-gray-500 dark:text-gray-400">
                                Slide sedang dibuat di builder. Setelah selesai, konten baru akan langsung dipilih untuk dicek dan diedit.
                            </p>
                        </div>
                    </div>
                )}

                {deck && showPlacementEditor && (
                    <div className="fixed inset-0 z-[105] flex justify-end bg-gray-950/45" role="dialog" aria-modal="true" aria-label="Atur posisi presentasi">
                        <div className="flex h-full w-full max-w-xl flex-col bg-gray-50 shadow-2xl dark:bg-gray-950">
                            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                                <div>
                                    <p className="text-xs font-black uppercase text-orange-600">Alur Week {moduleContext.week_number || '-'}</p>
                                    <h2 className="mt-0.5 text-base font-black text-gray-950 dark:text-white">Atur posisi presentasi</h2>
                                </div>
                                <button type="button" onClick={() => setShowPlacementEditor(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Selesai</button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                                <p className="mb-4 text-sm font-medium text-gray-600 dark:text-gray-400">Geser presentasi ke celah yang sesuai. Perubahan posisi langsung disimpan tanpa mengubah isi slide.</p>
                                <WeekPlacementEditor
                                    days={days}
                                    decks={timelineDecks}
                                    selectedDeckId={deck.id}
                                    busy={isPositionSaving}
                                    onMoveDeck={moveDeck}
                                    onMoveDraft={moveDraft}
                                    onOpenDeck={(deckId) => {
                                        setShowPlacementEditor(false);
                                        visitDeck(deckId);
                                    }}
                                />
                            </div>
                            <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                                <button
                                    type="button"
                                    onClick={leaveWorkspace}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 text-xs font-black text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-900/60 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
                                >
                                    <LogoutIcon sx={{ fontSize: 17 }} />
                                    Keluar Builder
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <header className="sticky top-16 z-30 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 lg:top-0 lg:px-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <button type="button" onClick={leaveWorkspace} title={returnUrl ? 'Kembali ke setup ruang' : 'Kembali ke Roadmap'} aria-label={returnUrl ? 'Kembali ke setup ruang' : 'Kembali ke Roadmap'} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-orange-950/30">
                                <ArrowBackIcon sx={{ fontSize: 19 }} />
                            </button>
                            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-600 text-white sm:grid">
                                <SlideshowIcon sx={{ fontSize: 20 }} />
                            </span>
                            <div className="min-w-0">
                                <h1 className="truncate text-base font-black text-gray-900 dark:text-white sm:text-lg">
                                    {isMentorDeck ? 'PPT Sesi Mentor' : 'Materi Presentasi'} <span className="text-gray-400">/</span> Week {moduleContext.week_number || '-'}
                                </h1>
                                <p className="truncate text-[11px] font-bold text-gray-400">
                                    {isMentorDeck ? 'Hanya digunakan di Ruang Kelas Live' : 'Tampil pada materi kelas setelah diterbitkan'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
                            {deck && canEdit && (
                                <>
                            {!isMentorDeck && <div className="relative">
                                <button type="button" onClick={() => { setShowDeckSettings((value) => !value); setShowDeckActions(false); setShowImportMenu(false); }} title="Pengaturan presentasi" className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-xs font-black transition sm:px-3 ${showDeckSettings ? 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                                    <TuneIcon sx={{ fontSize: 17 }} /><span className="hidden sm:inline">Pengaturan</span>
                                </button>
                                {showDeckSettings && (
                                    <div className="absolute right-0 top-10 z-50 w-72 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Pengaturan presentasi</p>
                                        <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-950">
                                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Posisi di Week</p>
                                            <p className="mt-0.5 text-xs font-black text-gray-900 dark:text-white">{slotLabel(deckSlotKey({ week_slot: deckPlacement, module_day_id: deckDayId }), days)}</p>
                                        </div>
                                        <button type="button" onClick={() => { setShowDeckSettings(false); setShowPlacementEditor(true); }} className="h-10 w-full rounded-lg border border-orange-200 text-xs font-black text-orange-700 transition hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/30">
                                            Atur posisi di alur Week
                                        </button>
                                        <label className="block">
                                            <span className="mb-1.5 block text-xs font-bold text-gray-500">Status</span>
                                            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold dark:border-gray-700 dark:bg-gray-950 dark:text-white"><option value="draft">Draft</option><option value="published">Published</option></select>
                                        </label>
                                    </div>
                                )}
                            </div>}
                            <div className="relative">
                                <button type="button" onClick={() => { setShowImportMenu((value) => !value); setShowDeckSettings(false); setShowDeckActions(false); }} title="Import presentasi" className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-orange-200 px-2.5 text-xs font-black text-orange-700 dark:border-orange-900/50 dark:text-orange-300 sm:px-3">
                                    <FileUploadOutlinedIcon sx={{ fontSize: 17 }} /><span className="hidden sm:inline">{isImporting ? 'Import...' : 'Import'}</span>
                                </button>
                                {showImportMenu && (
                                    <div className="absolute right-0 top-10 z-50 w-[300px] space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                                        <form onSubmit={importPptx} className="space-y-2">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">PPTX Draft</p>
                                                <p className="text-xs font-bold text-gray-500">Maks 25 MB. Tidak convert ke PDF otomatis; dipakai untuk draft editable dan wajib review layout.</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                                onChange={(event) => setPptxFile(event.target.files?.[0] || null)}
                                                className="w-full text-xs font-bold text-gray-600 file:mr-2 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-orange-700 dark:text-gray-300 dark:file:bg-orange-900/20 dark:file:text-orange-300"
                                            />
                                            <button disabled={!pptxFile || isImporting} className="h-9 w-full rounded-xl bg-orange-600 px-4 text-xs font-black text-white disabled:opacity-50">Import Draft Editable</button>
                                        </form>
                                        <form onSubmit={importPdf} className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">PDF Final</p>
                                            <p className="text-xs font-bold text-gray-500">Maks 50 MB. Disimpan private dan ditampilkan melalui viewer presentasi.</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                                                className="w-full text-xs font-bold text-gray-600 file:mr-2 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-emerald-700 dark:text-gray-300 dark:file:bg-emerald-900/20 dark:file:text-emerald-300"
                                            />
                                            <button disabled={!pdfFile || isImporting} className="h-9 w-full rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-50">Import PDF Final</button>
                                        </form>
                                        <form onSubmit={importImages} className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Gambar</p>
                                                <p className="text-xs font-bold text-gray-500">Maks 5 MB/gambar. Bisa pilih banyak file.</p>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
                                                className="w-full text-xs font-bold text-gray-600 file:mr-2 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-blue-700 dark:text-gray-300"
                                            />
                                            <button disabled={!imageFiles.length || isImporting} className="h-9 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:opacity-50">Import Gambar</button>
                                        </form>
                                        <form onSubmit={importEmbedLink} className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Link Canva / Google Drive / PPT Online</p>
                                                <p className="text-xs font-bold text-gray-500">Tidak masuk storage. Gunakan link public/embed agar tampil ke user.</p>
                                            </div>
                                            <input
                                                value={embedTitle}
                                                onChange={(event) => setEmbedTitle(event.target.value)}
                                                placeholder="Judul slide opsional"
                                                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            />
                                            <input
                                                value={embedUrl}
                                                onChange={(event) => setEmbedUrl(event.target.value)}
                                                placeholder="https://drive.google.com/drive/folders/... atau https://www.canva.com/design/..."
                                                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            />
                                            <button disabled={!embedUrl.trim()} className="h-9 w-full rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50">Tambah Link ke Slide</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                            <button type="button" onClick={openPresenter} title="Pratinjau presentasi" className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 sm:px-3"><PlayArrowIcon sx={{ fontSize: 18 }} /><span className="hidden sm:inline">Present</span></button>
                            <div className="relative">
                                <button type="button" onClick={() => { setShowDeckActions((value) => !value); setShowDeckSettings(false); setShowImportMenu(false); }} title="Aksi lainnya" aria-label="Aksi lainnya" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"><MoreVertIcon sx={{ fontSize: 19 }} /></button>
                                {showDeckActions && (
                                    <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                                        <button type="button" onClick={() => { setShowDeckActions(false); deleteDeck(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/20"><DeleteOutlineIcon sx={{ fontSize: 17 }} /> Hapus presentasi</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={saveSlides} className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-3 text-xs font-black text-white shadow-sm shadow-brand-500/20"><SaveOutlinedIcon sx={{ fontSize: 17 }} /><span className="hidden sm:inline">Simpan</span></button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black ${isMentorDeck ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'}`}>
                            {isMentorDeck ? 'PPT SESI MENTOR' : 'MATERI KELAS'}
                        </span>
                        {(decks || []).map((summary) => {
                            const selected = deck?.id === summary.id;
                            const placementLabel = summary.week_slot === 'closing'
                                ? 'Akhir minggu'
                                : summary.week_slot === 'after_day'
                                    ? `Setelah Day ${summary.day?.day_number || '-'}`
                                    : 'Awal minggu';

                            return (
                                <button
                                    key={summary.id}
                                    type="button"
                                    onClick={() => visitDeck(summary.id)}
                                    className={`flex min-w-48 max-w-64 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                                        selected
                                            ? 'border-orange-400 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                                    }`}
                                >
                                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-orange-600 text-white' : 'bg-white text-gray-400 dark:bg-gray-800'}`}><SlideshowIcon sx={{ fontSize: 16 }} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-black">{summary.title}</span>
                                        <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-70">{placementLabel} - {selected ? slides.length : summary.slides_count || 0} slide</span>
                                    </span>
                                    <span title={selected && hasUnsavedChanges ? 'Belum disimpan' : summary.status} className={`h-2 w-2 shrink-0 rounded-full ${selected && hasUnsavedChanges ? 'bg-amber-500' : summary.status === 'published' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                </button>
                            );
                        })}
                        {canCreate && <button
                            type="button"
                            onClick={() => openCreateDeck('opening')}
                            title="Tambah presentasi"
                            aria-label="Tambah presentasi"
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/20"
                        >
                            <AddIcon sx={{ fontSize: 19 }} />
                        </button>}
                    </div>
                </header>

                {!deck ? (
                    <main className={`mx-auto grid max-w-6xl gap-8 px-4 py-7 lg:px-6 ${isMentorDeck ? 'max-w-xl' : 'lg:grid-cols-[320px_minmax(0,1fr)]'}`}>
                        <section className="lg:sticky lg:top-28 lg:self-start">
                            <p className="text-xs font-black text-orange-600">{isMentorDeck ? 'PPT Sesi Mentor' : 'Presentasi baru'}</p>
                            <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">{isMentorDeck ? 'Buat presentasi untuk sesi ini' : 'Buat dan letakkan di Week'}</h2>
                            <p className="mt-2 text-sm font-medium leading-6 text-gray-600 dark:text-gray-400">{isMentorDeck ? 'PPT ini menjadi milik Anda dan tidak tampil di materi kelas mandiri.' : 'Isi judul, lalu geser kartu presentasi baru ke celah yang diinginkan.'}</p>

                            <label className="mt-5 block">
                                <span className="mb-1.5 block text-xs font-bold text-gray-600 dark:text-gray-300">Judul presentasi</span>
                                <input
                                    value={newDeckTitle}
                                    onChange={(event) => setNewDeckTitle(event.target.value)}
                                    autoFocus
                                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                            </label>
                            {!isMentorDeck && <div className="mt-4 rounded-lg bg-gray-100 px-3 py-2.5 dark:bg-gray-900">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Posisi terpilih</p>
                                <p className="mt-0.5 text-xs font-black text-gray-900 dark:text-white">{slotLabel(draftSlotKey, days)}</p>
                            </div>}
                            <button
                                type="button"
                                onClick={createDeck}
                                disabled={!newDeckTitle.trim()}
                                className="mt-4 h-11 w-full rounded-lg bg-orange-600 px-5 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isMentorDeck ? 'Buat dan buka editor' : 'Buat Presentasi'}
                            </button>
                        </section>

                        {!isMentorDeck && <section aria-label="Alur presentasi dalam Week" className="min-w-0">
                            <div className="mb-4 flex items-end justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-800">
                                <div>
                                    <p className="text-xs font-black uppercase text-gray-400">Alur Week {moduleContext.week_number || '-'}</p>
                                    <h3 className="mt-1 text-lg font-black text-gray-950 dark:text-white">{moduleContext.title}</h3>
                                </div>
                                <p className="hidden text-xs font-medium text-gray-500 sm:block">Geser lewat handle ::</p>
                            </div>
                            <WeekPlacementEditor
                                days={days}
                                decks={timelineDecks}
                                draft={{ isDraft: true, title: newDeckTitle || 'Presentasi baru', slotKey: draftSlotKey, sort_order: draftSortOrder }}
                                busy={isPositionSaving}
                                onMoveDeck={moveDeck}
                                onMoveDraft={moveDraft}
                                onOpenDeck={visitDeck}
                            />
                        </section>}
                    </main>
                ) : (
                    <>
                {(['pdf', 'pptx'].includes(deck.source_type) || deck.import_summary?.note) && (
                    <div className="border-b border-gray-200 bg-white/80 px-3 py-1.5 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 lg:px-4">
                        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${
                            deck.source_type === 'pdf'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                                : deck.source_type === 'pptx'
                                    ? 'border-orange-100 bg-orange-50 text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200'
                                    : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200'
                        }`}>
                            <span>{deck.source_type === 'pdf' ? 'PDF final' : deck.source_type === 'pptx' ? 'PPTX editable' : 'Import'}</span>
                            {deck.import_summary?.note && <span className="truncate opacity-70">{deck.import_summary.note}</span>}
                        </div>
                    </div>
                )}

                <main className="grid min-w-0 grid-cols-1 gap-3 overflow-x-hidden p-3 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:p-4">
                    <aside className="min-w-0 space-y-3 lg:sticky lg:top-[68px] lg:self-start">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Slides</h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={removeAllSlides} disabled={!slides.length} className="rounded-lg border border-red-100 px-2 py-1.5 text-[11px] font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/40 dark:hover:bg-red-950/30">Hapus</button>
                                    <button onClick={() => addSlide()} className="rounded-lg bg-orange-50 px-2 py-1.5 text-[11px] font-black text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">Tambah</button>
                                </div>
                            </div>
                            <div className="max-h-[76vh] space-y-2 overflow-y-auto pr-1">
                                {slides.map((slide, index) => (
                                    <button key={slide._clientKey} onClick={() => setActiveIndex(index)} className={`w-full rounded-xl border p-1.5 text-left transition ${activeIndex === index ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-100 bg-gray-50 hover:border-gray-200 dark:border-gray-800 dark:bg-gray-950'}`}>
                                        <SlidePreview slide={slide} small />
                                        <p className="mt-1 truncate px-1 text-[11px] font-black text-gray-700 dark:text-gray-200">{index + 1}. {slide.title || 'Untitled'}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <section className="min-w-0 space-y-3">
                        {activeSlide ? (
                            <>
                                {activeSlide.layout !== 'pdf' ? (
                                    <FabricSlideCanvas
                                        key={`${activeSlide._clientKey}-${activeSlide.layout}`}
                                        value={activeSlide.canvas_json}
                                        onUploadBackground={uploadBackgroundImage}
                                        transparent={activeSlide.layout === 'media'}
                                        underlay={activeSlide.layout === 'media' ? (
                                            <div className="h-full w-full bg-gray-950">
                                                <EmbedFrame url={activeSlide.media_url} title={activeSlide.title || 'Media'} />
                                            </div>
                                        ) : null}
                                        onChange={({ canvas_json, snapshot_data }) => {
                                            setSlides((current) => current.map((slide, index) => (
                                                index === activeIndex ? { ...slide, canvas_json, snapshot_data } : slide
                                            )));
                                        }}
                                    />
                                ) : (
                                    <PdfCarousel url={activeSlide.media_url || deck.source_file_url} title={activeSlide.title || deck.title} />
                                )}
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                    <button onClick={() => moveSlide(-1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">Naik</button>
                                    <button onClick={() => moveSlide(1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">Turun</button>
                                    <button onClick={duplicateSlide} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">Duplicate</button>
                                    <button onClick={removeSlide} className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-[11px] font-black text-red-600 dark:border-red-900/40 dark:bg-gray-900">Hapus</button>
                                </div>
                            </>
                        ) : (
                            <div className="grid min-h-[320px] place-items-center rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                                <button onClick={() => addSlide()} className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-black text-white">Tambah Slide Pertama</button>
                            </div>
                        )}
                    </section>

                    <aside className="min-w-0 space-y-3 lg:sticky lg:top-[68px] lg:self-start">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                            <button type="button" onClick={() => setShowTemplatePanel((value) => !value)} className="flex w-full items-center justify-between text-left">
                                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Template</span>
                                <span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{showTemplatePanel ? 'Tutup' : 'Buka'}</span>
                            </button>
                            {showTemplatePanel && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {templates.map((template) => (
                                        <button
                                            key={template.label}
                                            type="button"
                                            onClick={() => addSlide(template)}
                                            className="rounded-xl border border-gray-100 bg-gray-50 p-2 text-left transition hover:border-orange-200 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-orange-900/20"
                                        >
                                            <SlidePreview slide={{ ...emptySlide, ...template }} small />
                                            <span className="mt-2 block truncate text-xs font-black text-gray-800 dark:text-gray-100">{template.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {activeSlide && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                <button type="button" onClick={() => setShowEditPanel((value) => !value)} className="flex w-full items-center justify-between text-left">
                                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Edit Slide</span>
                                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">{showEditPanel ? 'Tutup' : 'Buka'}</span>
                                </button>
                                {showEditPanel && (
                                <div className="mt-3 space-y-2">
                                    <input value={activeSlide.title || ''} onChange={(event) => updateSlide('title', event.target.value)} placeholder="Judul slide" className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    <select value={activeSlide.layout} onChange={(event) => changeSlideLayout(event.target.value)} className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                        <option value="title">Title</option>
                                        <option value="content">Materi</option>
                                        <option value="vocabulary">Kosakata</option>
                                        <option value="kanji">Kanji</option>
                                        <option value="media">Media</option>
                                        <option value="question">Pertanyaan</option>
                                        <option value="board">Jamboard</option>
                                        <option value="canvas">Canvas</option>
                                    </select>
                                    <textarea value={activeSlide.content || ''} onChange={(event) => updateSlide('content', event.target.value)} placeholder="Catatan atau deskripsi slide." className="min-h-20 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                    {activeSlide.layout === 'media' && (
                                        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                                            <div className="grid grid-cols-2 rounded-lg bg-gray-200 p-1 dark:bg-gray-800">
                                                <button type="button" onClick={() => setMediaMode('link')} className={`rounded-md px-2 py-1.5 text-[11px] font-black ${mediaMode === 'link' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Link media</button>
                                                <button type="button" onClick={() => setMediaMode('upload')} className={`rounded-md px-2 py-1.5 text-[11px] font-black ${mediaMode === 'upload' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Upload MP4</button>
                                            </div>
                                            {mediaMode === 'link' ? (
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">YouTube, Google Drive, gambar, atau URL MP4</label>
                                                    <input value={activeSlide.media_url || ''} onChange={(event) => updateSlide('media_url', event.target.value)} placeholder="Tempel link share media di sini" className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                                                    <p className="text-[10px] font-semibold leading-4 text-gray-400">Pastikan link Google Drive dapat dilihat siapa pun yang memiliki link.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <input type="file" accept="video/mp4,.mp4" onChange={(event) => setMediaFile(event.target.files?.[0] || null)} className="w-full text-xs font-semibold text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-orange-700" />
                                                    <button type="button" onClick={uploadMedia} disabled={!mediaFile || isMediaUploading} className="h-9 w-full rounded-xl bg-orange-600 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                                                        {isMediaUploading ? 'Mengupload...' : 'Upload video (maks. 50 MB)'}
                                                    </button>
                                                </div>
                                            )}
                                            {activeSlide.media_url && (
                                                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                                                    <EmbedFrame url={activeSlide.media_url} title={activeSlide.title || 'Preview media'} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={activeSlide.background} onChange={(event) => updateSlide('background', event.target.value)} className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white">
                                            {backgroundOptions.map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                        <input type="color" value={activeSlide.accent_color || '#22C55E'} onChange={(event) => updateSlide('accent_color', event.target.value)} className="h-9 w-full rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-950" />
                                    </div>
                                    <textarea value={activeSlide.speaker_notes || ''} onChange={(event) => updateSlide('speaker_notes', event.target.value)} placeholder="Catatan sensei, hanya tampil di presenter mode." className="min-h-20 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                </div>
                                )}
                            </div>
                        )}
                    </aside>
                </main>
                    </>
                )}
            </div>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}
