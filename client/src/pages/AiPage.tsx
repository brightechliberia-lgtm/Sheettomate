import { AI_INDUSTRIES, AI_SUGGESTIONS } from '@sheetomate/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, QueuedError } from '../lib/api';

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
  generatedTemplate?: {
    id: string;
    title: string;
    previewUrl: string | null;
    description: string;
    category: string;
  } | null;
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
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState({ used: 0, limit: 8 });
  const [refineText, setRefineText] = useState('');

  useEffect(() => {
    api<{ items: Suggestion[] }>('/ai/suggestions')
      .then((data) => setSuggestions(data.items))
      .catch(() => undefined);
    api<{ usage: { used: number; limit: number } }>('/ai/me')
      .then((data) => setUsage(data.usage))
      .catch(() => undefined);
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
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: `Ready: ${data.template.title}. Preview below, then refine or publish.` },
        ]);
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

  async function startGenerate(text: string) {
    setError('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refine failed');
    }
  }

  async function vote(rating: 'UP' | 'DOWN') {
    if (!request) return;
    await api('/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ requestId: request.id, rating }),
    });
  }

  async function publish() {
    if (!request) return;
    await api('/ai/publish', {
      method: 'POST',
      body: JSON.stringify({ requestId: request.id, price: 0 }),
    });
    setMessages((m) => [...m, { role: 'assistant', text: 'Published to the marketplace as a free AI template.' }]);
  }

  const activeStep = request?.progress ?? 'queued';

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-8">
      <div>
        <h1 className="text-3xl font-bold">Build your own template</h1>
        <p className="mt-2 text-stone-600">
          Describe the workbook. Sheettomate structures it, generates Excel with formulas, then gives you a preview.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Today: {usage.used}/{usage.limit} generations
        </p>

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
          {messages.length === 0 && <p className="text-sm text-stone-500">Your conversation will appear here.</p>}
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
            <h2 className="font-bold text-xl">{request.generatedTemplate.title}</h2>
            <p className="text-sm text-stone-600 mt-1">{request.generatedTemplate.description}</p>
            {request.generatedTemplate.previewUrl && (
              <img src={request.generatedTemplate.previewUrl} alt="" className="mt-3 w-full rounded border" />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => vote('UP')} className="rounded border px-3 py-1 text-sm">
                👍
              </button>
              <button type="button" onClick={() => vote('DOWN')} className="rounded border px-3 py-1 text-sm">
                👎
              </button>
              <button
                type="button"
                onClick={() => {
                  void startGenerate(request.prompt);
                }}
                className="rounded border px-3 py-1 text-sm"
              >
                Regenerate
              </button>
              <button type="button" onClick={publish} className="rounded bg-brand-600 px-3 py-1 text-sm text-white">
                Save & publish
              </button>
              <Link to={`/templates/${request.generatedTemplate.id}`} className="rounded border px-3 py-1 text-sm">
                Open template
              </Link>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                placeholder="Add a column for Orange Money fees…"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button type="button" onClick={refine} className="rounded border px-3 py-2 text-sm font-semibold">
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
    </div>
  );
}
