import { useRef, useState, type TouchEvent } from 'react';
import type { MarketplaceTemplate } from '@sheetomate/shared';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import LazyImage from './LazyImage';

export default function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: MarketplaceTemplate;
  onClose: () => void;
}) {
  const { add } = useCart();
  const [scale, setScale] = useState(1);
  const startDist = useRef<number | null>(null);

  function distance(e: TouchEvent) {
    if (e.touches.length < 2) return 0;
    const a = e.touches[0];
    const b = e.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="max-w-lg w-full rounded-t-2xl sm:rounded-2xl bg-white p-6 max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{template.title}</h2>
        {template.previewUrl && (
          <div
            className="mt-3 overflow-hidden touch-none rounded-lg border"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) startDist.current = distance(e);
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && startDist.current) {
                e.preventDefault();
                setScale(Math.min(3, Math.max(1, distance(e) / startDist.current)));
              }
            }}
            onTouchEnd={() => {
              startDist.current = null;
            }}
          >
            <LazyImage src={template.previewUrl} alt="" className="w-full" />
          </div>
        )}
        <p className="mt-3 text-sm text-stone-600">{template.description}</p>
        <p className="mt-2 text-sm">
          {template.rows} rows × {template.columns} cols · {template.softwareRequired}
        </p>
        <p className="mt-1 text-xs text-stone-400">Pinch to zoom the preview</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/templates/${template.id}`} className="rounded-lg bg-brand-600 px-4 py-3 text-white text-sm font-semibold min-h-11">
            View details
          </Link>
          <button type="button" onClick={() => add(template.id)} className="rounded-lg border px-4 py-3 text-sm font-semibold min-h-11">
            Add to cart
          </button>
          <button type="button" onClick={onClose} className="text-sm text-stone-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
