import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import AnalyticsChart from '../../admin/AnalyticsChart';
import QuickActions from '../../admin/QuickActions';

interface Overview {
  metrics: {
    users: number;
    templates: number;
    courses: number;
    revenue: { today: { usd: number }; week: { usd: number }; month: { usd: number } };
  };
  charts: { revenue30d: { date: string; value: number }[]; userGrowth30d: { date: string; value: number }[] };
  topTemplates: { id: string; title: string; downloadCount: number }[];
  topCourses: { id: string; title: string; _count: { enrollments: number } }[];
  activity: { at: string; text: string }[];
  generatedAt: string;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    let timer: number;
    async function load() {
      try {
        const d = await api<Overview>('/admin/overview');
        setData(d);
      } catch {
        setData(null);
      }
      timer = window.setTimeout(() => void load(), 12000);
    }
    void load();
    return () => window.clearTimeout(timer);
  }, []);

  if (!data) return <p>Loading live dashboard…</p>;
  const m = data.metrics;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-xs text-stone-500">Live · {new Date(data.generatedAt).toLocaleTimeString()}</p>
      </div>
      <QuickActions />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Users" value={m.users} />
        <Card label="Templates" value={m.templates} />
        <Card label="Courses" value={m.courses} />
        <Card
          label="Revenue"
          value={`$${m.revenue.today.usd.toFixed(0)} / $${m.revenue.week.usd.toFixed(0)} / $${m.revenue.month.usd.toFixed(0)}`}
          hint="today / week / month"
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <AnalyticsChart
          title="Revenue (30 days)"
          points={data.charts.revenue30d.map((p) => ({ label: p.date.slice(5), value: p.value }))}
        />
        <AnalyticsChart
          title="User signups (30 days)"
          type="bar"
          points={data.charts.userGrowth30d.map((p) => ({ label: p.date.slice(5), value: p.value }))}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-bold">Top templates</h2>
          <ul className="mt-2 text-sm space-y-1">
            {data.topTemplates.map((t) => (
              <li key={t.id}>
                {t.title} · {t.downloadCount} downloads
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-bold">Popular courses</h2>
          <ul className="mt-2 text-sm space-y-1">
            {data.topCourses.map((c) => (
              <li key={c.id}>
                {c.title} · {c._count.enrollments} enrolled
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-4">
        <h2 className="font-bold">Activity</h2>
        <ul className="mt-2 text-sm space-y-1">
          {data.activity.map((a) => (
            <li key={a.at + a.text}>
              <span className="text-stone-400">{a.at.slice(11, 16)}</span> {a.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-xl font-bold break-all">{value}</p>
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}
