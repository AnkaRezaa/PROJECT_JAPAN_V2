import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Circle, FabricImage, Group, Line, PencilBrush, Polygon, Rect, Textbox, Triangle } from 'fabric';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';
import PanToolAltOutlinedIcon from '@mui/icons-material/PanToolAltOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const colors = ['#111827', '#F97316', '#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED', '#FFFFFF'];
const backgrounds = ['#FFFFFF', '#FFF7ED', '#F8FAFC', '#ECFEFF', '#F0FDF4', '#FEF2F2', '#111827'];
const shapeOptions = [
    ['rectangle', 'Kotak'],
    ['rounded', 'Kotak bulat'],
    ['circle', 'Lingkaran'],
    ['triangle', 'Segitiga'],
    ['trapezoid', 'Trapesium'],
    ['diamond', 'Diamond'],
    ['line', 'Garis'],
    ['arrow-right', 'Panah kanan'],
    ['arrow-left', 'Panah kiri'],
    ['arrow-up', 'Panah atas'],
    ['arrow-down', 'Panah bawah'],
    ['star', 'Bintang'],
];

function ToolButton({ label, active = false, disabled = false, onClick, children, danger = false }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-35 ${
                danger
                    ? 'border-red-100 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30'
                    : active
                        ? 'border-gray-950 bg-gray-950 text-white dark:border-white dark:bg-white dark:text-gray-950'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
        >
            {children}
        </button>
    );
}

function isFabricJson(data) {
    return data?.objects?.some((object) => Boolean(object.type));
}

function canvasSize(value) {
    const width = Number(value?.width);
    const height = Number(value?.height);

    if (width > 0 && height > 0) {
        return {
            width,
            height,
        };
    }

    return {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    };
}

function fitCanvasToFrame(canvas, frame, logicalSize) {
    if (!canvas || !frame) return;

    const width = Math.max(1, frame.clientWidth || logicalSize.width);
    const height = Math.max(1, Math.round(width * (logicalSize.height / logicalSize.width)));
    const scale = width / logicalSize.width;

    canvas.__tokuUpLogicalSize = logicalSize;
    canvas.setDimensions({ width, height });
    canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    if (canvas.wrapperEl) {
        canvas.wrapperEl.style.width = `${width}px`;
        canvas.wrapperEl.style.height = `${height}px`;
        canvas.wrapperEl.style.position = 'absolute';
        canvas.wrapperEl.style.inset = '0';
    }
    canvas.calcOffset();
    canvas.requestRenderAll();
}

function serializeCanvas(canvas) {
    const logicalSize = canvas.__tokuUpLogicalSize || {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    };

    return {
        ...canvas.toJSON(['kind', 'src', 'shapeType']),
        width: logicalSize.width,
        height: logicalSize.height,
        backgroundColor: canvas.backgroundColor || '#ffffff',
        backgroundImageUrl: canvas.backgroundImage?.get('src') || null,
    };
}

export default function FabricSlideCanvas({
    value,
    onChange,
    readonly = false,
    onUploadBackground,
    underlay = null,
    transparent = false,
}) {
    const canvasElementRef = useRef(null);
    const canvasFrameRef = useRef(null);
    const fabricRef = useRef(null);
    const isLoadingRef = useRef(false);
    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const contextTargetRef = useRef(null);
    const [mode, setMode] = useState('select');
    const [selectedType, setSelectedType] = useState('');
    const [drawColor, setDrawColor] = useState('#22C55E');
    const [drawSize, setDrawSize] = useState(5);
    const [textColor, setTextColor] = useState('#111827');
    const [fontSize, setFontSize] = useState(34);
    const [shapeFill, setShapeFill] = useState('#FFE4D6');
    const [shapeStroke, setShapeStroke] = useState('#22C55E');
    const [backgroundColor, setBackgroundColor] = useState(value?.backgroundColor || '#FFFFFF');
    const [isUploadingBackground, setIsUploadingBackground] = useState(false);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [showBackgroundTools, setShowBackgroundTools] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [historyVersion, setHistoryVersion] = useState(0);
    const size = canvasSize(value);
    const { confirmState, openConfirm, closeConfirm } = useConfirmAction();

    useEffect(() => {
        const canvas = new Canvas(canvasElementRef.current, {
            width: size.width,
            height: size.height,
            backgroundColor: transparent ? 'transparent' : backgroundColor,
            preserveObjectStacking: true,
            selection: !readonly,
        });

        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.width = Number(drawSize);
        canvas.freeDrawingBrush.color = drawColor;
        canvas.isDrawingMode = false;
        fabricRef.current = canvas;
        fitCanvasToFrame(canvas, canvasFrameRef.current, size);

        const emit = () => {
            if (isLoadingRef.current || readonly) return;
            const serialized = serializeCanvas(canvas);
            const signature = JSON.stringify(serialized);
            const currentSignature = historyRef.current[historyIndexRef.current];

            if (signature !== currentSignature) {
                historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
                historyRef.current.push(signature);
                historyIndexRef.current = historyRef.current.length - 1;
                setHistoryVersion((version) => version + 1);
            }

            onChange?.({
                canvas_json: serialized,
                snapshot_data: canvas.toDataURL({ format: 'png', multiplier: 1 }),
            });
        };

        canvas.on('object:modified', emit);
        canvas.on('object:removed', emit);
        canvas.on('path:created', emit);
        canvas.on('selection:created', updateSelectionState);
        canvas.on('selection:updated', updateSelectionState);
        canvas.on('selection:cleared', () => setSelectedType(''));
        canvas.on('mouse:down', ({ e }) => {
            if (e?.button !== 2) setContextMenu(null);
        });
        const contextCanvas = canvas.upperCanvasEl;
        const openContextMenu = (event) => {
            event.preventDefault();
            const target = canvas.findTarget(event);
            contextTargetRef.current = target || null;
            if (target) {
                canvas.setActiveObject(target);
                updateSelectionState();
                canvas.requestRenderAll();
            }

            const frame = canvasFrameRef.current?.getBoundingClientRect();
            setContextMenu({
                x: event.clientX - (frame?.left || 0),
                y: event.clientY - (frame?.top || 0),
                hasTarget: Boolean(target),
            });
        };
        contextCanvas?.addEventListener('contextmenu', openContextMenu);

        return () => {
            contextCanvas?.removeEventListener('contextmenu', openContextMenu);
            canvas.dispose();
            fabricRef.current = null;
        };
    }, []);

    useEffect(() => {
        const frame = canvasFrameRef.current;
        if (!frame) return undefined;

        const observer = new ResizeObserver(() => {
            fitCanvasToFrame(fabricRef.current, frame, size);
        });

        observer.observe(frame);
        fitCanvasToFrame(fabricRef.current, frame, size);

        return () => observer.disconnect();
    }, [size.width, size.height]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.isDrawingMode = mode === 'draw' && !readonly;
        canvas.selection = mode === 'select' && !readonly;
        canvas.getObjects().forEach((object) => {
            object.selectable = mode === 'select' && !readonly;
            object.evented = !readonly;
        });
        canvas.renderAll();
    }, [mode, readonly]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas?.freeDrawingBrush) return;

        canvas.freeDrawingBrush.color = drawColor;
        canvas.freeDrawingBrush.width = Number(drawSize);
    }, [drawColor, drawSize]);

    useEffect(() => {
        if (readonly) return undefined;

        const handleKeyDown = (event) => {
            const target = event.target;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) return;

            if ((event.key === 'Delete' || event.key === 'Backspace') && fabricRef.current?.getActiveObjects().length) {
                event.preventDefault();
                deleteSelected();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                event.shiftKey ? redo() : undo();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readonly, historyVersion]);

    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        isLoadingRef.current = true;
        const nextSize = canvasSize(value);
        fitCanvasToFrame(canvas, canvasFrameRef.current, nextSize);
        canvas.clear();
        canvas.backgroundColor = transparent ? 'transparent' : value?.backgroundColor || '#ffffff';
        canvas.backgroundImage = null;
        setBackgroundColor(transparent ? '#FFFFFF' : value?.backgroundColor || '#FFFFFF');

        const load = async () => {
            if (isFabricJson(value)) {
                await canvas.loadFromJSON(value);
                canvas.backgroundColor = transparent ? 'transparent' : value?.backgroundColor || canvas.backgroundColor || '#ffffff';
            } else {
                await loadCustomObjects(canvas, value?.objects || []);
            }

            if (value?.backgroundImageUrl) {
                await applyBackgroundImage(canvas, value.backgroundImageUrl);
            }

            canvas.getObjects().forEach((object) => {
                object.selectable = !readonly;
                object.evented = !readonly;
            });
            fitCanvasToFrame(canvas, canvasFrameRef.current, nextSize);
            canvas.renderAll();
            isLoadingRef.current = false;
            const signature = JSON.stringify(serializeCanvas(canvas));
            historyRef.current = [signature];
            historyIndexRef.current = 0;
            setHistoryVersion((version) => version + 1);
        };

        load();
    }, []);

    const updateSelectionState = () => {
        const object = fabricRef.current?.getActiveObject();
        if (!object) {
            setSelectedType('');
            return;
        }

        setSelectedType(object.type || object.kind || '');
        if (object.type === 'textbox') {
            setTextColor(object.fill || '#111827');
            setFontSize(object.fontSize || 34);
        }

        if (object.kind === 'shape' || ['rect', 'circle', 'triangle', 'polygon', 'line', 'group'].includes(object.type)) {
            setShapeFill(object.fill || '#FFE4D6');
            setShapeStroke(object.stroke || '#22C55E');
        }
    };

    const emitManualChange = () => {
        const canvas = fabricRef.current;
        if (!canvas || readonly) return;

        const serialized = serializeCanvas(canvas);
        const signature = JSON.stringify(serialized);
        if (signature !== historyRef.current[historyIndexRef.current]) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
            historyRef.current.push(signature);
            historyIndexRef.current = historyRef.current.length - 1;
            setHistoryVersion((version) => version + 1);
        }

        onChange?.({
            canvas_json: serialized,
            snapshot_data: canvas.toDataURL({ format: 'png', multiplier: 1 }),
        });
    };

    const addText = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const text = new Textbox('Tulis teks', {
            left: 96,
            top: 96,
            originX: 'left',
            originY: 'top',
            width: 420,
            fontSize: Number(fontSize),
            fill: textColor,
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: '700',
            kind: 'textbox',
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        setMode('select');
        emitManualChange();
    };

    const addShape = (shapeType = 'rectangle') => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const common = {
            left: 120,
            top: 140,
            originX: 'left',
            originY: 'top',
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: 3,
            kind: 'shape',
            shapeType,
        };
        let shape;

        if (shapeType === 'circle') {
            shape = new Circle({ ...common, radius: 80 });
        } else if (shapeType === 'triangle') {
            shape = new Triangle({ ...common, width: 180, height: 160 });
        } else if (shapeType === 'trapezoid') {
            shape = new Polygon([
                { x: 35, y: 0 },
                { x: 185, y: 0 },
                { x: 220, y: 130 },
                { x: 0, y: 130 },
            ], common);
        } else if (shapeType === 'diamond') {
            shape = new Polygon([
                { x: 100, y: 0 },
                { x: 200, y: 80 },
                { x: 100, y: 160 },
                { x: 0, y: 80 },
            ], common);
        } else if (shapeType === 'star') {
            const points = Array.from({ length: 10 }, (_, index) => {
                const radius = index % 2 === 0 ? 90 : 42;
                const angle = (-Math.PI / 2) + (index * Math.PI / 5);
                return { x: 90 + radius * Math.cos(angle), y: 90 + radius * Math.sin(angle) };
            });
            shape = new Polygon(points, common);
        } else if (shapeType === 'line') {
            shape = new Line([0, 0, 220, 0], {
                ...common,
                fill: null,
                strokeWidth: 6,
            });
        } else if (shapeType.startsWith('arrow-')) {
            const horizontal = ['arrow-right', 'arrow-left'].includes(shapeType);
            const line = new Line(horizontal ? [0, 60, 180, 60] : [60, 180, 60, 0], {
                stroke: shapeStroke,
                strokeWidth: 8,
                originX: 'center',
                originY: 'center',
            });
            const head = new Triangle({
                width: 34,
                height: 44,
                fill: shapeStroke,
                left: shapeType === 'arrow-left' ? -90 : shapeType === 'arrow-right' ? 90 : 0,
                top: shapeType === 'arrow-up' ? -90 : shapeType === 'arrow-down' ? 90 : 0,
                angle: shapeType === 'arrow-right' ? 90 : shapeType === 'arrow-down' ? 180 : shapeType === 'arrow-left' ? 270 : 0,
                originX: 'center',
                originY: 'center',
            });
            shape = new Group([line, head], {
                ...common,
                fill: null,
            });
        } else {
            shape = new Rect({
                ...common,
                width: 280,
                height: 120,
                rx: shapeType === 'rounded' ? 24 : 0,
                ry: shapeType === 'rounded' ? 24 : 0,
            });
        }

        canvas.add(shape);
        canvas.setActiveObject(shape);
        setMode('select');
        setShowShapeMenu(false);
        emitManualChange();
    };

    const restoreHistory = async (nextIndex) => {
        const canvas = fabricRef.current;
        const snapshot = historyRef.current[nextIndex];
        if (!canvas || !snapshot) return;

        isLoadingRef.current = true;
        await canvas.loadFromJSON(JSON.parse(snapshot));
        canvas.getObjects().forEach((object) => {
            object.selectable = mode === 'select' && !readonly;
            object.evented = !readonly;
        });
        canvas.requestRenderAll();
        historyIndexRef.current = nextIndex;
        isLoadingRef.current = false;
        setSelectedType('');
        setHistoryVersion((version) => version + 1);
        onChange?.({
            canvas_json: serializeCanvas(canvas),
            snapshot_data: canvas.toDataURL({ format: 'png', multiplier: 1 }),
        });
    };

    const undo = () => restoreHistory(historyIndexRef.current - 1);
    const redo = () => restoreHistory(historyIndexRef.current + 1);

    const selectContextTarget = () => {
        const canvas = fabricRef.current;
        if (!canvas || !contextTargetRef.current) {
            setMode('select');
            setContextMenu(null);
            return;
        }

        canvas.setActiveObject(contextTargetRef.current);
        setMode('select');
        updateSelectionState();
        canvas.requestRenderAll();
        setContextMenu(null);
    };

    const deleteContextTarget = () => {
        const canvas = fabricRef.current;
        if (!canvas || !contextTargetRef.current) return;

        canvas.remove(contextTargetRef.current);
        canvas.discardActiveObject();
        contextTargetRef.current = null;
        setSelectedType('');
        setContextMenu(null);
        canvas.requestRenderAll();
        emitManualChange();
    };

    const updateActiveObject = (styles) => {
        const canvas = fabricRef.current;
        const object = canvas?.getActiveObject();
        if (!canvas || !object) return;

        object.set(styles);
        if (object.type === 'group') {
            object.getObjects().forEach((child) => child.set({
                ...(styles.fill ? { fill: styles.fill, stroke: styles.stroke || styles.fill } : {}),
                ...(styles.stroke ? { stroke: styles.stroke, fill: child.type === 'triangle' ? styles.stroke : child.fill } : {}),
            }));
        }
        canvas.requestRenderAll();
        emitManualChange();
    };

    const changeBackgroundImage = async (url) => {
        const canvas = fabricRef.current;
        if (!canvas || !url) return;

        await applyBackgroundImage(canvas, url);
        canvas.requestRenderAll();
        emitManualChange();
    };

    const removeBackgroundImage = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.backgroundImage = null;
        canvas.requestRenderAll();
        emitManualChange();
    };

    const uploadBackgroundImage = async (event) => {
        const file = event.target.files?.[0] || null;
        event.target.value = '';

        if (!file || !onUploadBackground) return;

        setIsUploadingBackground(true);
        try {
            const url = await onUploadBackground(file);
            await changeBackgroundImage(url);
        } finally {
            setIsUploadingBackground(false);
        }
    };

    const deleteSelected = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const selected = canvas.getActiveObjects();
        if (!selected.length) return;

        selected.forEach((object) => canvas.remove(object));
        canvas.discardActiveObject();
        setSelectedType('');
        canvas.requestRenderAll();
        emitManualChange();
    };

    const changeBackground = (color) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        setBackgroundColor(color);
        canvas.backgroundColor = color;
        canvas.requestRenderAll();
        emitManualChange();
    };

    const clearCanvas = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        openConfirm({
            variant: 'danger',
            title: 'Bersihkan Slide?',
            message: 'Semua objek pada canvas slide ini akan dihapus. Background tetap dipertahankan.',
            confirmLabel: 'Iya, Bersihkan',
            details: [
                { label: 'Objek canvas', value: `${canvas.getObjects().length} objek` },
            ],
            onConfirm: () => {
                canvas.getObjects().forEach((object) => canvas.remove(object));
                emitManualChange();
                closeConfirm();
            },
        });
    };

    const shapeSelected = selectedType && selectedType !== 'textbox' && selectedType !== 'path';

    return (
        <div className="min-w-0 space-y-2.5">
            {!readonly && (
                <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                        <ToolButton label="Pilih dan edit" active={mode === 'select'} onClick={() => setMode('select')}><PanToolAltOutlinedIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Pena Jamboard" active={mode === 'draw'} onClick={() => setMode('draw')}><DrawOutlinedIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Tambah teks" onClick={addText}><TextFieldsIcon fontSize="small" /></ToolButton>
                        <div className="relative">
                            <ToolButton label="Tambah shape" active={showShapeMenu} onClick={() => setShowShapeMenu((value) => !value)}><CategoryOutlinedIcon fontSize="small" /></ToolButton>
                            {showShapeMenu && (
                                <div className="absolute left-0 top-11 z-50 grid w-64 grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                    {shapeOptions.map(([value, label]) => (
                                        <button key={value} type="button" onClick={() => addShape(value)} className="rounded-lg px-2 py-2 text-left text-[11px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-200 dark:hover:bg-orange-950/30">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />
                        <ToolButton label="Undo" disabled={historyIndexRef.current <= 0} onClick={undo}><UndoIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Redo" disabled={historyIndexRef.current >= historyRef.current.length - 1} onClick={redo}><RedoIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Hapus objek" disabled={!selectedType} danger onClick={deleteSelected}><DeleteOutlineIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Background slide" active={showBackgroundTools} onClick={() => setShowBackgroundTools((value) => !value)}><PaletteOutlinedIcon fontSize="small" /></ToolButton>
                        <ToolButton label="Bersihkan slide" danger onClick={clearCanvas}><CleaningServicesOutlinedIcon fontSize="small" /></ToolButton>
                    </div>

                    {(mode === 'draw' || selectedType === 'textbox' || shapeSelected || showBackgroundTools) && (
                        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-2 dark:bg-gray-950">
                            {mode === 'draw' && (
                                <>
                                <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Pena</span>
                                {colors.map((item) => (
                                    <button key={`draw-${item}`} type="button" onClick={() => setDrawColor(item)} className={`h-7 w-7 rounded-lg border-2 ${drawColor === item ? 'border-gray-950 ring-2 ring-orange-200 dark:border-white' : 'border-white dark:border-gray-700'}`} style={{ backgroundColor: item }} aria-label={`Warna coretan ${item}`} />
                                ))}
                                <input type="range" min="2" max="34" value={drawSize} onChange={(event) => setDrawSize(event.target.value)} className="w-20 accent-orange-600" />
                                </>
                            )}
                            {selectedType === 'textbox' && (
                                <>
                                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Teks</span>
                                <input type="color" value={textColor} onChange={(event) => {
                                    setTextColor(event.target.value);
                                    updateActiveObject({ fill: event.target.value });
                                }} className="h-9 w-12 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900" />
                                <input type="number" min="12" max="96" value={fontSize} onChange={(event) => {
                                    setFontSize(event.target.value);
                                    updateActiveObject({ fontSize: Number(event.target.value) });
                                }} className="h-9 w-20 rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                                <button type="button" disabled={selectedType !== 'textbox'} onClick={() => updateActiveObject({ fontWeight: fabricRef.current?.getActiveObject()?.fontWeight === '900' ? '700' : '900' })} className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-black disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">B</button>
                                <button type="button" disabled={selectedType !== 'textbox'} onClick={() => updateActiveObject({ fontStyle: fabricRef.current?.getActiveObject()?.fontStyle === 'italic' ? 'normal' : 'italic' })} className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-black italic disabled:opacity-40 dark:border-gray-700 dark:text-gray-200">I</button>
                                </>
                            )}
                            {shapeSelected && (
                                <>
                                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Shape</span>
                                <input type="color" value={shapeFill} onChange={(event) => {
                                    setShapeFill(event.target.value);
                                    updateActiveObject({ fill: event.target.value });
                                }} className="h-9 w-12 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900" />
                                <input type="color" value={shapeStroke} onChange={(event) => {
                                    setShapeStroke(event.target.value);
                                    updateActiveObject({ stroke: event.target.value });
                                }} className="h-9 w-12 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900" />
                                </>
                            )}
                            {showBackgroundTools && (
                                <>
                                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Background</span>
                                {backgrounds.map((item) => (
                                    <button key={`bg-${item}`} type="button" onClick={() => changeBackground(item)} className={`h-8 w-8 rounded-lg border-2 ${backgroundColor === item ? 'border-gray-950 ring-2 ring-orange-200 dark:border-white' : 'border-white dark:border-gray-700'}`} style={{ backgroundColor: item }} aria-label={`Background ${item}`} />
                                ))}
                                <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                    {isUploadingBackground ? 'Upload...' : 'BG Image'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadBackgroundImage} disabled={isUploadingBackground} className="hidden" />
                                </label>
                                <button type="button" onClick={removeBackgroundImage} className="h-8 rounded-lg border border-red-100 px-3 text-[11px] font-black text-red-600 hover:bg-red-50 dark:border-red-900/40">
                                    Hapus BG
                                </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div
                ref={canvasFrameRef}
                className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800"
                style={{ aspectRatio: `${size.width} / ${size.height}` }}
            >
                {underlay && <div className="absolute inset-0 z-0">{underlay}</div>}
                <div className={`absolute inset-0 z-10 ${transparent ? 'bg-transparent' : ''}`}>
                    <canvas ref={canvasElementRef} />
                </div>
                {contextMenu && (
                    <div
                        className="absolute z-50 min-w-32 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                        style={{
                            left: Math.min(contextMenu.x, Math.max(8, (canvasFrameRef.current?.clientWidth || 200) - 145)),
                            top: Math.min(contextMenu.y, Math.max(8, (canvasFrameRef.current?.clientHeight || 120) - 90)),
                        }}
                    >
                        <button type="button" onClick={selectContextTarget} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                            <PanToolAltOutlinedIcon fontSize="small" /> Pilih
                        </button>
                        {contextMenu.hasTarget && (
                            <button type="button" onClick={deleteContextTarget} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                <DeleteOutlineIcon fontSize="small" /> Hapus
                            </button>
                        )}
                    </div>
                )}
            </div>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </div>
    );
}

async function applyBackgroundImage(canvas, url) {
    try {
        const image = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
        const logicalSize = canvas.__tokuUpLogicalSize || {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
        };
        const scale = Math.max(
            logicalSize.width / Math.max(1, image.width || 1),
            logicalSize.height / Math.max(1, image.height || 1),
        );

        image.set({
            left: (canvas.getWidth() - (image.width || 0) * scale) / 2,
            top: (canvas.getHeight() - (image.height || 0) * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            src: url,
        });

        canvas.backgroundImage = image;
    } catch {
        // Keep the current background if the uploaded image cannot be read by Fabric.
    }
}

async function loadCustomObjects(canvas, objects) {
    for (const object of objects) {
        if (object.kind === 'image' && object.src) {
            try {
                const image = await FabricImage.fromURL(object.src, { crossOrigin: 'anonymous' });
                image.set({
                    left: object.left || 0,
                    top: object.top || 0,
                    originX: 'left',
                    originY: 'top',
                    scaleX: (object.width || image.width || 1) / Math.max(1, image.width || 1),
                    scaleY: (object.height || image.height || 1) / Math.max(1, image.height || 1),
                    kind: 'image',
                    src: object.src,
                });
                canvas.add(image);
            } catch {
                // Ignore unreadable imported images; the admin can re-add assets manually.
            }
            continue;
        }

        if (object.kind === 'textbox') {
            canvas.add(new Textbox(object.text || '', {
                left: object.left || 0,
                top: object.top || 0,
                originX: 'left',
                originY: 'top',
                width: object.width || 420,
                height: object.height || 80,
                fontSize: object.fontSize || 28,
                fill: object.fill || '#111827',
                fontFamily: 'Inter, Arial, sans-serif',
                fontWeight: object.fontWeight || '700',
                textAlign: object.textAlign || 'left',
                kind: 'textbox',
            }));
            continue;
        }

        if (object.kind === 'shape') {
            canvas.add(new Rect({
                left: object.left || 0,
                top: object.top || 0,
                originX: 'left',
                originY: 'top',
                width: object.width || 240,
                height: object.height || 120,
                rx: object.shapeType === 'rounded' ? 24 : 0,
                ry: object.shapeType === 'rounded' ? 24 : 0,
                fill: object.fill || '#FFE4D6',
                stroke: object.stroke || '#22C55E',
                strokeWidth: object.strokeWidth || 2,
                kind: 'shape',
                shapeType: object.shapeType || 'rectangle',
            }));
        }
    }
}
