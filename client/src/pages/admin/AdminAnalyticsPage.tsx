import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import AnalyticsChart from '../../admin/AnalyticsChart';
import StaffGate from '../../admin/StaffGate';
import type { StaffScope } from '@sheetomate/shared';

type Point = { label: string; value: number };

function MetricCards({ items }: { items: { label: string; value: string | number }[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((m) => (
        <div key={m.label} className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">{m.label}</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  if (!rows.length) return null;
  return (
    <div className="mt-4 rounded-2xl border bg-white overflow-hidden">
      <h3 className="font-semibold px-4 py-3 border-b bg-stone-50">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage({
  path,
  scope,
  title,
}: {
  path: string;
  scope: StaffScope;
  title: string;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const d = await api<Record<string, unknown>>(`${path}?${q}`);
    setData(d);
  }

  useEffect(() => {
    load().catch(() => setData(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const view = useMemo(() => {
    if (!data) return { metrics: [] as { label: string; value: string | number }[], charts: [] as { title: string; points: Point[] }[], tables: [] as { title: string; headers: string[]; rows: (string | number)[][] }[] };

    const metrics: { label: string; value: string | number }[] = [];
    const charts: { title: string; points: Point[] }[] = [];
    const tables: { title: string; headers: string[]; rows: (string | number)[][] }[] = [];

    if (typeof data.totalUsd === 'number') metrics.push({ label: 'Total revenue (USD)', value: data.totalUsd.toFixed(2) });
    if (typeof data.signupsInRange === 'number') metrics.push({ label: 'Signups in range', value: data.signupsInRange });
    if (typeof data.total === 'number') metrics.push({ label: 'Total users', value: data.total });
    if (typeof data.suspended === 'number') metrics.push({ label: 'Suspended', value: data.suspended });
    if (typeof data.retentionProxy === 'number') metrics.push({ label: 'Retention proxy %', value: data.retentionProxy });
    if (typeof data.churnProxy === 'number') metrics.push({ label: 'Dormant (proxy)', value: data.churnProxy });
    if (typeof data.enrollmentCount === 'number') metrics.push({ label: 'Enrollments', value: data.enrollmentCount });
    if (typeof data.enrollmentAvgProgress === 'number') {
      metrics.push({ label: 'Avg progress %', value: Number(data.enrollmentAvgProgress).toFixed(1) });
    }

    const byGateway = data.byGateway as { gateway: string; _sum?: { amountUsd: unknown }; _count?: number }[] | undefined;
    if (byGateway?.length) {
      charts.push({
        title: 'Revenue by gateway',
        points: byGateway.map((g) => ({ label: g.gateway, value: Number(g._sum?.amountUsd ?? g._count ?? 0) })),
      });
    }
    const byPurpose = data.byPurpose as { purpose: string; _sum?: { amountUsd: unknown }; _count?: number }[] | undefined;
    if (byPurpose?.length) {
      charts.push({
        title: 'Revenue by purpose',
        points: byPurpose.map((g) => ({ label: g.purpose, value: Number(g._sum?.amountUsd ?? g._count ?? 0) })),
      });
    }
    const byCountry = data.byCountry as { country: string; usd?: number; count?: number }[] | undefined;
    if (byCountry?.length) {
      charts.push({
        title: 'By country',
        points: byCountry.map((g) => ({ label: g.country, value: Number(g.usd ?? g.count ?? 0) })),
      });
    }
    const byRole = data.byRole as { role: string; count: number }[] | undefined;
    if (byRole?.length) {
      charts.push({
        title: 'Signups by role',
        points: byRole.map((g) => ({ label: g.role, value: g.count })),
      });
    }

    const geoUsers = data.users as { country: string; count: number }[] | undefined;
    if (geoUsers?.length && path.includes('geo')) {
      charts.push({
        title: 'Users by country',
        points: geoUsers.map((g) => ({ label: g.country, value: g.count })),
      });
    }
    const geoPay = data.payments as { country: string; usd: number }[] | undefined;
    if (geoPay?.length && path.includes('geo')) {
      charts.push({
        title: 'Payments by country (USD)',
        points: geoPay.map((g) => ({ label: g.country, value: g.usd })),
      });
    }

    const templates = data.templates as
      | { title: string; downloadCount: number; averageRating: number; category: string }[]
      | undefined;
    if (templates?.length) {
      tables.push({
        title: 'Top templates',
        headers: ['Title', 'Category', 'Downloads', 'Rating'],
        rows: templates.map((t) => [t.title, t.category, t.downloadCount, t.averageRating.toFixed(1)]),
      });
      charts.push({
        title: 'Downloads by template',
        points: templates.slice(0, 10).map((t) => ({ label: t.title.slice(0, 18), value: t.downloadCount })),
      });
    }
    const courses = data.courses as
      | { title: string; _count?: { enrollments: number; lessons: number }; averageRating?: number }[]
      | undefined;
    if (courses?.length) {
      tables.push({
        title: 'Top courses',
        headers: ['Title', 'Enrollments', 'Lessons'],
        rows: courses.map((c) => [c.title, c._count?.enrollments ?? 0, c._count?.lessons ?? 0]),
      });
    }

    const totals = data.totals as { _count?: number; _sum?: { costUsd?: unknown; tokensUsed?: unknown } } | undefined;
    if (totals) {
      metrics.push({ label: 'AI requests', value: totals._count ?? 0 });
      metrics.push({ label: 'AI cost (USD)', value: Number(totals._sum?.costUsd ?? 0).toFixed(4) });
      metrics.push({ label: 'Tokens', value: Number(totals._sum?.tokensUsed ?? 0) });
    }
    const byCategory = data.byCategory as { category: string; _count: number }[] | undefined;
    if (byCategory?.length) {
      charts.push({
        title: 'AI by category',
        points: byCategory.map((g) => ({ label: g.category || 'General', value: g._count })),
      });
    }
    const recent = data.recent as { prompt?: string; category?: string; status?: string; costUsd?: unknown; createdAt?: string }[] | undefined;
    if (recent?.length) {
      tables.push({
        title: 'Recent AI requests',
        headers: ['Category', 'Status', 'Cost', 'When'],
        rows: recent.slice(0, 12).map((r) => [
          r.category || '—',
          r.status || '—',
          Number(r.costUsd ?? 0).toFixed(4),
          r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
        ]),
      });
    }

    return { metrics, charts, tables };
  }, [data, path]);

  return (
    <StaffGate scope={scope}>
      <h1 className="text-2xl font-bold">{title}</h1>
      <form onSubmit={load} className="mt-3 flex flex-wrap gap-2 text-sm">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border px-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border px-2" />
        <button type="submit" className="rounded bg-brand-600 text-white px-3">
          Apply range
        </button>
      </form>
      {!data && <p className="mt-4 text-sm text-stone-500">Loading…</p>}
      <MetricCards items={view.metrics} />
      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        {view.charts.map((c) => (
          <AnalyticsChart key={c.title} title={c.title} type="bar" points={c.points} />
        ))}
      </div>
      {view.tables.map((t) => (
        <DataTable key={t.title} title={t.title} headers={t.headers} rows={t.rows} />
      ))}
      {data && !view.metrics.length && !view.charts.length && !view.tables.length && (
        <p className="mt-4 text-sm text-stone-500">No analytics data for this range yet.</p>
      )}
    </StaffGate>
  );
}
