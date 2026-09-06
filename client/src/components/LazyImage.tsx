import { useLowData } from '../context/LowDataContext';

export default function LazyImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const { lowData } = useLowData();
  if (!src || lowData) {
    return <div className={`grid place-items-center bg-stone-100 text-xs text-stone-400 ${className ?? ''}`}>{lowData ? 'Image off (low data)' : alt || 'No image'}</div>;
  }
  const cdn = import.meta.env.VITE_CDN_URL;
  const href = src.startsWith('http') || src.startsWith('data:') || !cdn ? src : `${cdn.replace(/\/$/, '')}${src.startsWith('/') ? src : `/${src}`}`;
  return <img src={href} alt={alt} loading="lazy" decoding="async" className={className} />;
}
