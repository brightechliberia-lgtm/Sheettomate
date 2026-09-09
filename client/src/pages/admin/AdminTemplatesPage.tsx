import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

interface Tpl {
  id: string;
  title: string;
  published: boolean;
  featured: boolean;
  flagged: boolean;
  reviewStatus: string;
  createdBy: { name: string };
}

export default function AdminTemplatesPage() {
  const [items, setItems] = useState<Tpl[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const d = await api<{ items: Tpl[] }>('/admin/templates');
    setItems(d.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  function patch(id: string, body: object) {
    setError('');
    void api(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      .then(load)
      .catch((err: Error) => setError(err.message));
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Permanently delete “${title}”? Buyers will lose access to this listing.`)) return;
    setError('');
    try {
      await api(`/templates/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <StaffGate scope="templates">
      <h1 className="text-2xl font-bold">Templates</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-2">
        {items.map((t) => (
          <li key={t.id} className="rounded-xl border bg-white p-4 flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-semibold">{t.title}</p>
              <p className="text-xs text-stone-500">
                {t.createdBy.name} · {t.reviewStatus} {t.flagged ? '· flagged' : ''} {t.featured ? '· featured' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => patch(t.id, { reviewStatus: 'APPROVED', published: true })}>
                Approve
              </button>
              <button type="button" onClick={() => patch(t.id, { reviewStatus: 'REJECTED', published: false })}>
                Reject
              </button>
              <button type="button" onClick={() => patch(t.id, { featured: !t.featured })}>
                Feature
              </button>
              <button type="button" onClick={() => patch(t.id, { flagged: !t.flagged, flagReason: 'Inappropriate' })}>
                Flag
              </button>
              <button type="button" className="text-red-700 font-semibold" onClick={() => void remove(t.id, t.title)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </StaffGate>
  );
}
