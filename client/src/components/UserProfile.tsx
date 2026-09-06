import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import BadgeDisplay from './BadgeDisplay';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Profile {
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    country: string | null;
    bio: string | null;
    expertise: string[];
    reputation: number;
    loginStreak: number;
    learnStreak: number;
    templates: { id: string; title: string; category: string }[];
    badges: { badge: string }[];
    endorsementsRecv: { skill: string; from: { id: string; name: string } }[];
    certificates: { id: string; code: string; issuedAt: string; course: { title: string } }[];
    _count: { followers: number; following: number };
  };
  following: boolean;
  activity: { id: string; body: string; link?: string | null; createdAt: string }[];
}

export default function UserProfile({ data, onChange }: { data: Profile; onChange?: () => void }) {
  const { user: me } = useAuth();
  const { user } = data;
  const [skill, setSkill] = useState('Excel');

  async function follow() {
    const path = `/community/users/${user.id}/follow`;
    await api(path, { method: data.following ? 'DELETE' : 'POST' });
    onChange?.();
  }

  async function endorse(e: FormEvent) {
    e.preventDefault();
    await api(`/community/users/${user.id}/endorse`, { method: 'POST', body: JSON.stringify({ skill }) });
    onChange?.();
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-800 grid place-items-center text-xl font-bold">
              {user.name.slice(0, 1)}
            </div>
          )}
          <h1 className="text-3xl font-bold">{user.name}</h1>
        </div>
        <p className="text-sm text-stone-500">
          {user.country} · {user.reputation} reputation · {user._count.followers} followers · daily streak {user.loginStreak} · learn streak{' '}
          {user.learnStreak}
        </p>
        <p className="mt-3">{user.bio || 'No bio yet.'}</p>
        <p className="mt-2 text-sm text-brand-800">{user.expertise.join(' · ')}</p>
        <div className="mt-4">
          <BadgeDisplay badges={user.badges} />
        </div>
        {me && me.id !== user.id && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void follow()} className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-semibold">
              {data.following ? 'Unfollow' : 'Follow'}
            </button>
            <form onSubmit={endorse} className="flex gap-2">
              <input value={skill} onChange={(e) => setSkill(e.target.value)} className="rounded border px-2 text-sm" />
              <button type="submit" className="text-sm font-semibold">
                Endorse
              </button>
            </form>
          </div>
        )}
      </header>
      <section>
        <h2 className="font-bold">Shared templates</h2>
        <ul className="mt-2 grid sm:grid-cols-2 gap-2">
          {user.templates.map((t) => (
            <li key={t.id} className="rounded-lg border bg-white px-3 py-2 text-sm">
              <Link to={`/templates/${t.id}`} className="font-semibold">
                {t.title}
              </Link>
              <span className="text-stone-500"> · {t.category}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Endorsements</h2>
        <ul className="mt-2 text-sm">
          {user.endorsementsRecv.map((e) => (
            <li key={`${e.from.id}-${e.skill}`}>
              {e.skill} — {e.from.name}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Certificates</h2>
        <ul className="mt-2 text-sm">
          {user.certificates.map((c) => (
            <li key={c.id}>
              {c.course.title} · {c.code}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-bold">Activity</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {data.activity.map((a) => (
            <li key={a.id}>{a.body}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
