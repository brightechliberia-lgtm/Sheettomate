import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

export default function AdminCmsPage() {
  const [pages, setPages] = useState<{ slug: string; title: string; published: boolean }[]>([]);
  async function load() {
    const d = await api<{ pages: typeof pages; announcements: unknown[] }>('/admin/cms');
    setPages(d.pages);
  }
  useEffect(() => {
    load().catch(() => setPages([]));
  }, []);

  async function savePage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/cms', {
      method: 'POST',
      body: JSON.stringify({
        slug: fd.get('slug'),
        title: fd.get('title'),
        body: fd.get('body'),
        published: true,
      }),
    });
    await load();
  }

  async function announce(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: fd.get('title'), body: fd.get('body') }),
    });
    e.currentTarget.reset();
  }

  return (
    <StaffGate scope="cms">
      <h1 className="text-2xl font-bold">Content</h1>
      <div className="mt-4 grid md:grid-cols-2 gap-6">
        <form onSubmit={savePage} className="rounded-2xl border bg-white p-4 grid gap-2">
          <h2 className="font-bold">Landing / blog page</h2>
          <input name="slug" required placeholder="about" className="rounded border px-2 py-1" />
          <input name="title" required placeholder="Title" className="rounded border px-2 py-1" />
          <textarea name="body" required className="rounded border px-2 py-1 min-h-32" />
          <button type="submit" className="rounded bg-brand-600 text-white py-2">
            Save page
          </button>
        </form>
        <form onSubmit={announce} className="rounded-2xl border bg-white p-4 grid gap-2">
          <h2 className="font-bold">Announcement</h2>
          <input name="title" required className="rounded border px-2 py-1" />
          <textarea name="body" required className="rounded border px-2 py-1" />
          <button type="submit" className="rounded border py-2">
            Publish
          </button>
        </form>
      </div>
      <ul className="mt-4 text-sm">
        {pages.map((p) => (
          <li key={p.slug}>
            /{p.slug} — {p.title} {p.published ? '(live)' : ''}
          </li>
        ))}
      </ul>
    </StaffGate>
  );
}
