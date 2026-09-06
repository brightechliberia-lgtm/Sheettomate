import { FormEvent, useEffect, useState } from 'react';
import { api, getAccessToken } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

export default function AdminReportsPage() {
  const [items, setItems] = useState<{ id: string; email: string; cadence: string; reportType: string }[]>([]);

  async function load() {
    const d = await api<{ items: typeof items }>('/admin/reports/scheduled');
    setItems(d.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function download(kind: string, format: 'csv' | 'html') {
    const token = getAccessToken();
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/admin/reports/export?kind=${kind}&format=${format}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'csv' ? `${kind}.csv` : `${kind}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function schedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api('/admin/reports/scheduled', {
      method: 'POST',
      body: JSON.stringify({
        email: fd.get('email'),
        cadence: fd.get('cadence'),
        reportType: fd.get('reportType'),
      }),
    });
    await load();
  }

  return (
    <StaffGate scope="reports">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-1" onClick={() => void download('revenue', 'csv')}>
          Revenue CSV
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={() => void download('users', 'csv')}>
          Users CSV
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={() => void download('revenue', 'html')}>
          Printable HTML (Save as PDF)
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={() => void api('/admin/reports/run', { method: 'POST' })}>
          Run scheduled emails
        </button>
      </div>
      <form onSubmit={schedule} className="mt-6 rounded-2xl border bg-white p-4 grid gap-2 max-w-md">
        <h2 className="font-bold">Schedule email report</h2>
        <input name="email" type="email" required placeholder="ops@sheettomate.com" className="rounded border px-2 py-1" />
        <select name="cadence" className="rounded border px-2 py-1">
          <option>WEEKLY</option>
          <option>DAILY</option>
        </select>
        <select name="reportType" className="rounded border px-2 py-1">
          <option value="revenue">revenue</option>
          <option value="users">users</option>
        </select>
        <button type="submit" className="rounded bg-brand-600 text-white py-2">
          Save schedule
        </button>
      </form>
      <ul className="mt-4 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            {i.email} · {i.cadence} · {i.reportType}
          </li>
        ))}
      </ul>
    </StaffGate>
  );
}
