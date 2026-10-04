const OPTION_STYLES = {
    idle: 'border-gray-200 bg-white text-gray-700 shadow-[0_4px_0_0_#e5e7eb] hover:border-amber-300 hover:bg-amber-50/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:shadow-[0_4px_0_0_#374151] dark:hover:border-amber-500 dark:hover:bg-amber-950/30',
    selected: 'border-amber-500 bg-amber-50 text-gray-950 shadow-[0_4px_0_0_#b77900] dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-100 dark:shadow-[0_4px_0_0_#92400e]',
    correct: 'border-green-500 bg-green-100 text-green-900 shadow-[0_4px_0_0_#16a34a] dark:border-green-600 dark:bg-green-950 dark:text-green-200 dark:shadow-[0_4px_0_0_#166534]',
    wrong: 'border-red-500 bg-red-100 text-red-900 shadow-[0_4px_0_0_#dc2626] dark:border-red-600 dark:bg-red-950 dark:text-red-200 dark:shadow-[0_4px_0_0_#991b1b]',
};

export function QuizOptionButton({ state = 'idle', className = '', children, ...props }) {
    return (
        <button
            type="button"
            className={`relative min-h-[54px] min-w-0 w-full break-words rounded-2xl border-2 px-4 py-3 text-center text-base font-bold leading-tight transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:translate-y-1 active:shadow-none disabled:cursor-default sm:px-5 ${OPTION_STYLES[state] || OPTION_STYLES.idle} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function QuizErrorMessage({ children, className = '' }) {
    if (!children) return null;
    return (
        <div role="alert" className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 ${className}`}>
            {children}
        </div>
    );
}

export function QuizActionButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            className={`min-h-11 rounded-xl bg-action-primary px-6 py-3 text-sm font-black text-ink-900 shadow-sm transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function QuizSurface({ as: Component = 'div', media = false, children, className = '', ...props }) {
    const surfaceClass = media
        ? 'rounded-[1.5rem] border-2 border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-[2rem]'
        : 'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900';

    return <Component className={`${surfaceClass} ${className}`} {...props}>{children}</Component>;
}

export function QuizBackButton({ children, className = '', iconSize = 19, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition ${className}`}
            {...props}
        >
            <svg className="shrink-0" style={{ width: iconSize, height: iconSize }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span>{children || 'Kembali'}</span>
        </button>
    );
}

export function QuizCloseButton({ className = '', ...props }) {
    return (
        <button
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white ${className}`}
            {...props}
        >
            <svg className="shrink-0" style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
        </button>
    );
}

