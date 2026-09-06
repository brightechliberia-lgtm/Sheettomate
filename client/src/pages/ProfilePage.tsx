import { FormEvent, useEffect, useState, type ChangeEvent } from 'react';
import { WEST_AFRICAN_COUNTRIES } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '@sheetomate/shared';

interface DownloadRow {
  id: string;
  downloadDate: string;
  template: { id: string; title: string; category: string };
}

interface EnrollmentRow {
  id: string;
  progress: number;
  course: { id: string; title: string; level: string };
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<DownloadRow[]>([]);
  const [courses, setCourses] = useState<EnrollmentRow[]>([]);

  useEffect(() => {
    api<{ items: DownloadRow[] }>('/users/templates')
      .then((data) => setTemplates(data.items))
      .catch(() => setTemplates([]));
    api<{ items: EnrollmentRow[] }>('/users/courses')
      .then((data) => setCourses(data.items))
      .catch(() => setCourses([]));
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError('');
    setMessage('');
    try {
      await api<{ user: AuthUser }>('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: String(form.get('name')),
          phone: String(form.get('phone')),
          country: String(form.get('country')),
          bio: String(form.get('bio')),
          expertise: String(form.get('expertise'))
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          digestOptIn: form.get('digest') === 'on',
        }),
      });
      await refreshUser();
      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError('');
    setMessage('');
    try {
      await api('/users/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: String(form.get('currentPassword')),
          newPassword: String(form.get('newPassword')),
        }),
      });
      setMessage('Password changed. Please log in again.');
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Your profile</h1>
      {message && <p className="text-brand-700 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="rounded-2xl border bg-white p-6 max-w-lg flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-brand-100 text-brand-800 grid place-items-center text-2xl font-bold">
            {user.name.slice(0, 1)}
          </div>
        )}
        <label className="text-sm font-medium">
          Profile photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-2 block text-sm"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const data = new FormData();
              data.set('avatar', file);
              setError('');
              setMessage('');
              void api<{ user: AuthUser }>('/users/avatar', { method: 'POST', body: data })
                .then(() => refreshUser())
                .then(() => setMessage('Photo updated.'))
                .catch((err) => setError(err instanceof Error ? err.message : 'Photo upload failed'));
            }}
          />
        </label>
      </div>

      <form onSubmit={onSave} className="rounded-2xl border bg-white p-6 space-y-4 max-w-lg">
        <label className="block text-sm font-medium">
          Name
          <input name="name" defaultValue={user.name} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input value={user.email} disabled className="mt-1 w-full rounded-lg border bg-stone-50 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Phone
          <input name="phone" defaultValue={user.phone ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Country
          <select name="country" defaultValue={user.country ?? 'LR'} className="mt-1 w-full rounded-lg border px-3 py-2">
            {WEST_AFRICAN_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Bio
          <textarea name="bio" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Expertise (comma separated)
          <input name="expertise" placeholder="Excel, Finance, Inventory" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="digest" type="checkbox" defaultChecked />
          Weekly email digest
        </label>
        <p className="text-sm text-stone-500">
          Email {user.emailVerified ? 'verified' : 'not verified'} · Role {user.role}
        </p>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
          Save profile
        </button>
      </form>

      <form onSubmit={onPassword} className="rounded-2xl border bg-white p-6 space-y-4 max-w-lg">
        <h2 className="font-bold">Change password</h2>
        <input
          name="currentPassword"
          type="password"
          required
          placeholder="Current password"
          className="w-full rounded-lg border px-3 py-2"
        />
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          placeholder="New password"
          className="w-full rounded-lg border px-3 py-2"
        />
        <button type="submit" className="rounded-lg border px-4 py-2 font-semibold">
          Update password
        </button>
      </form>

      <section>
        <h2 className="font-bold text-xl">Purchased templates</h2>
        <ul className="mt-3 space-y-2">
          {templates.map((row) => (
            <li key={row.id} className="rounded-lg border bg-white px-4 py-3">
              {row.template.title}{' '}
              <span className="text-sm text-stone-500">({row.template.category})</span>
            </li>
          ))}
          {templates.length === 0 && <li className="text-stone-500 text-sm">No purchases yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-xl">Enrolled courses</h2>
        <ul className="mt-3 space-y-2">
          {courses.map((row) => (
            <li key={row.id} className="rounded-lg border bg-white px-4 py-3">
              {row.course.title} — {row.progress}%
            </li>
          ))}
          {courses.length === 0 && <li className="text-stone-500 text-sm">No enrollments yet.</li>}
        </ul>
      </section>
    </div>
  );
}
