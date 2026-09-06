import { FormEvent, useEffect, useState } from 'react';
import type { AuthUser, UserRole } from '@sheetomate/shared';
import { WEST_AFRICAN_COUNTRIES } from '@sheetomate/shared';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

const ROLES: UserRole[] = ['ADMIN', 'CREATOR', 'USER', 'LEARNER'];

type EditForm = {
  name: string;
  email: string;
  phone: string;
  country: string;
  role: UserRole;
};

export default function AdminUsersManagePage() {
  const [items, setItems] = useState<AuthUser[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    const data = await api<{ items: AuthUser[] }>(`/admin/users?${params}`);
    setItems(data.items);
  }

  useEffect(() => {
    load().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status]);

  function openEdit(u: AuthUser) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      country: u.country ?? '',
      role: u.role,
    });
    setError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !form) return;
    setError('');
    try {
      await api(`/admin/users/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          country: form.country || null,
          role: form.role,
        }),
      });
      setEditing(null);
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function removeUser(u: AuthUser) {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setError('');
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      setSelected((s) => s.filter((id) => id !== u.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <StaffGate scope="users">
      <h1 className="text-2xl font-bold">Users</h1>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded border px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded border px-2">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="rounded bg-brand-600 px-3 py-2 text-white text-sm">
          Search
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {selected.length > 0 && (
        <div className="mt-3 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() =>
              void api('/admin/users/bulk', { method: 'POST', body: JSON.stringify({ ids: selected, action: 'suspend' }) }).then(load)
            }
          >
            Suspend selected
          </button>
          <button
            type="button"
            onClick={() =>
              void api('/admin/users/bulk', { method: 'POST', body: JSON.stringify({ ids: selected, action: 'activate' }) }).then(load)
            }
          >
            Activate selected
          </button>
        </div>
      )}
      <table className="mt-4 w-full text-sm bg-white rounded-2xl border">
        <thead>
          <tr className="text-left bg-stone-50">
            <th className="p-2" />
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Staff</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={selected.includes(u.id)}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, u.id] : s.filter((id) => id !== u.id)))
                  }
                />
              </td>
              <td>
                {u.name}
                {u.suspended ? ' (suspended)' : ''}
              </td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) =>
                    void api(`/admin/users/${u.id}/role`, { method: 'PUT', body: JSON.stringify({ role: e.target.value }) }).then(load)
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td>{u.staffRole ?? '—'}</td>
              <td className="p-2 space-x-2 whitespace-nowrap">
                <button type="button" className="text-brand-700 font-medium" onClick={() => openEdit(u)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-brand-700"
                  onClick={() =>
                    void api(`/admin/users/${u.id}/suspend`, {
                      method: 'POST',
                      body: JSON.stringify({ suspend: !u.suspended }),
                    }).then(load)
                  }
                >
                  {u.suspended ? 'Activate' : 'Suspend'}
                </button>
                <button type="button" className="text-red-700" onClick={() => void removeUser(u)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && form && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 space-y-3 shadow-xl">
            <h2 className="text-lg font-bold">Edit user</h2>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Name"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Email"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Phone"
            />
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Country</option>
              {WEST_AFRICAN_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg px-3 py-2 text-sm" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white font-semibold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </StaffGate>
  );
}
