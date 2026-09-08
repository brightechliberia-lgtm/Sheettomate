import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import BrandLogo from './BrandLogo';
import ExploreMenu from './ExploreMenu';
import NotificationBell from './NotificationBell';
import NewsletterForm from './NewsletterForm';
import OfflineBanner from './OfflineBanner';
import InstallPrompt from './InstallPrompt';
import MobileTabBar from './MobileTabBar';
import PushOptIn from './PushOptIn';
import BackButton from './BackButton';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? 'text-brand-700' : 'text-stone-600 hover:text-stone-900'}`;

const MARKETING = [
  '/',
  '/about',
  '/contact',
  '/blog',
  '/pricing',
  '/terms',
  '/privacy',
  '/get-templates',
  '/templates',
  '/build',
  '/learn',
  '/courses',
  '/categories',
];

const NO_BACK = [
  '/',
  '/pricing',
  '/get-templates',
  '/templates',
  '/build',
  '/learn',
  '/courses',
  '/categories',
  '/about',
  '/contact',
  '/blog',
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { ids } = useCart();
  const { currency, setCurrency } = useCurrency();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const fullBleed =
    MARKETING.includes(pathname) ||
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/courses/');

  const accountNav = user ? (
    <>
      <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
        <span className="inline-flex items-center gap-2">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : null}
          Dashboard
        </span>
      </NavLink>
      <NavLink to="/notifications" className={linkClass} onClick={() => setOpen(false)}>
        Inbox
      </NavLink>
      <NotificationBell />
      {user.role === 'ADMIN' && (
        <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
          Admin
        </NavLink>
      )}
      <button type="button" onClick={() => logout()} className="text-sm text-stone-500 text-left">
        Log out
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
        Log in
      </NavLink>
      <NavLink
        to="/register"
        onClick={() => setOpen(false)}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white text-center"
      >
        Sign up
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col pb-14 lg:pb-0">
      <OfflineBanner />
      {pathname === '/' && (
        <div className="bg-brand-800 text-white text-center text-sm py-2 px-4">
          Templates, build-your-own files, and courses — free to start.{' '}
          <Link to="/register" className="font-bold underline underline-offset-2">
            Join free
          </Link>
        </div>
      )}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="xl" />
            <p className="hidden sm:block text-xs sm:text-sm font-semibold text-accent-800 leading-snug max-w-[14rem] lg:max-w-[18rem]">
              Automate Sheets. Save Time. Grow Faster.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <InstallPrompt />
            <PushOptIn />
          </div>
          <nav className="hidden lg:flex items-center gap-4">
            <ExploreMenu />
            <NavLink to="/cart" className={linkClass}>
              Cart ({ids.length})
            </NavLink>
            <button type="button" onClick={() => setCurrency(currency === 'USD' ? 'LRD' : 'USD')} className="text-sm text-stone-600">
              {currency}
            </button>
            {accountNav}
          </nav>
          <button
            type="button"
            className="lg:hidden rounded-lg border px-3 py-1.5 text-sm font-semibold"
            aria-expanded={open}
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t px-4 py-4 grid gap-3 bg-white">
            <ExploreMenu mobile onNavigate={() => setOpen(false)} />
            <NavLink to="/cart" className={linkClass} onClick={() => setOpen(false)}>
              Cart ({ids.length})
            </NavLink>
            <button type="button" onClick={() => setCurrency(currency === 'USD' ? 'LRD' : 'USD')} className="text-sm text-stone-600 text-left">
              {currency}
            </button>
            {accountNav}
          </div>
        )}
      </header>
      <main className={fullBleed ? 'flex-1 w-full' : 'flex-1 mx-auto w-full max-w-6xl px-4 py-8'}>
        {!NO_BACK.includes(pathname) && !pathname.startsWith('/blog/') && (
          <div className={fullBleed ? 'mx-auto max-w-6xl px-4 pt-4' : ''}>
            <BackButton />
          </div>
        )}
        {children}
      </main>
      <footer className="border-t border-stone-200 bg-stone-50 text-accent-900">
        <div className="h-1 w-full bg-brand-500" />
        <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-4 gap-10 text-sm">
          <div>
            <BrandLogo size="lg" />
            <p className="mt-3 text-accent-700 leading-relaxed">
              Get templates, build your own, and learn — for Liberia and West Africa.
            </p>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold text-accent-900 tracking-wide text-xs uppercase">Explore</p>
            <Link to="/get-templates" className="text-accent-700 hover:text-brand-700">
              Get templates
            </Link>
            <Link to="/build" className="text-accent-700 hover:text-brand-700">
              Build your own template
            </Link>
            <Link to="/learn" className="text-accent-700 hover:text-brand-700">
              Learn
            </Link>
            <Link to="/categories" className="text-accent-700 hover:text-brand-700">
              Categories
            </Link>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold text-accent-900 tracking-wide text-xs uppercase">Company</p>
            <Link to="/about" className="text-accent-700 hover:text-brand-700">
              About
            </Link>
            <Link to="/contact" className="text-accent-700 hover:text-brand-700">
              Contact
            </Link>
            <Link to="/blog" className="text-accent-700 hover:text-brand-700">
              Blog
            </Link>
            <Link to="/pricing" className="text-accent-700 hover:text-brand-700">
              Pricing
            </Link>
          </div>
          <div>
            <p className="font-semibold text-accent-900 tracking-wide text-xs uppercase">Newsletter</p>
            <p className="mt-1 mb-3 text-xs text-accent-600">Tips, new templates, course drops.</p>
            <NewsletterForm source="newsletter" />
          </div>
        </div>
        <div className="border-t border-stone-200 mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-center text-xs text-accent-600">© {new Date().getFullYear()} Sheettomate</p>
          <a
            href="https://brightechliberia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-accent-800 hover:border-brand-400 hover:bg-brand-50"
          >
            <span>Powered by</span>
            <img src="/brightech-logo.png" alt="Brightech Liberia" className="h-7 w-auto object-contain" />
          </a>
        </div>
      </footer>
      <MobileTabBar />
    </div>
  );
}
