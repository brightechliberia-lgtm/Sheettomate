import { FormEvent, useEffect, useState } from 'react';
import { TEMPLATE_TAGS } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useCatalog } from '../hooks/useCatalog';
import { useCurrency } from '../context/CurrencyContext';

const LEVELS = [
  { id: 'BASIC', label: 'Basic' },
  { id: 'ADVANCED', label: 'Advance' },
  { id: 'EXPERT', label: 'Expert' },
] as const;

export interface EditableTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: string | number;
  version: string;
  softwareRequired: string;
  demoUrl: string | null;
  videoTutorial: string | null;
  published?: boolean;
}

export default function TemplateUploadForm({
  onCreated,
  editing = null,
  onCancelEdit,
}: {
  onCreated: () => void;
  editing?: EditableTemplate | null;
  onCancelEdit?: () => void;
}) {
  const { catalog } = useCatalog();
  const { googleSheetsUpload } = useCurrency();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState(editing?.category ?? 'Finance');
  const [level, setLevel] = useState<(typeof LEVELS)[number]['id']>('BASIC');
  const [price, setPrice] = useState(String(editing?.price ?? '4.99'));
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [version, setVersion] = useState(editing?.version ?? '1.0');
  const [softwareRequired, setSoftwareRequired] = useState(editing?.softwareRequired ?? 'Excel / Google Sheets');
  const [demoUrl, setDemoUrl] = useState(editing?.demoUrl ?? '');
  const [videoTutorial, setVideoTutorial] = useState(editing?.videoTutorial ?? '');
  const [published, setPublished] = useState(editing?.published ?? true);
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [createGoogleSheet, setCreateGoogleSheet] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setTitle(editing.title);
    setDescription(editing.description);
    setCategory(editing.category);
    setPrice(String(editing.price));
    setVersion(editing.version);
    setSoftwareRequired(editing.softwareRequired);
    setDemoUrl(editing.demoUrl ?? '');
    setVideoTutorial(editing.videoTutorial ?? '');
    setPublished(editing.published ?? true);
    setTags(editing.tags ?? []);
    setFile(null);
    setCreateGoogleSheet(false);
    setError('');
  }, [editing]);

  useEffect(() => {
    if (catalog.templateCategories.length && !catalog.templateCategories.includes(category)) {
      setCategory(catalog.templateCategories[0]);
    }
  }, [catalog.templateCategories, category]);

  useEffect(() => {
    if (editing) return;
    const row = catalog.templateLevelPrices[category];
    if (row?.[level] != null) setPrice(String(row[level]));
  }, [catalog.templateLevelPrices, category, level, editing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing && !file) {
      setError('Choose an .xlsx or .csv file.');
      return;
    }
    const data = new FormData();
    data.set('title', title);
    data.set('description', description);
    data.set('category', category);
    data.set('price', price);
    data.set('version', version);
    data.set('softwareRequired', softwareRequired);
    if (demoUrl) data.set('demoUrl', demoUrl);
    if (videoTutorial) data.set('videoTutorial', videoTutorial);
    data.set('published', published ? 'true' : 'false');
    tags.forEach((tag) => data.append('tags', tag));
    if (file) data.set('file', file);
    if (createGoogleSheet) data.set('createGoogleSheet', 'true');

    setError('');
    setPending(true);
    try {
      if (editing) {
        await api(`/templates/${editing.id}`, { method: 'PUT', body: data });
      } else {
        await api('/templates', { method: 'POST', body: data });
      }
      setFile(null);
      setCreateGoogleSheet(false);
      if (!editing) {
        setTitle('');
        setDescription('');
        setDemoUrl('');
        setVideoTutorial('');
        setTags([]);
        setPublished(true);
      }
      onCreated();
      onCancelEdit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : editing ? 'Update failed' : 'Upload failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{editing ? 'Edit template' : 'Upload template'}</h2>
        {editing && onCancelEdit && (
          <button type="button" onClick={onCancelEdit} className="text-sm text-stone-600">
            Cancel
          </button>
        )}
      </div>
      <input
        required
        minLength={3}
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border px-3 py-2"
      />
      <textarea
        required
        minLength={10}
        rows={4}
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border px-3 py-2"
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {catalog.templateCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {!editing && (
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
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {TEMPLATE_TAGS.map((tag) => (
          <label key={tag} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={tags.includes(tag)}
              onChange={(e) =>
                setTags((current) => (e.target.checked ? [...current, tag] : current.filter((t) => t !== tag)))
              }
            />{' '}
            {tag}
          </label>
        ))}
      </div>
      <div>
        <label className="text-sm text-stone-600">Price (USD){editing ? '' : ' — suggested from admin matrix'}</label>
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
        <input
          placeholder="Version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Software"
          value={softwareRequired}
          onChange={(e) => setSoftwareRequired(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Demo URL"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Video tutorial URL"
          value={videoTutorial}
          onChange={(e) => setVideoTutorial(e.target.value)}
          className="rounded-lg border px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Listed in marketplace
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={createGoogleSheet}
          onChange={(e) => setCreateGoogleSheet(e.target.checked)}
          disabled={Boolean(editing) && !file}
        />
        <span>
          Auto-create a Google Sheets version from this file
          {!googleSheetsUpload && (
            <span className="block text-stone-500">
              Requires Google Sheets credentials on the API server. When set, the sheet link is saved as the demo URL.
            </span>
          )}
          {editing && !file && <span className="block text-stone-500">Upload a new file to regenerate the Sheet.</span>}
        </span>
      </label>
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
        <p className="font-medium">{editing ? 'Replace file (optional)' : 'Drag & drop an .xlsx file'}</p>
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
        {pending ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish template'}
      </button>
    </form>
  );
}
