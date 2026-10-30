import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SearchableSelect from '@/Components/UI/SearchableSelect';
import ConfirmActionDialog, { useConfirmAction } from '@/Components/UI/ConfirmActionDialog';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const LiveClassRoom = React.lazy(() => import('@/Components/Features/Presentation/LiveClassRoom'));

function RealtimeClock() {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <p className="text-xs font-bold tabular-nums text-gray-700 dark:text-gray-300">
            {formatIndonesianTime(time)}
        </p>
    );
}

function LiveRoomSkeleton() {
    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-white">
            <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-orange-500/20 border-t-orange-500" />
            <p className="mt-4 text-sm font-black tracking-wide text-gray-200">Menghubungkan ke Ruang Kelas Live...</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">Menyiapkan panggung presentasi dan audio mentor</p>
        </div>
    );
}

const inputClass = 'flex min-h-11 w-full items-center justify-between gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 text-left text-xs font-bold text-gray-900 outline-none transition hover:border-orange-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-white dark:focus:bg-gray-800';

function formatIndonesianTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${hours}:${minutes} • ${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

const nextHourInputValue = () => {
    const value = new Date(Date.now() + (60 * 60 * 1000));
    value.setMinutes(0, 0, 0);
    return new Date(value.getTime() - (value.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

function RoomSetup({ setup, upcomingSessions = [], storeEndpoint, exitUrl }) {
    const [, startTransition] = useTransition();
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const [materiScope, setMateriScope] = useState('shared'); // 'shared' | 'mentor' | 'blank'
    const [deviceDrawerOpen, setDeviceDrawerOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState(upcomingSessions.length > 0 ? 'schedules' : 'preview'); // 'schedules' | 'preview'
    const [copiedSessionId, setCopiedSessionId] = useState(null);

    // Green Room Media Preview State
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationFrameRef = useRef(null);
    const audioBarRef = useRef(null);

    const [devices, setDevices] = useState({ cameras: [], mics: [] });
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMic, setSelectedMic] = useState('');
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [deviceError, setDeviceError] = useState('');
    const [isDeviceLoading, setIsDeviceLoading] = useState(true);

    const initialKloterId = setup.kloters.some((item) => Number(item.id) === Number(setup.initial?.kloter_id))
        ? String(setup.initial.kloter_id)
        : (setup.kloters.length > 0 ? String(setup.kloters[0].id) : '');
    const initialWeekId = setup.weeks.some((item) => Number(item.id) === Number(setup.initial?.week_id))
        ? String(setup.initial.week_id)
        : (setup.weeks.length > 0 ? String(setup.weeks[0].id) : '');
    const initialDeck = setup.decks.find((item) => Number(item.id) === Number(setup.initial?.deck_id));

    const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId || (initialDeck ? String(initialDeck.module_id) : ''));

    const form = useForm({
        kloter_belajar_id: initialKloterId,
        presentation_deck_id: initialDeck ? String(initialDeck.id) : '',
        scheduled_at: nextHourInputValue(),
    });

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
        if (audioBarRef.current) {
            audioBarRef.current.style.width = '0%';
        }
    };

    const setupAudioMeter = (stream) => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) return;

            const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const samples = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                if (!analyser) return;
                analyser.getByteFrequencyData(samples);
                const sum = samples.reduce((acc, val) => acc + val, 0);
                const avg = sum / samples.length;
                const pct = Math.min(100, Math.round((avg / 128) * 100) * 1.5);
                if (audioBarRef.current) {
                    audioBarRef.current.style.width = `${pct}%`;
                }
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
        } catch {
            // Abaikan audio context error
        }
    };

    useEffect(() => {
        if (rightPanelTab !== 'preview') {
            stopAllTracks();
            return;
        }

        let cancelled = false;

        const initMedia = async () => {
            stopAllTracks();
            setIsDeviceLoading(true);
            setDeviceError('');

            if (!cameraEnabled && !micEnabled) {
                setIsDeviceLoading(false);
                setAudioLevel(0);
                return;
            }

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
                    videoRef.current.play().catch(() => {});
                }

                if (micEnabled) {
                    setupAudioMeter(stream);
                } else {
                    setAudioLevel(0);
                }

                const allDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
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
                if (!cancelled) {
                    setDeviceError('Izin akses kamera/mikrofon belum diberikan atau perangkat sedang digunakan.');
                }
            } finally {
                if (!cancelled) {
                    setIsDeviceLoading(false);
                }
            }
        };

        initMedia();

        return () => {
            cancelled = true;
            stopAllTracks();
        };
    }, [rightPanelTab, cameraEnabled, micEnabled, selectedCamera, selectedMic]);

    const selectedKloter = setup.kloters.find((kloter) => String(kloter.id) === String(form.data.kloter_belajar_id));
    const selectedWeek = setup.weeks.find((week) => String(week.id) === String(selectedWeekId));
    const selectedDeck = setup.decks.find((deck) => String(deck.id) === String(form.data.presentation_deck_id));

    const sharedDecks = useMemo(() => {
        return setup.decks.filter((deck) => String(deck.module_id) === String(selectedWeekId) && deck.audience_scope === 'shared');
    }, [selectedWeekId, setup.decks]);

    const mentorDecks = useMemo(() => {
        return setup.decks.filter((deck) => String(deck.module_id) === String(selectedWeekId) && deck.audience_scope === 'mentor_session');
    }, [selectedWeekId, setup.decks]);

    const kloterOptions = useMemo(() => {
        return setup.kloters.map((k) => ({
            value: String(k.id),
            label: `${k.nama} ${k.kode ? `(${k.kode})` : ''} ${k.live_mentor ? `• LIVE (${k.live_mentor})` : ''}`.trim(),
            description: k.minggu_aktif ? `Week ${k.minggu_aktif} Aktif` : undefined,
        }));
    }, [setup.kloters]);

    const weekOptions = useMemo(() => {
        return setup.weeks.map((w) => ({
            value: String(w.id),
            label: `Week ${w.week_number}: ${w.title}`,
        }));
    }, [setup.weeks]);

    const deckOptions = useMemo(() => {
        const list = materiScope === 'shared' ? sharedDecks : mentorDecks;
        return list.map((d) => ({
            value: String(d.id),
            label: `${d.title} (${d.slides_count || 0} slide)`,
        }));
    }, [materiScope, sharedDecks, mentorDecks]);

    const selectKloter = (kloterId) => {
        form.setData('kloter_belajar_id', String(kloterId));
        const kloter = setup.kloters.find((k) => String(k.id) === String(kloterId));
        if (kloter?.minggu_aktif) {
            const matchedWeek = setup.weeks.find((w) => Number(w.week_number) === Number(kloter.minggu_aktif));
            if (matchedWeek) {
                selectWeek(matchedWeek.id);
            }
        }
    };

    const selectWeek = (weekId) => {
        startTransition(() => {
            setSelectedWeekId(String(weekId));
        });
        if (selectedDeck && String(selectedDeck.module_id) !== String(weekId)) {
            form.setData('presentation_deck_id', '');
        }
    };

    const handleMateriScopeChange = (scope) => {
        setMateriScope(scope);
        if (scope === 'blank') {
            form.setData('presentation_deck_id', '');
        } else if (scope === 'shared' && sharedDecks.length > 0) {
            form.setData('presentation_deck_id', String(sharedDecks[0].id));
        } else if (scope === 'mentor' && mentorDecks.length > 0) {
            form.setData('presentation_deck_id', String(mentorDecks[0].id));
        }
    };

    const liveClassContext = {
        audience_scope: 'mentor_session',
        return_context: 'live_class',
        program_id: setup.program?.id,
        kloter_id: form.data.kloter_belajar_id || undefined,
        week_id: selectedWeekId,
    };

    const createBlankDeck = () => {
        if (!selectedWeekId) return;
        router.get(route('admin.modules.presentations.builder', selectedWeekId), {
            create: 1,
            placement: 'opening',
            ...liveClassContext,
        });
    };

    const duplicateSharedDeck = () => {
        if (!selectedDeck || selectedDeck.audience_scope !== 'shared' || !selectedWeek) return;
        router.post(route('admin.presentations.store'), {
            title: `${selectedDeck.title} - Sesi`,
            description: '',
            level_id: null,
            module_id: selectedWeek.id,
            module_day_id: null,
            week_slot: 'opening',
            sort_order: 0,
            status: 'draft',
            source_deck_id: selectedDeck.id,
            kloter_belajar_id: form.data.kloter_belajar_id || null,
            audience_scope: 'mentor_session',
            return_context: 'live_class',
        });
    };

    const submit = (action) => {
        stopAllTracks();
        form.setData('action', action);
        form.transform((data) => ({ ...data, action }));
        form.post(storeEndpoint, {
            preserveScroll: true,
            onSuccess: () => {
                setScheduleOpen(false);
                setRightPanelTab('schedules');
                form.setData('scheduled_at', nextHourInputValue());
            },
            onError: () => {
                if (action === 'schedule') {
                    setScheduleOpen(true);
                }
            },
        });
    };

    const startScheduledSession = (startUrl) => {
        stopAllTracks();
        router.post(startUrl);
    };

    const cancelScheduledSession = (cancelUrl) => {
        openConfirm({
            variant: 'danger',
            title: 'Batalkan Jadwal Kelas?',
            message: 'Jadwal sesi kelas ini akan dibatalkan dan dihapus dari daftar.',
            confirmLabel: 'Batalkan Jadwal',
            onConfirm: () => {
                setConfirmProcessing(true);
                router.delete(cancelUrl, {
                    preserveScroll: true,
                    onFinish: () => closeConfirm(),
                });
            },
        });
    };

    const fallbackCopy = (text, sessionId) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedSessionId(sessionId);
            setTimeout(() => setCopiedSessionId(null), 2500);
        } finally {
            document.body.removeChild(textArea);
        }
    };

    const copyJoinUrl = (sessionId, url) => {
        const resolvedUrl = url && url.startsWith('http') ? url : new URL(url, window.location.origin).toString();
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(resolvedUrl).then(() => {
                setCopiedSessionId(sessionId);
                setTimeout(() => setCopiedSessionId(null), 2500);
            }).catch(() => fallbackCopy(resolvedUrl, sessionId));
        } else {
            fallbackCopy(resolvedUrl, sessionId);
        }
    };

    const switchProgram = (programId) => {
        router.get(route('admin.live-classes.create'), { program_id: programId }, { preserveState: false });
    };

    const isKloterBusy = Boolean(selectedKloter?.live_mentor);

    return (
        <AuthenticatedLayout>
            <Head title={`Ruang Kelas Live - ${setup.program?.title || 'Persiapan Sesi'}`} />

            <main className="min-h-screen bg-gray-50/50 pb-16 dark:bg-gray-950 sm:px-6 lg:px-8">
                {/* Header Bilah Waktu Real-Time (Google Meet Style) */}
                <header className="border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href={exitUrl}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 transition hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400"
                            >
                                <ArrowBackIcon sx={{ fontSize: 16 }} />
                                Kembali
                            </Link>
                            <span className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                            {setup.programs && setup.programs.length > 1 ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-gray-500">Program:</span>
                                    <select
                                        value={setup.program?.id || ''}
                                        onChange={(e) => switchProgram(e.target.value)}
                                        className="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    >
                                        {setup.programs.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                    {setup.program?.title || 'Ruang Kelas Live'}
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            <RealtimeClock />
                        </div>
                    </div>
                </header>

                {/* Google Meet Home Hero Layout */}
                <div className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
                    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                        {/* LEFT COLUMN: Google Meet Home Action Area (6 cols) */}
                        <div className="space-y-4 lg:col-span-6">
                            <div className="space-y-1">
                                <h1 className="text-xl font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
                                    Ruang Kelas Live
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Mulai kelas instan atau atur jadwal bimbingan tatap muka bersama kloter Anda.
                                </p>
                            </div>

                            {/* Minimalist Curriculum Setup Card (Tanpa Label Birokratis) */}
                            <div className="space-y-5 rounded-3xl border border-gray-200/90 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/90 max-w-xl">
                                {/* Kloter & Minggu Pembelajaran */}
                                <div className="grid gap-3.5 sm:grid-cols-2">
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Kloter</span>
                                            {selectedKloter?.minggu_aktif && (
                                                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                                    Week {selectedKloter.minggu_aktif} Aktif
                                                </span>
                                            )}
                                        </div>
                                        <SearchableSelect
                                            value={form.data.kloter_belajar_id}
                                            onChange={(val) => selectKloter(val)}
                                            options={kloterOptions}
                                            placeholder="Pilih kloter aktif"
                                            searchPlaceholder="Cari nama atau kode kloter..."
                                            triggerClassName={inputClass}
                                            emptyMessage="Belum ada kloter aktif"
                                        />
                                        {form.errors.kloter_belajar_id && (
                                            <p className="mt-1 text-xs font-bold text-red-600">{form.errors.kloter_belajar_id}</p>
                                        )}
                                    </div>

                                    <div>
                                        <span className="mb-1.5 block text-xs font-bold text-gray-500 dark:text-gray-400">Minggu Pembelajaran</span>
                                        <SearchableSelect
                                            value={selectedWeekId}
                                            onChange={(val) => selectWeek(val)}
                                            options={weekOptions}
                                            placeholder="Pilih minggu materi"
                                            searchPlaceholder="Cari nomor week atau judul materi..."
                                            triggerClassName={inputClass}
                                            emptyMessage="Belum ada materi"
                                        />
                                    </div>
                                </div>

                                {/* Materi Sesi Segmented Tabs */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Materi Sesi</span>
                                        {selectedDeck?.audience_scope === 'shared' && (
                                            <button
                                                type="button"
                                                onClick={duplicateSharedDeck}
                                                className="text-[11px] font-bold text-gray-500 hover:text-orange-600 hover:underline dark:text-gray-400"
                                            >
                                                Duplikat slide ini
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex rounded-full bg-gray-100 p-1 dark:bg-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => handleMateriScopeChange('shared')}
                                            className={`flex-1 rounded-full py-1.5 text-center text-xs font-bold transition ${
                                                materiScope === 'shared'
                                                    ? 'bg-white text-gray-950 shadow-xs dark:bg-gray-900 dark:text-white'
                                                    : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            Slide Resmi ({sharedDecks.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMateriScopeChange('mentor')}
                                            className={`flex-1 rounded-full py-1.5 text-center text-xs font-bold transition ${
                                                materiScope === 'mentor'
                                                    ? 'bg-white text-gray-950 shadow-xs dark:bg-gray-900 dark:text-white'
                                                    : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            PPT Sesi ({mentorDecks.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMateriScopeChange('blank')}
                                            className={`flex-1 rounded-full py-1.5 text-center text-xs font-bold transition ${
                                                materiScope === 'blank'
                                                    ? 'bg-white text-gray-950 shadow-xs dark:bg-gray-900 dark:text-white'
                                                    : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            Papan Tulis
                                        </button>
                                    </div>

                                    {materiScope !== 'blank' && (
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <SearchableSelect
                                                value={form.data.presentation_deck_id}
                                                onChange={(val) => form.setData('presentation_deck_id', val)}
                                                options={deckOptions}
                                                placeholder="Pilih slide presentasi"
                                                searchPlaceholder="Cari judul slide..."
                                                triggerClassName={`${inputClass} flex-1`}
                                                className="flex-1 min-w-0"
                                                emptyMessage="Belum ada presentasi pada kategori ini"
                                            />
                                            <button
                                                type="button"
                                                onClick={createBlankDeck}
                                                disabled={!selectedWeekId}
                                                title="Buat PPT Baru"
                                                className="inline-flex h-11 shrink-0 items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                            >
                                                + Baru
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Warning if Kloter is already Live */}
                                {isKloterBusy && (
                                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                                        <WarningAmberIcon sx={{ fontSize: 18 }} className="shrink-0 text-rose-600" />
                                        <span>Kloter ini sedang live bersama <strong>{selectedKloter.live_mentor}</strong>.</span>
                                    </div>
                                )}

                                {/* Google Meet Action Pill Buttons */}
                                <div className="pt-2 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => submit('start')}
                                        disabled={form.processing || !form.data.kloter_belajar_id || isKloterBusy}
                                        onMouseEnter={() => import('@/Components/Features/Presentation/LiveClassRoom')}
                                        className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-orange-600 px-7 text-sm font-bold text-white shadow-md shadow-orange-600/25 transition hover:bg-orange-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <VideocamIcon sx={{ fontSize: 20 }} />
                                        {form.processing ? 'Menyiapkan...' : 'Mulai Kelas Instan'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setScheduleOpen((v) => !v)}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        <CalendarMonthIcon sx={{ fontSize: 18 }} />
                                        {scheduleOpen ? 'Tutup Jadwal' : 'Jadwalkan Sesi'}
                                    </button>
                                </div>

                                {/* Schedule Dropdown Drawer */}
                                {scheduleOpen && (
                                    <div className="mt-4 rounded-2xl border border-orange-200/80 bg-orange-50/60 p-4 transition-all dark:border-orange-900/40 dark:bg-orange-950/20">
                                        <div className="mb-2.5 flex items-center gap-2">
                                            <CalendarMonthIcon sx={{ fontSize: 16 }} className="text-orange-600 dark:text-orange-400" />
                                            <span className="text-xs font-bold text-orange-950 dark:text-orange-200">
                                                Tentukan Waktu Pelaksanaan Sesi
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <input
                                                type="datetime-local"
                                                value={form.data.scheduled_at}
                                                min={new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                                onChange={(e) => form.setData('scheduled_at', e.target.value)}
                                                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => submit('schedule')}
                                                disabled={form.processing || !form.data.kloter_belajar_id || !form.data.scheduled_at}
                                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-orange-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                                            >
                                                Simpan Jadwal Kelas
                                            </button>
                                        </div>
                                        {form.errors.scheduled_at && (
                                            <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                                                {form.errors.scheduled_at}
                                            </p>
                                        )}
                                        {form.errors.session && (
                                            <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                                                {form.errors.session}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Google Meet Home Hub (Schedules & Device Preview) (6 cols) */}
                        <div className="space-y-4 lg:col-span-6">
                            {/* Tab Switcher: Jadwal Kelas vs Uji Perangkat */}
                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center rounded-full border border-gray-200/60 bg-gray-100 p-1 dark:border-gray-700/60 dark:bg-gray-800/80">
                                    <button
                                        type="button"
                                        onClick={() => setRightPanelTab('schedules')}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                                            rightPanelTab === 'schedules'
                                                ? 'bg-white text-orange-600 shadow-xs dark:bg-gray-900 dark:text-orange-400'
                                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <CalendarMonthIcon sx={{ fontSize: 15 }} />
                                        <span>Jadwal Kelas</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                                            rightPanelTab === 'schedules'
                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {upcomingSessions.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRightPanelTab('preview')}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                                            rightPanelTab === 'preview'
                                                ? 'bg-white text-orange-600 shadow-xs dark:bg-gray-900 dark:text-orange-400'
                                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <VideocamIcon sx={{ fontSize: 15 }} />
                                        <span>Uji Perangkat</span>
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: Daftar Jadwal Kelas (Upcoming Scheduled Sessions) */}
                            {rightPanelTab === 'schedules' ? (
                                <div className="space-y-3.5">
                                    {upcomingSessions.map((session) => (
                                        <article
                                            key={session.id}
                                            className={`group relative overflow-hidden rounded-3xl border p-5 transition-all duration-200 ${
                                                session.is_live
                                                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 shadow-sm ring-1 ring-emerald-500/20 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/10 dark:border-emerald-500/40'
                                                    : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            {/* Top Header: Status & Kloter Pill */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    {session.is_live ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-400">
                                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            LIVE SEKARANG
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            <CalendarMonthIcon sx={{ fontSize: 14 }} className="text-gray-500 dark:text-gray-400" />
                                                            {session.scheduled_date_formatted}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {session.kloter_name} {session.kloter_code ? `(${session.kloter_code})` : ''}
                                                </span>
                                            </div>

                                            {/* Center: Time Column & Session Information */}
                                            <div className="mt-4 flex items-start gap-4">
                                                <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/90 px-3.5 py-2.5 text-center dark:border-gray-800 dark:bg-gray-800/80 min-w-[76px]">
                                                    <span className="text-lg font-black tracking-tight text-gray-950 dark:text-white">
                                                        {session.scheduled_time_formatted ? session.scheduled_time_formatted.replace(' WIB', '') : '-'}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                        WIB
                                                    </span>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base font-bold text-gray-950 transition-colors group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400 line-clamp-1">
                                                        {session.deck_title}
                                                    </h3>
                                                    <p className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{session.program_title}</span>
                                                        {session.mentor_name && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Mentor: {session.mentor_name}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Actions: Google Meet Pill Style */}
                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-gray-100 pt-3.5 dark:border-gray-800/80">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {session.is_live ? (
                                                        <Link
                                                            href={route('admin.live-classes.show', session.id)}
                                                            onClick={stopAllTracks}
                                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                                                        >
                                                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                                                            Masuk Kelas
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => startScheduledSession(session.start_url)}
                                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-orange-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-95"
                                                        >
                                                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                                                            Mulai Kelas
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => copyJoinUrl(session.id, session.join_url)}
                                                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                                    >
                                                        {copiedSessionId === session.id ? (
                                                            <>
                                                                <CheckCircleIcon sx={{ fontSize: 15 }} className="text-emerald-500" />
                                                                <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                                <span>Salin Tautan Siswa</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => cancelScheduledSession(session.cancel_url)}
                                                    title="Batalkan Sesi"
                                                    aria-label="Batalkan Sesi"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                                </button>
                                            </div>
                                        </article>
                                    ))}

                                    {upcomingSessions.length === 0 && (
                                        <div className="rounded-3xl border border-gray-200/90 bg-white p-8 text-center shadow-xs dark:border-gray-800 dark:bg-gray-900">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                                                <CalendarMonthIcon sx={{ fontSize: 30 }} />
                                            </div>
                                            <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                                                Tidak Ada Jadwal Kelas Mendatang
                                            </h3>
                                            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                                Semua jadwal kelas bimbingan yang Anda buat akan muncul di sini. Anda dapat menjadwalkan lebih dari satu sesi sekaligus.
                                            </p>
                                            <div className="mt-5">
                                                <button
                                                    type="button"
                                                    onClick={() => setScheduleOpen(true)}
                                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 shadow-xs transition hover:border-orange-500 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                                >
                                                    <CalendarMonthIcon sx={{ fontSize: 16 }} className="text-orange-600 dark:text-orange-400" />
                                                    + Buat Jadwal Kelas
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* TAB 2: Uji Kamera & Mic (Green Room Preview) */
                                <div className="space-y-4">
                                    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-gray-950 shadow-2xl shadow-gray-950/20 [contain:layout_size]">
                                        {cameraEnabled ? (
                                            <video
                                                ref={videoRef}
                                                muted
                                                playsInline
                                                autoPlay
                                                className="h-full w-full object-cover transform -scale-x-100"
                                            />
                                        ) : (
                                            <div className="grid h-full w-full place-items-center bg-gray-900 text-center p-6">
                                                <div>
                                                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-800 text-gray-400">
                                                        <VideocamOffIcon sx={{ fontSize: 32 }} />
                                                    </div>
                                                    <p className="mt-3 text-sm font-bold text-gray-300">Kamera dinonaktifkan</p>
                                                </div>
                                            </div>
                                        )}

                                        {isDeviceLoading && (
                                            <div className="absolute inset-0 grid place-items-center bg-gray-950/75 backdrop-blur-xs text-xs font-bold text-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                    Memeriksa perangkat...
                                                </div>
                                            </div>
                                        )}

                                        {deviceError && (
                                            <div className="absolute top-4 inset-x-4 rounded-xl bg-red-600/90 p-3 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                                                {deviceError}
                                            </div>
                                        )}

                                        {/* Decibel Audio Level Meter Bar */}
                                        {micEnabled && (
                                            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-gray-900/80 px-3.5 py-1.5 backdrop-blur-md">
                                                <VolumeUpIcon sx={{ fontSize: 16 }} className="text-gray-300" />
                                                <div className="h-2 w-16 overflow-hidden rounded-full bg-white/20">
                                                    <div
                                                        ref={audioBarRef}
                                                        className="h-full bg-emerald-500 transition-all duration-75 ease-out"
                                                        style={{ width: '0%' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Floating Quick Controls (Google Meet Circle Style) */}
                                        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-gray-950/80 px-5 py-2 backdrop-blur-md">
                                            <button
                                                type="button"
                                                onClick={() => setMicEnabled((prev) => !prev)}
                                                aria-label={micEnabled ? 'Matikan Mikrofon' : 'Nyalakan Mikrofon'}
                                                className={`grid h-12 w-12 place-items-center rounded-full transition ${
                                                    micEnabled
                                                        ? 'bg-white/15 text-white hover:bg-white/25 active:scale-95'
                                                        : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                                                }`}
                                            >
                                                {micEnabled ? <MicIcon sx={{ fontSize: 22 }} /> : <MicOffIcon sx={{ fontSize: 22 }} />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setCameraEnabled((prev) => !prev)}
                                                aria-label={cameraEnabled ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                                                className={`grid h-12 w-12 place-items-center rounded-full transition ${
                                                    cameraEnabled
                                                        ? 'bg-white/15 text-white hover:bg-white/25 active:scale-95'
                                                        : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                                                }`}
                                            >
                                                {cameraEnabled ? <VideocamIcon sx={{ fontSize: 22 }} /> : <VideocamOffIcon sx={{ fontSize: 22 }} />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDeviceDrawerOpen((prev) => !prev)}
                                                aria-label="Pengaturan Perangkat"
                                                className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition"
                                            >
                                                <SettingsIcon sx={{ fontSize: 22 }} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Device Selectors Dropdown Drawer */}
                                    {deviceDrawerOpen && (
                                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
                                                <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                    Pengaturan Input Perangkat
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeviceDrawerOpen(false)}
                                                    className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        Kamera
                                                    </span>
                                                    <select
                                                        value={selectedCamera}
                                                        onChange={(e) => setSelectedCamera(e.target.value)}
                                                        disabled={!cameraEnabled}
                                                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    >
                                                        {devices.cameras.map((c) => (
                                                            <option key={c.deviceId} value={c.deviceId}>
                                                                {c.label || `Kamera ${c.deviceId.slice(0, 6)}`}
                                                            </option>
                                                        ))}
                                                        {devices.cameras.length === 0 && <option value="">Kamera Default</option>}
                                                    </select>
                                                </div>
                                                <div>
                                                    <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                        Mikrofon
                                                    </span>
                                                    <select
                                                        value={selectedMic}
                                                        onChange={(e) => setSelectedMic(e.target.value)}
                                                        disabled={!micEnabled}
                                                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-orange-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    >
                                                        {devices.mics.map((m) => (
                                                            <option key={m.deviceId} value={m.deviceId}>
                                                                {m.label || `Mikrofon ${m.deviceId.slice(0, 6)}`}
                                                            </option>
                                                        ))}
                                                        {devices.mics.length === 0 && <option value="">Mikrofon Default</option>}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Info Card */}
                                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xs dark:border-gray-800 dark:bg-gray-900/60">
                                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Perangkat Siap Digunakan</p>
                                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                Perangkat otomatis tersambung saat ruang kelas live dibuka.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}

function ScheduledRoom({ session, startEndpoint, cancelEndpoint, exitUrl }) {
    const action = useForm({});
    const { confirmState, openConfirm, closeConfirm, setConfirmProcessing } = useConfirmAction();
    const scheduledAt = session.scheduled_at
        ? new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'full',
            timeStyle: 'short',
        }).format(new Date(session.scheduled_at))
        : 'Waktu belum ditentukan';

    const cancel = () => {
        openConfirm({
            variant: 'danger',
            title: 'Batalkan Jadwal Kelas?',
            message: 'Sesi kelas terjadwal ini akan dibatalkan secara permanen.',
            confirmLabel: 'Batalkan Jadwal',
            onConfirm: () => {
                setConfirmProcessing(true);
                action.delete(cancelEndpoint, {
                    preserveScroll: true,
                    onFinish: () => closeConfirm(),
                });
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Jadwal Kelas - ${session.program.title}`} />
            <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-gray-50/60 px-4 py-8 dark:bg-gray-950">
                <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xl shadow-gray-950/5 dark:border-gray-800 dark:bg-gray-900">
                    <div className="bg-gray-950 px-6 py-7 text-white">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600">
                            <CalendarMonthIcon sx={{ fontSize: 25 }} />
                        </span>
                        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-orange-400">Kelas Terjadwal</p>
                        <h1 className="mt-1 text-2xl font-black">{session.program.title}</h1>
                        <p className="mt-2 text-sm font-semibold text-gray-300">{session.kloter.nama} · {session.mentor.username}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Waktu Mulai</p>
                        <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">{scheduledAt}</p>
                        <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {session.deck?.title ? `Materi: ${session.deck.title}` : 'Mode papan tulis kosong'}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => action.post(startEndpoint)}
                                disabled={action.processing}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orange-600 px-6 text-sm font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                            >
                                <PlayArrowIcon sx={{ fontSize: 20 }} /> Mulai Kelas
                            </button>
                            <button
                                type="button"
                                onClick={cancel}
                                disabled={action.processing}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-rose-200 px-5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} /> Batal
                            </button>
                        </div>
                        <Link href={exitUrl} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-orange-600 dark:text-gray-400">
                            <ArrowBackIcon sx={{ fontSize: 16 }} /> Kembali ke kelas
                        </Link>
                    </div>
                </section>
            </main>
            <ConfirmActionDialog {...confirmState} onCancel={closeConfirm} />
        </AuthenticatedLayout>
    );
}

export default function Show(props) {
    if (!props.session) {
        return (
            <RoomSetup
                setup={props.setup}
                upcomingSessions={props.upcomingSessions || []}
                storeEndpoint={props.storeEndpoint}
                exitUrl={props.exitUrl}
            />
        );
    }

    if (props.session.status !== 'live') {
        return <ScheduledRoom {...props} />;
    }

    return (
        <React.Suspense fallback={<LiveRoomSkeleton />}>
            <Head title={`Ruang Kelas - ${props.session.program.title}`}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <LiveClassRoom {...props} role="mentor" deck={props.session.deck} availableDecks={props.availableDecks || []} />
        </React.Suspense>
    );
}
