import { FormEvent, useEffect, useState } from 'react';
import CommentsSection from '../components/CommentsSection';
import VoteButtons from '../components/VoteButtons';
import ReportButton from '../components/ReportButton';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { MarketplaceTemplate } from '@sheetomate/shared';
import { api } from '../lib/api';
import { cacheTemplate } from '../lib/offline';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { downloadTemplateFile } from '../lib/download';

interface TemplateDetail extends MarketplaceTemplate {
  fileUrl?: string;
  questions?: {
    id: string;
    body: string;
    user: { name: string };
    answers: { id: string; body: string; user: { name: string } }[];
  }[];
}

export default function TemplateDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const { formatUsd } = useCurrency();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function load() {
    if (!id) return;
    const data = await api<{ template: TemplateDetail }>(`/templates/${id}`);
    setTemplate(data.template);
    await cacheTemplate(`/templates/${id}`, data);
  }

  useEffect(() => {
    load().catch((err: Error) => setMessage(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function buy() {
    if (!template) return;
    navigate(`/checkout?templateId=${template.id}`);
  }

  async function download() {
    if (!template) return;
    try {
      setMessage('Starting download…');
      await downloadTemplateFile(template.id);
      setMessage('Download started. If nothing appears, check your browser’s downloads bar.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Download failed');
    }
  }

  async function ask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!template) return;
    const body = String(new FormData(e.currentTarget).get('body'));
    await api(`/templates/${template.id}/questions`, { method: 'POST', body: JSON.stringify({ body }) });
    e.currentTarget.reset();
    await load();
  }

  if (!template) {
    return <p>{message || 'Loading...'}</p>;
  }

  const isGoogleSheet = Boolean(template.demoUrl?.includes('docs.google.com/spreadsheets'));

  return (
    <article className="space-y-6">
      <div className="rounded-2xl border bg-white p-8">
        <p className="text-sm uppercase text-brand-600 font-semibold">{template.category}</p>
        <h1 className="mt-2 text-3xl font-bold">{template.title}</h1>
        {template.createdBy && (
          <p className="mt-1 text-sm">
            By <Link to={`/u/${template.createdBy.id}`} className="text-brand-700 font-semibold">{template.createdBy.name}</Link>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <VoteButtons templateId={template.id} likeCount={0} />
          <ReportButton targetType="template" targetId={template.id} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(template.title)}&url=${encodeURIComponent(window.location.href)}`}>Share X</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}>Facebook</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(template.title + ' ' + window.location.href)}`}>WhatsApp</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}>LinkedIn</a>
        </div>
        <p className="mt-4 text-stone-700">{template.description}</p>
        {template.previewUrl && <img src={template.previewUrl} alt="" className="mt-6 rounded-xl border w-full max-h-80 object-contain bg-stone-50" />}
        <dl className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
          <div>Software: {template.softwareRequired}</div>
          <div>Version: {template.version}</div>
          <div>
            Size: {template.rows ?? '—'} rows × {template.columns ?? '—'} cols
          </div>
          <div>
            Rating: {template.averageRating.toFixed(1)} ({template.ratingCount})
          </div>
        </dl>
        {template.demoUrl && (
          <p className="mt-4 text-sm">
            <a href={template.demoUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700">
              {isGoogleSheet ? 'Open Google Sheets version' : 'Open demo'}
            </a>
          </p>
        )}
        <p className="mt-6 text-xl font-bold">{formatUsd(Number(template.price))}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user && (
            <>
              <button type="button" onClick={buy} className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
                Purchase
              </button>
              <button type="button" onClick={download} className="rounded-lg border px-4 py-2 font-semibold">
                Download
              </button>
              <button type="button" onClick={() => add(template.id)} className="rounded-lg border px-4 py-2 font-semibold">
                Add to cart
              </button>
            </>
          )}
          {!user && <p className="text-stone-600">Log in to purchase or download.</p>}
        </div>
        {message && <p className="mt-4 text-sm text-stone-600">{message}</p>}
      </div>

      <CommentsSection templateId={template.id} />
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold text-lg">Questions</h2>
        <ul className="mt-3 space-y-3">
          {template.questions?.map((q) => (
            <li key={q.id}>
              <p className="font-medium">{q.user.name}</p>
              <p className="text-sm">{q.body}</p>
              {q.answers.map((a) => (
                <p key={a.id} className="ml-4 mt-1 text-sm text-brand-800">
                  {a.user.name}: {a.body}
                </p>
              ))}
            </li>
          ))}
        </ul>
        {user && (
          <form className="mt-4 flex gap-2" onSubmit={ask}>
            <input name="body" required minLength={8} placeholder="Ask the creator" className="flex-1 rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
              Send
            </button>
          </form>
        )}
      </section>
    </article>
  );
}
