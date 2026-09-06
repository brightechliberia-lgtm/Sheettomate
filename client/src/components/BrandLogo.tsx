import { Link } from 'react-router-dom';

export default function BrandLogo({
  className = '',
  to = '/',
  size = 'md',
}: {
  className?: string;
  to?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const heights = { sm: 'h-8', md: 'h-10', lg: 'h-12', xl: 'h-16' };
  return (
    <Link to={to} className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      <img src="/logo.png" alt="Sheettomate" className={`${heights[size]} w-auto object-contain`} />
      <span className="sr-only">Sheettomate</span>
    </Link>
  );
}
