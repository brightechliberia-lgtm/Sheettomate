import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function WebhooksPage() {
  const [items, setItems] = useState<{ id: string; name: string; url: string; secret: string; enabled: boolean; deliveries: { id: string; success: boolean; statusCode: number | null; event: string }[] }[]>([]);
  const [inbound, setInbound] = useState<{ id: string; name: string; token: string }[]>([]);

  async function load() {
    const d = await api<{ items: typeof items; inbound: typeof inbound }>('/automations/webhooks');
    setItems(d.items);
    setInbound(d.inbound);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function createOut(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/automations/webhooks', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), url: fd.get('url') }) });
    e.currentTarget.reset();
    await load();
  }

  async function createIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api('/automations/inbound', { method: 'POST', body: JSON.stringify({ name: String(new FormData(e.currentTarget).get('name')) }) });
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Webhook management</h1>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Inbound (Zapier / Make / forms)</h2>
        <form onSubmit={createIn} className="mt-3 flex gap-2">
          <input name="name" required placeholder="Hook name" className="rounded border px-3 py-2" />
          <button type="submit" className="text-sm font-semibold">
            Create
          </button>
        </form>
        <ul className="mt-3 text-sm space-y-2">
          {inbound.map((h) => (
            <li key={h.id} className="font-mono break-all">
              {h.name}: {window.location.origin.replace('5173', '4000')}/api/automations/hooks/{h.token}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Outbound</h2>
        <form onSubmit={createOut} className="mt-3 grid sm:grid-cols-2 gap-2">
          <input name="name" required placeholder="Name" className="rounded border px-3 py-2" />
          <input name="url" required type="url" placeholder="https://example.com/hook" className="rounded border px-3 py-2" />
          <button type="submit" className="text-sm font-semibold">
            Save
          </button>
        </form>
        <ul className="mt-4 space-y-4">
          {items.map((w) => (
            <li key={w.id} className="border-t pt-3">
              <p className="font-semibold">{w.name}</p>
              <p className="text-xs break-all">{w.url}</p>
              <p className="text-xs">HMAC secret: {w.secret}</p>
              <div className="flex gap-2 mt-2 text-sm">
                <button type="button" onClick={() => void api(`/automations/webhooks/${w.id}/test`, { method: 'POST' }).then(load)}>
                  Test
                </button>
                <button type="button" onClick={() => void api(`/automations/webhooks/${w.id}`, { method: 'DELETE' }).then(load)}>
                  Delete
                </button>
              </div>
              <ul className="text-xs mt-2">
                {w.deliveries?.map((d) => (
                  <li key={d.id} className="flex justify-between">
                    <span>
                      {d.event} · {d.success ? 'ok' : 'fail'} · {d.statusCode ?? '—'}
                    </span>
                    {!d.success && (
                      <button type="button" onClick={() => void api(`/automations/deliveries/${d.id}/retry`, { method: 'POST' })}>
                        Retry
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
