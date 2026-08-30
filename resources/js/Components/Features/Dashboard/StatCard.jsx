export default function StatCard({ icon, title, value, change, changeType = 'up', className = '' }) {
    return (
        <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 transition-colors ${className}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xl font-black text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">{icon}</div>
                {change && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${changeType === 'up' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {changeType === 'up' ? '+' : '-'} {change}
                    </span>
                )}
            </div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        </div>
    );
}
