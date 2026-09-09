import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { downloadTemplateFile } from '../lib/download';

interface PurchaseRow {
  id: string;
  template: { id: string; title: string; category: string };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [downloadMsg, setDownloadMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api<{ items: PurchaseRow[] }>('/users/templates')
      .then((d) => setPurchases(d.items))
      .catch(() => setPurchases([]));
  }, [user]);

  if (!user) {
    return <p>Please log in to view your dashboard.</p>;
  }

  async function download(templateId: string) {
    setDownloadMsg('');
    try {
      await downloadTemplateFile(templateId);
      setDownloadMsg('Download started.');
    } catch (err) {
      setDownloadMsg(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-800 grid place-items-center text-xl font-bold">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-sm text-stone-500">Signed in as</p>
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-stone-600">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              {user.role}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/profile" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Edit profile
          </Link>
          <Link to="/payments/history" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Payments
          </Link>
          <Link to="/automations" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Automations
          </Link>
          <Link to="/learn" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Learn
          </Link>
          <Link to="/build" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Build
          </Link>
          {(user.role === 'CREATOR' || user.role === 'ADMIN' || user.role === 'USER') && (
            <Link to="/creator" className="rounded-lg border px-4 py-2 text-sm font-semibold">
              Creator studio
            </Link>
          )}
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="rounded-lg border px-4 py-2 text-sm font-semibold">
              Admin dashboard
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-xl">Your downloads</h2>
          <Link to="/profile" className="text-sm font-semibold text-brand-700">
            All purchases
          </Link>
        </div>
        {downloadMsg && <p className="mt-2 text-sm text-stone-600">{downloadMsg}</p>}
        <ul className="mt-4 space-y-2">
          {purchases.slice(0, 8).map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3">
              <div>
                <Link to={`/templates/${row.template.id}`} className="font-medium hover:text-brand-700">
                  {row.template.title}
                </Link>
                <p className="text-xs text-stone-500">{row.template.category}</p>
              </div>
              <button
                type="button"
                onClick={() => void download(row.template.id)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Download
              </button>
            </li>
          ))}
          {!purchases.length && (
            <li className="text-sm text-stone-500">
              No purchases yet.{' '}
              <Link to="/get-templates" className="font-semibold text-brand-700">
                Browse templates
              </Link>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
