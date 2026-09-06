import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const SCOPES = ['automations:read', 'automations:write', 'webhooks:manage', 'data:export', '*'];

export default function ApiKeysPage() {
  const [items, setItems] = useState<{ id: string; name: string; prefix: string; scopes: string[]; revokedAt: string | null }[]>([]);
  const [secret, setSecret] = useState('');

  async function load() {
    const d = await api<{ items: typeof items }>('/automations/keys');
    setItems(d.items);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scopes = SCOPES.filter((s) => fd.getAll('scope').includes(s));
    const d = await api<{ key: string }>('/automations/keys', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), scopes: scopes.length ? scopes : ['automations:read'] }) });
    setSecret(d.key);
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">API keys & OAuth</h1>
      <p className="text-sm text-stone-600">
        Enterprise REST lives at <code>/api/v1</code> with header <code>Authorization: Bearer smk_…</code>. Scoped keys cannot exceed the scopes you tick.
      </p>
      {secret && <p className="rounded-lg bg-amber-50 p-3 text-sm font-mono break-all">{secret}</p>}
      <form onSubmit={create} className="rounded-2xl border bg-white p-4 space-y-2">
        <input name="name" required placeholder="Key name" className="rounded border px-3 py-2 w-full" />
        <div className="flex flex-wrap gap-3 text-sm">
          {SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input type="checkbox" name="scope" value={s} />
              {s}
            </label>
          ))}
        </div>
        <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
          Create key
        </button>
      </form>
      <ul className="text-sm space-y-2">
        {items.map((k) => (
          <li key={k.id} className="rounded-xl border bg-white px-4 py-3 flex justify-between">
            <span>
              {k.name} · {k.prefix}… · {k.scopes.join(', ')} {k.revokedAt ? '(revoked)' : ''}
            </span>
            {!k.revokedAt && (
              <button type="button" onClick={() => void api(`/automations/keys/${k.id}`, { method: 'DELETE' }).then(load)}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => void api<{ url: string }>('/automations/oauth/google/start').then((d) => window.open(d.url, '_blank'))}>
          Connect Google Drive / Sheets
        </button>
        <button type="button" onClick={() => void api<{ url: string }>('/automations/oauth/hubspot/start').then((d) => window.open(d.url, '_blank'))}>
          Connect HubSpot (sandbox)
        </button>
      </div>
    </div>
  );
}
