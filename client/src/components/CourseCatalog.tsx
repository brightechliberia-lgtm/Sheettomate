import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import LazyImage from '../components/LazyImage';
import { CatalogSearch } from '../components/MarketingHero';
import { INSTITUTE_TOPICS } from '../content/categories';
import { useCatalog } from '../hooks/useCatalog';

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  price: string | number;
  featured?: boolean;
  thumbnailUrl?: string | null;
  averageRating?: number;
  instructor?: { name: string };
  _count?: { lessons: number; enrollments: number };
}

const LEVELS = [
  { id: '', label: 'All levels' },
  { id: 'BEGINNER', label: 'Beginner' },
  { id: 'INTERMEDIATE', label: 'Intermediate' },
  { id: 'ADVANCED', label: 'Advanced' },
] as const;

export default function CourseCatalog({ showSearch = true }: { showSearch?: boolean }) {
  const { user } = useAuth();
  const { formatUsd } = useCurrency();
  const { catalog } = useCatalog();
  const [items, setItems] = useState<CatalogCourse[]>([]);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (level) params.set('level', level);
    api<{ items: CatalogCourse[] }>(`/courses?${params}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [q, level]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
  }

  const topics =
    catalog.courseCategories.length > 0
      ? catalog.courseCategories.map((label, i) => ({
          label,
          q: label.toLowerCase(),
          image: INSTITUTE_TOPICS[i % INSTITUTE_TOPICS.length].image,
        }))
      : INSTITUTE_TOPICS;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {showSearch && (
        <div className="flex justify-center mb-8">
          <CatalogSearch value={q} onChange={setQ} onSubmit={onSearch} placeholder="Search courses…" />
        </div>
      )}

      <h2 className="font-display text-xl font-bold text-brand-800">Popular topics</h2>
      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {topics.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setQ(t.q)}
            className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white text-left hover:border-brand-500 hover:shadow-lg transition-all duration-300"
          >
            <LazyImage src={t.image} alt="" className="h-24 w-full object-cover group-hover:scale-105 transition duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 to-brand-900/20" />
            <span className="absolute bottom-2 left-3 right-3 text-sm font-semibold text-white">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLevel(l.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              level === l.id ? 'bg-brand-600 text-white shadow-md' : 'border bg-white text-stone-700 hover:border-brand-500'
            }`}
          >
            {l.label}
          </button>
        ))}
        {user && (user.role === 'CREATOR' || user.role === 'ADMIN') && (
          <Link to="/instructor" className="ml-auto text-sm font-semibold text-brand-700">
            Instructor studio →
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Link
            key={c.id}
            to={`/courses/${c.id}`}
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white hover:shadow-lg hover:border-brand-400 transition"
          >
            <div className="aspect-[16/10] bg-brand-100 overflow-hidden">
              {c.thumbnailUrl ? (
                <LazyImage src={c.thumbnailUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
              ) : (
                <LazyImage
                  src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=480&h=300&fit=crop&q=80"
                  alt=""
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                />
              )}
            </div>
            <div className="p-5">
              {c.featured && <p className="text-xs font-semibold uppercase text-gold">Featured</p>}
              <p className="text-xs font-bold uppercase text-brand-600">{c.level}</p>
              <h3 className="mt-1 font-display text-lg font-bold group-hover:text-brand-700">{c.title}</h3>
              <p className="mt-2 text-sm text-stone-600 line-clamp-2">{c.description}</p>
              <div className="mt-4 flex justify-between text-sm border-t border-stone-100 pt-3">
                <span className="text-stone-500">{c.instructor?.name ?? 'Sheettomate'}</span>
                <span className="font-bold text-brand-800">{Number(c.price) === 0 ? 'Free' : formatUsd(Number(c.price))}</span>
              </div>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="col-span-full text-center text-stone-500 py-12 rounded-2xl border border-dashed bg-brand-50/50">
            Courses appear when the API is running and seeded.
          </p>
        )}
      </div>
    </div>
  );
}
