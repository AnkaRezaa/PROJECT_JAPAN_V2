export default function XPBar({ current = 0, required = 100, level = 1, className = '' }) {
    const percent = Math.min(Math.round((current / required) * 100), 100);

    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-5 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    <span className="text-sm font-bold text-gray-900">Level {level}</span>
                </div>
                <span className="text-xs text-gray-500">{current}/{required} XP</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-brand-600 to-achievement-400 rounded-full transition-all duration-700"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 mt-2">{required - current} XP to next level</p>
        </div>
    );
}
