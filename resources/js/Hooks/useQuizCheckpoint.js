import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / MS_PER_DAY);

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'kemarin';
    return `${diffDays} hari lalu`;
}

/**
 * Reusable React Hook untuk persistensi sesi kuis di localStorage.
 * Standar industri dengan batas simpan fleksibel hingga 3 hari (72 jam) dan auto-cleanup.
 *
 * @param {Object} options
 * @param {string} options.quizType - 'grammar' | 'vocab' | 'dokkai' | 'mixed'
 * @param {string|number} options.quizId - ID unik kuis
 * @param {number} [options.maxAgeDays=3] - Batas kedaluwarsa sesi (default 3 hari)
 * @param {boolean} [options.enabled=true] - Aktifkan atau nonaktifkan hook
 */
export default function useQuizCheckpoint({
    quizType,
    quizId,
    maxAgeDays = 3,
    enabled = true,
}) {
    const { auth } = usePage().props || {};
    const userId = auth?.user?.id || 'guest';

    const storageKey = useMemo(() => {
        if (!enabled || !quizType || !quizId) return null;
        return `japanlingo_cp_${quizType}_${quizId}_u${userId}`;
    }, [enabled, quizType, quizId, userId]);

    const maxAgeMs = maxAgeDays * MS_PER_DAY;

    // Baca checkpoint awal dari localStorage HANYA SEKALI saat initial mount
    const [initialData] = useState(() => {
        if (!enabled || typeof window === 'undefined' || !storageKey) return null;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (!parsed?.savedAt) return null;

            // Periksa apakah sesi sudah kedaluwarsa (> 3 hari)
            if ((Number.isFinite(parsed.expiresAt) && Date.now() >= parsed.expiresAt)
                || Date.now() - parsed.savedAt > maxAgeMs) {
                window.localStorage.removeItem(storageKey);
                return null;
            }

            return parsed;
        } catch (e) {
            console.warn('[useQuizCheckpoint] Gagal membaca checkpoint:', e);
            return null;
        }
    });

    const [hasInitialCheckpoint, setHasInitialCheckpoint] = useState(() => Boolean(initialData));
    const [checkpointData, setCheckpointData] = useState(initialData);

    const formattedSavedTime = useMemo(() => {
        const time = initialData?.savedAt || checkpointData?.savedAt;
        return time ? formatRelativeTime(time) : '';
    }, [initialData?.savedAt, checkpointData?.savedAt]);

    // Simpan progres ke localStorage TANPA memicu modal resume pada sesi aktif
    const saveCheckpoint = useCallback((state = {}) => {
        if (!enabled || typeof window === 'undefined' || !storageKey) return;
        try {
            const payload = {
                ...state,
                savedAt: Date.now(),
                version: 1,
            };
            window.localStorage.setItem(storageKey, JSON.stringify(payload));
            setCheckpointData(payload);
        } catch (e) {
            console.warn('[useQuizCheckpoint] Gagal menyimpan checkpoint:', e);
        }
    }, [enabled, storageKey]);

    // Hapus sesi saat kuis selesai disubmit / user memilih mulai baru
    const clearCheckpoint = useCallback(() => {
        if (typeof window === 'undefined' || !storageKey) return;
        try {
            window.localStorage.removeItem(storageKey);
            setCheckpointData(null);
            setHasInitialCheckpoint(false);
        } catch (e) {
            console.warn('[useQuizCheckpoint] Gagal menghapus checkpoint:', e);
        }
    }, [storageKey]);

    const dismissResume = useCallback(() => {
        setHasInitialCheckpoint(false);
    }, []);

    return {
        hasCheckpoint: hasInitialCheckpoint,
        hasInitialCheckpoint,
        checkpointData,
        initialCheckpointData: initialData,
        formattedSavedTime,
        saveCheckpoint,
        clearCheckpoint,
        dismissResume,
        storageKey,
    };
}
