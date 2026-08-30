export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-11 items-center rounded-lg border border-[var(--toku-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-sm transition duration-150 ease-in-out hover:bg-[var(--toku-primary-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--toku-focus)] focus:ring-offset-2 disabled:opacity-25 dark:bg-gray-800 dark:text-gray-300 dark:focus:ring-offset-gray-950 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
