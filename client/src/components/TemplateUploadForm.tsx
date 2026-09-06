import { FormEvent, useEffect, useState } from 'react';
import { TEMPLATE_TAGS } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useCatalog } from '../hooks/useCatalog';

const LEVELS = [
  { id: 'BASIC', label: 'Basic' },
  { id: 'ADVANCED', label: 'Advance' },
  { id: 'EXPERT', label: 'Expert' },
] as const;

export default function TemplateUploadForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { catalog } = useCatalog();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState('Finance');
  const [level, setLevel] = useState<(typeof LEVELS)[number]['id']>('BASIC');
  const [price, setPrice] = useState('4.99');

  useEffect(() => {
    if (catalog.templateCategories.length && !catalog.templateCategories.includes(category)) {
      setCategory(catalog.templateCategories[0]);
    }
  }, [catalog.templateCategories, category]);

  useEffect(() => {
    const row = catalog.templateLevelPrices[category];
    if (row?.[level] != null) setPrice(String(row[level]));
  }, [catalog.templateLevelPrices, category, level]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!file) {
      setError('Choose an .xlsx or .csv file.');
      return;
    }
    const selected = TEMPLATE_TAGS.filter((tag) => data.getAll('tags').includes(tag));
    data.delete('tags');
    selected.forEach((tag) => data.append('tags', tag));
    data.set('category', category);
    data.set('price', price);
    data.set('file', file);
    setError('');
    setPending(true);
    try {
      await api('/templates', { method: 'POST', body: data });
      form.reset();
      setFile(null);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 space-y-4">
      <h2 className="text-xl font-bold">Upload template</h2>
      <input name="title" required minLength={3} placeholder="Title" className="w-full rounded-lg border px-3 py-2" />
      <textarea name="description" required minLength={10} rows={4} placeholder="Description" className="w-full rounded-lg border px-3 py-2" />
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          {catalog.templateCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as (typeof LEVELS)[number]['id'])}
          className="w-full rounded-lg border px-3 py-2"
        >
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {TEMPLATE_TAGS.map((tag) => (
          <label key={tag} className="flex items-center gap-1">
            <input type="checkbox" name="tags" value={tag} /> {tag}
          </label>
        ))}
      </div>
      <div>
        <label className="text-sm text-stone-600">Price (USD) — suggested from admin matrix</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="version" placeholder="Version" defaultValue="1.0" className="rounded-lg border px-3 py-2" />
        <input name="softwareRequired" placeholder="Software" defaultValue="Excel / Google Sheets" className="rounded-lg border px-3 py-2" />
        <input name="demoUrl" placeholder="Demo URL" className="rounded-lg border px-3 py-2" />
        <input name="videoTutorial" placeholder="Video tutorial URL" className="rounded-lg border px-3 py-2" />
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) setFile(dropped);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center ${dragging ? 'border-brand-600 bg-brand-50' : 'border-stone-300'}`}
      >
        <p className="font-medium">Drag & drop an .xlsx file</p>
        <p className="text-sm text-stone-500 mt-1">Max 50MB. First sheet becomes a preview image.</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="mt-3"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && <p className="mt-2 text-sm">{file.name}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
        {pending ? 'Publishing...' : 'Publish template'}
      </button>
    </form>
  );
}
