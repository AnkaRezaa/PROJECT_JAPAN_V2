import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Link } from '@inertiajs/react';

const DropdownContext = createContext();

export default function Dropdown({ children }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <DropdownContext.Provider value={{ open, setOpen }}>
            <div ref={ref} className="relative">{children}</div>
        </DropdownContext.Provider>
    );
}

Dropdown.Trigger = function Trigger({ children }) {
    const { setOpen } = useContext(DropdownContext);
    return <div onClick={() => setOpen(prev => !prev)}>{children}</div>;
};

Dropdown.Content = function Content({ children, align = 'right', width = '48' }) {
    const { open } = useContext(DropdownContext);
    const alignClass = align === 'left' ? 'left-0' : 'right-0';
    const widthClass = `w-${width}`;
    if (!open) return null;
    return (
        <div className={`absolute z-50 mt-2 ${widthClass} ${alignClass} bg-white rounded-xl shadow-lg border border-gray-100 py-1 transform transition-all`}>
            {children}
        </div>
    );
};

Dropdown.Link = function DropdownLink({ children, href, method, as, ...props }) {
    return (
        <Link href={href} method={method} as={as} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-700 transition-colors" {...props}>
            {children}
        </Link>
    );
};
