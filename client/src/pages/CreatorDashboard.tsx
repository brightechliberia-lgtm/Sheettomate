import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TemplateUploadForm from '../components/TemplateUploadForm';
import { api, setAccessToken } from '../lib/api';
import type { AuthUser } from '@sheetomate/shared';

interface SeriesRow {
  id: string;
  title: string;
  downloads: number;
  rating: number;
  earnings: number;
  openQuestions: number;
}

interface QuestionRow {
  id: string;
  body: string;
  templateId: string;
  templateTitle: string;
  answers: { id: string }[];
}

export default function CreatorDashboard() {
  const { user, refreshUser } = useAuth();
  const [totals, setTotals] = useState({ earnings: 0, downloads: 0, templates: 0 });
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});

  async function load() {
    if (!user || (user.role !== 'CREATOR' && user.role !== 'ADMIN')) {
      return;
    }
    const data = await api<{ totals: typeof totals; series: SeriesRow[]; questions: QuestionRow[] }>(
      '/creator/analytics',
    );
    setTotals(data.totals);
    setSeries(data.series);
    setQuestions(data.questions);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [user?.role]);

  const maxDownloads = Math.max(1, ...series.map((row) => row.downloads));

  async function answer(templateId: string, questionId: string) {
    const body = reply[questionId];
    if (!body) return;
    await api(`/templates/${templateId}/questions/${questionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setReply((current) => ({ ...current, [questionId]: '' }));
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Creator dashboard</h1>
      {user && user.role !== 'CREATOR' && user.role !== 'ADMIN' && (
        <div className="rounded-xl border border-brand-500/40 bg-white p-4">
          <p className="text-sm text-stone-700">Template uploads are for creator accounts.</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              void api<{ user: AuthUser; accessToken?: string }>('/users/become-creator', { method: 'POST' }).then(
                async (d) => {
                  if (d.accessToken) setAccessToken(d.accessToken);
                  await refreshUser();
                },
              );
            }}
          >
            Become a creator
          </button>
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Earnings" value={`$${totals.earnings.toFixed(2)}`} />
        <Stat label="Downloads" value={String(totals.downloads)} />
        <Stat label="Templates" value={String(totals.templates)} />
      </div>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold">Downloads by template</h2>
        <div className="mt-4 space-y-3">
          {series.map((row) => (
            <div key={row.id}>
              <div className="flex justify-between text-sm">
                <Link to={`/templates/${row.id}`} className="font-medium">
                  {row.title}
                </Link>
                <span>
                  {row.downloads} · {row.rating.toFixed(1)}★ · ${row.earnings.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-stone-100">
                <div className="h-2 rounded bg-brand-600" style={{ width: `${(row.downloads / maxDownloads) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      {(user?.role === 'CREATOR' || user?.role === 'ADMIN') && <TemplateUploadForm onCreated={() => load()} />}
      <section>
        <h2 className="font-bold text-xl">Buyer questions</h2>
        <ul className="mt-3 space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl border bg-white p-4">
              <p className="text-xs text-stone-500">{q.templateTitle}</p>
              <p className="mt-1">{q.body}</p>
              {q.answers.length === 0 && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={reply[q.id] ?? ''}
                    onChange={(e) => setReply((c) => ({ ...c, [q.id]: e.target.value }))}
                    className="flex-1 rounded border px-3 py-2 text-sm"
                    placeholder="Write an answer"
                  />
                  <button type="button" onClick={() => answer(q.templateId, q.id)} className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
                    Reply
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
