import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const [ws, setWs] = useState<{
    name: string;
    members: { role: string; user: { id: string; name: string; email: string } }[];
    templates: { template: { id: string; title: string; version: string } }[];
  } | null>(null);

  async function load() {
    const data = await api<{ workspace: NonNullable<typeof ws> }>(`/community/workspaces/${id}`);
    setWs(data.workspace);
  }
  useEffect(() => {
    load().catch(() => setWs(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api(`/community/workspaces/${id}/invite`, { method: 'POST', body: JSON.stringify({ email: String(new FormData(e.currentTarget).get('email')) }) });
    await load();
  }

  async function attach(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await api(`/community/workspaces/${id}/templates`, {
      method: 'POST',
      body: JSON.stringify({ templateId: String(new FormData(e.currentTarget).get('templateId')) }),
    });
    await load();
  }

  if (!ws) return <p>Loading workspace…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{ws.name}</h1>
      <form onSubmit={invite} className="flex gap-2">
        <input name="email" type="email" required placeholder="Invite by email" className="rounded border px-3 py-2" />
        <button type="submit" className="text-sm font-semibold">
          Invite
        </button>
      </form>
      <form onSubmit={attach} className="flex gap-2">
        <input name="templateId" required placeholder="Template ID to co-create" className="rounded border px-3 py-2 flex-1" />
        <button type="submit" className="text-sm font-semibold">
          Attach
        </button>
      </form>
      <ul className="text-sm">
        {ws.members.map((m) => (
          <li key={m.user.id}>
            {m.user.name} ({m.role})
          </li>
        ))}
      </ul>
      <ul>
        {ws.templates.map((t) => (
          <li key={t.template.id}>
            {t.template.title} v{t.template.version}
          </li>
        ))}
      </ul>
    </div>
  );
}
