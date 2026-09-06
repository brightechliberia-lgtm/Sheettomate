import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../lib/realtime';
import ReportButton from './ReportButton';

interface Comment {
  id: string;
  body: string;
  user: { id: string; name: string };
  replies?: Comment[];
}

export default function CommentsSection({ templateId }: { templateId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);

  async function load() {
    const data = await api<{ items: Comment[] }>(`/community/templates/${templateId}/comments`);
    setItems(data.items);
  }

  useEffect(() => {
    load().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useRealtime((msg) => {
    if (msg.type === 'comment' || msg.type === 'poll') void load();
  });

  async function send(e: FormEvent<HTMLFormElement>, parentId?: string) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get('body'));
    await api(`/community/templates/${templateId}/comments`, { method: 'POST', body: JSON.stringify({ body, parentId }) });
    e.currentTarget.reset();
    await load();
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="font-bold text-lg">Discussion</h2>
      <ul className="mt-3 space-y-4">
        {items.map((c) => (
          <li key={c.id}>
            <p className="font-medium">{c.user.name}</p>
            <p className="text-sm">{c.body}</p>
            <ReportButton targetType="comment" targetId={c.id} />
            {c.replies?.map((r) => (
              <p key={r.id} className="ml-4 mt-1 text-sm text-brand-800">
                {r.user.name}: {r.body}
              </p>
            ))}
            {user && (
              <form className="mt-2 ml-4 flex gap-2" onSubmit={(e) => void send(e, c.id)}>
                <input name="body" minLength={2} required placeholder="Reply" className="flex-1 rounded border px-2 py-1 text-sm" />
                <button type="submit" className="text-xs font-semibold">
                  Reply
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {user && (
        <form className="mt-4 flex gap-2" onSubmit={(e) => void send(e)}>
          <input name="body" minLength={2} required placeholder="Comment on this template" className="flex-1 rounded border px-3 py-2" />
          <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
            Post
          </button>
        </form>
      )}
    </section>
  );
}
