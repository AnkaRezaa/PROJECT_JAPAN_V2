const colors = {
    red: 'bg-state-danger',
    brand: 'bg-progress-complete',
    green: 'bg-progress-complete',
    blue: 'bg-progress-active',
    yellow: 'bg-amber-500',
    gradient: 'bg-gradient-to-r from-brand-500 to-achievement-400',
};

export default function ProgressBar({ value = 0, max = 100, color = 'brand', showLabel = false, size = 'md', className = '' }) {
    const percent = Math.min(Math.round((value / max) * 100), 100);
    const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

    return (
        <div className={className}>
            {showLabel && (
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{value}/{max}</span>
                    <span>{percent}%</span>
                </div>
            )}
            <div className={`${heights[size]} overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800`}>
                <div className={`h-full rounded-full transition-all duration-700 ${colors[color]}`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
