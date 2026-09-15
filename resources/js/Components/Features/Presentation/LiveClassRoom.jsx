import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import axios from 'axios';
import { ConnectionState, DisconnectReason, LogLevel, Room, RoomEvent, setLogLevel, Track, VideoQuality } from 'livekit-client';
import PresentationStage from '@/Components/Features/Presentation/PresentationStage';
import { getEcho, leaveLiveClassChannel } from '@/lib/echo';
import ContextualFeedbackPrompt from '@/Components/Features/Feedback/ContextualFeedbackPrompt';
import { pushAnalyticsEvent } from '@/lib/analytics';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BrushIcon from '@mui/icons-material/Brush';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DrawIcon from '@mui/icons-material/Draw';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GroupsIcon from '@mui/icons-material/Groups';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PanToolIcon from '@mui/icons-material/PanTool';
import PeopleIcon from '@mui/icons-material/People';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PresentToAllIcon from '@mui/icons-material/PresentToAll';
import PushPinIcon from '@mui/icons-material/PushPin';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SendIcon from '@mui/icons-material/Send';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import UndoIcon from '@mui/icons-material/Undo';
import WifiIcon from '@mui/icons-material/Wifi';

setLogLevel(LogLevel.warn);

const initialParticipants = [
    { id: 'student-1', name: 'Aiko S.', initials: 'AS', handRaised: false, canSpeak: false, micBlocked: false, canWrite: false },
    { id: 'student-2', name: 'Bima R.', initials: 'BR', handRaised: true, canSpeak: false, micBlocked: false, canWrite: false },
    { id: 'student-3', name: 'Citra N.', initials: 'CN', handRaised: false, canSpeak: true, micBlocked: false, canWrite: false },
    { id: 'student-4', name: 'Dimas K.', initials: 'DK', handRaised: false, canSpeak: false, micBlocked: false, canWrite: false },
];

const connectionLabels = {
    connected: 'Terhubung',
    reconnecting: 'Menyambungkan kembali',
    slow: 'Koneksi kurang stabil',
};

function mediaIssueMessage(error, feature = 'Perangkat') {
    const name = String(error?.name || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();

    if (name.includes('notallowed') || message.includes('permission') || message.includes('denied')) {
        return `${feature} belum diizinkan. Izinkan akses melalui ikon gembok di browser, lalu coba lagi.`;
    }

    if (name.includes('notfound') || message.includes('not found')) {
        return `${feature} tidak ditemukan. Pastikan perangkat sudah terpasang.`;
    }

    if (name.includes('notreadable') || message.includes('could not start')) {
        return `${feature} sedang digunakan aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.`;
    }

    if (name.includes('overconstrained') || message.includes('constraint')) {
        return `${feature} tidak mendukung pengaturan yang dipilih. Coba perangkat lain.`;
    }

    if (message.includes('engine not connected') || message.includes('disconnected') || message.includes('timeout')) {
        return 'Koneksi kelas belum siap. Tunggu hingga tersambung, lalu coba lagi.';
    }

    return `${feature} belum dapat digunakan. Periksa perangkat dan koneksi, lalu coba lagi.`;
}

function joinIssueMessage(error) {
    const status = error?.response?.status;

    if (status === 403) return 'Akun Anda tidak memiliki akses ke ruang kelas ini.';
    if (status === 409) return 'Kelas belum dimulai atau sudah berakhir.';
    if (status === 429) return 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.';
    if (status === 503) return 'Ruang kelas sedang disiapkan. Tunggu sebentar, lalu coba lagi.';

    return 'Belum dapat masuk ke ruang kelas. Periksa koneksi internet, lalu coba lagi.';
}

const MAX_BOARD_STROKES = 500;
const MAX_STROKE_POINTS = 300;
const MIN_POINT_DISTANCE = 0.25;

function IconButton({ label, active = false, danger = false, disabled = false, onClick, children }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
                danger
                    ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                    : active
                        ? 'border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-950/30'
                        : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
            }`}
        >
            {children}
        </button>
    );
}

function Lobby({ deck, session, role, joining = false, lowDataMode = false, onToggleLowData, onStart, onExit }) {
    const [micEnabled, setMicEnabled] = useState(role === 'mentor');
    const [cameraEnabled, setCameraEnabled] = useState(role === 'mentor');
    const [microphones, setMicrophones] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [microphoneId, setMicrophoneId] = useState('');
    const [cameraId, setCameraId] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [deviceError, setDeviceError] = useState('');
    const [checkingDevices, setCheckingDevices] = useState(true);
    const [previewRevision, setPreviewRevision] = useState(0);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const meterFrameRef = useRef(null);

    const stopPreview = useCallback(() => {
        if (meterFrameRef.current) cancelAnimationFrame(meterFrameRef.current);
        meterFrameRef.current = null;
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setMicLevel(0);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const prepareDevices = async () => {
            stopPreview();
            setCheckingDevices(true);
            setDeviceError('');

            if (!navigator.mediaDevices?.getUserMedia) {
                setDeviceError('Browser ini tidak mendukung akses kamera dan mikrofon.');
                setCheckingDevices(false);
                return;
            }

            if (!micEnabled && !cameraEnabled) {
                const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
                if (!cancelled) {
                    setMicrophones(devices.filter((device) => device.kind === 'audioinput'));
                    setCameras(devices.filter((device) => device.kind === 'videoinput'));
                    setCheckingDevices(false);
                }
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: micEnabled ? {
                        deviceId: microphoneId ? { exact: microphoneId } : undefined,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    } : false,
                    video: cameraEnabled && role === 'mentor' ? {
                        deviceId: cameraId ? { exact: cameraId } : undefined,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    } : false,
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }

                const devices = await navigator.mediaDevices.enumerateDevices();
                setMicrophones(devices.filter((device) => device.kind === 'audioinput'));
                setCameras(devices.filter((device) => device.kind === 'videoinput'));

                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    if (AudioContextClass) {
                        const context = new AudioContextClass();
                        const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
                        const analyser = context.createAnalyser();
                        analyser.fftSize = 256;
                        source.connect(analyser);
                        audioContextRef.current = context;
                        const samples = new Uint8Array(analyser.frequencyBinCount);

                        const updateMeter = () => {
                            analyser.getByteFrequencyData(samples);
                            const average = samples.reduce((total, value) => total + value, 0) / samples.length;
                            setMicLevel(Math.min(100, Math.round(average * 1.6)));
                            meterFrameRef.current = requestAnimationFrame(updateMeter);
                        };
                        updateMeter();
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
                    setDeviceError(denied
                        ? 'Kamera dan mikrofon belum diizinkan. Izinkan akses melalui ikon gembok di browser.'
                        : mediaIssueMessage(error, 'Kamera atau mikrofon'));
                }
            } finally {
                if (!cancelled) setCheckingDevices(false);
            }
        };

        prepareDevices();

        return () => {
            cancelled = true;
            stopPreview();
        };
    }, [cameraEnabled, cameraId, micEnabled, microphoneId, previewRevision, role, stopPreview]);

    const enterRoom = async () => {
        stopPreview();
        const joined = await onStart({ micEnabled, cameraEnabled, microphoneId, cameraId });
        if (joined === false) setPreviewRevision((value) => value + 1);
    };

    const exitLobby = () => {
        stopPreview();
        onExit();
    };

    return (
        <main className="min-h-dvh bg-[#070b14] px-3 py-3 text-white sm:px-6 sm:py-6 lg:px-10">
            <div className="mx-auto max-w-6xl">
                <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
                    <button type="button" onClick={exitLobby} className="flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-bold text-gray-300 hover:text-white">
                        <ArrowBackIcon sx={{ fontSize: 18 }} /> Kembali
                    </button>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Persiapan kelas
                    </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start xl:gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">Ruang Kelas Virtual</p>
                        <h1 className="mt-2 max-w-3xl text-2xl font-black sm:mt-3 sm:text-3xl lg:text-4xl">{role === 'mentor' ? 'Siapkan perangkat sebelum mengajar' : 'Siapkan perangkat sebelum masuk kelas'}</h1>
                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-gray-400 sm:mt-4 sm:text-base">
                            Periksa suara dan kamera, lalu masuk ke ruang kelas saat sudah siap.
                        </p>

                        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#101725] sm:mt-7 sm:rounded-2xl">
                            <div className="relative aspect-video bg-gradient-to-br from-gray-800 via-gray-950 to-orange-950">
                                <video ref={videoRef} muted playsInline autoPlay className={`h-full w-full object-cover ${cameraEnabled ? 'block' : 'hidden'}`} />
                                {!cameraEnabled && <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center sm:p-10">
                                    <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-orange-400 bg-orange-500/20 text-xl font-black sm:h-20 sm:w-20 sm:text-2xl">MK</div>
                                    <p className="mt-3 text-base font-black sm:mt-4 sm:text-lg">{role === 'mentor' ? 'Mentor Kelas' : 'Peserta Kelas'}</p>
                                    <p className="mt-1 text-xs font-bold text-gray-400">Kamera dimatikan</p>
                                </div>}
                                {checkingDevices && <div className="absolute inset-0 grid place-items-center bg-gray-950/75 text-sm font-black text-gray-200">Memeriksa perangkat...</div>}
                                {cameraEnabled && !checkingDevices && <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-3 py-1.5 text-[11px] font-black">Pratinjau kamera</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 sm:flex sm:items-center sm:justify-center sm:gap-3 sm:p-4">
                                <button type="button" onClick={() => setMicEnabled((value) => !value)} className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black sm:px-4 sm:text-sm ${micEnabled ? 'bg-white/10' : 'bg-red-500/20 text-red-300'}`}>
                                    {micEnabled ? <MicIcon sx={{ fontSize: 19 }} /> : <MicOffIcon sx={{ fontSize: 19 }} />}
                                    Mikrofon
                                </button>
                                <button type="button" disabled={role !== 'mentor'} onClick={() => setCameraEnabled((value) => !value)} className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm ${cameraEnabled ? 'bg-white/10' : 'bg-red-500/20 text-red-300'}`}>
                                    <CameraAltIcon sx={{ fontSize: 19 }} /> Kamera
                                </button>
                            </div>
                        </div>

                        {deviceError && <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{deviceError}</p>}

                        <div className="mt-3 grid gap-3 md:grid-cols-2 sm:mt-4">
                            <label className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Mikrofon</span>
                                <select value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)} className="w-full border-0 bg-transparent p-0 text-sm font-bold text-white focus:ring-0">
                                    <option className="bg-gray-900" value="">Mikrofon default</option>
                                    {microphones.map((device, deviceIndex) => <option className="bg-gray-900" key={device.deviceId} value={device.deviceId}>{device.label || `Mikrofon ${deviceIndex + 1}`}</option>)}
                                </select>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${micEnabled ? Math.max(3, micLevel) : 0}%` }} /></div>
                                <span className="mt-1.5 block text-[10px] font-bold text-gray-500">{micEnabled ? (micLevel > 8 ? 'Suara terdeteksi' : 'Coba bicara untuk menguji') : 'Mikrofon dimatikan'}</span>
                            </label>
                            <label className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Kamera</span>
                                <select disabled={role !== 'mentor'} value={cameraId} onChange={(event) => setCameraId(event.target.value)} className="w-full border-0 bg-transparent p-0 text-sm font-bold text-white focus:ring-0 disabled:opacity-40">
                                    <option className="bg-gray-900" value="">Kamera default</option>
                                    {cameras.map((device, deviceIndex) => <option className="bg-gray-900" key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${deviceIndex + 1}`}</option>)}
                                </select>
                                <span className="mt-4 block text-[10px] font-bold text-gray-500">{cameraEnabled ? 'Gambar tampil pada pratinjau di atas' : 'Kamera tetap mati saat masuk'}</span>
                            </label>
                        </div>
                    </section>

                    <aside className="rounded-xl border border-white/10 bg-[#101725] p-4 shadow-2xl sm:rounded-2xl sm:p-5 lg:sticky lg:top-6">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-500">Konteks kelas</p>
                        <h2 className="mt-3 text-xl font-black">{deck.title}</h2>
                        <dl className="mt-5 space-y-4 text-sm">
                            <div><dt className="font-bold text-gray-500">Kelas / Minggu</dt><dd className="mt-1 font-black text-gray-100">{deck.module?.title || 'Belum ditentukan'}</dd></div>
                            <div><dt className="font-bold text-gray-500">Kloter</dt><dd className="mt-1 font-black text-gray-100">{session?.kloter?.nama || 'Kloter aktif'}</dd></div>
                            <div><dt className="font-bold text-gray-500">Materi</dt><dd className="mt-1 font-black text-gray-100">{deck.slides?.length || 0} slide siap</dd></div>
                        </dl>
                        <div className="mt-6 rounded-xl bg-gray-950/70 p-4">
                            <div className="flex items-center gap-3">
                                <GroupsIcon className="text-orange-400" />
                                <div><p className="text-sm font-black">Ruang kelas siap</p><p className="text-xs font-semibold text-gray-500">Tekan tombol masuk saat kamu sudah siap</p></div>
                            </div>
                        </div>
                        <button type="button" onClick={onToggleLowData} className={`mt-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-black transition ${lowDataMode ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-gray-300'}`}>
                            <span><WifiIcon sx={{ fontSize: 17 }} className="mr-2 align-middle" />Mode hemat data</span>
                            <span>{lowDataMode ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                        <button type="button" disabled={joining} onClick={enterRoom} aria-busy={joining} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition-colors hover:bg-orange-500 disabled:cursor-wait disabled:bg-orange-700">
                            {joining ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" /> : <PlayArrowIcon />}
                            {joining ? 'Menyiapkan ruang kelas...' : role === 'mentor' ? 'Masuk sebagai Mentor' : 'Masuk Ruang Kelas'}
                        </button>
                        {joining && <p className="mt-2 text-center text-[11px] font-semibold text-gray-400">Mohon tunggu, materi dan perangkat sedang disambungkan.</p>}
                    </aside>
                </div>
            </div>
        </main>
    );
}

function ParticipantDrawer({
    open,
    activeTab = 'participants',
    onTabChange,
    role,
    participants,
    speakingIds = [],
    messages = [],
    onSendMessage,
    unreadChatCount = 0,
    currentUserId,
    onClose,
    onUpdate,
    onKick,
    onClearStrokes,
    onMuteAll,
}) {
    const [activeMenu, setActiveMenu] = useState(null);
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef(null);

    const orderedParticipants = useMemo(() => [...participants].sort((a, b) => {
        if (a.handRaised !== b.handRaised) return a.handRaised ? -1 : 1;
        if (a.handRaised && b.handRaised) return Number(a.handRaisedAt || 0) - Number(b.handRaisedAt || 0);
        return String(a.name).localeCompare(String(b.name));
    }), [participants]);

    useEffect(() => {
        if (activeTab === 'chat' && open) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, activeTab, open]);

    const runAction = (action) => {
        action();
        setActiveMenu(null);
    };

    const handleSend = (event) => {
        event.preventDefault();
        const trimmed = inputText.trim();
        if (!trimmed) return;
        onSendMessage?.(trimmed);
        setInputText('');
    };

    return (
        <Transition show={open}>
            <Dialog className="relative z-[80]" onClose={onClose}>
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/55" />
                </TransitionChild>
                <div className="fixed inset-0 flex justify-end">
                    <TransitionChild
                        enter="transform ease-out duration-300"
                        enterFrom="translate-x-full"
                        enterTo="translate-x-0"
                        leave="transform ease-in duration-200"
                        leaveFrom="translate-x-0"
                        leaveTo="translate-x-full"
                    >
        <DialogPanel className="flex h-full w-[min(100vw,24rem)] flex-col border-l border-white/10 bg-[#0d1422] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onTabChange?.('participants')}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                            activeTab === 'participants'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <PeopleIcon sx={{ fontSize: 16 }} className="mr-1 align-middle" />
                        Peserta ({participants.length + 1})
                    </button>
                    <button
                        type="button"
                        onClick={() => onTabChange?.('chat')}
                        className={`relative rounded-lg px-2.5 py-1.5 text-xs font-black transition ${
                            activeTab === 'chat'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} className="mr-1 align-middle" />
                        Obrolan
                        {unreadChatCount > 0 && activeTab !== 'chat' && (
                            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                                {unreadChatCount}
                            </span>
                        )}
                    </button>
                </div>
                <IconButton label="Tutup panel" onClick={onClose}><CloseIcon sx={{ fontSize: 19 }} /></IconButton>
            </div>

            {activeTab === 'participants' && (
                <>
                    {role === 'mentor' && participants.length > 0 && (
                        <button type="button" onClick={onMuteAll} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 text-xs font-black text-red-200 hover:bg-red-500/20">
                            <MicOffIcon sx={{ fontSize: 17 }} /> Matikan semua mic
                        </button>
                    )}
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500 font-black">MK</span>
                            <div><p className="text-sm font-black">Mentor Kelas</p><p className="text-xs font-bold text-orange-300">Mentor</p></div>
                        </div>
                    </div>
                    <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                        {orderedParticipants.map((participant) => (
                            <article
                                key={participant.id}
                                onContextMenu={(event) => {
                                    if (role !== 'mentor') return;
                                    event.preventDefault();
                                    setActiveMenu(participant.id);
                                }}
                                className="relative rounded-xl border border-white/10 bg-white/[0.04] p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`grid h-10 w-10 place-items-center rounded-full bg-blue-500/20 text-sm font-black text-blue-200 ${speakingIds.includes(Number(participant.id)) ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0d1422]' : ''}`}>{participant.initials}</span>
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{participant.name}</p><p className={`text-xs font-bold ${speakingIds.includes(Number(participant.id)) ? 'text-emerald-400' : 'text-gray-500'}`}>{speakingIds.includes(Number(participant.id)) ? 'Sedang berbicara' : participant.handRaised ? 'Mengangkat tangan' : participant.canWrite ? 'Boleh menulis' : 'Menyimak'}</p></div>
                                    {participant.handRaised && <PanToolIcon className="text-amber-400" sx={{ fontSize: 18 }} />}
                                    {role === 'mentor' && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveMenu((value) => value === participant.id ? null : participant.id)}
                                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
                                            aria-label={`Opsi ${participant.name}`}
                                            title="Opsi peserta"
                                        >
                                            <MoreVertIcon sx={{ fontSize: 19 }} />
                                        </button>
                                    )}
                                </div>

                                {role === 'mentor' && activeMenu === participant.id && (
                                    <div className="absolute right-3 top-14 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#172033] p-1.5 shadow-2xl">
                                        <button type="button" onClick={() => runAction(() => onUpdate(participant.id, { micBlocked: !participant.micBlocked, canSpeak: false }))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-gray-200 hover:bg-white/10">
                                            <MicOffIcon sx={{ fontSize: 17 }} /> {participant.micBlocked ? 'Buka blokir mic' : 'Blokir mikrofon'}
                                        </button>
                                        <button type="button" onClick={() => runAction(() => onUpdate(participant.id, { canWrite: !participant.canWrite }))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-gray-200 hover:bg-white/10">
                                            <DrawIcon sx={{ fontSize: 17 }} /> {participant.canWrite ? 'Cabut izin menulis' : 'Izinkan menulis'}
                                        </button>
                                        <button type="button" onClick={() => runAction(() => onClearStrokes(participant.id))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-gray-200 hover:bg-white/10">
                                            <DeleteSweepIcon sx={{ fontSize: 17 }} /> Hapus coretan
                                        </button>
                                        <div className="my-1 h-px bg-white/10" />
                                        <button type="button" onClick={() => runAction(() => onKick(participant.id))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-red-300 hover:bg-red-500/10">
                                            <PersonRemoveIcon sx={{ fontSize: 17 }} /> Keluarkan peserta
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'chat' && (
                <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between">
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {messages.length === 0 ? (
                            <div className="grid h-full place-items-center p-6 text-center text-xs text-gray-500">
                                <div>
                                    <ChatBubbleOutlineIcon sx={{ fontSize: 32 }} className="mx-auto text-gray-600 mb-2" />
                                    <p className="font-bold text-gray-300">Belum ada obrolan.</p>
                                    <p className="mt-1 text-[11px] text-gray-500">Ketik pesan untuk bertanya atau berdiskusi dengan mentor dan teman kelas.</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = String(msg.senderId) === String(currentUserId);
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                                            <span className={`font-black ${msg.role === 'mentor' ? 'text-orange-400' : 'text-gray-300'}`}>
                                                {msg.senderName} {msg.role === 'mentor' ? '★' : ''}
                                            </span>
                                            <span className="text-[10px] opacity-60">{msg.time}</span>
                                        </div>
                                        <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed shadow ${
                                            isMe ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                        }`}>
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(event) => setInputText(event.target.value)}
                            placeholder="Ketik pesan kelas..."
                            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-orange-500 focus:bg-white/10"
                            maxLength={500}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Kirim pesan"
                        >
                            <SendIcon sx={{ fontSize: 17 }} />
                        </button>
                    </form>
                </div>
            )}
        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}

export default function LiveClassRoom({
    deck,
    availableDecks = [],
    session = null,
    role: initialRole = 'mentor',
    participants: initialParticipantRows = [],
    tokenEndpoint = null,
    stateEndpoint = null,
    endEndpoint = null,
    leaveEndpoint = null,
    participantEndpoint = null,
    muteAllEndpoint = null,
    joinUrl = null,
    initialStageMode = 'slides',
    exitUrl: customExitUrl = null,
}) {
    const [currentDeck, setCurrentDeck] = useState(deck);
    const [deckPickerOpen, setDeckPickerOpen] = useState(false);
    const [switchingDeck, setSwitchingDeck] = useState(false);

    useEffect(() => {
        if (deck) {
            setCurrentDeck(deck);
        }
    }, [deck]);

    const resolvedDeck = currentDeck || {
        title: session?.program?.title || 'Papan Tulis',
        module: null,
        slides: [],
    };
    const slides = resolvedDeck.slides || [];
    const hasSlides = slides.length > 0;
    const stageRef = useRef(null);
    const cameraContainerRef = useRef(null);
    const dockedCameraContainerRef = useRef(null);
    const screenContainerRef = useRef(null);
    const remoteAudioContainerRef = useRef(null);
    const roomRef = useRef(null);
    const echoChannelRef = useRef(null);
    const cameraDragRef = useRef(null);
    const previousCanDrawRef = useRef(false);
    const copyFeedbackTimerRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectRoomRef = useRef(null);
    const joiningRef = useRef(false);
    const intentionalDisconnectRef = useRef(false);
    const sessionUnavailableRef = useRef(false);
    const mediaPreferencesRef = useRef({ micEnabled: true, cameraEnabled: true, microphoneId: '', cameraId: '' });
    const raiseHandControlRef = useRef(null);
    const raiseHandNoticeTimerRef = useRef(null);
    const snapshotTimerRef = useRef(null);
    const boardVersionRef = useRef(Number(session?.board_snapshot?.version || 0));
    const seenBoardEventsRef = useRef(new Set());
    const strokesRef = useRef(session?.board_snapshot?.strokes || []);
    const lastPointerSentAtRef = useRef(0);
    const [phase, setPhase] = useState('lobby');
    const [role, setRole] = useState(initialRole);
    const [index, setIndex] = useState(session?.current_slide_index || 0);
    const [stageMode, setStageMode] = useState(() => session?.stage_mode || (initialStageMode === 'board' || !hasSlides ? 'board' : 'slides'));
    const [tool, setTool] = useState('pointer');
    const [color, setColor] = useState('#22c55e');
    const [width, setWidth] = useState(3);
    const [strokes, setStrokes] = useState(session?.board_snapshot?.strokes || []);
    const [activeStroke, setActiveStroke] = useState(null);
    const [pointer, setPointer] = useState(null);
    const [participants, setParticipants] = useState(session ? initialParticipantRows : initialParticipants);
    const [selfParticipant, setSelfParticipant] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState('participants');
    const [messages, setMessages] = useState([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [cameraDocked, setCameraDocked] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('toku-up:live-camera-docked') === '1');
    const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [screenShareBusy, setScreenShareBusy] = useState(false);
    const [connection, setConnection] = useState('reconnecting');
    const [studentSpeaking, setStudentSpeaking] = useState(false);
    const [kicked, setKicked] = useState(false);
    const [stageMenuOpen, setStageMenuOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
    const [cameraTrack, setCameraTrack] = useState(null);
    const [screenTrack, setScreenTrack] = useState(null);
    const [remoteAudioTracks, setRemoteAudioTracks] = useState([]);
    const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
    const [cameraPosition, setCameraPosition] = useState(() => {
        if (typeof window === 'undefined') return { x: 86, y: 80 };
        try {
            const saved = JSON.parse(window.localStorage.getItem('toku-up:live-camera-position'));
            return Number.isFinite(saved?.x) && Number.isFinite(saved?.y) ? saved : { x: 86, y: 80 };
        } catch {
            return { x: 86, y: 80 };
        }
    });
    const [lowDataMode, setLowDataMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('toku-up:live-low-data') === '1');
    const [speakingIds, setSpeakingIds] = useState([]);
    const [joinError, setJoinError] = useState('');
    const [mediaError, setMediaError] = useState('');
    const [copyStatus, setCopyStatus] = useState('idle');
    const [joining, setJoining] = useState(false);
    const [devicePreferences, setDevicePreferences] = useState({ microphoneId: '', cameraId: '' });
    const [raiseHandPromptOpen, setRaiseHandPromptOpen] = useState(false);
    const [raiseHandNotice, setRaiseHandNotice] = useState('');
    const trackedCompletionRef = useRef(false);
    const currentStudent = role === 'student' ? (selfParticipant || participants[0] || initialParticipants[0]) : (participants[0] || initialParticipants[0]);
    const canDraw = role === 'mentor' || currentStudent?.canWrite;
    const activeSlide = slides[index] || null;
    const showMentorCamera = role === 'mentor' ? cameraEnabled : Boolean(cameraTrack);
    const ownStrokeOwnerId = role === 'mentor' ? 'mentor' : currentStudent?.id;
    const hasOwnStrokes = strokes.some((stroke) => stroke.ownerId === ownStrokeOwnerId);
    const resolvedJoinUrl = useMemo(() => {
        if (!joinUrl) return '';
        if (typeof window === 'undefined') return joinUrl;

        try {
            return new URL(joinUrl, window.location.origin).toString();
        } catch {
            return joinUrl;
        }
    }, [joinUrl]);

    useEffect(() => {
        if (role !== 'student' || phase !== 'ended' || trackedCompletionRef.current) return;
        trackedCompletionRef.current = true;
        pushAnalyticsEvent('class_session_completed', { session_type: 'live_class' });
    }, [phase, role]);

    const visibleStrokes = useMemo(() => strokes.filter((stroke) => !stroke.hidden), [strokes]);

    const activeSpeakerName = useMemo(() => {
        if (!speakingIds || speakingIds.length === 0) return null;
        const firstSpeakerId = speakingIds[0];
        if (Number(session?.mentor?.id) === Number(firstSpeakerId) || (role === 'mentor' && !selfParticipant)) {
            return session?.mentor?.username || 'Mentor';
        }
        const found = participants.find((p) => Number(p.id) === Number(firstSpeakerId));
        return found?.name || null;
    }, [participants, session?.mentor, speakingIds, role, selfParticipant]);

    const currentUserId = useMemo(() => {
        if (role === 'mentor') return session?.mentor?.id || 'mentor';
        return selfParticipant?.id || currentStudent?.id || 'student';
    }, [currentStudent?.id, role, selfParticipant?.id, session?.mentor?.id]);

    const sendChatMessage = useCallback(async (text) => {
        const trimmed = String(text || '').trim();
        if (!trimmed) return;
        const senderName = role === 'mentor'
            ? (session?.mentor?.username || 'Mentor')
            : (selfParticipant?.name || currentStudent?.name || 'Siswa');
        const newMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: trimmed,
            senderId: currentUserId,
            senderName,
            role,
            time: new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        };

        setMessages((prev) => [...prev, newMsg]);

        const room = roomRef.current;
        if (room?.localParticipant) {
            try {
                const payload = new TextEncoder().encode(JSON.stringify(newMsg));
                await room.localParticipant.publishData(payload, { reliable: true, topic: 'chat' });
            } catch (err) {
                console.error('[LiveClass] Gagal kirim pesan WebRTC:', err);
            }
        }
    }, [currentStudent?.name, currentUserId, role, selfParticipant?.name, session?.mentor?.username]);

    useEffect(() => {
        if (drawerOpen && drawerTab === 'chat') {
            setUnreadChatCount(0);
        }
    }, [drawerOpen, drawerTab]);

    useEffect(() => {
        window.localStorage.setItem('toku-up:live-camera-docked', cameraDocked ? '1' : '0');
    }, [cameraDocked]);

    const normalizeParticipant = useCallback((participant) => ({
        ...participant,
        id: Number(participant.id),
        initials: String(participant.name || 'P').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        handRaised: Boolean(participant.handRaised),
        canSpeak: !participant.micBlocked,
    }), []);

    const mergeParticipant = useCallback((participant) => {
        const normalized = normalizeParticipant(participant);
        setParticipants((rows) => {
            const exists = rows.some((row) => Number(row.id) === normalized.id);
            return exists
                ? rows.map((row) => Number(row.id) === normalized.id ? { ...row, ...normalized } : row)
                : [...rows, normalized];
        });
        setSelfParticipant((current) => current && Number(current.id) === normalized.id ? { ...current, ...normalized } : current);
    }, [normalizeParticipant]);

    const participantFromLiveKit = useCallback((participant) => {
        let metadata = {};
        try { metadata = JSON.parse(participant.metadata || '{}'); } catch { metadata = {}; }
        if (metadata.role !== 'student') return null;

        return normalizeParticipant({
            id: metadata.user_id || String(participant.identity || '').replace('user:', ''),
            name: participant.name || 'Peserta',
            canWrite: Boolean(metadata.can_draw),
            micBlocked: false,
        });
    }, [normalizeParticipant]);

    const persistState = useCallback((changes) => {
        if (!stateEndpoint || role !== 'mentor') return Promise.resolve();
        return axios.patch(stateEndpoint, changes).catch(() => setConnection('slow'));
    }, [role, stateEndpoint]);

    const handleSelectDeck = useCallback(async (newDeckId) => {
        if (role !== 'mentor' || !stateEndpoint || switchingDeck) return;
        setSwitchingDeck(true);
        try {
            const res = await axios.patch(stateEndpoint, {
                presentation_deck_id: newDeckId,
                current_slide_index: 0,
                stage_mode: newDeckId ? 'slides' : 'board',
            });
            if (res.data?.state?.deck !== undefined) {
                setCurrentDeck(res.data.state.deck);
            }
            setIndex(0);
            setStageMode(newDeckId ? 'slides' : 'board');
            setDeckPickerOpen(false);
        } catch (err) {
            console.error('Gagal mengganti presentasi:', err);
        } finally {
            setSwitchingDeck(false);
        }
    }, [role, stateEndpoint, switchingDeck]);

    const replaceBoardStrokes = useCallback((updater) => {
        const nextStrokes = typeof updater === 'function' ? updater(strokesRef.current) : updater;
        strokesRef.current = nextStrokes;
        setStrokes(nextStrokes);
        return nextStrokes;
    }, []);

    const flushBoardSnapshot = useCallback((extraState = {}) => {
        if (role !== 'mentor' || !stateEndpoint) return Promise.resolve();
        if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
        boardVersionRef.current += 1;

        return persistState({
            ...extraState,
            board_snapshot: {
                version: boardVersionRef.current,
                strokes: strokesRef.current,
            },
        });
    }, [persistState, role, stateEndpoint]);

    const scheduleBoardSnapshot = useCallback(() => {
        if (role !== 'mentor' || !stateEndpoint) return;
        if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = window.setTimeout(() => flushBoardSnapshot(), 2000);
    }, [flushBoardSnapshot, role, stateEndpoint]);

    const applyBoardEvent = useCallback((event) => {
        if (!event?.eventId || !event?.type || seenBoardEventsRef.current.has(event.eventId)) return;
        seenBoardEventsRef.current.add(event.eventId);
        if (seenBoardEventsRef.current.size > 1000) {
            seenBoardEventsRef.current = new Set([...seenBoardEventsRef.current].slice(-500));
        }

        replaceBoardStrokes((current) => {
            if (event.type === 'append' && event.stroke && !current.some((stroke) => stroke.id === event.stroke.id)) {
                return [...current, event.stroke].slice(-MAX_BOARD_STROKES);
            }
            if (event.type === 'remove') return current.filter((stroke) => stroke.id !== event.strokeId);
            if (event.type === 'clear') {
                return event.ownerId == null
                    ? []
                    : current.filter((stroke) => String(stroke.ownerId) !== String(event.ownerId));
            }
            return current;
        });

        if (role === 'mentor') scheduleBoardSnapshot();
    }, [replaceBoardStrokes, role, scheduleBoardSnapshot]);

    const publishBoardEvent = useCallback((event) => {
        const payload = {
            ...event,
            eventId: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        };
        applyBoardEvent(payload);
        echoChannelRef.current?.whisper('board-change', payload);
    }, [applyBoardEvent, role]);

    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    useEffect(() => {
        window.localStorage.setItem('toku-up:live-low-data', lowDataMode ? '1' : '0');
    }, [lowDataMode]);

    useEffect(() => {
        window.localStorage.setItem('toku-up:live-camera-position', JSON.stringify(cameraPosition));
    }, [cameraPosition]);

    useEffect(() => {
        const quality = lowDataMode ? VideoQuality.LOW : VideoQuality.HIGH;
        roomRef.current?.remoteParticipants.forEach((participant) => {
            participant.videoTrackPublications.forEach((publication) => publication.setVideoQuality?.(quality));
        });
    }, [lowDataMode]);

    useEffect(() => () => {
        if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current);
    }, []);

    useEffect(() => {
        if (role !== 'student') return;

        if (canDraw && !previousCanDrawRef.current) {
            setTool('pen');
            setToolsOpen(true);
        } else if (!canDraw && previousCanDrawRef.current) {
            setTool('pointer');
            setToolsOpen(false);
            setActiveStroke(null);
        }

        previousCanDrawRef.current = Boolean(canDraw);
    }, [canDraw, role]);

    useEffect(() => {
        const container = cameraDocked ? dockedCameraContainerRef.current : cameraContainerRef.current;
        if (!container || !cameraTrack) return undefined;
        const element = cameraTrack.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.className = 'h-full w-full object-cover';
        container.replaceChildren(element);

        return () => {
            cameraTrack.detach(element);
            element.remove();
        };
    }, [cameraDocked, cameraTrack, phase]);

    useEffect(() => {
        const container = screenContainerRef.current;
        if (!container || !screenTrack) return undefined;
        const element = screenTrack.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.className = 'h-full w-full object-contain bg-black';
        container.replaceChildren(element);

        return () => {
            screenTrack.detach(element);
            element.remove();
        };
    }, [screenTrack, stageMode]);

    useEffect(() => {
        const container = remoteAudioContainerRef.current;
        if (!container) return undefined;

        const attached = remoteAudioTracks.map((track) => {
            const element = track.attach();
            element.autoplay = true;
            element.playsInline = true;
            element.controls = false;
            container.appendChild(element);
            element.play()
                .then(() => setAudioPlaybackBlocked(false))
                .catch(() => setAudioPlaybackBlocked(true));

            return { element, track };
        });

        return () => {
            attached.forEach(({ element, track }) => {
                track.detach(element);
                element.remove();
            });
        };
    }, [remoteAudioTracks, phase]);

    useEffect(() => {
        if (!session?.id) return undefined;

        const channel = getEcho().private(`live-class.${session.id}`);
        echoChannelRef.current = channel;
        channel.listen('.state.updated', (payload) => {
            if (payload.status === 'ended') setPhase('ended');
            if (payload.stage_mode) setStageMode(payload.stage_mode);
            if (Number.isInteger(payload.current_slide_index)) setIndex(payload.current_slide_index);
            if (payload.deck !== undefined) {
                setCurrentDeck(payload.deck);
            }
            if (payload.board_snapshot?.strokes && Number(payload.board_snapshot.version || 0) >= boardVersionRef.current) {
                boardVersionRef.current = Number(payload.board_snapshot.version || 0);
                replaceBoardStrokes(payload.board_snapshot.strokes);
            }
            if (payload.drawing_reset) {
                setParticipants((rows) => rows.map((item) => ({ ...item, canWrite: false })));
                setSelfParticipant((current) => current ? { ...current, canWrite: false } : current);
            }
            if (payload.participant) mergeParticipant(payload.participant);
            if (payload.participant_removed) setParticipants((rows) => rows.filter((item) => Number(item.id) !== Number(payload.participant_removed)));
        });
        channel.listenForWhisper('pointer', (payload) => setPointer(payload?.point || null));
        channel.listenForWhisper('board-change', applyBoardEvent);
        // Compatibility for clients that were already open before the delta protocol was deployed.
        channel.listenForWhisper('strokes', (payload) => {
            if (!Array.isArray(payload?.strokes)) return;
            replaceBoardStrokes(payload.strokes.slice(-MAX_BOARD_STROKES));
            if (role === 'mentor') scheduleBoardSnapshot();
        });
        channel.listenForWhisper('raise-hand', (payload) => {
            setParticipants((rows) => rows.map((item) => Number(item.id) === Number(payload?.userId) ? {
                ...item,
                handRaised: Boolean(payload.raised),
                handRaisedAt: payload.raised ? Number(payload.raisedAt || Date.now()) : null,
            } : item));
        });

        return () => {
            echoChannelRef.current = null;
            leaveLiveClassChannel(session.id);
        };
    }, [applyBoardEvent, mergeParticipant, replaceBoardStrokes, role, scheduleBoardSnapshot, session?.id]);

    const clearReconnectTimer = useCallback(() => {
        if (!reconnectTimerRef.current) return;
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
    }, []);

    const scheduleRoomReconnect = useCallback((minimumDelayMs = 0) => {
        if (intentionalDisconnectRef.current || sessionUnavailableRef.current || reconnectTimerRef.current) return;

        const attempt = reconnectAttemptRef.current;
        const delay = Math.max(minimumDelayMs, Math.min(1000 * (2 ** attempt), 10000));
        reconnectAttemptRef.current += 1;
        setConnection('reconnecting');
        reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            reconnectRoomRef.current?.();
        }, delay);
    }, []);

    useEffect(() => () => {
        intentionalDisconnectRef.current = true;
        sessionUnavailableRef.current = true;
        clearReconnectTimer();
        roomRef.current?.disconnect();
        if (copyFeedbackTimerRef.current) window.clearTimeout(copyFeedbackTimerRef.current);
        if (raiseHandNoticeTimerRef.current) window.clearTimeout(raiseHandNoticeTimerRef.current);
    }, [clearReconnectTimer]);

    const copyJoinLink = useCallback(async () => {
        if (!resolvedJoinUrl) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(resolvedJoinUrl);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = resolvedJoinUrl;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand('copy');
                textarea.remove();
                if (!copied) throw new Error('Clipboard tidak tersedia');
            }

            setCopyStatus('success');
        } catch {
            setCopyStatus('error');
        }

        if (copyFeedbackTimerRef.current) window.clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), 2500);
    }, [resolvedJoinUrl]);

    const startRoom = async ({ micEnabled: startMic, cameraEnabled: startCamera, microphoneId = '', cameraId = '' }, { reconnect = false } = {}) => {
        if (joiningRef.current) return false;

        joiningRef.current = true;
        setJoining(true);
        intentionalDisconnectRef.current = false;
        if (!reconnect) {
            const preferences = { micEnabled: startMic, cameraEnabled: startCamera, microphoneId, cameraId };
            mediaPreferencesRef.current = preferences;
            setDevicePreferences({ microphoneId, cameraId });
        }

        if (!tokenEndpoint) {
            setMicEnabled(startMic);
            setCameraEnabled(startCamera);
            setConnection('connected');
            setPhase('live');
            joiningRef.current = false;
            setJoining(false);
            return true;
        }

        if (!reconnect) {
            setJoinError('');
            setMediaError('');
        }
        setConnection('reconnecting');

        let allowReconnectAfterDisconnect = true;
        let room = null;
        try {
            const { data } = await axios.post(tokenEndpoint);
            room = new Room({ adaptiveStream: true, dynacast: true });
            roomRef.current = room;

            room.on(RoomEvent.Reconnecting, () => setConnection('reconnecting'));
            room.on(RoomEvent.Reconnected, () => setConnection('connected'));
            room.on(RoomEvent.ConnectionStateChanged, (state) => {
                if (state === ConnectionState.Connected) setConnection('connected');
            });
            room.on(RoomEvent.ParticipantConnected, (participant) => {
                const row = participantFromLiveKit(participant);
                if (row) mergeParticipant(row);
            });
            room.on(RoomEvent.ParticipantDisconnected, (participant) => {
                const id = Number(String(participant.identity || '').replace('user:', ''));
                setParticipants((rows) => rows.filter((item) => Number(item.id) !== id));
            });
            room.on(RoomEvent.ActiveSpeakersChanged, (activeSpeakers) => {
                setSpeakingIds(activeSpeakers.map((participant) => Number(String(participant.identity || '').replace('user:', ''))).filter(Number.isFinite));
            });
            room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                if (topic === 'chat') {
                    try {
                        const parsed = JSON.parse(new TextDecoder().decode(payload));
                        setMessages((prev) => [...prev, parsed]);
                        setUnreadChatCount((count) => count + 1);
                    } catch (e) {
                        console.error('[LiveKit] Data chat parse error:', e);
                    }
                }
            });
            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === Track.Kind.Audio) {
                    setRemoteAudioTracks((tracks) => tracks.includes(track) ? tracks : [...tracks, track]);
                } else if (publication.source === Track.Source.ScreenShare) {
                    setScreenTrack(track);
                    setStageMode('screen');
                } else if (publication.source === Track.Source.Camera) {
                    let metadata = {};
                    try { metadata = JSON.parse(participant.metadata || '{}'); } catch { metadata = {}; }
                    if (metadata.role === 'mentor') setCameraTrack(track);
                }
                if (track.kind === Track.Kind.Video && lowDataMode) publication.setVideoQuality?.(VideoQuality.LOW);
            });
            room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
                if (track.kind === Track.Kind.Audio) {
                    setRemoteAudioTracks((tracks) => tracks.filter((item) => item !== track));
                }
                if (publication.source === Track.Source.ScreenShare) setScreenTrack(null);
                if (publication.source === Track.Source.Camera) setCameraTrack(null);
                track.detach();
            });
            room.on(RoomEvent.LocalTrackPublished, (publication) => {
                if (publication.source === Track.Source.ScreenShare) {
                    setScreenTrack(publication.track || null);
                    setScreenSharing(true);
                }
                if (publication.source === Track.Source.Camera) setCameraTrack(publication.track || null);
            });
            room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
                if (publication.source === Track.Source.ScreenShare) {
                    setScreenTrack(null);
                    setScreenSharing(false);
                    setStageMode((current) => current === 'screen' ? (hasSlides ? 'slides' : 'board') : current);
                    persistState({ stage_mode: hasSlides ? 'slides' : 'board' });
                }
                if (publication.source === Track.Source.Camera) setCameraTrack(null);
            });
            room.on(RoomEvent.Disconnected, (reason) => {
                if (roomRef.current && roomRef.current !== room) return;
                if (roomRef.current === room) roomRef.current = null;
                setRemoteAudioTracks([]);
                setCameraTrack(null);
                setScreenTrack(null);
                setScreenSharing(false);

                if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
                    sessionUnavailableRef.current = true;
                    clearReconnectTimer();
                    setKicked(true);
                    return;
                }

                if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.ROOM_CLOSED) {
                    sessionUnavailableRef.current = true;
                    clearReconnectTimer();
                    setPhase('ended');
                    return;
                }

                if (allowReconnectAfterDisconnect && !intentionalDisconnectRef.current && !sessionUnavailableRef.current) {
                    scheduleRoomReconnect();
                }
            });

            await room.connect(data.server_url, data.participant_token);
            await room.startAudio().catch(() => setAudioPlaybackBlocked(true));
            room.remoteParticipants.forEach((participant) => {
                const row = participantFromLiveKit(participant);
                if (row) mergeParticipant(row);
            });

            const self = normalizeParticipant(data.participant);
            setSelfParticipant(self);
            if (role === 'student') mergeParticipant(self);

            if (role === 'mentor') {
                let microphoneActive = false;
                let cameraActive = false;

                if (startMic) {
                    try {
                        await room.localParticipant.setMicrophoneEnabled(true, {
                            deviceId: microphoneId || undefined,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        });
                        microphoneActive = true;
                    } catch (error) {
                        setMediaError(mediaIssueMessage(error, 'Mikrofon'));
                    }
                }

                if (startCamera) {
                    try {
                        const publication = await room.localParticipant.setCameraEnabled(true, {
                            deviceId: cameraId || undefined,
                            facingMode: 'user',
                            resolution: lowDataMode
                                ? { width: 640, height: 360, frameRate: 15 }
                                : { width: 1280, height: 720, frameRate: 24 },
                        });
                        setCameraTrack(publication?.track || room.localParticipant.getTrackPublication(Track.Source.Camera)?.track || null);
                        cameraActive = true;
                    } catch (error) {
                        setMediaError((current) => [current, mediaIssueMessage(error, 'Kamera')].filter(Boolean).join(' '));
                    }
                }

                setMicEnabled(microphoneActive);
                setCameraEnabled(cameraActive);
            } else {
                await room.localParticipant.setMicrophoneEnabled(false);
                setStudentSpeaking(false);
                setMicEnabled(false);
                setCameraEnabled(false);
            }

            clearReconnectTimer();
            reconnectAttemptRef.current = 0;
            setConnection('connected');
            setPhase('live');
            return true;
        } catch (error) {
            allowReconnectAfterDisconnect = false;
            if (roomRef.current === room) roomRef.current = null;
            room?.disconnect();

            const status = Number(error?.response?.status || 0);
            if (reconnect && status === 409) {
                sessionUnavailableRef.current = true;
                clearReconnectTimer();
                setPhase('ended');
            } else if (reconnect && (status === 401 || status === 403)) {
                sessionUnavailableRef.current = true;
                clearReconnectTimer();
                setKicked(true);
            } else if (reconnect) {
                setConnection('reconnecting');
                const retryAfterSeconds = Number(error?.response?.headers?.['retry-after'] || 0);
                scheduleRoomReconnect(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0);
            } else {
                setJoinError(joinIssueMessage(error));
                setConnection('slow');
            }
            return false;
        } finally {
            joiningRef.current = false;
            setJoining(false);
        }
    };

    reconnectRoomRef.current = () => startRoom(mediaPreferencesRef.current, { reconnect: true });

    const updateParticipant = (id, changes) => {
        setParticipants((rows) => rows.map((participant) => participant.id === id ? { ...participant, ...changes } : participant));
    };

    const eventPoint = (event) => {
        const bounds = stageRef.current?.getBoundingClientRect();
        if (!bounds) return null;
        return {
            x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
        };
    };

    const startCameraDrag = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        cameraDragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - (bounds.left + bounds.width / 2),
            offsetY: event.clientY - (bounds.top + bounds.height / 2),
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.stopPropagation();
        event.preventDefault();
    };

    const moveCamera = (event) => {
        const drag = cameraDragRef.current;
        const stageBounds = stageRef.current?.getBoundingClientRect();
        if (!drag || drag.pointerId !== event.pointerId || !stageBounds) return;

        const cameraBounds = event.currentTarget.getBoundingClientRect();
        const halfWidth = (cameraBounds.width / stageBounds.width) * 50;
        const halfHeight = (cameraBounds.height / stageBounds.height) * 50;
        const x = ((event.clientX - drag.offsetX - stageBounds.left) / stageBounds.width) * 100;
        const y = ((event.clientY - drag.offsetY - stageBounds.top) / stageBounds.height) * 100;

        setCameraPosition({
            x: Math.max(halfWidth, Math.min(100 - halfWidth, x)),
            y: Math.max(halfHeight, Math.min(100 - halfHeight, y)),
        });
        event.stopPropagation();
    };

    const endCameraDrag = (event) => {
        if (cameraDragRef.current?.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        cameraDragRef.current = null;
        event.stopPropagation();
    };

    const handlePointerDown = (event) => {
        const point = eventPoint(event);
        if (!point) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);

        if (tool === 'eraser' && canDraw) {
            const match = [...visibleStrokes].reverse().find((stroke) => stroke.points.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 5));
            if (match) publishBoardEvent({ type: 'remove', strokeId: match.id });
            return;
        }

        if (tool === 'pen' && canDraw) {
            if (strokesRef.current.length >= MAX_BOARD_STROKES) {
                setMediaError('Papan sudah penuh. Hapus beberapa coretan untuk melanjutkan.');
                return;
            }
            const id = `${role}-${Date.now()}`;
            setActiveStroke(id);
            replaceBoardStrokes((rows) => [...rows, { id, ownerId: role === 'mentor' ? 'mentor' : currentStudent.id, color, width, points: [point] }]);
        }
    };

    const handlePointerMove = (event) => {
        const point = eventPoint(event);
        if (!point) return;
        if (tool === 'pointer') {
            setPointer(point);
            if (Date.now() - lastPointerSentAtRef.current > 40) {
                echoChannelRef.current?.whisper('pointer', { point });
                lastPointerSentAtRef.current = Date.now();
            }
        }
        if (activeStroke) {
            replaceBoardStrokes((rows) => rows.map((stroke) => {
                if (stroke.id !== activeStroke || stroke.points.length >= MAX_STROKE_POINTS) return stroke;
                const previous = stroke.points[stroke.points.length - 1];
                if (Math.hypot(previous.x - point.x, previous.y - point.y) < MIN_POINT_DISTANCE) return stroke;
                return { ...stroke, points: [...stroke.points, point] };
            }));
        }
    };

    const endStroke = () => {
        const completedStroke = activeStroke ? strokesRef.current.find((stroke) => stroke.id === activeStroke) : null;
        if (completedStroke) publishBoardEvent({ type: 'append', stroke: completedStroke });
        setActiveStroke(null);
    };
    const exitUrl = customExitUrl?.startsWith('/admin/presentations')
        ? route('admin.programs.index')
        : customExitUrl || route('admin.programs.index');
    const selectStageMode = async (mode) => {
        if (mode === 'slides' && !hasSlides) return;
        if (screenShareBusy) return;

        const room = roomRef.current;
        const fallbackMode = hasSlides ? 'slides' : 'board';

        setMediaError('');

        if (
            role === 'mentor'
            && mode === 'screen'
            && (!room || room.state !== ConnectionState.Connected)
        ) {
            setMediaError('Koneksi kelas belum siap. Tunggu hingga tersambung, lalu coba lagi.');
            return;
        }

        setScreenShareBusy(true);

        try {
            if (role === 'mentor' && room) {
                if (mode === 'screen') {
                    const publication = await room.localParticipant.setScreenShareEnabled(true, {
                        audio: true,
                        resolution: { width: 1280, height: 720, frameRate: lowDataMode ? 8 : 15 },
                    });
                    setScreenTrack(publication?.track || room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track || null);
                } else if (screenSharing) {
                    await room.localParticipant.setScreenShareEnabled(false);
                    setScreenTrack(null);
                }
            }

            setStageMode(mode);
            setScreenSharing(mode === 'screen');
            setStageMenuOpen(false);
            flushBoardSnapshot({ stage_mode: mode });
        } catch (error) {
            const cancelled = error?.name === 'NotAllowedError';
            setMediaError(cancelled
                ? 'Berbagi layar dibatalkan. Pilih layar atau jendela saat ingin mencoba lagi.'
                : mediaIssueMessage(error, 'Berbagi layar'));
            setScreenSharing(false);
            setScreenTrack(null);
            setStageMode(fallbackMode);
            setStageMenuOpen(false);
        } finally {
            setScreenShareBusy(false);
        }
    };

    const changeSlide = (nextIndex) => {
        const safeIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
        setIndex(safeIndex);
        flushBoardSnapshot({ current_slide_index: safeIndex, stage_mode: 'slides' });
    };

    const toggleMentorMic = async () => {
        const next = !micEnabled;
        setMediaError('');
        try {
            await roomRef.current?.localParticipant.setMicrophoneEnabled(next, next ? {
                deviceId: devicePreferences.microphoneId || undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            } : undefined);
            mediaPreferencesRef.current = { ...mediaPreferencesRef.current, micEnabled: next };
            setMicEnabled(next);
        } catch (error) {
            setMediaError(mediaIssueMessage(error, 'Mikrofon'));
            setConnection('slow');
        }
    };

    const toggleMentorCamera = async () => {
        const next = !cameraEnabled;
        setMediaError('');
        try {
            const publication = await roomRef.current?.localParticipant.setCameraEnabled(next, next ? {
                deviceId: devicePreferences.cameraId || undefined,
                facingMode: 'user',
                resolution: lowDataMode
                    ? { width: 640, height: 360, frameRate: 15 }
                    : { width: 1280, height: 720, frameRate: 24 },
            } : undefined);
            setCameraTrack(next ? publication?.track || roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track || null : null);
            mediaPreferencesRef.current = { ...mediaPreferencesRef.current, cameraEnabled: next };
            setCameraEnabled(next);
        } catch (error) {
            setMediaError(mediaIssueMessage(error, 'Kamera'));
            setConnection('slow');
        }
    };

    const setStudentMic = async (enabled) => {
        if (!currentStudent?.canSpeak || currentStudent?.micBlocked) return false;
        try {
            await roomRef.current?.localParticipant.setMicrophoneEnabled(enabled);
            setStudentSpeaking(enabled);
            return true;
        } catch {
            setStudentSpeaking(false);
            setConnection('slow');
            return false;
        }
    };

    const enableRemoteAudio = async () => {
        try {
            await roomRef.current?.startAudio();
            const elements = remoteAudioContainerRef.current?.querySelectorAll('audio') || [];
            await Promise.all(Array.from(elements).map((element) => element.play()));
            setAudioPlaybackBlocked(false);
            setMediaError('');
        } catch (error) {
            setMediaError('Suara belum dapat diputar. Ketuk tombol suara sekali lagi atau periksa volume perangkat.');
        }
    };

    const applyRaiseHandState = async (raised) => {
        if (raised) {
            await setStudentMic(true);
        } else {
            await setStudentMic(false);
        }

        const raisedAt = raised ? Date.now() : null;
        setSelfParticipant((current) => current ? { ...current, handRaised: raised, handRaisedAt: raisedAt } : current);
        setParticipants((rows) => rows.map((participant) => Number(participant.id) === Number(currentStudent?.id) ? { ...participant, handRaised: raised, handRaisedAt: raisedAt } : participant));
        echoChannelRef.current?.whisper('raise-hand', { userId: currentStudent?.id, raised, raisedAt });
    };

    const showRaiseHandNotice = (message) => {
        if (raiseHandNoticeTimerRef.current) window.clearTimeout(raiseHandNoticeTimerRef.current);
        setRaiseHandNotice(message);
        raiseHandNoticeTimerRef.current = window.setTimeout(() => setRaiseHandNotice(''), 2600);
    };

    const handleRaiseHandButton = async () => {
        if (!currentStudent?.handRaised) {
            setRaiseHandNotice('');
            setRaiseHandPromptOpen(true);
            return;
        }

        await applyRaiseHandState(false);
        showRaiseHandNotice('Tangan diturunkan. Gunakan tahan bicara jika ingin berbicara lagi.');
    };

    const confirmRaiseHand = async () => {
        setRaiseHandPromptOpen(false);
        await applyRaiseHandState(true);
        showRaiseHandNotice('Tangan terangkat. Mentor dapat melihat permintaanmu.');
    };

    useEffect(() => {
        if (!raiseHandPromptOpen) return undefined;

        const closeOnOutside = (event) => {
            if (!raiseHandControlRef.current?.contains(event.target)) setRaiseHandPromptOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setRaiseHandPromptOpen(false);
        };

        document.addEventListener('pointerdown', closeOnOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [raiseHandPromptOpen]);

    useEffect(() => {
        if (role !== 'student' || phase !== 'live' || currentStudent?.handRaised || currentStudent?.micBlocked || !currentStudent?.canSpeak) return undefined;
        if (!window.matchMedia('(pointer: fine)').matches) return undefined;

        let pressed = false;
        const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
        const handleKeyDown = (event) => {
            if (event.code !== 'Space' || event.repeat || isTyping(event.target)) return;
            event.preventDefault();
            pressed = true;
            setStudentMic(true);
        };
        const releaseMic = (event) => {
            if (event?.code && event.code !== 'Space') return;
            if (!pressed) return;
            event?.preventDefault?.();
            pressed = false;
            setStudentMic(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', releaseMic);
        window.addEventListener('blur', releaseMic);

        return () => {
            if (pressed) roomRef.current?.localParticipant.setMicrophoneEnabled(false).catch(() => {});
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', releaseMic);
            window.removeEventListener('blur', releaseMic);
        };
    }, [currentStudent?.canSpeak, currentStudent?.handRaised, currentStudent?.micBlocked, phase, role]);

    useEffect(() => {
        if (role === 'student' && currentStudent?.micBlocked && studentSpeaking) {
            setStudentSpeaking(false);
        }
    }, [currentStudent?.micBlocked, role, studentSpeaking]);

    const undoOwnStroke = () => {
        const ownerId = role === 'mentor' ? 'mentor' : currentStudent?.id;
        const lastIndex = [...strokesRef.current].map((stroke) => stroke.ownerId).lastIndexOf(ownerId);
        if (lastIndex < 0) return;
        publishBoardEvent({ type: 'remove', strokeId: strokesRef.current[lastIndex].id });
    };

    const clearOwnStrokes = () => {
        const ownerId = role === 'mentor' ? 'mentor' : currentStudent?.id;
        publishBoardEvent({ type: 'clear', ownerId });
    };

    const downloadBoardImage = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.lineCap = 'round';
        context.lineJoin = 'round';

        visibleStrokes.forEach((stroke) => {
            if (stroke.points.length < 2) return;
            context.beginPath();
            context.strokeStyle = stroke.color;
            context.lineWidth = Math.max(2, stroke.width * 2);
            stroke.points.forEach((point, pointIndex) => {
                const x = (point.x / 100) * canvas.width;
                const y = (point.y / 100) * canvas.height;
                if (pointIndex === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            });
            context.stroke();
        });

        const link = document.createElement('a');
        link.download = `papan-kelas-${session?.join_code || Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const updateRemoteParticipant = async (id, changes) => {
        updateParticipant(id, changes);
        if (!participantEndpoint) return;

        const endpoint = participantEndpoint.replace('__USER__', String(id));
        if (Object.hasOwn(changes, 'micBlocked')) {
            const { data } = await axios.patch(endpoint, { action: 'mic', enabled: !changes.micBlocked });
            mergeParticipant(data.participant);
        }
        if (Object.hasOwn(changes, 'canWrite')) {
            const { data } = await axios.patch(endpoint, { action: 'drawing', enabled: changes.canWrite });
            if (changes.canWrite) setParticipants((rows) => rows.map((item) => ({ ...item, canWrite: Number(item.id) === Number(id) })));
            mergeParticipant(data.participant);
        }
    };

    const kickRemoteParticipant = async (id) => {
        if (!window.confirm('Keluarkan siswa ini dari sesi?')) return;
        if (participantEndpoint) await axios.delete(participantEndpoint.replace('__USER__', String(id)));
        setParticipants((rows) => rows.filter((participant) => Number(participant.id) !== Number(id)));
    };

    const muteAllParticipants = async () => {
        if (!muteAllEndpoint || !window.confirm('Matikan dan blokir mikrofon seluruh siswa dalam sesi ini?')) return;
        await axios.post(muteAllEndpoint);
        setParticipants((rows) => rows.map((participant) => ({ ...participant, micBlocked: true, canSpeak: false })));
        setSpeakingIds([]);
    };

    const leaveOrEnd = async () => {
        const message = role === 'mentor' ? 'Akhiri ruang kelas untuk semua peserta?' : 'Keluar dari ruang kelas?';
        if (!window.confirm(message)) return;

        if (role === 'mentor' && endEndpoint) {
            await flushBoardSnapshot();
            await axios.post(endEndpoint);
            intentionalDisconnectRef.current = true;
            sessionUnavailableRef.current = true;
            clearReconnectTimer();
            roomRef.current?.disconnect();
            setPhase('ended');
        } else {
            if (leaveEndpoint) await axios.post(leaveEndpoint).catch(() => null);
            intentionalDisconnectRef.current = true;
            sessionUnavailableRef.current = true;
            clearReconnectTimer();
            roomRef.current?.disconnect();
            window.location.assign(exitUrl);
        }
    };

    if (phase === 'lobby') {
        return (
            <div className="relative">
                <Lobby deck={resolvedDeck} session={session} role={role} joining={joining} lowDataMode={lowDataMode} onToggleLowData={() => setLowDataMode((value) => !value)} onExit={() => window.location.assign(exitUrl)} onStart={startRoom} />
                {joinError && <div className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-red-400/30 bg-red-950 px-4 py-3 text-center text-sm font-bold text-red-100 shadow-2xl">{joinError}</div>}
            </div>
        );
    }

    if (phase === 'ended' || kicked) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#070b14] p-6 text-white">
                <section className="w-full max-w-lg text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-500/15 text-orange-300"><CallEndIcon /></div>
                    <h1 className="mt-5 text-3xl font-black">{kicked ? 'Anda dikeluarkan dari sesi' : 'Ruang kelas telah berakhir'}</h1>
                    <p className="mt-3 text-sm font-semibold leading-6 text-gray-400">{kicked ? 'Mentor telah menutup akses Anda ke kelas ini.' : 'Terima kasih sudah mengikuti kelas.'}</p>
                    {role === 'student' && !kicked && session?.id && (
                        <ContextualFeedbackPrompt feature="live_class" contextId={session.id} className="mt-6 border-white/10 bg-[#111827] text-left" />
                    )}
                    <Link href={exitUrl} className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-black text-white">Kembali ke Roadmap</Link>
                </section>
            </main>
        );
    }

    return (
        <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#070b14] text-white">
            <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0b111d] px-2.5 sm:h-14 sm:gap-3 sm:px-4">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-black sm:text-sm">{resolvedDeck.title}</p><p className="hidden truncate text-[11px] font-bold text-gray-500 sm:block">{resolvedDeck.module?.title || 'Ruang kelas'}</p></div>
                <span className="hidden items-center gap-2 text-[11px] font-bold text-gray-400 md:inline-flex">
                    <span className={`h-2 w-2 rounded-full ${connection === 'connected' ? 'bg-emerald-400' : connection === 'slow' ? 'bg-amber-400' : 'animate-pulse bg-blue-400'}`} />
                    {connectionLabels[connection]}
                </span>
                <button
                    type="button"
                    onClick={() => { setDrawerOpen(true); setDrawerTab('chat'); setUnreadChatCount(0); }}
                    className="relative grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    title="Obrolan Kelas"
                >
                    <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />
                    {unreadChatCount > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white">
                            {unreadChatCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => { setDrawerOpen(true); setDrawerTab('participants'); }}
                    className="relative grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    title="Peserta"
                >
                    <PeopleIcon sx={{ fontSize: 19 }} />
                    <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 text-[9px] font-black text-white">{participants.length + 1}</span>
                </button>
                {role === 'mentor' && (
                    <button
                        type="button"
                        onClick={() => setDeckPickerOpen(true)}
                        className="flex h-9 items-center gap-2 rounded-lg bg-orange-500/20 px-2.5 text-xs font-black text-orange-300 transition hover:bg-orange-500/30 sm:px-3"
                        title="Pilih atau ganti presentasi kelas"
                    >
                        <AutoStoriesIcon sx={{ fontSize: 16 }} />
                        <span className="hidden sm:inline">Pilih PPT</span>
                    </button>
                )}
                {role === 'mentor' && resolvedJoinUrl && (
                    <button
                        type="button"
                        onClick={copyJoinLink}
                        className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-black transition sm:px-3 ${copyStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300' : copyStatus === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}
                        title={copyStatus === 'error' ? `Gagal menyalin. Link: ${resolvedJoinUrl}` : resolvedJoinUrl}
                        aria-label={copyStatus === 'success' ? 'Link siswa berhasil disalin' : 'Salin link siswa'}
                    >
                        {copyStatus === 'success' ? <CheckIcon sx={{ fontSize: 17 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                        <span className="hidden sm:inline">{copyStatus === 'success' ? 'Link tersalin' : copyStatus === 'error' ? 'Belum tersalin' : 'Salin link siswa'}</span>
                    </button>
                )}
                {!session && <button type="button" onClick={() => setPreviewMenuOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-gray-300 hover:bg-white/10" aria-label="Opsi pratinjau" title="Opsi pratinjau"><MoreVertIcon sx={{ fontSize: 19 }} /></button>}
                {!session && previewMenuOpen && (
                    <div className="absolute right-3 top-12 z-50 w-56 rounded-xl border border-white/10 bg-[#172033] p-2 shadow-2xl">
                        <p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Mode pratinjau</p>
                        <button type="button" onClick={() => { setRole((value) => value === 'mentor' ? 'student' : 'mentor'); setPreviewMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs font-black text-gray-200 hover:bg-white/10">
                            {role === 'mentor' ? 'Lihat sebagai siswa' : 'Kembali sebagai mentor'}
                        </button>
                        <label className="mt-1 block rounded-lg px-3 py-2 text-xs font-bold text-gray-400">
                            Pratinjau kondisi jaringan
                            <select value={connection} onChange={(event) => setConnection(event.target.value)} className="mt-1.5 w-full rounded-lg border-white/10 bg-gray-900 py-1.5 text-xs font-black text-white focus:border-orange-400 focus:ring-orange-400">
                                <option value="connected">Terhubung</option><option value="reconnecting">Menyambungkan kembali</option><option value="slow">Koneksi kurang stabil</option>
                            </select>
                        </label>
                    </div>
                )}
            </header>

            {connection !== 'connected' && (
                <div className={`z-20 flex min-h-8 shrink-0 items-center justify-center gap-2 px-3 py-1 text-center text-[11px] font-black sm:text-xs ${connection === 'slow' ? 'bg-amber-500 text-gray-950' : 'bg-blue-600 text-white'}`}>
                    <WifiIcon sx={{ fontSize: 15 }} /> {connection === 'slow'
                        ? 'Koneksi sedang kurang stabil. Materi terakhir tetap ditampilkan.'
                        : 'Koneksi terputus sementara. Kami sedang menyambungkan kembali.'}
                </div>
            )}

            {mediaError && (
                <div className="z-20 flex min-h-9 shrink-0 items-center justify-between gap-3 bg-red-700 px-3 py-2 text-xs font-bold text-white sm:px-4">
                    <span>{mediaError}</span>
                    <button type="button" onClick={() => setMediaError('')} className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10" aria-label="Tutup pesan media"><CloseIcon sx={{ fontSize: 15 }} /></button>
                </div>
            )}

            {audioPlaybackBlocked && (
                <div className="z-20 flex min-h-10 shrink-0 items-center justify-center gap-3 bg-amber-400 px-3 py-2 text-xs font-black text-gray-950 sm:px-4">
                    <span>Browser menahan audio kelas.</span>
                    <button type="button" onClick={enableRemoteAudio} className="rounded-lg bg-gray-950 px-3 py-1.5 text-white hover:bg-gray-800">Aktifkan suara</button>
                </div>
            )}

            <div className="relative flex min-h-0 flex-1">
                {thumbnailsOpen && (
                    <aside className="absolute inset-y-0 left-0 z-40 w-[min(82vw,14rem)] overflow-y-auto border-r border-white/10 bg-[#0b111d]/95 p-3 backdrop-blur sm:static sm:w-56 sm:shrink-0">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Slide ({slides.length})</p>
                            <div className="flex items-center gap-1.5">
                                {role === 'mentor' && (
                                    <button
                                        type="button"
                                        onClick={() => setDeckPickerOpen(true)}
                                        className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-black text-orange-400 hover:bg-orange-500/30"
                                        title="Ganti PPT"
                                    >
                                        Ganti
                                    </button>
                                )}
                                <button type="button" onClick={() => setThumbnailsOpen(false)} className="text-gray-400 hover:text-white sm:hidden"><CloseIcon sx={{ fontSize: 18 }} /></button>
                            </div>
                        </div>
                        {slides.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
                                <p className="text-xs text-gray-400">Belum ada slide aktif.</p>
                                {role === 'mentor' && (
                                    <button
                                        type="button"
                                        onClick={() => setDeckPickerOpen(true)}
                                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-black text-white hover:bg-orange-400"
                                    >
                                        <AutoStoriesIcon sx={{ fontSize: 14 }} /> Pilih PPT
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {slides.map((slide, slideIndex) => (
                                    <button type="button" key={slide.id || slideIndex} onClick={() => { changeSlide(slideIndex); if (window.innerWidth < 640) setThumbnailsOpen(false); }} className={`w-full rounded-lg border p-2 text-left ${slideIndex === index ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                                        <span className="text-[10px] font-black text-gray-500">{slideIndex + 1}</span><p className="mt-1 line-clamp-2 text-xs font-bold">{slide.title || `Slide ${slideIndex + 1}`}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </aside>
                )}

                <section className="relative flex min-w-0 flex-1 flex-col bg-black p-1 sm:p-2 lg:p-3">
                    <div
                        ref={stageRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endStroke}
                        onPointerCancel={endStroke}
                        onPointerLeave={() => { if (!activeStroke) setPointer(null); }}
                        className={`relative mx-auto aspect-video max-h-full w-full max-w-[calc((100dvh-7.5rem)*16/9)] flex-1 touch-none overflow-hidden rounded-lg border border-white/10 bg-gray-900 shadow-2xl sm:max-w-[calc((100dvh-9.5rem)*16/9)] sm:rounded-xl ${tool === 'pen' && canDraw ? 'cursor-crosshair' : ''}`}
                    >
                        {activeSpeakerName && (
                            <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-gray-950/85 px-3 py-1.5 shadow-xl backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                <MicIcon sx={{ fontSize: 15 }} className="text-emerald-400" />
                                <span className="text-xs font-black text-white">{activeSpeakerName}</span>
                            </div>
                        )}

                        {stageMode === 'slides' && <PresentationStage slide={activeSlide} contained className="absolute inset-0" />}
                        {stageMode === 'board' && <div className="absolute inset-0 bg-white bg-[linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />}
                        {stageMode === 'screen' && <div className="absolute inset-0 grid place-items-center bg-[#111827] p-6 text-center"><div ref={screenContainerRef} className="absolute inset-0" />{!screenTrack && <div><ScreenShareIcon sx={{ fontSize: 52 }} className="text-blue-400" /><h2 className="mt-3 text-xl font-black">Berbagi layar</h2><p className="mt-2 text-sm font-semibold text-gray-400">Pilih layar, jendela, atau tab browser yang ingin dibagikan.</p></div>}</div>}

                        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {visibleStrokes.map((stroke) => <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width / 5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
                        </svg>
                        {pointer && tool === 'pointer' && <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow-lg" style={{ left: `${pointer.x}%`, top: `${pointer.y}%` }} />}

                        {showMentorCamera && !cameraDocked && (
                            <div
                                onPointerDown={startCameraDrag}
                                onPointerMove={moveCamera}
                                onPointerUp={endCameraDrag}
                                onPointerCancel={endCameraDrag}
                                onDoubleClick={() => setCameraPosition({ x: 86, y: 80 })}
                                className="absolute z-20 grid h-16 w-24 touch-none select-none place-items-center overflow-hidden rounded-lg border-2 border-white/25 bg-gradient-to-br from-gray-700 to-gray-950 shadow-xl cursor-grab active:cursor-grabbing sm:h-24 sm:w-36 sm:rounded-xl lg:h-28 lg:w-40"
                                style={{ left: `${cameraPosition.x}%`, top: `${cameraPosition.y}%`, transform: 'translate(-50%, -50%)' }}
                                title="Geser kamera mentor. Klik dua kali untuk mengembalikan posisi."
                            >
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setCameraDocked(true); }}
                                    className="absolute right-1 top-1 z-30 grid h-5 w-5 place-items-center rounded bg-black/60 text-gray-300 transition hover:text-white"
                                    title="Sematkan kamera ke samping panggung (Docking)"
                                >
                                    <PushPinIcon sx={{ fontSize: 13 }} />
                                </button>
                                <div ref={cameraContainerRef} className="pointer-events-none absolute inset-0" />
                                {!cameraTrack && <div className="pointer-events-none relative text-center"><span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-[10px] font-black sm:h-9 sm:w-9 sm:text-xs">MK</span><p className="mt-1 hidden text-[10px] font-black sm:block">Kamera dimuat</p></div>}
                            </div>
                        )}
                        {role === 'student' && !currentStudent?.canWrite && <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-gray-950/75 px-2.5 py-1.5 text-[10px] font-black sm:left-3 sm:top-3 sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]"><LockIcon sx={{ fontSize: 14 }} /> Hanya mentor dapat menulis</div>}
                        {role === 'student' && currentStudent?.canWrite && <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-2.5 py-1.5 text-[10px] font-black text-gray-950 sm:left-3 sm:top-3 sm:px-3 sm:py-2 sm:text-[11px]"><DrawIcon sx={{ fontSize: 14 }} /> Izin menulis aktif</div>}
                    </div>

                    <div className="mt-1 flex min-h-6 items-center justify-between gap-3 px-1 text-[10px] font-bold text-gray-400 sm:mt-2 sm:min-h-8 sm:text-xs">
                        <span>{stageMode === 'slides' ? `Slide ${slides.length ? index + 1 : 0} / ${slides.length}` : stageMode === 'board' ? 'Papan tulis' : 'Berbagi layar'}</span>
                        <span className="hidden sm:inline">{role === 'mentor' ? 'Anda mengajar sebagai mentor' : `Pratinjau sebagai ${currentStudent?.name}`}</span>
                    </div>
                </section>

                {showMentorCamera && cameraDocked && (
                    <aside className="hidden w-56 shrink-0 flex-col border-l border-white/10 bg-[#0b111d] p-3 sm:flex">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Kamera Mentor</span>
                            <button
                                type="button"
                                onClick={() => setCameraDocked(false)}
                                className="rounded p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
                                title="Lepas ke mode melayang (Floating)"
                            >
                                <PushPinIcon sx={{ fontSize: 14 }} className="rotate-45 text-orange-400" />
                            </button>
                        </div>
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-gray-950 shadow">
                            <div ref={dockedCameraContainerRef} className="absolute inset-0" />
                            {!cameraTrack && (
                                <div className="grid h-full place-items-center text-center">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-xs font-black">MK</span>
                                    <p className="mt-1 text-[10px] font-bold text-gray-400">Kamera Mentor</p>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            <footer className={`relative z-30 flex min-h-14 shrink-0 items-center justify-start gap-2 border-t border-white/10 bg-[#0b111d] px-2 py-2 [scrollbar-width:none] sm:min-h-16 sm:px-3 md:justify-center [&::-webkit-scrollbar]:hidden ${toolsOpen || stageMenuOpen || raiseHandPromptOpen || raiseHandNotice ? 'overflow-visible' : 'overflow-x-auto overflow-y-hidden'}`}>
                {role === 'mentor' && stageMenuOpen && (
                    <div className="absolute bottom-full left-2 mb-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111a2b] p-2 shadow-2xl lg:hidden">
                        <p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Tampilan kelas</p>
                        <button type="button" onClick={() => { setDeckPickerOpen(true); setStageMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-orange-400 hover:bg-white/5"><AutoStoriesIcon sx={{ fontSize: 18 }} /> Pilih PPT Kelas</button>
                        <button type="button" disabled={!hasSlides} onClick={() => selectStageMode('slides')} className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-35 ${stageMode === 'slides' ? 'bg-orange-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}><PresentToAllIcon sx={{ fontSize: 18 }} /> Presentasi</button>
                        <button type="button" onClick={() => selectStageMode('board')} className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black ${stageMode === 'board' ? 'bg-orange-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}><DrawIcon sx={{ fontSize: 18 }} /> Papan tulis</button>
                        <button type="button" disabled={screenShareBusy || connection !== 'connected'} onClick={() => selectStageMode(stageMode === 'screen' ? (hasSlides ? 'slides' : 'board') : 'screen')} className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 ${stageMode === 'screen' ? 'bg-orange-500 text-white' : 'text-gray-200 hover:bg-white/5'}`}>{screenSharing ? <StopScreenShareIcon sx={{ fontSize: 18 }} /> : <ScreenShareIcon sx={{ fontSize: 18 }} />} {screenShareBusy ? 'Menyiapkan...' : screenSharing ? 'Hentikan berbagi' : 'Bagikan layar'}</button>
                        <button type="button" onClick={() => { setThumbnailsOpen(true); setStageMenuOpen(false); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black text-gray-200 hover:bg-white/5 sm:hidden"><SlideshowIcon sx={{ fontSize: 18 }} /> Daftar slide</button>
                    </div>
                )}

                {(role === 'mentor' || (role === 'student' && canDraw)) && toolsOpen && (
                    <div className="absolute bottom-full left-2 right-2 mb-2 mx-auto max-h-[52dvh] w-[calc(100%-1rem)] max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-[#111a2b] p-3 shadow-2xl sm:max-h-none">
                        <div className="flex items-center justify-between gap-3">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">{role === 'mentor' ? 'Alat anotasi' : 'Alat menulis'}</p><p className="mt-0.5 text-[11px] font-semibold text-gray-500">{role === 'mentor' ? 'Kelola coretan pada ruang kelas.' : 'Izin menulis aktif. Coretan Anda terlihat oleh kelas.'}</p></div>
                            <button type="button" onClick={() => setToolsOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-gray-300" aria-label="Tutup alat anotasi"><CloseIcon sx={{ fontSize: 17 }} /></button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setTool('pointer')} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${tool === 'pointer' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-200'}`}><ArrowForwardIcon sx={{ fontSize: 17 }} /> Pointer</button>
                            <button type="button" onClick={() => setTool('pen')} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${tool === 'pen' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-200'}`}><BrushIcon sx={{ fontSize: 17 }} /> Pena</button>
                            <button type="button" onClick={() => setTool('eraser')} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${tool === 'eraser' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-200'}`}><DeleteSweepIcon sx={{ fontSize: 17 }} /> Penghapus</button>
                            <label title="Warna pena" className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs font-black text-gray-200"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0" /> Warna</label>
                            <label title="Ketebalan pena" className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs font-black text-gray-200"><span className="hidden sm:inline">Ketebalan</span><input type="range" min="2" max="10" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-20 accent-orange-500" /></label>
                            <button type="button" disabled={!hasOwnStrokes} onClick={undoOwnStroke} className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-gray-200 disabled:opacity-35" title="Urungkan coretan terakhir"><UndoIcon sx={{ fontSize: 18 }} /></button>
                            {role === 'mentor' && <button type="button" disabled={!strokes.length} onClick={downloadBoardImage} className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3 text-xs font-black text-gray-200 disabled:opacity-35"><DownloadIcon sx={{ fontSize: 17 }} /> Unduh PNG</button>}
                            <button type="button" disabled={role === 'mentor' ? !strokes.length : !hasOwnStrokes} onClick={() => { if (window.confirm(role === 'mentor' ? 'Hapus semua coretan pada sesi ini?' : 'Hapus semua coretan Anda?')) role === 'mentor' ? publishBoardEvent({ type: 'clear', ownerId: null }) : clearOwnStrokes(); }} className="flex h-9 items-center gap-2 rounded-lg bg-red-500/10 px-3 text-xs font-black text-red-300 disabled:opacity-35"><DeleteSweepIcon sx={{ fontSize: 17 }} /> Bersihkan</button>
                        </div>
                    </div>
                )}

                <div className="hidden sm:block"><IconButton label="Daftar slide" active={thumbnailsOpen} onClick={() => setThumbnailsOpen((value) => !value)}><SlideshowIcon sx={{ fontSize: 19 }} /></IconButton></div>
                {role === 'mentor' && (
                    <>
                        <IconButton label="Slide sebelumnya" disabled={index <= 0 || stageMode !== 'slides'} onClick={() => changeSlide(index - 1)}><ChevronLeftIcon /></IconButton>
                        <IconButton label="Slide berikutnya" disabled={index >= slides.length - 1 || stageMode !== 'slides'} onClick={() => changeSlide(index + 1)}><ChevronRightIcon /></IconButton>
                        <span className="hidden h-7 w-px shrink-0 bg-white/10 sm:block" />
                        <div className="hidden items-center gap-2 lg:flex">
                            <IconButton label="Pilih / Ganti PPT Kelas" active={deckPickerOpen} onClick={() => setDeckPickerOpen(true)}><AutoStoriesIcon sx={{ fontSize: 19 }} /></IconButton>
                            <IconButton label="Mode presentasi" disabled={!hasSlides} active={stageMode === 'slides'} onClick={() => selectStageMode('slides')}><PresentToAllIcon sx={{ fontSize: 19 }} /></IconButton>
                            <IconButton label="Papan tulis" active={stageMode === 'board'} onClick={() => selectStageMode('board')}><DrawIcon sx={{ fontSize: 19 }} /></IconButton>
                            <IconButton label={screenShareBusy ? 'Menyiapkan berbagi layar' : screenSharing ? 'Hentikan berbagi layar' : 'Bagikan layar'} disabled={screenShareBusy || connection !== 'connected'} active={stageMode === 'screen'} onClick={() => selectStageMode(stageMode === 'screen' ? (hasSlides ? 'slides' : 'board') : 'screen')}>{screenSharing ? <StopScreenShareIcon sx={{ fontSize: 19 }} /> : <ScreenShareIcon sx={{ fontSize: 19 }} />}</IconButton>
                        </div>
                        <div className="lg:hidden"><IconButton label="Pilih tampilan kelas" active={stageMenuOpen} onClick={() => { setStageMenuOpen((value) => !value); setToolsOpen(false); }}>{stageMode === 'slides' ? <PresentToAllIcon sx={{ fontSize: 19 }} /> : stageMode === 'board' ? <DrawIcon sx={{ fontSize: 19 }} /> : <ScreenShareIcon sx={{ fontSize: 19 }} />}</IconButton></div>
                        <IconButton label="Alat anotasi" active={toolsOpen || tool !== 'pointer'} onClick={() => { setToolsOpen((value) => !value); setStageMenuOpen(false); }}><BrushIcon sx={{ fontSize: 18 }} /></IconButton>
                    </>
                )}

                {role === 'student' && (
                    <>
                        <div ref={raiseHandControlRef} className="relative shrink-0">
                            {(raiseHandPromptOpen || raiseHandNotice) && (
                                <div role="status" className="absolute bottom-full left-0 z-50 mb-3 w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-amber-300/25 bg-[#151b27] p-3 text-left shadow-2xl shadow-black/40">
                                    <span className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r border-amber-300/25 bg-[#151b27]" />
                                    {raiseHandPromptOpen ? (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-gray-950"><PanToolIcon sx={{ fontSize: 18 }} /></span>
                                                <div><p className="text-xs font-black text-white">Angkat tangan?</p><p className="mt-1 text-[11px] font-semibold leading-4 text-gray-400">Mentor akan melihat permintaanmu dan mikrofon dapat digunakan.</p></div>
                                            </div>
                                            <div className="mt-3 flex justify-end gap-2">
                                                <button type="button" onClick={() => setRaiseHandPromptOpen(false)} className="h-8 rounded-lg px-3 text-[11px] font-black text-gray-300 hover:bg-white/5">Batal</button>
                                                <button type="button" onClick={confirmRaiseHand} className="h-8 rounded-lg bg-amber-500 px-3 text-[11px] font-black text-gray-950 hover:bg-amber-400">Angkat tangan</button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><CheckIcon sx={{ fontSize: 17 }} /></span>
                                            <p className="pt-1 text-[11px] font-bold leading-4 text-gray-200">{raiseHandNotice}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button type="button" onClick={handleRaiseHandButton} aria-expanded={raiseHandPromptOpen} className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors ${currentStudent.handRaised ? 'bg-amber-500 text-gray-950 hover:bg-amber-400' : 'bg-white/5 text-gray-200 hover:bg-white/10'}`}><PanToolIcon sx={{ fontSize: 17 }} /> {currentStudent.handRaised ? 'Turunkan tangan' : 'Angkat tangan'}</button>
                        </div>
                        <button
                            type="button"
                            data-sound="none"
                            disabled={!currentStudent.canSpeak || currentStudent.micBlocked}
                            onClick={currentStudent.handRaised ? () => setStudentMic(!studentSpeaking) : undefined}
                            onPointerDown={currentStudent.handRaised ? undefined : () => setStudentMic(true)}
                            onPointerUp={currentStudent.handRaised ? undefined : () => setStudentMic(false)}
                            onPointerCancel={currentStudent.handRaised ? undefined : () => setStudentMic(false)}
                            onPointerLeave={currentStudent.handRaised ? undefined : () => setStudentMic(false)}
                            className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black disabled:opacity-40 ${studentSpeaking ? 'bg-green-500 text-gray-950' : 'bg-white/5 text-gray-200'}`}
                            title={currentStudent.handRaised ? 'Klik untuk mengaktifkan atau mematikan mikrofon' : 'Tahan tombol atau Space untuk bicara'}
                        >
                            {studentSpeaking ? <MicIcon sx={{ fontSize: 17 }} /> : <MicOffIcon sx={{ fontSize: 17 }} />}
                            {currentStudent.micBlocked ? 'Mikrofon dinonaktifkan mentor' : currentStudent.handRaised ? (studentSpeaking ? 'Mikrofon aktif' : 'Aktifkan mikrofon') : 'Tahan untuk bicara'}
                            {!currentStudent.handRaised && <span className="hidden rounded bg-black/25 px-1.5 py-0.5 text-[9px] md:inline">Space</span>}
                        </button>
                        {canDraw && <IconButton label="Alat menulis" active={toolsOpen || tool !== 'pointer'} onClick={() => setToolsOpen((value) => !value)}><BrushIcon sx={{ fontSize: 18 }} /></IconButton>}
                    </>
                )}

                {role === 'mentor' && (
                    <>
                        <span className="hidden h-7 w-px shrink-0 bg-white/10 sm:block" />
                        <IconButton label={micEnabled ? 'Matikan mikrofon' : 'Aktifkan mikrofon'} active={micEnabled} onClick={toggleMentorMic}>{micEnabled ? <MicIcon sx={{ fontSize: 19 }} /> : <MicOffIcon sx={{ fontSize: 19 }} />}</IconButton>
                        <IconButton label={cameraEnabled ? 'Matikan kamera' : 'Aktifkan kamera'} active={cameraEnabled} onClick={toggleMentorCamera}><CameraAltIcon sx={{ fontSize: 19 }} /></IconButton>
                    </>
                )}
                <IconButton label={lowDataMode ? 'Nonaktifkan mode hemat data' : 'Aktifkan mode hemat data'} active={lowDataMode} onClick={() => setLowDataMode((value) => !value)}><WifiIcon sx={{ fontSize: 19 }} /></IconButton>
                <div className="hidden md:block"><IconButton label="Layar penuh" onClick={() => document.documentElement.requestFullscreen?.()}><FullscreenIcon sx={{ fontSize: 19 }} /></IconButton></div>
                <span className="ml-auto" />
                <div className="relative">
                    <IconButton
                        label="Obrolan kelas"
                        active={drawerOpen && drawerTab === 'chat'}
                        onClick={() => {
                            setDrawerOpen(true);
                            setDrawerTab('chat');
                            setUnreadChatCount(0);
                        }}
                    >
                        <ChatBubbleOutlineIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                    {unreadChatCount > 0 && (
                        <span className="pointer-events-none absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white">
                            {unreadChatCount}
                        </span>
                    )}
                </div>
                <IconButton
                    label="Daftar peserta"
                    active={drawerOpen && drawerTab === 'participants'}
                    onClick={() => {
                        setDrawerOpen(true);
                        setDrawerTab('participants');
                    }}
                >
                    <PeopleIcon sx={{ fontSize: 19 }} />
                </IconButton>
                <IconButton label={role === 'mentor' ? 'Akhiri ruang kelas' : 'Keluar dari ruang kelas'} danger onClick={leaveOrEnd}>{role === 'mentor' ? <CallEndIcon sx={{ fontSize: 19 }} /> : <LogoutIcon sx={{ fontSize: 19 }} />}</IconButton>
            </footer>

            <ParticipantDrawer
                open={drawerOpen}
                role={role}
                participants={participants}
                speakingIds={speakingIds}
                activeTab={drawerTab}
                onTabChange={(tab) => {
                    setDrawerTab(tab);
                    if (tab === 'chat') setUnreadChatCount(0);
                }}
                messages={messages}
                onSendMessage={sendChatMessage}
                unreadChatCount={unreadChatCount}
                currentUserId={currentUserId}
                onClose={() => setDrawerOpen(false)}
                onUpdate={updateRemoteParticipant}
                onClearStrokes={(id) => publishBoardEvent({ type: 'clear', ownerId: id })}
                onKick={kickRemoteParticipant}
                onMuteAll={muteAllParticipants}
            />
            <Transition show={deckPickerOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setDeckPickerOpen(false)}>
                    <TransitionChild
                        as={React.Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
                    </TransitionChild>

                    <div className="fixed inset-0 overflow-y-auto p-4 flex items-center justify-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-2xl text-white">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <AutoStoriesIcon className="text-orange-400" sx={{ fontSize: 22 }} />
                                        <div>
                                            <DialogTitle className="text-base font-black text-white">
                                                Pilih PPT / Materi Kelas
                                            </DialogTitle>
                                            <p className="text-xs text-gray-400">
                                                Ganti presentasi yang sedang ditampilkan kepada peserta secara langsung.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDeckPickerOpen(false)}
                                        className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
                                    >
                                        <CloseIcon sx={{ fontSize: 18 }} />
                                    </button>
                                </div>

                                <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                                    <div className={`flex items-center justify-between rounded-xl border p-3.5 transition ${!currentDeck ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                                        <div>
                                            <p className="text-sm font-black text-white">Papan Tulis Kosong (Tanpa PPT)</p>
                                            <p className="text-xs text-gray-400">Gunakan layar papan tulis kosong untuk coretan bebas</p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!currentDeck || switchingDeck}
                                            onClick={() => handleSelectDeck(null)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${!currentDeck ? 'bg-orange-500/20 text-orange-300' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        >
                                            {!currentDeck ? 'Sedang Aktif' : switchingDeck ? 'Memuat...' : 'Gunakan'}
                                        </button>
                                    </div>

                                    {availableDecks.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
                                            Belum ada deck presentasi lain yang tersedia untuk program ini.
                                        </div>
                                    ) : (
                                        availableDecks.map((item) => {
                                            const isSelected = currentDeck?.id === item.id;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center justify-between rounded-xl border p-3.5 transition ${isSelected ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                                >
                                                    <div className="min-w-0 pr-3">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-black text-white">{item.title}</p>
                                                            {isSelected && (
                                                                <span className="shrink-0 rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-black text-orange-400">
                                                                    Aktif
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-400">
                                                            {item.module ? `Modul: ${item.module.title}` : 'Umum'} · {item.slides_count ?? item.slides?.length ?? 0} slide
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={isSelected || switchingDeck}
                                                        onClick={() => handleSelectDeck(item.id)}
                                                        className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-black transition ${isSelected ? 'bg-orange-500/20 text-orange-300 cursor-default' : 'bg-orange-500 text-white hover:bg-orange-400'}`}
                                                    >
                                                        {isSelected ? 'Sedang Tayang' : switchingDeck ? 'Memuat...' : 'Tampilkan'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>

            <div ref={remoteAudioContainerRef} className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0" aria-hidden="true" />
        </main>
    );
}
