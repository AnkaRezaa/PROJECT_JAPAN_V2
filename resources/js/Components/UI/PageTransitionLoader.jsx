import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 350;
const EXIT_FADE_MS = 200;

export default function PageTransitionLoader() {
    const [state, setState] = useState('idle');
    const stateRef = useRef('idle');
    const activeRequestsRef = useRef(0);
    const showTimerRef = useRef(null);
    const hideTimerRef = useRef(null);
    const exitTimerRef = useRef(null);
    const showTimestampRef = useRef(0);

    const updateState = (nextState) => {
        stateRef.current = nextState;
        setState(nextState);
    };

    useEffect(() => {
        const cleanupTimers = () => {
            if (showTimerRef.current) clearTimeout(showTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };

        const handleStart = (event) => {
            if (event?.detail?.visit?.showProgress === false) {
                return;
            }

            activeRequestsRef.current += 1;

            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
                exitTimerRef.current = null;
            }

            if (stateRef.current === 'idle') {
                if (!showTimerRef.current) {
                    showTimerRef.current = setTimeout(() => {
                        showTimestampRef.current = Date.now();
                        updateState('visible');
                        showTimerRef.current = null;
                    }, SHOW_DELAY_MS);
                }
            } else if (stateRef.current === 'exiting') {
                updateState('visible');
            }
        };

        const handleFinish = () => {
            activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
            if (activeRequestsRef.current > 0) {
                return;
            }

            if (showTimerRef.current) {
                clearTimeout(showTimerRef.current);
                showTimerRef.current = null;
                updateState('idle');
                return;
            }

            const elapsed = Date.now() - showTimestampRef.current;
            const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

            hideTimerRef.current = setTimeout(() => {
                updateState('exiting');
                hideTimerRef.current = null;

                exitTimerRef.current = setTimeout(() => {
                    updateState('idle');
                    exitTimerRef.current = null;
                }, EXIT_FADE_MS);
            }, remaining);
        };

        const removeStart = router.on('start', handleStart);
        const removeFinish = router.on('finish', handleFinish);
        const removeCancel = router.on('cancel', handleFinish);
        const removeError = router.on('error', handleFinish);

        return () => {
            removeStart();
            removeFinish();
            removeCancel();
            removeError();
            cleanupTimers();
        };
    }, []);

    if (state === 'idle') {
        return null;
    }

    const isExiting = state === 'exiting';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/85 dark:bg-slate-950/85 backdrop-blur-md transition-opacity duration-200 select-none cursor-wait pointer-events-auto ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}
        >
            <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
                <div className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/60 dark:bg-slate-900/60 shadow-sm shadow-emerald-500/10">
                    <img
                        src="/images/logos/tokuup-mark.png"
                        alt="TOKU-UP"
                        className="h-9 w-9 object-contain drop-shadow-sm animate-pulse"
                    />
                </div>
            </div>
            <div className="mt-5 flex flex-col items-center gap-1 text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-800 dark:text-emerald-400">
                    TOKU-UP
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Memuat...
                </span>
            </div>
        </div>
    );
}
