import { Link } from 'react-router-dom';
import type { MarketplaceTemplate } from '@sheetomate/shared';
import TemplateCard from './TemplateCard';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

export default function TemplateList({
  items,
  view,
  onPreview,
  page,
  pageSize,
  total,
  onPage,
}: {
  items: MarketplaceTemplate[];
  view: 'grid' | 'list';
  onPreview: (template: MarketplaceTemplate) => void;
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const { add, has } = useCart();
  const { formatUsd } = useCurrency();

  return (
    <div>
      <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
        {items.map((template) =>
          view === 'grid' ? (
            <TemplateCard key={template.id} template={template} onPreview={onPreview} />
          ) : (
            <div key={template.id} className="rounded-xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="text-left" onClick={() => onPreview(template)}>
                <p className="text-xs uppercase text-brand-600 font-semibold">{template.category}</p>
                <p className="font-bold">{template.title}</p>
                <p className="text-sm text-stone-500">
                  {template.averageRating.toFixed(1)}★ · {template.downloadCount} downloads
                </p>
              </button>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatUsd(Number(template.price))}</span>
                <Link to={`/templates/${template.id}`} className="text-sm font-semibold text-brand-700">
                  View
                </Link>
                <button type="button" onClick={() => add(template.id)} className="text-sm">
                  {has(template.id) ? 'In cart' : 'Add'}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="mt-6 flex items-center gap-3 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}
