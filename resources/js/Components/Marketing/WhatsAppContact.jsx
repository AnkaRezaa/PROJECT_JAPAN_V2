import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const phoneNumber = '6283892614774';
const message = 'Halo TOKU-UP, saya ingin bertanya tentang kelas bahasa Jepang.';

export const WHATSAPP_URL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

export default function WhatsAppContact() {
    return (
        <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Tanya kelas melalui WhatsApp"
            className="group fixed bottom-4 right-4 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/90 bg-[#25D366] text-white shadow-[0_12px_28px_rgba(22,163,74,0.35)] transition duration-200 hover:-translate-y-1 hover:bg-[#1fb85a] focus:outline-none focus:ring-4 focus:ring-green-500/30 sm:bottom-6 sm:right-6"
        >
            <WhatsAppIcon sx={{ fontSize: 30 }} aria-hidden="true" />
            <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] whitespace-nowrap rounded-md bg-gray-950 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                Tanya via WhatsApp
            </span>
        </a>
    );
}
