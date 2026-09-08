/** Flat section helpers — decorative ornaments/ribbons removed for a clean UI */

export function HeroOrnaments() {
  return null;
}

export function FloralDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-16 mx-auto bg-stone-200 ${className}`} aria-hidden />;
}

export function CornerFloral(_props: { className?: string }) {
  return null;
}

export function SectionGlow(_props: { tone?: 'light' | 'warm' | 'navy' | 'mint' }) {
  return null;
}

export function WaveDivider(_props: { flip?: boolean; className?: string }) {
  return null;
}

export function SectionMesh({ tone }: { tone: 'white' | 'mint' | 'slate' | 'cream' | 'sky' | 'brand' }) {
  const fills: Record<typeof tone, string> = {
    white: 'bg-white',
    mint: 'bg-brand-50/40',
    slate: 'bg-stone-50',
    cream: 'bg-stone-50',
    sky: 'bg-brand-50/30',
    brand: 'bg-brand-50/50',
  };
  return <div className={`pointer-events-none absolute inset-0 ${fills[tone]}`} aria-hidden />;
}

export function DotGrid(_props: { className?: string }) {
  return null;
}
