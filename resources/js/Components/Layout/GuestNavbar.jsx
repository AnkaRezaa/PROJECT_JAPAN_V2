import Button from '@/Components/UI/Button';
import ApplicationLogo from '@/Components/Navigation/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';

const makeAkatsukiPattern = (color = '16a34a') => {
    const outerC = 'c6.456,7.715 15.233,9.382 19.494,5.819 c4.261,-3.563 7.56,-12.538 17.966,-9.085 c-4.809,-12.756 9.527,-28.222 23.541,-21.591 c3.742,-17.293 38.975,-18.218 41.427,2.796 c31.424,-8.87 37.621,56.101 0,51.162 c-0.555,17.047 -31.397,23.431 -35.006,7.25 c-6.226,13.38 -31.153,15.198 -33.763,-2.884 c-16.744,7.33 -31.589,-12.955 -33.659,-33.468z';
    const innerC = 'c-4.38,-0.107 -8.81,0.916 -12.219,2.844 c-3.409,1.928 -5.765,4.645 -6.531,8.188 c-8.03,28.804 27.126,23.034 18.936,5.031 l3.061,-1.668 c10.049,23.447 -32.05,29.094 -25.466,-1.676 c-12.084,-5.718 -24.162,7.875 -20.156,18.5 c0.33,0.869 0.116,1.919 -0.528,2.589 c-0.644,0.67 -1.685,0.926 -2.566,0.63 c-4.524,-1.501 -6.668,-0.459 -8.906,1.438 c-2.239,1.896 -4.017,4.955 -6.688,7.188 c-2.916,2.438 -7.058,2.895 -11.156,1.812 c-2.092,-0.553 -4.205,-1.539 -6.25,-2.906 c1.809,7.311 5.182,14.154 9.469,18.906 c5.612,6.221 12.14,8.91 19.5,5.688 c-2.272,-14.97 20.696,-22.16 22.718,-4.001 l-2.854,0.194 c-2.017,-14.012 -19.95,-8.564 -16.426,5.713 c0.96,3.889 2.254,6.563 4.562,8.344 c2.309,1.781 5.365,2.724 8.594,2.781 c6.458,0.115 13.339,-3.352 15.938,-8.938 c0.428,-0.933 1.487,-1.535 2.508,-1.425 c1.021,0.11 1.928,0.922 2.148,1.925 c0.732,3.283 2.624,5.179 5.438,6.344 c2.814,1.165 6.595,1.364 10.312,0.594 c3.717,-0.77 7.363,-2.484 10,-4.875 c2.637,-2.391 4.26,-5.352 4.375,-8.875 c-20.403,-8.938 -6.011,-32.484 7.41,-24.798 l-0.572,2.57 c-10.389,-6.74 -23.722,14.736 -4.056,19.885 c8.721,1.145 14.339,-1.609 18.062,-6.25 c3.724,-4.641 5.424,-11.45 5.063,-18.219 c-0.361,-6.769 -2.788,-13.413 -6.688,-17.625 c-3.899,-4.212 -9.016,-6.248 -16.094,-4.25 c-1.363,0.367 -2.927,-0.691 -3.093,-2.094 c-0.534,-4.576 -2.758,-7.75 -5.969,-10 c-3.211,-2.25 -7.494,-3.456 -11.875,-3.563z';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 120' width='240' height='120'><g fill='#${color}' fill-opacity='0.07' stroke='#${color}' stroke-linecap='round' stroke-linejoin='round'><path stroke-width='2' stroke-opacity='0.45' d='m15,55 ${outerC}' /><path stroke-width='1.5' stroke-opacity='0.58' d='m97.3,19.65 ${innerC}' /><path stroke-width='2' stroke-opacity='0.45' d='m135,-5 ${outerC}' /><path stroke-width='1.5' stroke-opacity='0.58' d='m217.3,-40.35 ${innerC}' /><path stroke-width='2' stroke-opacity='0.45' d='m135,115 ${outerC}' /><path stroke-width='1.5' stroke-opacity='0.58' d='m217.3,79.65 ${innerC}' /></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
const akatsukiPattern = makeAkatsukiPattern('16a34a');

export default function GuestNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const { url, props } = usePage();
    const isAuthenticated = Boolean(props.auth?.user);

    const navigationItems = [
        { href: '/', label: 'Beranda' },
        { href: '/pricing', label: 'Harga' },
        { href: '/about', label: 'Tentang Kami' },
        { href: '/roadmap', label: 'Roadmap' },
    ];

    const isActive = (href) => href === '/' ? url === '/' : url.startsWith(href);

    useEffect(() => {
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, []);

    useEffect(() => {
        const updateScrollState = () => setHasScrolled(window.scrollY > 20);
        updateScrollState();
        window.addEventListener('scroll', updateScrollState, { passive: true });

        return () => window.removeEventListener('scroll', updateScrollState);
    }, []);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className="sticky top-0 z-50 border-b border-[#e2ece5] bg-white/95 shadow-sm backdrop-blur transition-[background-color,border-color,box-shadow] duration-300">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-repeat opacity-65"
                style={{
                    backgroundImage: akatsukiPattern,
                    backgroundSize: '240px 120px',
                }}
            />
            <div className="relative flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 lg:px-20">
                <ApplicationLogo wordmarkClassName="dark:!invert-0 dark:!hue-rotate-0 dark:!brightness-100" />
                <ul className="hidden list-none items-center gap-7 md:flex lg:gap-8">
                    {navigationItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`relative py-2 text-[15px] font-extrabold tracking-wide no-underline transition-colors [text-shadow:0_1px_4px_rgba(255,255,255,0.9),0_0_8px_#ffffff] after:absolute after:-bottom-1 after:left-0 after:h-[3px] after:rounded-full after:bg-[#15803D] after:transition-all after:duration-300 ${
                                    isActive(item.href)
                                        ? 'text-[#15803D] after:w-full'
                                        : 'text-[#0f172a] after:w-0 hover:text-[#15803D] hover:after:w-full'
                                }`}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="hidden items-center gap-3 md:flex">
                    {isAuthenticated ? (
                        <Button
                            href="/dashboard"
                            className="!rounded-full !px-6 !font-bold hover:!translate-y-0 !bg-[#30C060] !text-[#122818] hover:!bg-[#22a44f] hover:!text-white shadow-sm"
                        >
                            Buka Dashboard
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                href="/login"
                                className="!text-[#2D3742] hover:!translate-y-0 hover:!bg-brand-50 hover:!text-brand-700 !font-bold"
                            >
                                Masuk
                            </Button>
                            <Button
                                href="/register"
                                className="!rounded-full !bg-[#30C060] !px-5 !font-bold !text-[#122818] !shadow-[0_8px_18px_rgba(48,192,96,0.22)] hover:!translate-y-0 hover:!bg-[#22a44f] hover:!text-white"
                            >
                                Daftar Gratis
                            </Button>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200/80 bg-white/80 text-gray-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-focus/30 md:hidden"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    aria-expanded={isMenuOpen}
                    aria-controls="guest-mobile-menu"
                    aria-label={isMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                >
                    {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
            </div>

            {isMenuOpen && (
                <div id="guest-mobile-menu" className="relative overflow-hidden border-t border-[var(--toku-border)] bg-white px-5 py-4 shadow-xl md:hidden">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-repeat opacity-85"
                        style={{ backgroundImage: akatsukiPattern, backgroundSize: '240px 120px' }}
                    />
                    <div className="relative">
                        <div className="flex flex-col gap-1">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeMenu}
                                    className={`rounded-xl px-4 py-2.5 text-base font-extrabold no-underline transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-brand-600 !text-white shadow-sm'
                                            : 'bg-white/80 text-[#1a232c] hover:bg-brand-50 hover:text-brand-700'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <div className={`mt-3 border-t border-gray-100 pt-4 ${isAuthenticated ? '' : 'grid grid-cols-2 gap-3'}`}>
                            {isAuthenticated ? (
                                <Button href="/dashboard" onClick={closeMenu} className="w-full !rounded-xl !bg-[#30C060] !text-[#122818] hover:!bg-[#22a44f] hover:!text-white">Buka Dashboard</Button>
                            ) : (
                                <>
                                    <Button variant="outline" href="/login" onClick={closeMenu} className="w-full !rounded-xl">Masuk</Button>
                                    <Button href="/register" onClick={closeMenu} className="w-full !rounded-xl !bg-[#30C060] !text-[#122818] hover:!bg-[#22a44f] hover:!text-white">Daftar Gratis</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
