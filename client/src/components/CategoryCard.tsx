import { Link } from 'react-router-dom';
import { CATEGORY_CATALOG, getCategoryMeta } from '../content/categories';
import CategoryIcon from './CategoryIcon';
import LazyImage from './LazyImage';

export default function CategoryCard({
  name,
  size = 'md',
  to,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  to?: string;
}) {
  const meta = getCategoryMeta(name);
  const href = to ?? `/get-templates?category=${encodeURIComponent(name)}`;
  const heights = { sm: 'min-h-[7rem]', md: 'min-h-[9rem]', lg: 'min-h-[11rem]' };

  return (
    <Link
      to={href}
      className={`group block overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm hover:shadow-xl hover:border-brand-400 transition-all duration-300 ${heights[size]}`}
    >
      <div className="relative h-full">
        <LazyImage src={meta.image} alt="" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105 duration-500" />
        <div className={`absolute inset-0 bg-gradient-to-t ${meta.tint} via-brand-900/55 to-brand-900/25`} />
        <div className="absolute top-3 right-3 h-8 w-8 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-4 text-white">
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <CategoryIcon name={name} className="h-5 w-5" />
          </span>
          <h3 className="font-display text-lg font-bold leading-tight">{meta.name}</h3>
          <p className="mt-0.5 text-xs text-white/85">{meta.blurb}</p>
        </div>
      </div>
    </Link>
  );
}

/** Horizontal strip for catalog pages */
export function CategoryStrip({ active }: { active?: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
      {CATEGORY_CATALOG.map((c) => (
        <Link
          key={c.name}
          to={`/get-templates?category=${encodeURIComponent(c.name)}`}
          className={`snap-start shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            active === c.name ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-200 bg-white hover:border-brand-600'
          }`}
        >
          <CategoryIcon name={c.name} className="h-4 w-4" />
          {c.name}
        </Link>
      ))}
    </div>
  );
}
