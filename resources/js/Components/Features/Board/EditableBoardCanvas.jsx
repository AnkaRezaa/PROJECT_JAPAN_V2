import React, { useEffect, useRef, useState } from 'react';
import { redrawBoard } from '@/Components/Features/Board/BoardCanvas';

const canvasSize = {
    width: 1280,
    height: 720,
};

const colorOptions = ['#111827', '#F97316', '#2563EB', '#16A34A', '#F59E0B', '#DC2626'];

export default function EditableBoardCanvas({ initialStrokes = [], onChange, className = '' }) {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef(null);
    const [strokes, setStrokes] = useState(initialStrokes || []);
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#111827');
    const [size, setSize] = useState(5);

    useEffect(() => {
        setStrokes(initialStrokes || []);
    }, [initialStrokes]);

    useEffect(() => {
        redrawBoard(canvasRef.current, strokes);
        onChange?.({
            strokes,
            snapshot_data: canvasRef.current ? canvasRef.current.toDataURL('image/png') : null,
        });
    }, [strokes]);

    const getPoint = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
            y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
        };
    };

    const redrawWithCurrentStroke = () => {
        if (!canvasRef.current) return;
        redrawBoard(canvasRef.current, currentStrokeRef.current ? [...strokes, currentStrokeRef.current] : strokes);
    };

    const startDrawing = (event) => {
        if (!canvasRef.current) return;

        event.preventDefault();
        canvasRef.current.setPointerCapture?.(event.pointerId);
        isDrawingRef.current = true;
        currentStrokeRef.current = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            tool,
            color,
            size: Number(size),
            points: [getPoint(event)],
        };
    };

    const draw = (event) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        event.preventDefault();
        currentStrokeRef.current = {
            ...currentStrokeRef.current,
            points: [...currentStrokeRef.current.points, getPoint(event)],
        };
        redrawWithCurrentStroke();
    };

    const stopDrawing = (event) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        event.preventDefault();
        const nextStroke = currentStrokeRef.current;
        isDrawingRef.current = false;
        currentStrokeRef.current = null;

        if ((nextStroke.points || []).length > 1) {
            setStrokes((items) => [...items, nextStroke]);
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Jamboard</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Menu coret-coret untuk slide aktif.</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {tool === 'pen' ? 'Pena' : 'Penghapus'} {size}px
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTool('pen')}
                        className={`rounded-xl px-3 py-2 text-xs font-black ${tool === 'pen' ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        Pena
                    </button>
                    <button
                        type="button"
                        onClick={() => setTool('eraser')}
                        className={`rounded-xl px-3 py-2 text-xs font-black ${tool === 'eraser' ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        Penghapus
                    </button>
                    <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                        {colorOptions.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setColor(item)}
                                className={`h-8 w-8 rounded-lg border-2 transition ${color === item ? 'border-gray-950 ring-2 ring-orange-200 dark:border-white' : 'border-white/70 dark:border-gray-700'}`}
                                style={{ backgroundColor: item }}
                                aria-label={`Pilih warna ${item}`}
                            />
                        ))}
                    </div>
                    <label className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Ukuran
                        <input
                            type="range"
                            min="2"
                            max="30"
                            value={size}
                            onChange={(event) => setSize(event.target.value)}
                            className="w-24 accent-orange-600"
                        />
                    </label>
                    <button type="button" disabled={!strokes.length} onClick={() => setStrokes((items) => items.slice(0, -1))} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        Undo
                    </button>
                    <button type="button" disabled={!strokes.length} onClick={() => setStrokes([])} className="rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/40 dark:hover:bg-red-950/30">
                        Bersihkan
                    </button>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                className="aspect-video w-full touch-none rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800"
            />
        </div>
    );
}
