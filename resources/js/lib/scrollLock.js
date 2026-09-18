import { useEffect } from 'react';

let lockCount = 0;

export function lockScroll() {
    if (typeof document === 'undefined') return () => {};

    lockCount += 1;
    if (lockCount === 1) {
        document.body.style.overflow = 'hidden';
    }

    let released = false;
    return () => {
        if (released) return;
        released = true;
        unlockScroll();
    };
}

export function unlockScroll() {
    if (typeof document === 'undefined') return;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
    }
}

export function resetScrollLock() {
    if (typeof document === 'undefined') return;

    lockCount = 0;
    document.body.style.overflow = '';
}

export function useScrollLock(active = true) {
    useEffect(() => {
        if (!active) return undefined;

        const unlock = lockScroll();
        return () => {
            unlock();
        };
    }, [active]);
}
