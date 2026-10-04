import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { getSupportEcho, leaveSupportChannel } from '@/lib/echo';

export default function SupportInbox({ chats, filters, selectedChatId = 0, whatsapp, quickAnswers = [] }) {
    const [selectedId, setSelectedId] = useState(selectedChatId || chats.data[0]?.id || null);
    const [detail, setDetail] = useState(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [loadingMore, setLoadingMore] = useState(false);
    const bottom = useRef(null);
    const chatContainerRef = useRef(null);
    const shouldScrollBottomRef = useRef(true);
    const justRepliedRef = useRef(0);
    const settings = useForm({
        enabled: whatsapp.enabled,
        recipient: whatsapp.recipient,
    });
    const answers = useForm({ quick_answers: quickAnswers });

    const loadChat = (id) => {
        if (!id) return;
        shouldScrollBottomRef.current = true;
        window.axios.get(route('superadmin.support.show', id))
            .then(({ data }) => setDetail(data))
            .catch(() => setError('Percakapan belum dapat dimuat.'));
    };

    const loadMore = async () => {
        if (!selectedId || !detail?.chat?.has_more || loadingMore) return;
        const oldestId = detail.chat.messages[0]?.id;
        if (!oldestId) return;
        setLoadingMore(true);
        shouldScrollBottomRef.current = false;
        try {
            const container = chatContainerRef.current;
            const prevScrollHeight = container?.scrollHeight || 0;
            const { data } = await window.axios.get(route('superadmin.support.show', selectedId), {
                params: { before_id: oldestId },
            });
            setDetail((current) => ({
                ...current,
                chat: {
                    ...current.chat,
                    has_more: data.chat.has_more,
                    messages: [...data.chat.messages, ...current.chat.messages],
                },
            }));
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                }
            });
        } catch {
            setError('Gagal memuat pesan sebelumnya.');
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => { loadChat(selectedId); }, [selectedId]);
    useEffect(() => {
        if (shouldScrollBottomRef.current) {
            bottom.current?.scrollIntoView({ block: 'end' });
        }
    }, [detail?.chat?.messages?.length]);

    useEffect(() => {
        const heartbeat = () => window.axios.post(route('superadmin.support.presence')).catch(() => {});
        heartbeat();
        const timer = window.setInterval(() => { if (!document.hidden) heartbeat(); }, 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const echo = getSupportEcho();
        echo?.private('support-admin').listen('.support.updated', ({ chatId }) => {
            if (Number(chatId) === Number(selectedId)) {
                if (Date.now() - justRepliedRef.current > 2500) {
                    loadChat(selectedId);
                }
            }
            router.reload({ only: ['chats'], preserveScroll: true });
        });
        const timer = window.setInterval(() => {
            if (document.hidden) return;
            router.reload({ only: ['chats'], preserveScroll: true });
            loadChat(selectedId);
        }, 20000);
        return () => { leaveSupportChannel('support-admin'); window.clearInterval(timer); };
    }, [selectedId]);

    const send = async (event) => {
        event.preventDefault();
        if (!selectedId || !message.trim() || sending) return;
        setSending(true);
        setError('');
        shouldScrollBottomRef.current = true;
        try {
            justRepliedRef.current = Date.now();
            const { data } = await window.axios.post(route('superadmin.support.reply', selectedId), { body: message });
            setDetail((current) => ({ ...current, chat: data.chat }));
            setMessage('');
            router.reload({ only: ['chats'], preserveScroll: true });
        } catch {
            setError('Balasan belum terkirim. Coba lagi.');
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (status) => {
        if (!selectedId) return;
        if (status === 'closed' && !window.confirm('Tandai percakapan ini sebagai selesai?')) {
            return;
        }
        try {
            const { data } = await window.axios.patch(route('superadmin.support.status', selectedId), { status });
            setDetail((current) => (current ? {
                ...current,
                chat: { ...current.chat, status: data.status || status },
            } : current));
            router.reload({ only: ['chats'], preserveScroll: true });
        } catch {
            setError('Status belum dapat diperbarui.');
        }
    };

    const filter = (event) => {
        event.preventDefault();
        router.get(route('superadmin.support'), { search, status: filters.status }, { preserveState: true });
    };

    const saveSettings = (event) => {
        event.preventDefault();
        settings.put(route('superadmin.support.whatsapp.settings'), { preserveScroll: true });
    };

    const saveQuickAnswers = (event) => {
        event.preventDefault();
        answers.put(route('superadmin.support.quick-answers'), { preserveScroll: true });
    };

    const updateQuickAnswer = (index, field, value) => {
        answers.setData('quick_answers', answers.data.quick_answers.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [field]: value } : item
        )));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Inbox Bantuan" />
            <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Dukungan pengunjung</p><h1 className="text-2xl font-bold text-gray-950 dark:text-white">Inbox Bantuan</h1></div><span className="text-sm text-gray-500 dark:text-gray-400">{chats.total} percakapan</span></div>
                <div className="grid min-h-[540px] overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[290px_minmax(0,1fr)]">
                    <aside className="border-b border-gray-200 dark:border-gray-800 lg:border-b-0 lg:border-r">
                        <form onSubmit={filter} className="flex gap-2 border-b border-gray-200 p-3 dark:border-gray-800"><input aria-label="Cari percakapan" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau email" className="min-w-0 flex-1 rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-950" /><button className="rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white">Cari</button></form>
                        <div className="flex gap-1 border-b border-gray-200 p-2 text-sm dark:border-gray-800">{[['', 'Semua'], ['open', 'Terbuka'], ['closed', 'Selesai']].map(([status, label]) => <Link key={label} href={route('superadmin.support', { status, search: filters.search })} className={`rounded-md px-3 py-2 ${filters.status === status ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'text-gray-500 dark:text-gray-300'}`}>{label}</Link>)}</div>
                        <div className="max-h-[450px] overflow-y-auto">{chats.data.length ? chats.data.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setDetail(null); setError(''); }} className={`block w-full border-b border-gray-100 p-3 text-left dark:border-gray-800 ${selectedId === item.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.name}</span>{item.unread_admin > 0 && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{item.unread_admin}</span>}</div>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.email}</p>
                            <p className="mt-1 text-xs text-gray-400">{item.status === 'closed' ? 'Selesai' : 'Terbuka'} · {item.last_message_at ? new Date(item.last_message_at).toLocaleString('id-ID') : '-'}</p>
                        </button>) : <p className="p-5 text-sm text-gray-500">Belum ada percakapan.</p>}</div>
                        {chats.links?.length > 3 && <div className="flex flex-wrap gap-1 p-2">{chats.links.map((link, index) => <Link key={index} href={link.url || '#'} className={`rounded px-2 py-1 text-xs ${link.active ? 'bg-emerald-700 text-white' : 'text-gray-500'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}>{index === 0 ? '‹' : index === chats.links.length - 1 ? '›' : index}</Link>)}</div>}
                    </aside>
                    <section className="flex min-h-[450px] min-w-0 flex-col">
                        {detail?.chat && <>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
                                <div><h2 className="font-bold text-gray-950 dark:text-white">{detail.chat.name}</h2><a href={`mailto:${detail.email}`} className="text-xs text-emerald-700 dark:text-emerald-300">{detail.email}</a></div>
                                <button type="button" onClick={() => updateStatus(detail.chat.status === 'closed' ? 'open' : 'closed')} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">{detail.chat.status === 'closed' ? 'Buka kembali' : 'Tandai selesai'}</button>
                            </div>
                            <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950/40">
                                {detail.chat.has_more && <div className="text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 disabled:opacity-40">{loadingMore ? 'Memuat pesan...' : 'Muat pesan sebelumnya'}</button></div>}
                                {detail.chat.messages.map((item) => <div key={item.id} className={`max-w-[85%] rounded-md p-3 text-sm ${item.sender === 'admin' ? 'ml-auto bg-emerald-700 text-white' : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white'}`}>
                                    {item.topic && <span className="mb-1 block text-xs font-semibold opacity-80">{item.topic}</span>}
                                    <p className="whitespace-pre-wrap break-words">{item.body}</p>
                                    <span className="mt-1 block text-[10px] opacity-70">{new Date(item.created_at).toLocaleString('id-ID')}</span>
                                </div>)}
                                <div ref={bottom} />
                            </div>
                            <form onSubmit={send} className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800"><textarea aria-label="Balasan admin" value={message} onChange={(event) => setMessage(event.target.value)} rows={2} maxLength={2000} placeholder="Tulis balasan..." className="min-w-0 flex-1 resize-none rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-950" /><button type="submit" disabled={sending || !message.trim()} aria-label="Kirim balasan" title="Kirim balasan" className="grid h-11 w-11 place-items-center rounded-md bg-emerald-700 text-white disabled:opacity-40"><SendIcon fontSize="small" /></button></form>
                        </>}
                        {!detail?.chat && <div className="grid flex-1 place-items-center p-6 text-center text-sm text-gray-500">Pilih percakapan untuk membaca dan membalas pesan.</div>}
                        {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{error}</p>}
                    </section>
                </div>
                <details className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <summary className="cursor-pointer font-bold text-gray-900 dark:text-white">WhatsApp bantuan <span className="ml-2 text-xs font-normal text-gray-500">{whatsapp.enabled ? 'Aktif' : 'Nonaktif'}</span></summary>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Pengunjung dapat membuka percakapan langsung ke nomor ini. Percakapan WhatsApp terpisah dari Inbox Bantuan website.</p>
                    <form onSubmit={saveSettings} className="mt-4 grid gap-3 sm:max-w-lg">
                        <label className="text-sm text-gray-700 dark:text-gray-200">Nomor WhatsApp admin
                            <input type="tel" inputMode="numeric" value={settings.data.recipient} onChange={(event) => settings.setData('recipient', event.target.value)} placeholder="628123456789" className="mt-1 w-full rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-950" />
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gunakan kode negara tanpa tanda +, spasi, atau angka 0 di depan.</p>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={settings.data.enabled} onChange={(event) => settings.setData('enabled', event.target.checked)} />Tampilkan pilihan WhatsApp di chat bantuan</label>
                        {Object.entries(settings.errors).map(([field, message]) => <p key={field} role="alert" className="text-xs text-red-600">{field}: {message}</p>)}
                        <button disabled={settings.processing} className="w-fit rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Simpan pengaturan</button>
                    </form>
                </details>
                <details className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                    <summary className="cursor-pointer font-bold text-gray-900 dark:text-white">Jawaban cepat <span className="ml-2 text-xs font-normal text-gray-500">{answers.data.quick_answers.length} pertanyaan</span></summary>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Pertanyaan ini muncul di chat bantuan sebelum pengunjung mengirim pesan.</p>
                    <form onSubmit={saveQuickAnswers} className="mt-4 space-y-3 sm:max-w-2xl">
                        {answers.data.quick_answers.length === 0 && <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">Belum ada jawaban cepat. Tambahkan pertanyaan untuk menampilkannya di chat bantuan.</p>}
                        {answers.data.quick_answers.map((item, index) => <div key={index} className="grid gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex items-start gap-2">
                                <label className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-200">Pertanyaan {index + 1}
                                    <input required minLength={3} maxLength={120} value={item.question} onChange={(event) => updateQuickAnswer(index, 'question', event.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                                </label>
                                <button type="button" title="Hapus pertanyaan" aria-label={`Hapus pertanyaan ${index + 1}`} onClick={() => answers.setData('quick_answers', answers.data.quick_answers.filter((_, itemIndex) => itemIndex !== index))} className="mt-6 grid h-10 w-10 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><DeleteOutlineIcon fontSize="small" /></button>
                            </div>
                            <label className="text-sm text-gray-700 dark:text-gray-200">Jawaban
                                <textarea required minLength={3} maxLength={500} rows={3} value={item.answer} onChange={(event) => updateQuickAnswer(index, 'answer', event.target.value)} className="mt-1 w-full resize-y rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
                            </label>
                        </div>)}
                        {Object.entries(answers.errors).map(([field, message]) => <p key={field} role="alert" className="text-xs text-red-600">{field}: {message}</p>)}
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={answers.data.quick_answers.length >= 8} onClick={() => answers.setData('quick_answers', [...answers.data.quick_answers, { question: '', answer: '' }])} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><AddIcon fontSize="small" />Tambah pertanyaan</button>
                            <button type="submit" disabled={answers.processing || !answers.isDirty} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Simpan jawaban cepat</button>
                        </div>
                    </form>
                </details>
            </div>
        </AuthenticatedLayout>
    );
}
