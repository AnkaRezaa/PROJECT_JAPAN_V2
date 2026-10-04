import { useEffect, useRef, useState } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { getSupportEcho, leaveSupportChannel } from '@/lib/echo';

export default function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [chat, setChat] = useState(null);
    const [adminOnline, setAdminOnline] = useState(false);
    const [topics, setTopics] = useState([]);
    const [quickAnswers, setQuickAnswers] = useState([]);
    const [whatsappUrl, setWhatsappUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [activeQuickAnswer, setActiveQuickAnswer] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', topic: '', body: '', website: '' });
    const bottom = useRef(null);

    const refresh = () => window.axios.get(route('support.chat.state'))
        .then(({ data }) => {
            setChat(data.chat);
            setAdminOnline(data.admin_online);
            setTopics(data.topics || []);
            setQuickAnswers(data.quick_answers || []);
            setWhatsappUrl(data.whatsapp_url);
            const lastTopic = [...(data.chat?.messages || [])].reverse().find((message) => message.topic)?.topic;
            if (lastTopic) setForm((current) => current.topic ? current : { ...current, topic: lastTopic });
        })
        .catch(() => {});

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        setLoading(true);
        refresh().finally(() => setLoading(false));
        const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 20000);
        return () => window.clearInterval(timer);
    }, [open]);

    useEffect(() => {
        if (!chat?.id) return undefined;
        const echo = getSupportEcho();
        echo?.private(`support-chat.${chat.id}`).listen('.support.updated', refresh);
        return () => leaveSupportChannel(`support-chat.${chat.id}`);
    }, [chat?.id]);

    useEffect(() => {
        if (open && chat?.messages?.length) bottom.current?.scrollIntoView({ block: 'end' });
    }, [chat?.messages?.length, open]);

    useEffect(() => {
        if (open && chat?.unread_visitor) {
            window.axios.post(route('support.chat.read'))
                .then(() => setChat((current) => (current ? { ...current, unread_visitor: 0 } : current)))
                .catch(() => {});
        }
    }, [chat?.unread_visitor, open]);

    useEffect(() => {
        const openChat = () => setOpen(true);
        window.addEventListener('open-support-chat', openChat);
        return () => window.removeEventListener('open-support-chat', openChat);
    }, []);

    const send = async (event) => {
        event.preventDefault();
        if (sending || !form.body.trim() || !form.topic) return;
        setSending(true);
        setError('');
        try {
            const endpoint = chat ? route('support.chat.send') : route('support.chat.start');
            const { data } = await window.axios.post(endpoint, chat ? { body: form.body, topic: form.topic } : form);
            setChat(data.chat);
            setForm((current) => ({ ...current, body: '' }));
            setActiveQuickAnswer(null);
        } catch (requestError) {
            setError(requestError.response?.status === 429 ? 'Terlalu banyak pesan. Coba beberapa saat lagi.' : 'Pesan belum terkirim. Periksa isian dan coba lagi.');
        } finally {
            setSending(false);
        }
    };

    const directWhatsAppUrl = whatsappUrl && form.topic
        ? `${whatsappUrl}?text=${encodeURIComponent(`Halo, saya ingin bertanya tentang ${form.topic}.`)}`
        : null;

    return (
        <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
            {open && (
                <section aria-label="Chat bantuan TOKU-UP" className="mb-3 flex h-[min(calc(100dvh-6.5rem),560px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-950 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    <header className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
                        <div><h2 className="text-sm font-bold">Bantuan TOKU-UP</h2><p className="text-xs text-emerald-100">{adminOnline ? 'Admin tersedia untuk membalas.' : 'Tinggalkan pesan, admin akan membalas.'}</p></div>
                        <button type="button" onClick={() => setOpen(false)} title="Tutup chat" aria-label="Tutup chat" className="grid h-10 w-10 place-items-center"><CloseIcon fontSize="small" /></button>
                    </header>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950/60">
                        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Memuat percakapan...</p>}
                        {!chat && !loading && <>
                            {quickAnswers.length > 0 && <p className="text-sm font-semibold">Pertanyaan yang sering diajukan</p>}
                            {quickAnswers.map(({ question, answer }, index) => (
                                <button key={question} type="button" aria-expanded={activeQuickAnswer === index} onClick={() => setActiveQuickAnswer(activeQuickAnswer === index ? null : index)} className="block w-full rounded-md border border-gray-200 bg-white p-3 text-left text-sm hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-500">
                                    <span className="block break-words font-semibold">{question}</span>
                                    {activeQuickAnswer === index && <span className="mt-2 block whitespace-pre-wrap break-words leading-5 text-gray-600 dark:text-gray-300">{answer}</span>}
                                </button>
                            ))}
                            <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">{quickAnswers.length ? 'Masih ada pertanyaan?' : 'Ada pertanyaan?'} Kirim pesan kepada admin.</p>
                        </>}
                        {chat?.messages?.map((message) => <div key={message.id} className={`max-w-[90%] rounded-md px-3 py-2 text-sm leading-5 ${message.sender === 'visitor' ? 'ml-auto bg-emerald-700 text-white' : 'border border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'}`}>{message.topic && <span className="mb-1 block text-[11px] font-semibold opacity-80">{message.topic}</span>}<p className="whitespace-pre-wrap break-words">{message.body}</p></div>)}
                        <div ref={bottom} />
                    </div>
                    <form onSubmit={send} className="max-h-[65%] space-y-2 overflow-y-auto border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200" htmlFor="support-topic">Topik pertanyaan</label>
                        <select id="support-topic" required value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className="w-full rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                            <option value="">Pilih topik</option>
                            {topics.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {!chat && <div className="grid grid-cols-2 gap-2"><input required maxLength={80} aria-label="Nama" placeholder="Nama" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="min-w-0 rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /><input required type="email" maxLength={254} aria-label="Email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-w-0 rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /><input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></div>}
                        {!chat && <p className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">Nama, email, dan pesan disimpan untuk menanggapi pertanyaanmu. <a href="/privacy-policy" className="underline">Privasi</a></p>}
                        <div className="flex gap-2"><textarea required rows={2} maxLength={2000} aria-label="Pesan" placeholder="Tulis pesan..." value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="min-w-0 flex-1 resize-none rounded-md border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" /><button type="submit" disabled={sending || !form.body.trim() || !form.topic} title="Kirim pesan" aria-label="Kirim pesan" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-700 text-white disabled:opacity-40"><SendIcon fontSize="small" /></button></div>
                        {whatsappUrl && <a href={directWhatsAppUrl || '#'} target="_blank" rel="noopener noreferrer" aria-disabled={!directWhatsAppUrl} onClick={(event) => { if (!directWhatsAppUrl) event.preventDefault(); }} className={`flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-700 text-sm font-semibold text-emerald-800 dark:text-emerald-300 ${directWhatsAppUrl ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950' : 'cursor-not-allowed opacity-40'}`}><WhatsAppIcon fontSize="small" />Chat lewat WhatsApp</a>}
                        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                    </form>
                </section>
            )}
            <button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Tutup chat' : 'Buka chat bantuan'} title={open ? 'Tutup chat' : 'Buka chat bantuan'} className="relative ml-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-700 text-white shadow-lg transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                {open ? <CloseIcon /> : <ChatBubbleOutlineIcon />}
                {!open && Boolean(chat?.unread_visitor) && (
                    <span aria-label={`${chat.unread_visitor} pesan belum dibaca`} className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow ring-2 ring-white">
                        {chat.unread_visitor > 9 ? '9+' : chat.unread_visitor}
                    </span>
                )}
            </button>
        </div>
    );
}
