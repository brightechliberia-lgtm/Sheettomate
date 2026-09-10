import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

type LevelPrices = { FREE: number; BASIC: number; ADVANCED: number; EXPERT: number };
type SubscriptionPackage = {
  id: string;
  name: string;
  audience: 'CREATOR' | 'LEARNER' | 'ALL';
  interval: 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
  priceUsd: number;
  features: string[];
  active: boolean;
};
type CatalogConfig = {
  templateCategories: string[];
  courseCategories: string[];
  subscriptionPackages: SubscriptionPackage[];
  templateLevelPrices: Record<string, LevelPrices>;
};

type Tab = 'categories' | 'packages' | 'prices' | 'advanced';

function CategoryListEditor({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="rounded-2xl border bg-white p-5 space-y-3">
      <div>
        <h2 className="font-bold text-lg">{title}</h2>
        <p className="text-sm text-stone-500">{hint}</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="text-sm text-red-700 px-2"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New category"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const v = draft.trim();
              if (!v) return;
              onChange([...items, v]);
              setDraft('');
            }
          }}
        />
        <button
          type="button"
          className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold"
          onClick={() => {
            const v = draft.trim();
            if (!v) return;
            onChange([...items, v]);
            setDraft('');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [catalog, setCatalog] = useState<CatalogConfig | null>(null);
  const [rows, setRows] = useState<{ key: string; value: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ catalog: CatalogConfig }>('/admin/catalog')
      .then((d) => setCatalog(d.catalog))
      .catch(() => setCatalog(null));
    api<{ settings: { key: string; value: string }[] }>('/admin/settings')
      .then((d) =>
        setRows(
          d.settings.filter((s) => s.key !== 'catalog.v1').length
            ? d.settings.filter((s) => s.key !== 'catalog.v1')
            : [
                { key: 'pricing.fxUsdLrd', value: '190' },
                { key: 'tiers.creatorFeePercent', value: '10' },
              ],
        ),
      )
      .catch(() => setRows([]));
  }, []);

  async function saveCatalog(e: FormEvent) {
    e.preventDefault();
    if (!catalog) return;
    setMsg('');
    setErr('');
    try {
      const d = await api<{ catalog: CatalogConfig }>('/admin/catalog', {
        method: 'PUT',
        body: JSON.stringify({ catalog }),
      });
      setCatalog(d.catalog);
      setMsg('Catalog settings saved.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed');
    }
  }

  async function saveAdvanced(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: rows }) });
      setMsg('Advanced settings saved.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed');
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'categories', label: 'Categories' },
    { id: 'packages', label: 'Subscription packages' },
    { id: 'prices', label: 'Template prices' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <StaffGate scope="settings">
      <h1 className="text-2xl font-bold">Platform settings</h1>
      <p className="text-sm text-stone-600 mt-1">
        Configure categories for creators, subscription fees, and template prices by category and level.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === t.id ? 'bg-brand-800 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

      {tab !== 'advanced' && catalog && (
        <form onSubmit={saveCatalog} className="mt-4 space-y-4">
          {tab === 'categories' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <CategoryListEditor
                title="Template categories"
                hint="Creators pick these when uploading marketplace templates."
                items={catalog.templateCategories}
                onChange={(templateCategories) => setCatalog({ ...catalog, templateCategories })}
              />
              <CategoryListEditor
                title="Course categories"
                hint="Topics creators use when publishing courses."
                items={catalog.courseCategories}
                onChange={(courseCategories) => setCatalog({ ...catalog, courseCategories })}
              />
            </div>
          )}

          {tab === 'packages' && (
            <div className="space-y-4">
              {catalog.subscriptionPackages.map((pkg, i) => (
                <div key={pkg.id + i} className="rounded-2xl border bg-white p-5 grid sm:grid-cols-2 gap-3">
                  <input
                    value={pkg.name}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i ? { ...p, name: e.target.value } : p,
                        ),
                      })
                    }
                    placeholder="Package name"
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    value={pkg.id}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i ? { ...p, id: e.target.value } : p,
                        ),
                      })
                    }
                    placeholder="id"
                    className="rounded-lg border px-3 py-2 text-sm font-mono"
                  />
                  <select
                    value={pkg.audience}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i ? { ...p, audience: e.target.value as SubscriptionPackage['audience'] } : p,
                        ),
                      })
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="CREATOR">Creators</option>
                    <option value="LEARNER">Learners</option>
                    <option value="ALL">All users</option>
                  </select>
                  <select
                    value={pkg.interval}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i ? { ...p, interval: e.target.value as SubscriptionPackage['interval'] } : p,
                        ),
                      })
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="ONE_TIME">One-time</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pkg.priceUsd}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i ? { ...p, priceUsd: Number(e.target.value) } : p,
                        ),
                      })
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pkg.active}
                      onChange={(e) =>
                        setCatalog({
                          ...catalog,
                          subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                            j === i ? { ...p, active: e.target.checked } : p,
                          ),
                        })
                      }
                    />
                    Active
                  </label>
                  <textarea
                    value={pkg.features.join('\n')}
                    onChange={(e) =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.map((p, j) =>
                          j === i
                            ? { ...p, features: e.target.value.split('\n').map((f) => f.trim()).filter(Boolean) }
                            : p,
                        ),
                      })
                    }
                    rows={3}
                    placeholder="One feature per line"
                    className="sm:col-span-2 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    className="text-sm text-red-700 text-left"
                    onClick={() =>
                      setCatalog({
                        ...catalog,
                        subscriptionPackages: catalog.subscriptionPackages.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Remove package
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                onClick={() =>
                  setCatalog({
                    ...catalog,
                    subscriptionPackages: [
                      ...catalog.subscriptionPackages,
                      {
                        id: `package-${catalog.subscriptionPackages.length + 1}`,
                        name: 'New package',
                        audience: 'CREATOR',
                        interval: 'MONTHLY',
                        priceUsd: 0,
                        features: [],
                        active: true,
                      },
                    ],
                  })
                }
              >
                Add package
              </button>
            </div>
          )}

          {tab === 'prices' && (
            <div className="rounded-2xl border bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    <th className="p-3">Category</th>
                    <th className="p-3">Free (USD)</th>
                    <th className="p-3">Basic (USD)</th>
                    <th className="p-3">Advance (USD)</th>
                    <th className="p-3">Expert (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.templateCategories.map((cat) => {
                    const saved = catalog.templateLevelPrices[cat];
                    const prices: LevelPrices = {
                      FREE: saved?.FREE ?? 0,
                      BASIC: saved?.BASIC ?? 4.99,
                      ADVANCED: saved?.ADVANCED ?? 9.99,
                      EXPERT: saved?.EXPERT ?? 19.99,
                    };
                    const setPrice = (key: keyof LevelPrices, value: number) =>
                      setCatalog({
                        ...catalog,
                        templateLevelPrices: {
                          ...catalog.templateLevelPrices,
                          [cat]: { ...prices, [key]: value },
                        },
                      });
                    return (
                      <tr key={cat} className="border-t">
                        <td className="p-3 font-medium">{cat}</td>
                        {(['FREE', 'BASIC', 'ADVANCED', 'EXPERT'] as const).map((level) => (
                          <td key={level} className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={prices[level]}
                              onChange={(e) => setPrice(level, Number(e.target.value))}
                              className="w-28 rounded border px-2 py-1"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="p-3 text-xs text-stone-500">
                Suggested list prices by category and level (Free / Basic / Advance / Expert). Creators see these when
                uploading. Use 0 for Free.
              </p>
            </div>
          )}

          <button type="submit" className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold">
            Save catalog settings
          </button>
        </form>
      )}

      {tab === 'advanced' && (
        <form onSubmit={saveAdvanced} className="mt-4 space-y-2 max-w-lg">
          <p className="text-sm text-stone-500 mb-2">Low-level key/value platform settings (FX, fees, etc.).</p>
          {rows.map((row, i) => (
            <div key={row.key + i} className="flex gap-2">
              <input
                value={row.key}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                className="rounded border px-2 py-1 flex-1"
              />
              <input
                value={row.value}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                className="rounded border px-2 py-1 flex-1"
              />
            </div>
          ))}
          <button type="button" className="text-sm" onClick={() => setRows((r) => [...r, { key: '', value: '' }])}>
            Add key
          </button>
          <button type="submit" className="block rounded bg-brand-600 text-white px-4 py-2">
            Save
          </button>
        </form>
      )}

      {!catalog && tab !== 'advanced' && <p className="mt-4 text-sm text-stone-500">Loading catalog…</p>}
    </StaffGate>
  );
}
