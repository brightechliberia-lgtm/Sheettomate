import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

type ExploreItem = { to: string; label: string };
type ExploreSection = { title: string; items: ExploreItem[] };

const SECTIONS: ExploreSection[] = [
  {
    title: 'Start here',
    items: [
      { to: '/get-templates', label: 'Get templates' },
      { to: '/build', label: 'Build your own template' },
      { to: '/learn', label: 'Learn' },
      { to: '/categories', label: 'Browse categories' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { to: '/community', label: 'Community' },
      { to: '/automations', label: 'Automate workflows' },
      { to: '/blog', label: 'Blog & guides' },
    ],
  },
  {
    title: 'Company',
    items: [
      { to: '/about', label: 'About us' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/contact', label: 'Contact' },
    ],
  },
];

const EXPLORE_PATHS = new Set([
  '/get-templates',
  '/templates',
  '/build',
  '/learn',
  '/courses',
  '/categories',
  '/community',
  '/automations',
  '/blog',
  '/about',
  '/pricing',
  '/contact',
]);

function ExplorePanel({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 min-w-[16rem] sm:min-w-[28rem] p-4">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">{section.title}</p>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className="block rounded-lg px-2 py-1.5 text-sm font-medium text-stone-700 hover:bg-brand-50 hover:text-brand-800"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ExploreMenu({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const exploreActive = EXPLORE_PATHS.has(pathname) || pathname.startsWith('/blog/') || pathname.startsWith('/templates/');

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (mobile) {
    return (
      <div className="border rounded-xl overflow-hidden">
        <button
          type="button"
          className="w-full px-4 py-3 text-left text-sm font-bold bg-brand-800 text-white"
          onClick={() => setOpen((v) => !v)}
        >
          Explore {open ? '▴' : '▾'}
        </button>
        {open && (
          <div className="border-t bg-white">
            <ExplorePanel onNavigate={onNavigate} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-xl border-2 transition-colors ${
          exploreActive || open
            ? 'bg-brand-800 text-white border-brand-800 shadow-sm'
            : 'bg-brand-50 text-brand-900 border-brand-200 hover:bg-brand-100 hover:border-brand-400'
        }`}
        aria-expanded={open}
      >
        Explore
        <span className={`text-xs ${exploreActive || open ? 'opacity-90' : 'opacity-70'}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 rounded-2xl border border-stone-200 bg-white shadow-xl">
          <ExplorePanel onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function ExploreMobileLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid gap-1 pt-2 border-t">
      {SECTIONS.flatMap((s) => s.items).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `text-sm font-medium py-1 ${isActive ? 'text-brand-700' : 'text-stone-600 hover:text-stone-900'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
