const colors = {
    red: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    brand: 'bg-[var(--toku-primary-soft)] text-[var(--toku-primary-hover)]',
    green: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300',
    blue: 'bg-learning-50 text-learning-700 dark:bg-learning-950/50 dark:text-learning-200',
    yellow: 'bg-achievement-50 text-achievement-700 dark:bg-achievement-900/40 dark:text-achievement-100',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    purple: 'bg-purple-50 text-purple-600',
};

export default function Badge({ children, color = 'brand', className = '' }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]} ${className}`}>
            {children}
        </span>
    );
}
