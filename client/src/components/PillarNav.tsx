import { Link, useLocation } from 'react-router-dom';

const PILLARS = [
  {
    id: 'get',
    to: '/get-templates',
    label: 'Get templates',
    hint: 'Ready-made workbooks',
    icon: '📥',
  },
  {
    id: 'build',
    to: '/build',
    label: 'Build your own template',
    hint: 'Any spreadsheet you need',
    icon: '✨',
  },
  {
    id: 'learn',
    to: '/learn',
    label: 'Learn',
    hint: 'Courses & skills',
    icon: '📚',
  },
] as const;

export type PillarId = (typeof PILLARS)[number]['id'];

export default function PillarNav({ active }: { active: PillarId }) {
  return (
    <nav aria-label="Main product areas" className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 w-full max-w-3xl">
      {PILLARS.map((p) => {
        const on = active === p.id;
        return (
          <Link
            key={p.id}
            to={p.to}
            className={`group relative flex-1 min-w-[9rem] rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-300 overflow-hidden ${
              on
                ? 'border-accent-500 bg-gradient-to-br from-accent-600 to-brand-800 text-white shadow-lg shadow-brand-900/20 scale-[1.02]'
                : 'border-stone-200/80 bg-white/95 backdrop-blur text-brand-900 hover:border-accent-300 hover:shadow-md'
            }`}
          >
            {!on && <div className="absolute inset-0 bg-gradient-to-br from-brand-50/0 to-[#BF0A30]/0 group-hover:from-brand-50/80 group-hover:to-red-50/30 transition-colors" />}
            <span className="relative text-xl" aria-hidden>
              {p.icon}
            </span>
            <p className={`relative mt-1.5 text-sm font-bold leading-tight ${on ? 'text-white' : 'text-brand-800'}`}>{p.label}</p>
            <p className={`relative text-xs mt-0.5 ${on ? 'text-white/75' : 'text-stone-500'}`}>{p.hint}</p>
          </Link>
        );
      })}
    </nav>
  );
}

export function useActivePillar(): PillarId {
  const { pathname } = useLocation();
  if (pathname.startsWith('/build')) return 'build';
  if (pathname.startsWith('/learn') || pathname.startsWith('/courses')) return 'learn';
  return 'get';
}
