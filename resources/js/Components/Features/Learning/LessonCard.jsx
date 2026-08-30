import LockIcon from '@mui/icons-material/Lock';
import Badge from '@/Components/UI/Badge';
import ProgressBar from '@/Components/UI/ProgressBar';

export default function LessonCard({ title, subtitle, progress, total, icon, locked = false, onClick }) {
    return (
        <div
            onClick={!locked ? onClick : undefined}
            className={`bg-white border border-gray-200 rounded-2xl p-5 transition-all duration-300 ${locked ? 'opacity-50' : 'hover:shadow-md hover:-translate-y-1 cursor-pointer'}`}
        >
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">
                    {locked ? '<LockIcon className="w-5 h-5 inline-block" />' : icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 truncate">{title}</h4>
                        {progress === total && <Badge color="green">✓ Done</Badge>}
                    </div>
                    {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
                    {total > 0 && <ProgressBar value={progress} max={total} showLabel size="sm" />}
                </div>
            </div>
        </div>
    );
}
