import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useRealtime } from '../lib/realtime';

export default function AutomationsPage() {
  const [catalog, setCatalog] = useState<{
    connectors: { id: string; name: string }[];
    templates: { slug: string; name: string; description: string }[];
  } | null>(null);
  const [items, setItems] = useState<{ id: string; name: string; triggerType: string; enabled: boolean; _count: { runs: number } }[]>([]);
  const [flash, setFlash] = useState('');

  async function load() {
    const c = await api<NonNullable<typeof catalog>>('/automations/catalog');
    const w = await api<{ items: typeof items }>('/automations/workflows');
    setCatalog(c);
    setItems(w.items);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  useRealtime((msg) => {
    if (msg.type === 'automation') {
      setFlash('A workflow just finished');
      void load();
    }
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap justify-between gap-3 rounded-2xl border bg-gradient-to-r from-brand-800 to-brand-600 text-white p-6 shadow-lg">
        <div>
          <h1 className="text-3xl font-extrabold">Automation engine</h1>
          <p className="text-white/80 mt-1">Connect spreadsheets to email, SMS, Slack, WhatsApp, Drive, CRM, and QuickBooks.</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link to="/automations/new" className="rounded-full bg-gold px-4 py-2 text-white">
            New workflow
          </Link>
          <Link to="/automations/webhooks" className="rounded-full border border-white/40 px-4 py-2">
            Webhooks
          </Link>
          <Link to="/automations/keys" className="rounded-full border border-white/40 px-4 py-2">
            API keys
          </Link>
          <Link to="/automations/data" className="rounded-full border border-white/40 px-4 py-2">
            Import / export
          </Link>
        </nav>
      </header>
      {flash && <p className="text-sm text-brand-700">{flash}</p>}
      <section>
        <h2 className="font-bold text-xl">Starter templates</h2>
        <div className="mt-3 grid md:grid-cols-3 gap-3">
          {catalog?.templates.map((t) => (
            <article key={t.slug} className="rounded-2xl border bg-white p-4">
              <h3 className="font-bold">{t.name}</h3>
              <p className="text-sm text-stone-600 mt-1">{t.description}</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-brand-700"
                onClick={() => void api('/automations/templates', { method: 'POST', body: JSON.stringify({ slug: t.slug }) }).then(load)}
              >
                Install
              </button>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-bold text-xl">Connectors</h2>
        <ul className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
          {catalog?.connectors.map((c) => (
            <li key={c.id} className="rounded-xl border bg-white px-3 py-2">
              {c.name}
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-500 mt-2">Zapier/Make: create an inbound hook, then POST JSON to that URL from any of 1000+ apps.</p>
      </section>
      <section>
        <h2 className="font-bold text-xl">Your workflows</h2>
        <ul className="mt-3 space-y-2">
          {items.map((w) => (
            <li key={w.id} className="rounded-xl border bg-white px-4 py-3 flex justify-between gap-3">
              <div>
                <Link to={`/automations/${w.id}`} className="font-semibold">
                  {w.name}
                </Link>
                <p className="text-xs text-stone-500">
                  {w.triggerType} · {w._count.runs} runs · {w.enabled ? 'on' : 'paused'}
                </p>
              </div>
              <button
                type="button"
                className="text-sm"
                onClick={() => void api(`/automations/workflows/${w.id}/run`, { method: 'POST', body: JSON.stringify({ payload: { sales: 150, target: 100, stock: 3, item: 'Rice' } }) })}
              >
                Run now
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
