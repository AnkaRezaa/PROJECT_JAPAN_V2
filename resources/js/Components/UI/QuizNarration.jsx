import { useEffect, useState } from 'react';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const SOUND_PREFERENCE_KEY = 'toku-up.quizSoundEnabled';
const JAPANESE_TEXT_PATTERN = /[\u3040-\u30ff\u3400-\u9fff]/g;

export function japaneseSpeechText(...parts) {
    const matches = parts.filter(Boolean).join(' ').match(JAPANESE_TEXT_PATTERN);
    return matches?.join('') || '';
}

export function useQuizSoundPreference() {
    const [enabled, setEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false';
    });

    useEffect(() => {
        window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'true' : 'false');
        if (!enabled) window.speechSynthesis?.cancel?.();
    }, [enabled]);

    return [enabled, setEnabled];
}

export default function QuizSoundToggle({ enabled, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            title={enabled ? 'Nonaktifkan narator otomatis' : 'Aktifkan narator otomatis'}
            aria-label={enabled ? 'Nonaktifkan narator otomatis' : 'Aktifkan narator otomatis'}
            aria-pressed={enabled}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                enabled
                    ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
        >
            {enabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
        </button>
    );
}
