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

interface Providers {
  mode: string;
  active: string;
  live: boolean;
  note: string;
  openai: { configured: boolean; model: string; baseUrl: string };
  anthropic: { configured: boolean; model: string };
  allowFallback: boolean;
}

export default function AdminAiPage() {
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [limits, setLimits] = useState({ dailyLimitUser: 8, dailyLimitCreator: 25, dailyLimitAdmin: 100 });
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoadError('');
    try {
      const data = await api<{
        today: { _count: number; _sum: { tokensUsed: number | null; costUsd: unknown } };
        totals: { _count: number; _sum: { tokensUsed: number | null; costUsd: unknown } };
        byStatus: { status: string; _count: number }[];
        settings: { key: string; value: string }[];
        providers?: Providers;
      }>('/admin/ai/usage');
      setUsage(data as unknown as Record<string, unknown>);
      setProviders(
        data.providers ?? {
          mode: 'unknown',
          active: 'fallback',
          live: false,
          note: 'API is missing provider status. Redeploy the Railway API (push latest server code) so OpenAI/Anthropic keys are detected.',
          openai: { configured: false, model: '—', baseUrl: '—' },
          anthropic: { configured: false, model: '—' },
          allowFallback: true,
        },
      );
      const map = Object.fromEntries((data.settings ?? []).map((s) => [s.key, s.value]));
      setLimits({
        dailyLimitUser: Number(map['ai.dailyLimit.user'] ?? 8),
        dailyLimitCreator: Number(map['ai.dailyLimit.creator'] ?? 25),
        dailyLimitAdmin: Number(map['ai.dailyLimit.admin'] ?? 100),
      });
      try {
        const p = await api<{ items: PromptRow[] }>('/admin/ai/prompts');
        setPrompts(p.items);
      } catch {
        setPrompts([]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load AI admin data');
      setProviders(null);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
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

  async function testProvider(provider: 'openai' | 'anthropic') {
    setTesting(true);
    setTestMsg('');
    try {
      const data = await api<{ result: { ok: boolean; message: string; latencyMs: number; model: string } }>(
        '/admin/ai/test',
        { method: 'POST', body: JSON.stringify({ provider }) },
      );
      setTestMsg(
        `${provider}: ${data.result.ok ? 'OK' : 'Failed'} — ${data.result.message} (${data.result.latencyMs}ms, ${data.result.model})`,
      );
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  const today = usage?.today as { _count?: number; _sum?: { tokensUsed?: number; costUsd?: string } } | undefined;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">AI admin</h1>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="font-bold text-lg">API providers</h2>
        {!loaded && <p className="text-sm text-stone-500">Loading provider status…</p>}
        {loaded && providers ? (
          <>
            <p className="text-sm text-stone-600">{providers.note}</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full px-3 py-1 ${providers.live ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>
                Active: {providers.active} · mode {providers.mode}
              </span>
              <span className={`rounded-full px-3 py-1 ${providers.openai.configured ? 'bg-green-50 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                OpenAI {providers.openai.configured ? providers.openai.model : 'not configured'}
              </span>
              <span className={`rounded-full px-3 py-1 ${providers.anthropic.configured ? 'bg-green-50 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                Anthropic {providers.anthropic.configured ? providers.anthropic.model : 'not configured'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Set <code>OPENAI_API_KEY</code> and/or <code>ANTHROPIC_API_KEY</code> on Railway. Optional:{' '}
              <code>AI_PROVIDER=auto|openai|anthropic</code>, <code>OPENAI_BASE_URL</code> for compatible hosts.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={testing || !providers.openai.configured}
                onClick={() => void testProvider('openai')}
                className="rounded border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Test OpenAI
              </button>
              <button
                type="button"
                disabled={testing || !providers.anthropic.configured}
                onClick={() => void testProvider('anthropic')}
                className="rounded border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Test Anthropic
              </button>
            </div>
            {testMsg && <p className="text-sm text-stone-700">{testMsg}</p>}
          </>
        ) : null}
        {loaded && !providers && !loadError && (
          <p className="text-sm text-stone-500">Provider status unavailable.</p>
        )}
      </section>

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
