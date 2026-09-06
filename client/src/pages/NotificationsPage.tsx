import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useRealtime } from '../lib/realtime';

interface Note {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);

  async function load() {
    const d = await api<{ items: Note[] }>('/courses/notifications');
    setItems(d.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);
  useRealtime((msg) => {
    if (msg.type === 'notification' || msg.type === 'poll') void load();
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <button type="button" className="text-sm" onClick={() => void api('/community/digest/me', { method: 'POST' })}>
          Email me a digest
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className="rounded-xl border bg-white p-4">
            <p className="font-semibold">{n.title}</p>
            <p className="text-sm">{n.body}</p>
            {n.link && (
              <Link to={n.link} className="text-sm text-brand-700">
                Open
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
