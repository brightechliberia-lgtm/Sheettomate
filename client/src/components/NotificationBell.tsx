import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../lib/realtime';

interface Note {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const unread = items.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!user) return;
    api<{ items: Note[] }>('/courses/notifications')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [user]);

  useRealtime((msg) => {
    if (!user) return;
    if (msg.type === 'notification' || msg.type === 'poll' || msg.type === 'hello') {
      api<{ items: Note[] }>('/courses/notifications')
        .then((d) => setItems(d.items))
        .catch(() => undefined);
    }
  });

  if (!user) return null;

  return (
    <div className="relative">
      <button type="button" className="text-sm text-stone-600" onClick={() => setOpen((v) => !v)}>
        Alerts{unread ? ` (${unread})` : ''}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border bg-white p-3 shadow-lg z-30 max-h-80 overflow-auto">
          {items.length === 0 && <p className="text-sm text-stone-500">No notifications</p>}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className="block w-full text-left text-sm py-2 border-b last:border-0"
              onClick={() => {
                void api(`/courses/notifications/${n.id}/read`, { method: 'POST' });
                setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
              }}
            >
              <p className="font-semibold">{n.title}</p>
              <p className="text-stone-600">{n.body}</p>
              {n.link && (
                <Link to={n.link} className="text-brand-700">
                  Open
                </Link>
              )}
            </button>
          ))}
          <Link to="/notifications" className="block text-center text-xs font-semibold text-brand-700 pt-2">
            Notification center
          </Link>
        </div>
      )}
    </div>
  );
}
