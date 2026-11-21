export default function ChartBreakdown({ items }) {
    return (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-700 dark:text-gray-300">
            {items.map(({ label, value }) => (
                <li key={label}>{label}: <strong>{Number(value).toLocaleString('id-ID')}</strong></li>
            ))}
        </ul>
    );
}
