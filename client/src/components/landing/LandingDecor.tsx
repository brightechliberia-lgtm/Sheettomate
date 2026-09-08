/** Decorative backgrounds — Alison-inspired soft sections + Sheettomate brand */

export function HeroOrnaments() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent-200/40 blur-3xl animate-float" />
      <div className="absolute top-0 right-0 h-[28rem] w-[28rem] rounded-full bg-brand-200/30 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#00a651]/8 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 40 104 / 0.06) 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />
      <svg className="absolute top-12 left-[6%] w-14 h-14 text-accent-500/20 hidden sm:block" viewBox="0 0 64 64" fill="currentColor">
        <path d="M32 4c-2 8-10 14-10 22 0 6 4 10 10 10s10-4 10-10c0-8-8-14-10-22zm0 36c-6 0-12 4-14 10 8-2 14-6 14-10s6 8 14 10c-2-6-8-10-14-10z" />
      </svg>
      <svg className="absolute top-16 right-[10%] w-24 h-24 text-brand-500/15 rotate-12 hidden md:block" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="40" cy="40" r="30" />
        <path d="M40 10v60M10 40h60" />
      </svg>
    </div>
  );
}

export function FloralDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent via-accent-400 to-brand-500" />
      <span className="h-2 w-2 rounded-full bg-accent-500 shadow-sm shadow-accent-500/40" />
      <span className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent via-accent-400 to-brand-500" />
    </div>
  );
}

export function CornerFloral({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-24 h-24 text-accent-500/10 ${className}`} viewBox="0 0 80 80" fill="currentColor" aria-hidden>
      <path d="M0 0c20 8 32 20 40 40C32 20 20 8 0 0zm40 40c8 20 20 32 40 40-20-8-32-20-40-40z" />
    </svg>
  );
}

export function SectionGlow({ tone = 'light' }: { tone?: 'light' | 'warm' | 'navy' | 'mint' }) {
  const bg =
    tone === 'navy'
      ? 'from-brand-900/50 via-brand-800/30 to-accent-900/20'
      : tone === 'warm'
        ? 'from-amber-50/90 via-white to-accent-50/50'
        : tone === 'mint'
          ? 'from-accent-50/90 via-white to-brand-50/40'
          : 'from-slate-50/80 via-white to-accent-50/30';
  return <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${bg}`} aria-hidden />;
}

/** Alison-style wave between sections */
export function WaveDivider({ flip = false, className = '' }: { flip?: boolean; className?: string }) {
  return (
    <div className={`relative w-full leading-[0] ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden>
      <svg className="w-full h-8 sm:h-12 text-inherit" viewBox="0 0 1440 48" preserveAspectRatio="none" fill="currentColor">
        <path d="M0,32 C360,0 720,64 1080,32 C1260,16 1380,24 1440,32 L1440,48 L0,48 Z" />
      </svg>
    </div>
  );
}

export function SectionMesh({ tone }: { tone: 'white' | 'mint' | 'slate' | 'cream' | 'sky' | 'brand' }) {
  const fills: Record<typeof tone, string> = {
    white: 'from-white via-slate-50/30 to-white',
    mint: 'from-accent-50/90 via-emerald-50/40 to-white',
    slate: 'from-slate-100/80 via-slate-50/50 to-white',
    cream: 'from-amber-50/50 via-orange-50/20 to-white',
    sky: 'from-sky-50/60 via-brand-50/30 to-white',
    brand: 'from-brand-100/40 via-accent-50/30 to-white',
  };
  return (
    <>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${fills[tone]}`} aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgb(13 148 136 / 0.08), transparent 45%), radial-gradient(circle at 80% 80%, rgb(0 40 104 / 0.06), transparent 40%)`,
        }}
        aria-hidden
      />
    </>
  );
}

export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 opacity-30 ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 40 104 / 0.07) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}
      aria-hidden
    />
  );
}
