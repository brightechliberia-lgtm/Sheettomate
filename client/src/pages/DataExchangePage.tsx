import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function DataExchangePage() {
  const [preview, setPreview] = useState('');

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const d = await api<{ ocr: string; json: unknown }>('/automations/import', { method: 'POST', body: fd });
      setPreview(JSON.stringify(d, null, 2));
      return;
    }
    const csv = String(new FormData(e.currentTarget).get('csv'));
    const d = await api('/automations/import', { method: 'POST', body: JSON.stringify({ csv }) });
    setPreview(JSON.stringify(d, null, 2));
  }

  async function download(format: string) {
    if (format === 'json') {
      const d = await api('/automations/export?format=json', { method: 'POST', body: JSON.stringify({}) });
      setPreview(JSON.stringify(d, null, 2));
      return;
    }
    const token = localStorage.getItem('sheettomate_access_token');
    const res = await fetch(`/api/automations/export?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: '{}',
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sheettomate-export.${format}`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Import & export</h1>
      <form onSubmit={onImport} className="rounded-2xl border bg-white p-5 space-y-3">
        <p className="text-sm">CSV, JSON, PDF text, or images (sandbox OCR).</p>
        <input name="file" type="file" />
        <textarea name="csv" placeholder="item,stock&#10;Rice,4" className="w-full min-h-24 rounded border p-2 text-sm" />
        <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
          Import (triggers sheet.change automations)
        </button>
      </form>
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => void download('csv')}>
          Export CSV
        </button>
        <button type="button" onClick={() => void download('json')}>
          Export JSON
        </button>
        <button type="button" onClick={() => void download('pdf')}>
          Export PDF
        </button>
      </div>
      {preview && <pre className="rounded-xl bg-stone-900 text-stone-100 p-4 text-xs overflow-auto">{preview}</pre>}
    </div>
  );
}
