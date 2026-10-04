import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

const canUseSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const narrationAudioCache = new Map();
let activeSpeechOwner = null;

export const isStreamableAudio = (audioUrl) => audioUrl && !audioUrl.includes('youtube.com') && !audioUrl.includes('youtu.be');

const debugNarration = (event, payload) => {
    if (import.meta.env.DEV) {
        console.debug('[JapaneseSpeech]', event, payload);
    }
};

export const preloadNarrationAudio = (audioUrl) => {
    if (typeof Audio === 'undefined' || !isStreamableAudio(audioUrl) || narrationAudioCache.has(audioUrl)) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.load();
    narrationAudioCache.set(audioUrl, audio);

    if (narrationAudioCache.size > 3) {
        const [oldestUrl, oldestAudio] = narrationAudioCache.entries().next().value;
        oldestAudio.pause();
        oldestAudio.removeAttribute('src');
        oldestAudio.load();
        narrationAudioCache.delete(oldestUrl);
    }
};

const takePreloadedNarrationAudio = (audioUrl) => {
    const audio = narrationAudioCache.get(audioUrl) || null;

    if (audio) {
        narrationAudioCache.delete(audioUrl);
    }

    return audio;
};

const chooseJapaneseVoice = (voices = []) => {
    const japaneseVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('ja'));

    return japaneseVoices.find((voice) => voice.lang?.toLowerCase() === 'ja-jp' && voice.localService)
        || japaneseVoices.find((voice) => voice.localService)
        || japaneseVoices.find((voice) => voice.lang?.toLowerCase() === 'ja-jp')
        || japaneseVoices[0]
        || null;
};

export default function JapaneseSpeechButton({
    text,
    audioUrl = null,
    className = '',
    iconClassName = '',
    title = 'Dengarkan pelafalan',
    rate = 0.9,
    pitch = 1,
    volume = 1,
    autoPlay = false,
    autoPlayEnabled = true,
    playbackKey = null,
    children = null,
    renderButton = true,
    usePreloadedAudio = false,
    ...buttonProps
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [voiceReady, setVoiceReady] = useState(false);
    const autoPlayedKeyRef = useRef(null);
    const audioRef = useRef(null);
    const voicesRef = useRef([]);
    const speakerIdRef = useRef(Symbol('japanese-speech-button'));

    const speakableText = useMemo(() => String(text || '').trim(), [text]);
    const supported = Boolean(audioUrl) || (canUseSpeech() && speakableText.length > 0);

    useEffect(() => {
        if (!canUseSpeech()) return undefined;

        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
            setVoiceReady(voicesRef.current.length > 0);
        };

        loadVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
            if (activeSpeechOwner === speakerIdRef.current) {
                activeSpeechOwner = null;
                window.speechSynthesis.cancel();
            }
            audioRef.current?.pause?.();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!audioUrl) return undefined;

        preloadNarrationAudio(audioUrl);
        const audio = usePreloadedAudio
            ? takePreloadedNarrationAudio(audioUrl) || new Audio(audioUrl)
            : new Audio(audioUrl);
        audio.preload = 'auto';
        audioRef.current = audio;

        if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
            audio.load();
        }

        return () => {
            audio.pause();
            if (audioRef.current === audio) {
                audioRef.current = null;
            }
        };
    }, [audioUrl, usePreloadedAudio]);

    useEffect(() => {
        if (autoPlayEnabled) return;

        window.speechSynthesis?.cancel?.();
        audioRef.current?.pause?.();
        audioRef.current = null;
        setIsPlaying(false);
    }, [autoPlayEnabled]);

    const play = useCallback(async (event) => {
        event?.stopPropagation?.();

        if (!supported) return;

        if (audioUrl) {
            window.speechSynthesis?.cancel?.();
            activeSpeechOwner = null;
            const audio = audioRef.current || new Audio(audioUrl);
            const queuedAt = performance.now();
            audio.preload = 'auto';
            audio.currentTime = 0;
            audioRef.current = audio;
            setIsPlaying(true);
            debugNarration('queue', { key: playbackKey, transport: 'audio', audioUrl });

            audio.onplaying = () => {
                debugNarration('start', { key: playbackKey, transport: 'audio', latencyMs: Math.round(performance.now() - queuedAt) });
            };

            audio.onended = () => {
                audioRef.current = null;
                setIsPlaying(false);
            };
            let playFailed = false;
            audio.onerror = () => {
                audioRef.current = null;
                setIsPlaying(false);
            };
            await audio.play().catch(() => {
                audioRef.current = null;
                playFailed = true;
            });
            if (!playFailed) return;
        }

        if (!canUseSpeech()) return;

        window.speechSynthesis.cancel();
        activeSpeechOwner = speakerIdRef.current;
        const queuedAt = performance.now();

        const utterance = new SpeechSynthesisUtterance(speakableText);
        utterance.lang = 'ja-JP';
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        const voice = chooseJapaneseVoice(voicesRef.current);
        if (voice) {
            utterance.voice = voice;
        }

        debugNarration('queue', { key: playbackKey, transport: 'speech', voice: voice?.name || 'browser-default' });
        utterance.onstart = () => {
            debugNarration('start', { key: playbackKey, transport: 'speech', latencyMs: Math.round(performance.now() - queuedAt), voice: voice?.name || 'browser-default' });
            setIsPlaying(true);
        };
        utterance.onend = () => {
            if (activeSpeechOwner === speakerIdRef.current) activeSpeechOwner = null;
            setIsPlaying(false);
        };
        utterance.onerror = () => {
            if (activeSpeechOwner === speakerIdRef.current) activeSpeechOwner = null;
            setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [audioUrl, pitch, playbackKey, rate, speakableText, supported, volume]);

    useEffect(() => {
        if (!autoPlay || !autoPlayEnabled || !supported) return undefined;

        const resolvedPlaybackKey = playbackKey || `${audioUrl || 'speech'}:${speakableText}`;
        if (autoPlayedKeyRef.current === resolvedPlaybackKey) return undefined;

        // Do not mark the key until playback is actually queued. In React Strict Mode,
        // the first mount timer can be cleaned up before it runs.
        const timer = window.setTimeout(() => {
            autoPlayedKeyRef.current = resolvedPlaybackKey;
            play();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [audioUrl, autoPlay, autoPlayEnabled, play, playbackKey, speakableText, supported]);

    if (!renderButton) return null;

    return (
        <button
            type="button"
            onClick={play}
            disabled={!supported}
            title={supported ? title : 'Narator tidak tersedia di browser ini'}
            aria-label={supported ? title : 'Narator tidak tersedia'}
            className={`${className} ${!supported ? 'cursor-not-allowed opacity-45' : ''}`}
            data-sound="none"
            data-voice-ready={voiceReady ? 'true' : 'false'}
            {...buttonProps}
        >
            {children || (
                isPlaying
                    ? <VolumeUpIcon className={iconClassName} />
                    : supported ? <VolumeUpIcon className={iconClassName} /> : <VolumeOffIcon className={iconClassName} />
            )}
        </button>
    );
}
