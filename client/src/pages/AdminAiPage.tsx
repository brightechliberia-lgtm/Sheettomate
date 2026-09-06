import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PromptRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  industry: string;
  examplePrompt: string;
  systemPrompt: string;
  enabled: boolean;
}

export default function AdminAiPage() {
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [limits, setLimits] = useState({ dailyLimitUser: 8, dailyLimitCreator: 25, dailyLimitAdmin: 100 });

  async function load() {
    const data = await api<{
      today: { _count: number; _sum: { tokensUsed: number | null; costUsd: unknown } };
      totals: { _count: number; _sum: { tokensUsed: number | null; costUsd: unknown } };
      byStatus: { status: string; _count: number }[];
      settings: { key: string; value: string }[];
    }>('/admin/ai/usage');
    setUsage(data as unknown as Record<string, unknown>);
    const p = await api<{ items: PromptRow[] }>('/admin/ai/prompts');
    setPrompts(p.items);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function saveLimits(e: FormEvent) {
    e.preventDefault();
    await api('/admin/ai/settings', { method: 'PUT', body: JSON.stringify(limits) });
    await load();
  }

  async function toggle(row: PromptRow) {
    await api('/admin/ai/prompts', {
      method: 'PUT',
      body: JSON.stringify({ ...row, enabled: !row.enabled }),
    });
    await load();
  }

  const today = usage?.today as { _count?: number; _sum?: { tokensUsed?: number; costUsd?: string } } | undefined;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">AI admin</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-stone-500">Generations today</p>
          <p className="text-2xl font-bold">{today?._count ?? 0}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-stone-500">Tokens today</p>
          <p className="text-2xl font-bold">{today?._sum?.tokensUsed ?? 0}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-stone-500">Est. cost today</p>
          <p className="text-2xl font-bold">${Number(today?._sum?.costUsd ?? 0).toFixed(4)}</p>
        </div>
      </div>
      <form onSubmit={saveLimits} className="rounded-2xl border bg-white p-6 grid sm:grid-cols-3 gap-3">
        <label className="text-sm">
          User daily limit
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1"
            value={limits.dailyLimitUser}
            onChange={(e) => setLimits({ ...limits, dailyLimitUser: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          Creator daily limit
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1"
            value={limits.dailyLimitCreator}
            onChange={(e) => setLimits({ ...limits, dailyLimitCreator: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          Admin daily limit
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1"
            value={limits.dailyLimitAdmin}
            onChange={(e) => setLimits({ ...limits, dailyLimitAdmin: Number(e.target.value) })}
          />
        </label>
        <button type="submit" className="sm:col-span-3 rounded bg-brand-600 text-white py-2 font-semibold">
          Save limits
        </button>
      </form>
      <section>
        <h2 className="font-bold text-xl">Prompt templates</h2>
        <ul className="mt-3 space-y-2">
          {prompts.map((row) => (
            <li key={row.id} className="rounded-xl border bg-white p-4 flex justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {row.title} <span className="text-xs text-stone-500">{row.industry}</span>
                </p>
                <p className="text-sm text-stone-600">{row.examplePrompt}</p>
              </div>
              <button type="button" onClick={() => toggle(row)} className="text-sm font-semibold">
                {row.enabled ? 'Disable' : 'Enable'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
