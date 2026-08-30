export default function StreakWidget({ streak = 0, target = 7, className = '' }) {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const completedDays = Math.min(streak % 7 || 7, 7);

    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">🔥 Streak</h3>
                <span className="text-2xl font-black text-achievement-700">{streak}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">days in a row</p>
            <div className="flex gap-2 justify-between">
                {days.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${i < completedDays ? 'bg-[var(--toku-primary)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {i < completedDays ? '✓' : d}
                        </div>
                        <span className="text-[10px] text-gray-400">{d}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
