import type { FormEvent, ReactNode } from 'react';
import PillarNav, { type PillarId } from './PillarNav';
import { HeroOrnaments, SectionGlow, WaveDivider } from './landing/LandingDecor';

export default function MarketingHero({
  title,
  subtitle,
  eyebrow,
  children,
  compact = false,
  centered = true,
  pillar,
  variant = 'default',
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: ReactNode;
  compact?: boolean;
  centered?: boolean;
  pillar?: PillarId;
  variant?: 'default' | 'warm' | 'navy' | 'mint';
}) {
  const isNavy = variant === 'navy';
  const glowTone = variant === 'warm' ? 'warm' : variant === 'mint' ? 'mint' : 'light';

  return (
    <section
      className={`relative overflow-hidden ${
        isNavy
          ? 'bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 text-white'
          : 'bg-gradient-to-b from-accent-50/80 via-white to-slate-50/40'
      } ${compact ? 'pt-10 pb-16 sm:pt-12 sm:pb-20' : 'pt-12 pb-20 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28'}`}
    >
      {!isNavy && <SectionGlow tone={glowTone} />}
      {!isNavy && <HeroOrnaments />}
      {isNavy && (
        <div
          className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_80%,#0d9488,transparent_45%),radial-gradient(circle_at_80%_20%,#BF0A30,transparent_40%)]"
          aria-hidden
        />
      )}
      <div className={`relative mx-auto max-w-6xl px-4 sm:px-6 ${centered ? 'text-center' : ''}`}>
        {pillar && (
          <div className={`mb-6 sm:mb-8 motion-safe:animate-fade-up ${centered ? 'flex justify-center' : ''}`}>
            <PillarNav active={pillar} />
          </div>
        )}
        {eyebrow && (
          <p
            className={`inline-block rounded-full px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4 motion-safe:animate-fade-up ${
              isNavy ? 'bg-white/10 text-white/90 border border-white/20' : 'bg-accent-100 text-accent-800 border border-accent-200'
            }`}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={`font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1] motion-safe:animate-fade-up ${
            isNavy ? 'text-white' : 'text-brand-800'
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={`mt-3 sm:mt-4 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed motion-safe:animate-fade-up ${
              centered ? 'mx-auto' : ''
            } ${isNavy ? 'text-white/85' : 'text-stone-600'}`}
            style={{ animationDelay: '0.08s' }}
          >
            {subtitle}
          </p>
        )}
        {children && (
          <div className={`mt-6 sm:mt-8 w-full motion-safe:animate-fade-up ${centered ? 'flex flex-col items-center' : ''}`} style={{ animationDelay: '0.12s' }}>
            {children}
          </div>
        )}
      </div>
      <WaveDivider className={`absolute bottom-0 left-0 right-0 ${isNavy ? 'text-slate-50' : 'text-white'}`} />
    </section>
  );
}

export function CatalogSearch({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel = 'Search',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder: string;
  buttonLabel?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-xl flex-col sm:flex-row rounded-2xl sm:rounded-full border-2 border-brand-600/80 bg-white shadow-xl shadow-brand-900/10 overflow-hidden ring-4 ring-accent-500/10 hover:ring-accent-500/20 motion-safe:transition"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 px-4 sm:px-5 py-3.5 text-base outline-none"
      />
      <button
        type="submit"
        className="shrink-0 bg-gradient-to-r from-accent-600 to-brand-700 px-6 sm:px-8 py-3.5 text-sm font-bold text-white hover:from-accent-700 hover:to-brand-800 motion-safe:transition"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

/** @deprecated Use ContentSection from landing/LandingUI */
export function PageSection({
  children,
  className = '',
  alt = false,
  tone,
}: {
  children: ReactNode;
  className?: string;
  alt?: boolean;
  tone?: 'white' | 'mint' | 'slate' | 'cream' | 'sky' | 'brand';
}) {
  const resolved = tone ?? (alt ? 'mint' : 'white');
  const meshes: Record<string, string> = {
    white: 'from-white via-slate-50/30 to-white',
    mint: 'from-accent-50/90 via-emerald-50/40 to-white',
    slate: 'from-slate-100/80 via-slate-50/50 to-white',
    cream: 'from-amber-50/50 via-orange-50/20 to-white',
    sky: 'from-sky-50/60 via-brand-50/30 to-white',
    brand: 'from-brand-100/40 via-accent-50/30 to-white',
  };
  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${meshes[resolved]}`} aria-hidden />
      <div className="relative">{children}</div>
    </section>
  );
}
