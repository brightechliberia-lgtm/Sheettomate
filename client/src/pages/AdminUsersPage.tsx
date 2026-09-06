import { useEffect, useState } from 'react';
import type { AuthUser, UserRole } from '@sheetomate/shared';
import { api } from '../lib/api';

const ROLES: UserRole[] = ['ADMIN', 'CREATOR', 'USER', 'LEARNER'];

export default function AdminUsersPage() {
  const [items, setItems] = useState<AuthUser[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  async function load(search = q) {
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const data = await api<{ items: AuthUser[] }>(`/admin/users${params}`);
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeRole(id: string, role: UserRole) {
    setError('');
    try {
      await api(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setError('');
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">User management</h1>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load().catch((err: Error) => setError(err.message));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="rounded-lg border px-3 py-2 max-w-sm flex-1"
        />
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
          Search
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="rounded border px-2 py-1"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{u.emailVerified ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => remove(u.id)} className="text-red-600 font-semibold">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
