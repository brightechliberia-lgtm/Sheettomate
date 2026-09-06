import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ReportButton from '../components/ReportButton';

interface Reply {
  id: string;
  body: string;
  user: { name: string };
  votes: unknown[];
  replies?: Reply[];
}

export default function ForumThreadPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<{ title: string; body: string; user: { name: string }; replies: Reply[] } | null>(null);

  async function load() {
    if (!id) return;
    const data = await api<{ post: NonNullable<typeof post> }>(`/community/forum/${id}`);
    setPost(data.post);
  }
  useEffect(() => {
    load().catch(() => setPost(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function reply(e: FormEvent<HTMLFormElement>, parentId?: string) {
    e.preventDefault();
    await api(`/community/forum/${id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body: String(new FormData(e.currentTarget).get('body')), parentId }),
    });
    e.currentTarget.reset();
    await load();
  }

  if (!post) return <p>Loading…</p>;

  return (
    <article className="space-y-4">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p>{post.body}</p>
      <p className="text-sm text-stone-500">{post.user.name}</p>
      <ReportButton targetType="forum" targetId={id ?? ''} />
      <ul className="space-y-3">
        {post.replies.map((r) => (
          <li key={r.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">{r.user.name}</p>
            <p className="text-sm">{r.body}</p>
            <p className="text-xs text-stone-500">{r.votes.length} helpful</p>
            {user && (
              <button
                type="button"
                className="text-xs font-semibold text-brand-700"
                onClick={() => void api(`/community/replies/${r.id}/helpful`, { method: 'POST' }).then(load)}
              >
                Mark helpful
              </button>
            )}
          </li>
        ))}
      </ul>
      {user && (
        <form onSubmit={(e) => void reply(e)} className="flex gap-2">
          <input name="body" required minLength={2} className="flex-1 rounded border px-3 py-2" placeholder="Write a reply" />
          <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
            Reply
          </button>
        </form>
      )}
    </article>
  );
}
