export default function AnalyticsChart({
  title,
  points,
  type = 'line',
}: {
  title: string;
  points: { label: string; value: number }[];
  type?: 'line' | 'bar';
}) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-stone-500">No data yet.</p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 640;
  const h = 180;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p.value / max) * (h - 8)}`)
    .join(' ');

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {type === 'line' ? (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44 text-brand-600">
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <div className="flex items-end gap-1 h-44">
          {points.map((p) => (
            <div key={p.label} className="flex-1 flex flex-col justify-end min-w-0" title={`${p.label}: ${p.value}`}>
              <div className="bg-brand-600/80 rounded-t w-full" style={{ height: `${(p.value / max) * 100}%` }} />
            </div>
          ))}
        </div>
      )}
      {type === 'bar' ? (
        <div className="mt-2 flex gap-1 text-[10px] text-stone-500">
          {points.map((p) => (
            <span key={p.label} className="flex-1 truncate text-center" title={p.label}>
              {p.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-400 mt-1">
          {points[0]?.label} → {points[points.length - 1]?.label}
        </p>
      )}
    </div>
  );
}
