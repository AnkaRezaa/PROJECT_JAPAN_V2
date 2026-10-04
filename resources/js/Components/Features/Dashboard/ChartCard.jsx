export default function ChartCard({ title, subtitle, children, action, className = '' }) {
    return (
        <div className={`min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 transition-colors ${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div>{children}</div>
        </div>
    );
}
