import BrandWordmark from '@/Components/Navigation/BrandWordmark';
import { Link, usePage } from '@inertiajs/react';
import SupportChatWidget from '@/Components/Marketing/SupportChatWidget';
import SocialLinks from '@/Components/Marketing/SocialLinks';

const footerLinks = {
    Produk: [
        { href: '/roadmap', label: 'Roadmap JLPT N3' },
        { href: '/#demo-belajar', label: 'Flashcard Kosakata', marketing: true },
        { href: '/dokkai/preview', label: 'Simulasi Kuis Dokkai', marketing: true },
        { href: '/pricing', label: 'Harga Premium', marketing: true },
    ],
    Perusahaan: [
        { href: '/berita', label: 'Berita', marketing: true },
        { href: '/about', label: 'Tentang Kami', marketing: true },
        { href: '/#fitur', label: 'Fitur Belajar', marketing: true },
        { href: '/privacy-policy', label: 'Kebijakan Privasi' },
        { href: '/terms', label: 'Syarat & Ketentuan' },
    ],
};

export default function Footer() {
    const hidePublicMarketing = Boolean(usePage().props.featureFlags?.hidePublicMarketing);
    return (
        <>
        <footer className="bg-slate-900 text-slate-400 px-6 lg:px-40 py-16">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-3 text-white mb-6">
                            <BrandWordmark light className="h-10 w-auto object-contain   " />
                        </div>
                        <p className="text-sm leading-relaxed mb-6">
                            Platform belajar Bahasa Jepang berbasis gamifikasi dengan kurikulum standar JLPT internasional.
                        </p>
                        <SocialLinks variant="footer" />
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="text-white font-bold mb-6">{title}</h4>
                            <ul className="flex flex-col gap-4 text-sm list-none p-0">
                                {links.filter((link) => !hidePublicMarketing || !link.marketing).map((link, i) => (
                                    <li key={i}>
                                        <Link
                                            href={link.href}
                                            className="text-gray-400 hover:text-brand-600 transition-colors no-underline"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-xs">
                    <span>© {new Date().getFullYear()} TOKU-UP. Seluruh hak cipta dilindungi.</span>
                    <div className="flex gap-6 text-xs">
                        <Link href="/terms" className="hover:text-white transition-colors no-underline">Syarat &amp; Ketentuan</Link>
                        <Link href="/cookie-policy" className="hover:text-white transition-colors no-underline">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
        <SupportChatWidget />
        </>
    );
}
