import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import type { MarketplaceTemplate } from '@sheetomate/shared';
import { api } from '../lib/api';
import { CategoryStrip } from '../components/CategoryCard';
import MarketingHero, { CatalogSearch } from '../components/MarketingHero';
import { ContentSection, LandingPageRoot } from '../components/landing/LandingUI';
import Seo from '../components/Seo';
import TemplateFilter, { type TemplateFilters } from '../components/TemplateFilter';
import TemplateList from '../components/TemplateList';
import TemplatePreviewModal from '../components/TemplatePreviewModal';
import { getCategoryMeta } from '../content/categories';

const emptyFilters: TemplateFilters = {
  category: '',
  tag: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  sort: 'newest',
};

export default function TemplatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MarketplaceTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<TemplateFilters>(() => ({
    ...emptyFilters,
    category: searchParams.get('category') ?? '',
  }));
  const [preview, setPreview] = useState<MarketplaceTemplate | null>(null);
  const [recs, setRecs] = useState<MarketplaceTemplate[]>([]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('sort', filters.sort);
    if (q) params.set('q', q);
    if (filters.category) params.set('category', filters.category);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minRating) params.set('minRating', filters.minRating);
    return params.toString();
  }, [page, q, filters]);

  useEffect(() => {
    api<{ items: MarketplaceTemplate[]; total: number }>(`/templates?${query}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      });
  }, [query]);

  useEffect(() => {
    if (q.length < 2) {
      setRecs([]);
      return;
    }
    api<{ recommendations: MarketplaceTemplate[] }>(`/templates/search?q=${encodeURIComponent(q)}`)
      .then((data) => setRecs(data.recommendations))
      .catch(() => setRecs([]));
  }, [q]);

  const categoryMeta = filters.category ? getCategoryMeta(filters.category) : null;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (q.trim()) params.set('q', q.trim());
    else params.delete('q');
    setSearchParams(params);
  }

  return (
    <LandingPageRoot>
      <Seo
        title={categoryMeta ? `${categoryMeta.name} templates` : 'Get templates — free spreadsheets'}
        description="Browse and download Excel and Google Sheets templates for Liberia and West Africa."
        path="/get-templates"
      />
      <MarketingHero
        pillar="get"
        variant="mint"
        title={categoryMeta ? `${categoryMeta.name} templates` : 'Free spreadsheet templates'}
        subtitle={
          categoryMeta
            ? categoryMeta.blurb
            : 'Cashbooks, inventory, grants, payroll — download ready-made workbooks or build your own.'
        }
      >
        <CatalogSearch value={q} onChange={setQ} onSubmit={onSearch} placeholder="Search templates…" />
      </MarketingHero>

      <ContentSection tone="cream" className="py-6 sm:py-8 px-4 sm:px-6">
        <div className="landing-container">
          <CategoryStrip active={filters.category || undefined} />
        </div>
      </ContentSection>

      <ContentSection tone="white" className="pb-12 sm:pb-16 px-4 sm:px-6" reveal={false}>
        <div className="landing-container">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-2xl bg-gradient-to-r from-brand-50 to-white border border-brand-100 px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-brand-800">
              {total} template{total === 1 ? '' : 's'}
              {filters.category ? ` in ${filters.category}` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${view === 'grid' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${view === 'list' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}
              >
                List
              </button>
            </div>
          </div>
          {recs.length > 0 && (
            <p className="mb-4 text-sm text-stone-600 rounded-lg bg-white border px-3 py-2">Recommended: {recs.map((r) => r.title).join(', ')}</p>
          )}
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <TemplateFilter
              filters={filters}
              onChange={(next) => {
                setPage(1);
                setFilters(next);
                const params = new URLSearchParams(searchParams);
                if (next.category) params.set('category', next.category);
                else params.delete('category');
                setSearchParams(params);
              }}
            />
            <TemplateList
              items={items}
              view={view}
              onPreview={setPreview}
              page={page}
              pageSize={12}
              total={total}
              onPage={setPage}
            />
          </div>
        </div>
      </ContentSection>
      {preview && <TemplatePreviewModal template={preview} onClose={() => setPreview(null)} />}
    </LandingPageRoot>
  );
}

/** Keep /templates as alias */
export function TemplatesRedirect() {
  const [params] = useSearchParams();
  const qs = params.toString();
  return <Navigate to={qs ? `/get-templates?${qs}` : '/get-templates'} replace />;
}
