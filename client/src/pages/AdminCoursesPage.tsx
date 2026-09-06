import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Course {
  id: string;
  title: string;
  status: string;
  featured: boolean;
  instructor: { name: string };
}

export default function AdminCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);

  async function load() {
    const data = await api<{ items: Course[] }>('/courses?status=PENDING_REVIEW');
    const all = await api<{ items: Course[] }>('/courses');
    setItems(all.items);
    void data;
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Institute moderation</h1>
      <button
        type="button"
        className="mt-2 text-sm font-semibold"
        onClick={() => void api('/courses/reminders', { method: 'POST' })}
      >
        Send lesson reminders
      </button>
      <ul className="mt-4 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-4 flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-stone-500">
                {c.instructor.name} · {c.status} {c.featured ? '· featured' : ''}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => void api(`/courses/${c.id}/review`, { method: 'POST', body: JSON.stringify({ status: 'PUBLISHED' }) }).then(load)}>
                Approve
              </button>
              <button type="button" onClick={() => void api(`/courses/${c.id}/review`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED', reason: 'Please revise lessons' }) }).then(load)}>
                Reject
              </button>
              <button type="button" onClick={() => void api(`/courses/${c.id}/feature`, { method: 'POST', body: JSON.stringify({ featured: !c.featured }) }).then(load)}>
                Feature
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
