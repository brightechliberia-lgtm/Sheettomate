import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function WorkspacesPage() {
  const [items, setItems] = useState<{ id: string; name: string; owner: { name: string }; _count: { members: number; templates: number } }[]>([]);

  async function load() {
    const data = await api<{ items: typeof items }>('/community/workspaces');
    setItems(data.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api('/community/workspaces', { method: 'POST', body: JSON.stringify({ name: String(new FormData(e.currentTarget).get('name')) }) });
    e.currentTarget.reset();
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Shared workspaces</h1>
      <form onSubmit={create} className="flex gap-2">
        <input name="name" required minLength={2} placeholder="Workspace name" className="rounded border px-3 py-2" />
        <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
          Create
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((w) => (
          <li key={w.id} className="rounded-xl border bg-white px-4 py-3">
            <Link to={`/community/workspaces/${w.id}`} className="font-semibold">
              {w.name}
            </Link>
            <p className="text-xs text-stone-500">
              {w.owner.name} · {w._count.members} members · {w._count.templates} templates
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
