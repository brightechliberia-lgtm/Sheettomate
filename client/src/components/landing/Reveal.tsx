import type { CSSProperties, ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'fade';

const hidden: Record<RevealVariant, string> = {
  up: 'opacity-0 translate-y-10',
  left: 'opacity-0 -translate-x-8',
  right: 'opacity-0 translate-x-8',
  scale: 'opacity-0 scale-[0.96]',
  fade: 'opacity-0',
};

const shown: Record<RevealVariant, string> = {
  up: 'opacity-100 translate-y-0',
  left: 'opacity-100 translate-x-0',
  right: 'opacity-100 translate-x-0',
  scale: 'opacity-100 scale-100',
  fade: 'opacity-100',
};

export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  const { ref, visible } = useScrollReveal();
  const style: CSSProperties = { transitionDelay: `${delay}ms` };

  return (
    <Tag
      ref={ref as never}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${
        visible ? shown[variant] : hidden[variant]
      } ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function RevealStagger({
  children,
  className = '',
  stagger = 90,
}: {
  children: ReactNode[];
  className?: string;
  stagger?: number;
}) {
  return (
    <>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * stagger} className={className}>
          {child}
        </Reveal>
      ))}
    </>
  );
}
