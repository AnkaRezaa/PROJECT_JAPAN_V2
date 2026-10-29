import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function DeviceTestModal({ isOpen, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [devices, setDevices] = useState({ cameras: [], mics: [] });
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMic, setSelectedMic] = useState('');
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const stopAllTracks = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const getAvailableDevices = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const cameras = allDevices.filter((d) => d.kind === 'videoinput');
            const mics = allDevices.filter((d) => d.kind === 'audioinput');
            setDevices({ cameras, mics });
            if (cameras.length > 0 && !selectedCamera) {
                setSelectedCamera(cameras[0].deviceId);
            }
            if (mics.length > 0 && !selectedMic) {
                setSelectedMic(mics[0].deviceId);
            }
        } catch {
            // Abaikan kegagalan enumerasi perangkat
        }
    };

    useEffect(() => {
        let cancelled = false;

        const initMedia = async () => {
            stopAllTracks();
            if (!isOpen) return;

            setIsLoading(true);
            setErrorMessage('');

            try {
                const constraints = {
                    video: cameraEnabled
                        ? (selectedCamera ? { deviceId: { exact: selectedCamera } } : true)
                        : false,
                    audio: micEnabled
                        ? (selectedMic ? { deviceId: { exact: selectedMic } } : true)
                        : false,
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;

                if (videoRef.current && cameraEnabled) {
                    videoRef.current.srcObject = stream;
                }

                if (micEnabled) {
                    const audioTracks = stream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        if (cancelled) {
                            audioContext.close().catch(() => {});
                            return;
                        }
                        audioContextRef.current = audioContext;

                        const analyser = audioContext.createAnalyser();
                        analyser.fftSize = 256;
                        analyser.smoothingTimeConstant = 0.5;

                        const source = audioContext.createMediaStreamSource(stream);
                        source.connect(analyser);

                        const dataArray = new Uint8Array(analyser.frequencyBinCount);

                        const updateMeter = () => {
                            if (!micEnabled || cancelled) {
                                setAudioLevel(0);
                                return;
                            }
                            analyser.getByteFrequencyData(dataArray);
                            let sum = 0;
                            for (let i = 0; i < dataArray.length; i++) {
                                sum += dataArray[i];
                            }
                            const average = sum / dataArray.length;
                            const percentage = Math.min(100, Math.round((average / 128) * 100));
                            setAudioLevel(percentage);
                            animationFrameRef.current = requestAnimationFrame(updateMeter);
                        };

                        updateMeter();
                    }
                } else {
                    setAudioLevel(0);
                }

                await getAvailableDevices();
                if (!cancelled) setIsLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setIsLoading(false);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setErrorMessage('Izin mikrofon atau kamera belum diberikan. Aktifkan izin di ikon gembok browser Anda.');
                    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        setErrorMessage('Perangkat kamera atau mikrofon tidak terdeteksi pada perangkat ini.');
                    } else {
                        setErrorMessage('Gagal menghubungkan perangkat: ' + (err.message || 'Terjadi gangguan.'));
                    }
                }
            }
        };

        if (isOpen) {
            initMedia();
        } else {
            stopAllTracks();
            setAudioLevel(0);
        }

        return () => {
            cancelled = true;
            stopAllTracks();
        };
    }, [isOpen, selectedCamera, selectedMic, cameraEnabled, micEnabled]);

    const handleClose = () => {
        stopAllTracks();
        onClose();
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-10">
                    <div className="flex min-h-full items-center justify-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <VolumeUpIcon className="text-brand-600 dark:text-brand-400" />
                                        <DialogTitle className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                                            Uji Mikrofon & Kamera
                                        </DialogTitle>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                        aria-label="Tutup modal"
                                    >
                                        <CloseIcon sx={{ fontSize: 20 }} />
                                    </button>
                                </div>

                                {errorMessage && (
                                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Video Preview Box */}
                                <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800">
                                    {cameraEnabled ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="h-full w-full object-cover scale-x-[-1]"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                                            <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-slate-400">
                                                <VideocamOffIcon sx={{ fontSize: 28 }} />
                                            </div>
                                            <p className="mt-2 text-xs font-bold text-slate-400">Kamera dinonaktifkan</p>
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="absolute inset-0 grid place-items-center bg-slate-950/60 backdrop-blur-xs text-xs font-bold text-white">
                                            Memeriksa perangkat...
                                        </div>
                                    )}

                                    {/* Overlay Quick Toggle Controls */}
                                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-slate-950/80 px-4 py-1.5 backdrop-blur-md">
                                        <button
                                            type="button"
                                            onClick={() => setMicEnabled((prev) => !prev)}
                                            className={`grid h-11 w-11 place-items-center rounded-full transition ${
                                                micEnabled ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-600 text-white'
                                            }`}
                                            title={micEnabled ? 'Matikan Mic' : 'Aktifkan Mic'}
                                        >
                                            {micEnabled ? <MicIcon sx={{ fontSize: 20 }} /> : <MicOffIcon sx={{ fontSize: 20 }} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCameraEnabled((prev) => !prev)}
                                            className={`grid h-11 w-11 place-items-center rounded-full transition ${
                                                cameraEnabled ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-600 text-white'
                                            }`}
                                            title={cameraEnabled ? 'Matikan Kamera' : 'Aktifkan Kamera'}
                                        >
                                            {cameraEnabled ? <VideocamIcon sx={{ fontSize: 20 }} /> : <VideocamOffIcon sx={{ fontSize: 20 }} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Audio Meter Indicator */}
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <MicIcon sx={{ fontSize: 16 }} className="text-emerald-600 dark:text-emerald-400" />
                                            Sensitivitas Suara Mikrofon
                                        </span>
                                        <span className="tabular-nums text-slate-500">{micEnabled ? `${audioLevel}%` : 'Off'}</span>
                                    </div>
                                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all duration-75"
                                            style={{ width: `${micEnabled ? Math.max(3, audioLevel) : 0}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                        Bicaralah ke mikrofon Anda. Jika bar hijau bergerak maju-mundur, mikrofon Anda bekerja normal.
                                    </p>
                                </div>

                                {/* Device Selector Dropdowns */}
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Pilih Kamera
                                        </label>
                                        <select
                                            value={selectedCamera}
                                            onChange={(e) => setSelectedCamera(e.target.value)}
                                            disabled={!cameraEnabled || devices.cameras.length === 0}
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                            {devices.cameras.map((c) => (
                                                <option key={c.deviceId} value={c.deviceId}>
                                                    {c.label || `Kamera ${c.deviceId.slice(0, 5)}`}
                                                </option>
                                            ))}
                                            {devices.cameras.length === 0 && <option value="">Kamera Default</option>}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Pilih Mikrofon
                                        </label>
                                        <select
                                            value={selectedMic}
                                            onChange={(e) => setSelectedMic(e.target.value)}
                                            disabled={!micEnabled || devices.mics.length === 0}
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                            {devices.mics.map((m) => (
                                                <option key={m.deviceId} value={m.deviceId}>
                                                    {m.label || `Mikrofon ${m.deviceId.slice(0, 5)}`}
                                                </option>
                                            ))}
                                            {devices.mics.length === 0 && <option value="">Mikrofon Default</option>}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    >
                                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                                        Selesai Menguji
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
