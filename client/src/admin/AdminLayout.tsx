import { useAuth } from '../context/AuthContext';
import { NavLink, Outlet } from 'react-router-dom';
import { staffCan, type StaffScope } from '@sheetomate/shared';
import NotificationCenter from './NotificationCenter';

const items: { to: string; label: string; scope: StaffScope }[] = [
  { to: '/admin', label: 'Overview', scope: 'overview' },
  { to: '/admin/users', label: 'Users', scope: 'users' },
  { to: '/admin/templates', label: 'Templates', scope: 'templates' },
  { to: '/admin/courses', label: 'Courses', scope: 'courses' },
  { to: '/admin/payments', label: 'Payments', scope: 'payments' },
  { to: '/admin/cms', label: 'Content', scope: 'cms' },
  { to: '/admin/moderation', label: 'Moderation', scope: 'moderation' },
  { to: '/admin/analytics/revenue', label: 'Revenue', scope: 'analytics' },
  { to: '/admin/analytics/users', label: 'User analytics', scope: 'analytics' },
  { to: '/admin/analytics/content', label: 'Content analytics', scope: 'analytics' },
  { to: '/admin/ai', label: 'AI usage', scope: 'ai' },
  { to: '/admin/analytics/geo', label: 'Geographic', scope: 'analytics' },
  { to: '/admin/reports', label: 'Reports', scope: 'reports' },
  { to: '/admin/health', label: 'Health', scope: 'health' },
  { to: '/admin/settings', label: 'Settings', scope: 'settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const staff = user?.staffRole ?? 'SUPER';

  return (
    <div className="min-h-screen flex bg-stone-100">
      <aside className="w-56 shrink-0 bg-brand-950 text-white p-4">
        <p className="font-extrabold text-lg">Sheettomate</p>
        <p className="text-xs text-brand-200 mt-1">Admin · {staff}</p>
        <nav className="mt-6 grid gap-1 text-sm">
          {items
            .filter((i) => staffCan(staff, i.scope))
            .map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === '/admin'}
                className={({ isActive }) =>
                  `rounded px-2 py-1.5 ${isActive ? 'bg-brand-700' : 'text-brand-100 hover:bg-brand-900'}`
                }
              >
                {i.label}
              </NavLink>
            ))}
        </nav>
        <a href="/" className="mt-8 block text-xs text-brand-300">
          ← Public site
        </a>
        <button type="button" onClick={() => void logout()} className="mt-2 text-xs text-brand-300">
          Log out
        </button>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b px-6 py-3 flex justify-between items-center">
          <p className="text-sm text-stone-500">{user?.email}</p>
          <NotificationCenter />
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
