import { AI_INDUSTRIES, AI_SUGGESTIONS } from '@sheetomate/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, QueuedError } from '../lib/api';
import { downloadTemplateFile } from '../lib/download';

interface Suggestion {
  id: string;
  title: string;
  prompt: string;
  category: string;
  industry: string;
}

interface AiRequest {
  id: string;
  status: string;
  progress: string;
  errorMessage?: string | null;
  prompt: string;
  tokensUsed?: number;
  generatedTemplateId?: string | null;
  generatedTemplate?: {
    id: string;
    title: string;
    previewUrl: string | null;
    description: string;
    category: string;
    tags?: string[];
  } | null;
}

interface HistoryItem {
  id: string;
  status: string;
  prompt: string;
  createdAt: string;
  generatedTemplate?: { id: string; title: string } | null;
}

interface ChatItem {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiPage() {
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([...AI_SUGGESTIONS]);
  const [request, setRequest] = useState<AiRequest | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ used: 0, limit: 8 });
  const [refineText, setRefineText] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [providerNote, setProviderNote] = useState('');
  const [aiLive, setAiLive] = useState(false);

  async function refreshHistory() {
    const data = await api<{
      items: HistoryItem[];
      usage: { used: number; limit: number };
      providers?: { live: boolean; note: string; active: string };
    }>('/ai/me');
    setHistory(data.items);
    setUsage(data.usage);
    if (data.providers) {
      setAiLive(Boolean(data.providers.live));
      setProviderNote(data.providers.note);
    }
  }

  useEffect(() => {
    api<{ items: Suggestion[] }>('/ai/suggestions')
      .then((data) => setSuggestions(data.items))
      .catch(() => undefined);
    refreshHistory().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!request || request.status === 'COMPLETED' || request.status === 'FAILED') return;
    const timer = window.setInterval(() => {
      api<{ request: AiRequest }>(`/ai/status/${request.id}`)
        .then((data) => setRequest((current) => ({ ...current!, ...data.request })))
        .catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [request?.id, request?.status]);

  useEffect(() => {
    if (request?.status !== 'COMPLETED') return;
    api<{ template: NonNullable<AiRequest['generatedTemplate']>; request: AiRequest }>(
      `/ai/result/${request.id}`,
    )
      .then((data) => {
        setRequest((current) => ({ ...current!, ...data.request, generatedTemplate: data.template }));
        const starter = data.request.progress?.includes('starter') || Number(data.request.tokensUsed) === 0;
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: starter
              ? `Ready: ${data.template.title} (starter workbook — add an AI API key on the server for fuller LLM builds).`
              : `Ready: ${data.template.title}. Download, refine, or publish.`,
          },
        ]);
        void refreshHistory().catch(() => undefined);
      })
      .catch(() => undefined);
  }, [request?.status, request?.id]);

  const steps = useMemo(
    () => [
      { id: 'queued', label: 'Queued' },
      { id: 'parse', label: 'Parse prompt' },
      { id: 'generate', label: 'Generate structure' },
      { id: 'preview', label: 'Build workbook' },
      { id: 'save', label: 'Save files' },
      { id: 'done', label: 'Done' },
    ],
    [],
  );

  const isStarter =
    Boolean(request?.progress?.includes('starter')) ||
    (request?.status === 'COMPLETED' && Number(request.tokensUsed ?? 0) === 0);

  async function startGenerate(text: string) {
    setError('');
    setDownloadMsg('');
    setMessages((m) => [...m, { role: 'user', text }]);
    try {
      const data = await api<{ request: AiRequest }>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: text, industry: industry || undefined }),
      });
      setRequest(data.request);
      setPrompt('');
      setUsage((u) => ({ ...u, used: u.used + 1 }));
    } catch (err) {
      setError(err instanceof QueuedError || err instanceof Error ? err.message : 'Generation failed');
    }
  }

  async function refine() {
    if (!request || !refineText.trim()) return;
    setError('');
    setMessages((m) => [...m, { role: 'user', text: `Refine: ${refineText}` }]);
    try {
      const data = await api<{ request: AiRequest }>('/ai/refine', {
        method: 'POST',
        body: JSON.stringify({ requestId: request.id, prompt: refineText }),
      });
      setRequest(data.request);
      setRefineText('');
      setUsage((u) => ({ ...u, used: u.used + 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refine failed');
    }
  }

  async function vote(rating: 'UP' | 'DOWN') {
    if (!request) return;
    try {
      await api('/ai/feedback', {
        method: 'POST',
        body: JSON.stringify({ requestId: request.id, rating }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: rating === 'UP' ? 'Thanks for the feedback.' : 'Noted — try refining the prompt.' }]);
    } catch {
      /* ignore */
    }
  }

  async function publish() {
    if (!request) return;
    setPublishing(true);
    setError('');
    try {
      await api('/ai/publish', {
        method: 'POST',
        body: JSON.stringify({ requestId: request.id, price: 0 }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: 'Published to the marketplace as a free AI template.' }]);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  async function download() {
    const templateId = request?.generatedTemplate?.id;
    if (!templateId) return;
    setDownloadMsg('');
    try {
      await downloadTemplateFile(templateId);
      setDownloadMsg('Download started.');
    } catch (err) {
      setDownloadMsg(err instanceof Error ? err.message : 'Download failed');
    }
  }

  async function openHistory(item: HistoryItem) {
    if (item.status !== 'COMPLETED' || !item.generatedTemplate) return;
    setError('');
    setDownloadMsg('');
    try {
      const data = await api<{ template: NonNullable<AiRequest['generatedTemplate']>; request: AiRequest }>(
        `/ai/result/${item.id}`,
      );
      setRequest({ ...data.request, generatedTemplate: data.template });
      setMessages([{ role: 'assistant', text: `Loaded: ${data.template.title}` }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load generation');
    }
  }

  const activeStep = (request?.progress ?? 'queued').replace(/:.*/, '');

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-8">
      <div>
        <h1 className="text-3xl font-bold">Build your own template</h1>
        <p className="mt-2 text-stone-600">
          Describe a Liberia-ready workbook. Sheettomate structures it, builds Excel with formulas, then lets you
          download or publish.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Today: {usage.used}/{usage.limit} generations
          {providerNote ? ` · ${aiLive ? 'Live AI' : 'Starter mode'}` : ''}
        </p>
        {providerNote && !aiLive && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {providerNote}
          </p>
        )}

        <div className="mt-6 overflow-x-auto flex gap-3 pb-2">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndustry(item.industry);
                setPrompt(item.prompt);
              }}
              className="min-w-[220px] rounded-2xl border bg-white p-4 text-left hover:border-brand-600"
            >
              <p className="text-xs uppercase text-brand-600 font-semibold">{item.industry}</p>
              <p className="mt-1 font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-stone-500 line-clamp-3">{item.prompt}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 space-y-3 min-h-[180px]">
          {messages.length === 0 && (
            <p className="text-sm text-stone-500">
              Tip: mention Orange Money, LRD/USD, or your county for more relevant sample data.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
              <span
                className={`inline-block rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-stone-100'}`}
              >
                {msg.text}
              </span>
            </div>
          ))}
        </div>

        {request && request.status !== 'COMPLETED' && request.status !== 'FAILED' && (
          <div className="mt-4 rounded-2xl border bg-white p-4">
            <p className="font-semibold">Generating…</p>
            <ol className="mt-3 space-y-1 text-sm">
              {steps.map((step) => (
                <li key={step.id} className={step.id === activeStep ? 'font-bold text-brand-700' : 'text-stone-500'}>
                  {step.id === activeStep ? '→ ' : ''}
                  {step.label}
                </li>
              ))}
            </ol>
            <div className="mt-3 h-2 rounded bg-stone-100 overflow-hidden">
              <div className="h-2 bg-brand-600 animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {request?.status === 'FAILED' && (
          <p className="mt-4 text-red-600 text-sm">{request.errorMessage || 'Generation failed'}</p>
        )}

        {request?.generatedTemplate && request.status === 'COMPLETED' && (
          <div className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-xl">{request.generatedTemplate.title}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isStarter ? 'bg-amber-50 text-amber-900' : 'bg-brand-50 text-brand-800'
                }`}
              >
                {isStarter ? 'Starter workbook' : 'AI workbook'}
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1">{request.generatedTemplate.description}</p>
            {request.generatedTemplate.previewUrl && (
              <img src={request.generatedTemplate.previewUrl} alt="" className="mt-3 w-full rounded border" />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void download()} className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white font-semibold">
                Download Excel
              </button>
              <Link to={`/templates/${request.generatedTemplate.id}`} className="rounded border px-3 py-1.5 text-sm font-semibold">
                Open template
              </Link>
              <button type="button" onClick={() => void publish()} disabled={publishing} className="rounded border px-3 py-1.5 text-sm font-semibold disabled:opacity-60">
                {publishing ? 'Publishing…' : 'Save & publish free'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void startGenerate(request.prompt);
                }}
                className="rounded border px-3 py-1.5 text-sm"
              >
                Regenerate
              </button>
              <button type="button" onClick={() => void vote('UP')} className="rounded border px-3 py-1.5 text-sm">
                👍
              </button>
              <button type="button" onClick={() => void vote('DOWN')} className="rounded border px-3 py-1.5 text-sm">
                👎
              </button>
            </div>
            {downloadMsg && <p className="mt-2 text-sm text-stone-600">{downloadMsg}</p>}
            <div className="mt-3 flex gap-2">
              <input
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                placeholder="Add a column for Orange Money fees…"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => void refine()} className="rounded border px-3 py-2 text-sm font-semibold">
                Refine
              </button>
            </div>
          </div>
        )}

        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim().length >= 10) void startGenerate(prompt);
          }}
        >
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">Auto-detect industry</option>
            {AI_INDUSTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            minLength={10}
            rows={4}
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Create a sales tracker with monthly targets for a Monrovia shop…"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">
            Generate
          </button>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-bold">Recent builds</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.slice(0, 12).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={item.status !== 'COMPLETED' || !item.generatedTemplate}
                  onClick={() => void openHistory(item)}
                  className="w-full text-left rounded-lg border px-3 py-2 hover:border-brand-600 disabled:opacity-50"
                >
                  <p className="font-medium line-clamp-1">
                    {item.generatedTemplate?.title || item.prompt.slice(0, 48)}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {item.status.toLowerCase()} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </button>
              </li>
            ))}
            {!history.length && <li className="text-stone-500 text-xs">Your generations will show up here.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border bg-stone-50 p-4 text-xs text-stone-600 space-y-2">
          <p className="font-semibold text-stone-800">Liberia tips</p>
          <p>Ask for USD + LRD columns, Orange Money / MTN MoMo, and +231 sample phones.</p>
          <p>
            Prefer marketplace templates?{' '}
            <Link to="/get-templates" className="font-semibold text-brand-700">
              Browse catalog
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}
