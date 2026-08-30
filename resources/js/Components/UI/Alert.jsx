import { useState } from 'react';

const styles = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: '✓' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '✕' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: '⚠' },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'ℹ' },
};

export default function Alert({ type = 'info', children, dismissible = false, className = '' }) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    const s = styles[type];

    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${s.bg} ${className}`}>
            <span className={`${s.text} font-bold text-sm mt-0.5`}>{s.icon}</span>
            <div className={`flex-1 text-sm ${s.text}`}>{children}</div>
            {dismissible && (
                <button onClick={() => setVisible(false)} className={`${s.text} hover:opacity-70 text-lg leading-none`}>&times;</button>
            )}
        </div>
    );
}
