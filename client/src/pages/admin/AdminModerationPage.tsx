import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

export default function AdminModerationPage() {
  const [flags, setFlags] = useState<{ id: string; targetType: string; reason: string; status: string; reporter: { email: string } }[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; template: { title: string }; user: { email: string } }[]>([]);

  async function load() {
    const f = await api<{ items: typeof flags }>('/admin/flags');
    const r = await api<{ items: typeof reviews }>('/admin/reviews');
    setFlags(f.items);
    setReviews(r.items);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <StaffGate scope="moderation">
      <h1 className="text-2xl font-bold">Moderation</h1>
      <h2 className="mt-4 font-semibold">Flags / spam</h2>
      <ul className="text-sm space-y-2">
        {flags.map((f) => (
          <li key={f.id} className="rounded border bg-white p-3 flex justify-between">
            <span>
              {f.targetType}: {f.reason} ({f.status}) · {f.reporter.email}
              {/spam/i.test(f.reason) ? ' · spam heuristic' : ''}
            </span>
            <button
              type="button"
              onClick={() => void api(`/admin/flags/${f.id}`, { method: 'POST', body: JSON.stringify({ status: 'RESOLVED' }) }).then(load)}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Reviews</h2>
      <ul className="text-sm space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="rounded border bg-white p-3 flex justify-between">
            <span>
              {r.template.title} · {r.rating}★ · {r.user.email} — {r.comment}
            </span>
            <button type="button" onClick={() => void api(`/admin/reviews/${r.id}`, { method: 'DELETE' }).then(load)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </StaffGate>
  );
}
