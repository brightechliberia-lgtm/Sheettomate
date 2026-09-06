import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ForumPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; title: string; createdAt: string; user: { name: string }; _count: { replies: number } }[]>([]);

  async function load() {
    const data = await api<{ items: typeof items }>('/community/forum');
    setItems(data.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/community/forum', {
      method: 'POST',
      body: JSON.stringify({ title: fd.get('title'), body: fd.get('body'), tags: ['spreadsheets'] }),
    });
    e.currentTarget.reset();
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Q&A forum</h1>
      {user && (
        <form onSubmit={create} className="rounded-2xl border bg-white p-4 space-y-2">
          <input name="title" required minLength={4} placeholder="Question title" className="w-full rounded border px-3 py-2" />
          <textarea name="body" required minLength={8} placeholder="What are you trying to do in Excel or Sheets?" className="w-full rounded border px-3 py-2 min-h-24" />
          <button type="submit" className="rounded bg-brand-600 px-4 py-2 text-white text-sm font-semibold">
            Ask
          </button>
        </form>
      )}
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="rounded-xl border bg-white px-4 py-3">
            <Link to={`/community/forum/${p.id}`} className="font-semibold">
              {p.title}
            </Link>
            <p className="text-xs text-stone-500">
              {p.user.name} · {p._count.replies} replies
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
