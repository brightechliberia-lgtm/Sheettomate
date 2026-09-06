import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <p>Please log in to view your dashboard.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-800 grid place-items-center text-xl font-bold">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div>
        <p className="text-sm text-stone-500">Signed in as</p>
        <p className="text-xl font-bold">{user.name}</p>
        <p className="text-stone-600">{user.email}</p>
        <p className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {user.role}
        </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/profile" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            Edit profile
          </Link>
          <Link to="/automations" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Automations
          </Link>
          <Link to="/learn" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Learn
          </Link>
          <Link to="/build" className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Build
          </Link>
          {(user.role === 'CREATOR' || user.role === 'ADMIN' || user.role === 'USER') && (
            <Link to="/creator" className="rounded-lg border px-4 py-2 text-sm font-semibold">
              Creator studio
            </Link>
          )}
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="rounded-lg border px-4 py-2 text-sm font-semibold">
              Admin dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
