import Button from '@/Components/UI/Button';
import ApplicationLogo from '@/Components/Navigation/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';

const makeSeigaihaPattern = (color, opacity) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 48'%3E%3Cg fill='none' stroke='%23${color}' stroke-opacity='${opacity}' stroke-width='1.35'%3E%3Cpath d='M0 48A24 24 0 0 1 48 48M8 48A16 16 0 0 1 40 48M16 48A8 8 0 0 1 32 48M48 48A24 24 0 0 1 96 48M56 48A16 16 0 0 1 88 48M64 48A8 8 0 0 1 80 48M24 24A24 24 0 0 1 72 24M32 24A16 16 0 0 1 64 24M40 24A8 8 0 0 1 56 24'/%3E%3C/g%3E%3C/svg%3E")`;
const lightSeigaihaPattern = makeSeigaihaPattern('30c060', '.14');
const darkSeigaihaPattern = makeSeigaihaPattern('f2b705', '.22');

export default function GuestNavbar({ heroTone = 'light' }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const { url, props } = usePage();
    const isAuthenticated = Boolean(props.auth?.user);
    const isHeroPage = ['/', '/about', '/pricing', '/roadmap'].includes(url);
    const isHeroState = isHeroPage && !hasScrolled && !isMenuOpen;
    const usesDarkHero = heroTone === 'dark' && isHeroState;

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
        if (!isHeroPage) {
            setHasScrolled(true);
            return undefined;
        }

        const updateScrollState = () => setHasScrolled(window.scrollY > 20);
        updateScrollState();
        window.addEventListener('scroll', updateScrollState, { passive: true });

        return () => window.removeEventListener('scroll', updateScrollState);
    }, [isHeroPage]);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${usesDarkHero ? 'border-white/10 bg-[#2D3742]/95' : 'border-[var(--toku-border)] bg-white/95 shadow-sm backdrop-blur'}`}>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-repeat"
                style={{
                    backgroundImage: usesDarkHero ? darkSeigaihaPattern : lightSeigaihaPattern,
                    backgroundSize: '96px 48px',
                }}
            />
            <div className="relative flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 lg:px-20">
                <ApplicationLogo
                    className={usesDarkHero ? 'drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]' : ''}
                    wordmarkClassName={usesDarkHero ? 'brightness-0 invert opacity-95' : ''}
                />
                <ul className="hidden list-none items-center gap-7 md:flex lg:gap-8">
                    {navigationItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`relative py-2 text-sm font-bold no-underline transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-brand-600 after:transition-transform ${isActive(item.href)
                                    ? usesDarkHero ? 'text-amber-200 after:bg-amber-300 after:w-full' : 'text-brand-600 after:w-full'
                                    : usesDarkHero ? 'text-white/90 after:w-0 hover:text-amber-200 hover:after:w-full' : 'text-gray-700 after:w-0 hover:text-brand-600 hover:after:w-full'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="hidden items-center gap-3 md:flex">
                    {isAuthenticated ? (
                            <Button href="/dashboard" className="!rounded-full !px-5 hover:!translate-y-0">Buka Dashboard</Button>
                    ) : (
                        <>
                            <Button variant="ghost" href="/login" className={usesDarkHero ? '!text-white hover:!translate-y-0 hover:!bg-white/15 hover:!text-white' : '!text-[#2D3742] hover:!translate-y-0 hover:!bg-brand-50 hover:!text-brand-700'}>Masuk</Button>
                            <Button href="/register" className="!rounded-full !bg-[#30C060] !px-5 !text-[#24303B] !shadow-[0_8px_18px_rgba(48,192,96,0.22)] hover:!translate-y-0 hover:!bg-[#15803D] hover:!text-white">Daftar Gratis</Button>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-focus/30 md:hidden ${usesDarkHero ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-amber-200' : 'border-gray-200/80 bg-white/80 text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600'}`}
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
                        className="pointer-events-none absolute inset-0 bg-repeat"
                        style={{ backgroundImage: lightSeigaihaPattern, backgroundSize: '96px 48px' }}
                    />
                    <div className="relative">
                    <div className="flex flex-col gap-1">
                        {navigationItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMenu}
                                className={`rounded-lg px-3 py-2.5 text-sm font-semibold no-underline transition-colors ${isActive(item.href)
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'text-gray-700 hover:bg-brand-50 hover:text-brand-600'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    <div className={`mt-3 border-t border-gray-100 pt-4 ${isAuthenticated ? '' : 'grid grid-cols-2 gap-3'}`}>
                        {isAuthenticated ? (
                            <Button href="/dashboard" onClick={closeMenu} className="w-full">Buka Dashboard</Button>
                        ) : (
                            <>
                                <Button variant="outline" href="/login" onClick={closeMenu} className="w-full">Masuk</Button>
                                <Button href="/register" onClick={closeMenu} className="w-full">Daftar Gratis</Button>
                            </>
                        )}
                    </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
