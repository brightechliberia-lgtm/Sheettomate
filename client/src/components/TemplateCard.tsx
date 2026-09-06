import { Link } from 'react-router-dom';
import type { MarketplaceTemplate } from '@sheetomate/shared';
import { useCart } from '../context/CartContext';
import { useLowData } from '../context/LowDataContext';
import { api } from '../lib/api';
import { cacheTemplate } from '../lib/offline';
import LazyImage from './LazyImage';

export default function TemplateCard({
  template,
  onPreview,
}: {
  template: MarketplaceTemplate;
  onPreview?: (template: MarketplaceTemplate) => void;
}) {
  const { add, has } = useCart();
  const { lowData } = useLowData();
  const preview = template.previewUrl;

  function prefetch() {
    if (lowData) return;
    void api<{ template: MarketplaceTemplate }>(`/templates/${template.id}`).then((data) =>
      cacheTemplate(`/templates/${template.id}`, data),
    );
  }

  return (
    <article className="rounded-2xl border bg-white overflow-hidden flex flex-col">
      <button
        type="button"
        className="block bg-stone-100 aspect-[16/9] touch-manipulation"
        onClick={() => onPreview?.(template)}
        onMouseEnter={prefetch}
        onTouchStart={prefetch}
      >
        {preview ? (
          <LazyImage src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-sm text-stone-400">No preview</div>
        )}
      </button>
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs uppercase font-semibold text-brand-600">{template.category}</p>
        <Link to={`/templates/${template.id}`} className="mt-1 font-bold hover:text-brand-700" onMouseEnter={prefetch}>
          {template.title}
        </Link>
        <p className="mt-1 text-sm text-stone-600 line-clamp-2">{template.description}</p>
        <p className="mt-2 text-xs text-stone-500">
          {template.averageRating.toFixed(1)}★ · {template.downloadCount} downloads
        </p>
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="font-semibold">${Number(template.price).toFixed(2)}</span>
          <button type="button" onClick={() => add(template.id)} className="text-sm font-semibold text-brand-700 min-h-11">
            {has(template.id) ? 'In cart' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
