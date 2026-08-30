export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-11 items-center rounded-lg border border-transparent bg-[var(--toku-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-[var(--toku-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--toku-focus)] focus:ring-offset-2 dark:focus:ring-offset-gray-950 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
