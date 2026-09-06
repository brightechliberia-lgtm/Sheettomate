import { TEMPLATE_TAGS } from '@sheetomate/shared';
import { useCatalog } from '../hooks/useCatalog';

export interface TemplateFilters {
  category: string;
  tag: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sort: string;
}

export default function TemplateFilter({
  filters,
  onChange,
}: {
  filters: TemplateFilters;
  onChange: (next: TemplateFilters) => void;
}) {
  const { catalog } = useCatalog();

  function set<K extends keyof TemplateFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className="rounded-2xl border bg-white p-4 space-y-4 h-fit">
      <h2 className="font-bold">Filters</h2>
      <label className="block text-sm">
        Category
        <select className="mt-1 w-full rounded border px-2 py-1" value={filters.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All</option>
          {catalog.templateCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Tag
        <select className="mt-1 w-full rounded border px-2 py-1" value={filters.tag} onChange={(e) => set('tag', e.target.value)}>
          <option value="">All</option>
          {TEMPLATE_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={filters.minPrice}
          onChange={(e) => set('minPrice', e.target.value)}
          placeholder="Min $"
          className="rounded border px-2 py-1 text-sm"
        />
        <input
          value={filters.maxPrice}
          onChange={(e) => set('maxPrice', e.target.value)}
          placeholder="Max $"
          className="rounded border px-2 py-1 text-sm"
        />
      </div>
      <label className="block text-sm">
        Min rating
        <select className="mt-1 w-full rounded border px-2 py-1" value={filters.minRating} onChange={(e) => set('minRating', e.target.value)}>
          <option value="">Any</option>
          <option value="4">4+</option>
          <option value="3">3+</option>
        </select>
      </label>
      <label className="block text-sm">
        Sort
        <select className="mt-1 w-full rounded border px-2 py-1" value={filters.sort} onChange={(e) => set('sort', e.target.value)}>
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
    </aside>
  );
}
