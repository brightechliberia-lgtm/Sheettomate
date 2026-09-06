export default function LeaderboardTable({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; score: number; hint?: string }[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      <ol className="mt-3 space-y-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.id} className="flex justify-between gap-2">
            <span>
              {i + 1}. {r.name}
              {r.hint ? <span className="text-stone-500"> · {r.hint}</span> : null}
            </span>
            <span className="font-semibold text-brand-700">{r.score}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-stone-500">No rankings yet.</li>}
      </ol>
    </section>
  );
}
