import { Link } from '@inertiajs/react';
import fujiImage from '@/../Images/Mount-Fuji-New.jpg';

export default function GuestAuthLayout({ children }) {
    return (
        <div className="flex min-h-screen">
            <div className="relative hidden overflow-hidden bg-[#2D3742] p-10 lg:flex lg:w-1/2 xl:p-12">
                <img
                    src={fujiImage}
                    className="absolute inset-0 h-full w-full object-cover opacity-80"
                    alt="Mount Fuji"
                />
                <div className="absolute inset-0 bg-[#2D3742]/75" />
                <div className="absolute left-10 top-20 text-[200px] font-black text-white/5 -rotate-12">文</div>
                <div className="absolute bottom-20 right-10 text-[150px] font-black text-white/5 rotate-12">語</div>

                <div className="relative z-10 flex min-h-full w-full flex-col justify-between">
                    <Link href="/" aria-label="TOKU-UP - Beranda" className="flex items-center gap-2.5 no-underline">
                        <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-10 w-auto object-contain invert hue-rotate-180 brightness-110" />
                    </Link>

                    <div className="max-w-xl pb-8">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#9DDCB3]/50 bg-[#D2F0DD]/15 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm">
                            JLPT N3 STRUCTURED
                        </div>
                        <h1 className="mb-5 text-4xl font-black leading-[0.95] text-white drop-shadow-xl xl:text-6xl">
                            Kuasai Bahasa Jepang<br />Satu Tingkat Setiap Waktu.
                        </h1>
                        <p className="max-w-md text-base leading-relaxed text-white/75 xl:text-lg">
                            Bergabunglah dengan komunitas TOKU-UP. Pelajaran tergamifikasi yang dirancang untuk membantu Anda meningkatkan kompetensi bahasa Jepang dengan percaya diri.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {['A', 'B', 'C'].map((item) => (
                                <span key={item} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-800 bg-white/20 text-xs font-black text-white">{item}</span>
                            ))}
                        </div>
                        <div className="text-sm text-white/70">
                            <span className="text-amber-400">*</span> <strong className="text-white">4.9/5</strong> Rating dari komunitas kami
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-[#F7FAF8] lg:w-1/2">
                <div className="relative overflow-hidden border-b border-[#9DDCB3] bg-[#D2F0DD] px-5 py-4 sm:p-6 lg:hidden">
                    <div className="absolute -right-5 -top-8 text-8xl font-black text-[#2D3742]/5" aria-hidden="true">N3</div>
                    <Link href="/" aria-label="TOKU-UP - Beranda" className="relative flex items-center gap-2.5 no-underline">
                        <img src="/images/logos/toku-up-wordmark.png" alt="TOKU-UP" className="h-8 w-auto object-contain" />
                    </Link>
                    <p className="relative mt-2 text-xs font-semibold tracking-wide text-[#55616D]">JLPT N3 STRUCTURED LEARNING</p>
                </div>

                <div className="flex flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:py-8 lg:px-16">
                    <div className="w-full max-w-lg">
                        {children}
                    </div>
                </div>

                <div className="flex justify-center gap-4 px-6 py-4 text-center text-xs text-gray-400">
                    <Link href="/privacy-policy" className="no-underline transition-colors hover:text-brand-600">Kebijakan Privasi</Link>
                    <Link href="/terms" className="no-underline transition-colors hover:text-brand-600">Syarat & Ketentuan</Link>
                </div>
            </div>
        </div>
    );
}
