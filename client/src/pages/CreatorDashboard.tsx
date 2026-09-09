import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import TemplateUploadForm, { type EditableTemplate } from '../components/TemplateUploadForm';
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

interface CreatorTemplate extends EditableTemplate {
  downloadCount: number;
  averageRating: number;
  reviewStatus?: string;
  featured?: boolean;
  _count?: { downloads: number; ratings: number; questions: number };
}

interface CourseRow {
  id: string;
  title: string;
  students: number;
  revenueUsd: number;
  averageRating: number;
}

export default function CreatorDashboard() {
  const { user, refreshUser } = useAuth();
  const { formatUsd } = useCurrency();
  const [totals, setTotals] = useState({ earnings: 0, downloads: 0, templates: 0 });
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [templates, setTemplates] = useState<CreatorTemplate[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [editing, setEditing] = useState<EditableTemplate | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');

  async function load() {
    if (!user || (user.role !== 'CREATOR' && user.role !== 'ADMIN')) {
      return;
    }
    const [analytics, mine, instructor] = await Promise.all([
      api<{ totals: typeof totals; series: SeriesRow[]; questions: QuestionRow[] }>('/creator/analytics'),
      api<{ items: CreatorTemplate[] }>('/creator/templates'),
      api<{ items: CourseRow[] }>('/courses/instructor/me').catch(() => ({ items: [] as CourseRow[] })),
    ]);
    setTotals(analytics.totals);
    setSeries(analytics.series);
    setQuestions(analytics.questions);
    setTemplates(mine.items);
    setCourses(instructor.items);
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

  async function removeTemplate(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setActionError('');
    try {
      await api(`/templates/${id}`, { method: 'DELETE' });
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Creator dashboard</h1>
        <Link to="/instructor" className="text-sm font-semibold text-brand-700">
          Course studio →
        </Link>
      </div>
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
        <Stat label="Earnings" value={formatUsd(totals.earnings)} />
        <Stat label="Downloads" value={String(totals.downloads)} />
        <Stat label="Templates" value={String(totals.templates)} />
      </div>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold text-xl">My templates</h2>
        <p className="mt-1 text-sm text-stone-600">View, edit, publish, or remove your marketplace products.</p>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
        <ul className="mt-4 space-y-3">
          {templates.map((tpl) => (
            <li key={tpl.id} className="rounded-xl border p-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={`/templates/${tpl.id}`} className="font-semibold hover:text-brand-700">
                  {tpl.title}
                </Link>
                <p className="text-xs text-stone-500 mt-1">
                  {formatUsd(Number(tpl.price))} · {tpl.downloadCount} downloads · {Number(tpl.averageRating).toFixed(1)}★
                  {tpl.published === false ? ' · hidden' : ' · listed'}
                  {tpl.reviewStatus ? ` · ${tpl.reviewStatus}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 font-medium"
                  onClick={() => {
                    setEditing(tpl);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 text-red-700 font-medium"
                  onClick={() => void removeTemplate(tpl.id, tpl.title)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!templates.length && <p className="text-sm text-stone-500">No templates yet — upload one below.</p>}
        </ul>
      </section>
      {courses.length > 0 && (
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-xl">My courses</h2>
            <Link to="/instructor" className="text-sm font-semibold text-brand-700">
              Manage all
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {courses.map((course) => (
              <li key={course.id} className="flex flex-wrap justify-between gap-2 text-sm">
                <Link to={`/instructor/courses/${course.id}`} className="font-medium hover:text-brand-700">
                  {course.title}
                </Link>
                <span className="text-stone-500">
                  {course.students} students · {formatUsd(course.revenueUsd)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
                  {row.downloads} · {row.rating.toFixed(1)}★ · {formatUsd(row.earnings)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-stone-100">
                <div className="h-2 rounded bg-brand-600" style={{ width: `${(row.downloads / maxDownloads) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      {(user?.role === 'CREATOR' || user?.role === 'ADMIN') && (
        <TemplateUploadForm
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onCreated={() => {
            void load();
          }}
        />
      )}
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
