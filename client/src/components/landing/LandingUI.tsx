import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { FloralDivider, SectionMesh } from './LandingDecor';
import { Reveal } from './Reveal';

export type SectionTone = 'white' | 'mint' | 'slate' | 'cream' | 'sky' | 'brand';

const toneBorder: Record<SectionTone, string> = {
  white: 'border-stone-100',
  mint: 'border-accent-100',
  slate: 'border-slate-200/80',
  cream: 'border-amber-100',
  sky: 'border-brand-100',
  brand: 'border-brand-200',
};

export function SectionHeading({
  title,
  subtitle,
  align = 'center',
  className = '',
  light = false,
}: {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
  light?: boolean;
}) {
  return (
    <Reveal className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
      <h2 className={`font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-brand-800'}`}>
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-3 text-base sm:text-lg leading-relaxed max-w-2xl ${align === 'center' ? 'mx-auto' : ''} ${
            light ? 'text-white/85' : 'text-stone-600'
          }`}
        >
          {subtitle}
        </p>
      )}
      <FloralDivider className="mt-5" />
    </Reveal>
  );
}

export function StatBand({ stats }: { stats: { n: string; l: string }[] }) {
  const { ref, visible } = useScrollReveal();
  return (
    <section className="relative border-y border-stone-200 overflow-hidden bg-stone-50">
      <div
        ref={ref as never}
        className={`relative mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center motion-safe:transition-all motion-safe:duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {stats.map((s, i) => (
          <div key={s.l} style={{ transitionDelay: `${i * 80}ms` }} className="motion-safe:transition-all motion-safe:duration-700">
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-800">{s.n}</p>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-stone-600">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeatureCard({
  title,
  body,
  to,
  icon,
  children,
}: {
  title: string;
  body?: string;
  to?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const inner = (
    <>
      {icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-brand-700 text-white text-xl shadow-lg shadow-brand-900/15">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg sm:text-xl font-bold text-brand-800">{title}</h3>
      {body && <p className="mt-2 text-sm text-stone-600 leading-relaxed">{body}</p>}
      {children}
    </>
  );
  const cls =
    'group relative h-full rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-sm p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-accent-300 hover:-translate-y-1 motion-safe:transition-all motion-safe:duration-300 overflow-hidden';
  if (to) {
    return (
      <Link to={to} className={cls}>
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/0 to-brand-600/0 group-hover:from-accent-500/[0.04] group-hover:to-brand-600/[0.06] transition-colors" />
        <div className="relative">{inner}</div>
      </Link>
    );
  }
  return (
    <div className={cls}>
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-accent-100/80 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
      {inner}
    </div>
  );
}

export function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <Reveal className="h-full">
      <div className="relative h-full text-center rounded-2xl border border-white/80 bg-white/90 backdrop-blur p-5 sm:p-6 shadow-md hover:shadow-lg motion-safe:transition-all">
        <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-accent-500 to-brand-700 text-white grid place-items-center text-lg sm:text-xl font-black shadow-lg">
          {n}
        </div>
        <h3 className="mt-4 font-display text-base sm:text-lg font-bold text-brand-800">{title}</h3>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">{body}</p>
      </div>
    </Reveal>
  );
}

export function CtaBand({
  title,
  subtitle,
  primary,
  secondary,
}: {
  title: string;
  subtitle?: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <section className="relative overflow-hidden bg-brand-700 text-white px-4 sm:px-6 py-14 sm:py-20">
      <Reveal className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">{title}</h2>
        {subtitle && <p className="mt-4 text-white text-base sm:text-lg max-w-xl mx-auto opacity-95">{subtitle}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to={primary.to}
            className="rounded-full bg-white px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-brand-800 shadow-lg hover:bg-brand-50 motion-safe:transition"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              to={secondary.to}
              className="rounded-full border-2 border-white px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-white/10 motion-safe:transition"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}

export function ContentSection({
  children,
  alt = false,
  tone,
  className = '',
  id,
  reveal = true,
  waveTop: _waveTop = false,
  waveBottom: _waveBottom = false,
}: {
  children: ReactNode;
  alt?: boolean;
  tone?: SectionTone;
  className?: string;
  id?: string;
  reveal?: boolean;
  waveTop?: boolean;
  waveBottom?: boolean;
}) {
  const resolvedTone: SectionTone = tone ?? (alt ? 'mint' : 'white');
  const { ref, visible } = useScrollReveal(0.08);

  const inner = (
    <section
      id={id}
      ref={reveal ? (ref as never) : undefined}
      className={`relative overflow-hidden border-y ${toneBorder[resolvedTone]} ${className}`}
    >
      <SectionMesh tone={resolvedTone} />
      <div
        className={`relative motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${
          !reveal || visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {children}
      </div>
    </section>
  );

  return inner;
}

export function LandingPageRoot({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">{children}</div>
  );
}

export function TestimonialCard({
  quote,
  name,
  role,
  img,
}: {
  quote: string;
  name: string;
  role: string;
  img: string;
}) {
  return (
    <Reveal className="h-full">
      <blockquote className="relative h-full rounded-2xl bg-white/95 backdrop-blur p-5 sm:p-6 border border-stone-200/80 shadow-sm hover:shadow-xl motion-safe:transition-all">
        <img src={img} alt="" className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover ring-4 ring-accent-100" />
        <p className="mt-4 text-sm sm:text-base text-stone-700 leading-relaxed">"{quote}"</p>
        <footer className="mt-4 text-sm font-semibold text-brand-800">
          {name}
          <span className="block font-normal text-stone-500">{role}</span>
        </footer>
      </blockquote>
    </Reveal>
  );
}

export function PricingCard({
  name,
  price,
  points,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  points: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <Reveal className="h-full">
      <div
        className={`relative h-full rounded-2xl p-5 sm:p-6 motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 ${
          highlight
            ? 'bg-gradient-to-br from-brand-900 to-brand-800 text-white shadow-2xl shadow-brand-900/25 ring-2 ring-accent-400/60 lg:scale-[1.03]'
            : 'bg-white/95 border border-stone-200 shadow-sm hover:shadow-lg'
        }`}
      >
        {highlight && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-3 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide">
            Popular
          </span>
        )}
        <h3 className="font-display text-lg sm:text-xl font-bold">{name}</h3>
        <p className="mt-2 text-2xl sm:text-3xl font-extrabold">{price}</p>
        <ul className={`mt-4 space-y-2 text-sm ${highlight ? 'text-white/85' : 'text-stone-600'}`}>
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className={highlight ? 'text-accent-300' : 'text-accent-600'}>✓</span>
              {p}
            </li>
          ))}
        </ul>
        <Link
          to={cta}
          className={`mt-5 block text-center rounded-full py-2.5 text-sm font-semibold motion-safe:transition ${
            highlight ? 'bg-accent-500 text-white hover:bg-accent-600' : 'bg-brand-700 text-white hover:bg-brand-800'
          }`}
        >
          Choose {name}
        </Link>
      </div>
    </Reveal>
  );
}

/** Grid helper with staggered scroll reveal */
export function RevealGrid({
  children,
  className = '',
  stagger = 80,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal key={i} delay={i * stagger} className="h-full">
          {child}
        </Reveal>
      ))}
    </div>
  );
}
