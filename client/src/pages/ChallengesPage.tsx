import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ChallengesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<
    { id: string; title: string; description: string; type: string; startsAt: string; endsAt: string; meetingUrl?: string | null; _count: { entries: number; rsvps: number } }[]
  >([]);

  useEffect(() => {
    api<{ items: typeof items }>('/community/events')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Challenges & events</h1>
      <ul className="space-y-3">
        {items.map((ev) => (
          <li key={ev.id} className="rounded-2xl border bg-white p-5">
            <p className="text-xs uppercase font-semibold text-brand-700">{ev.type}</p>
            <h2 className="text-xl font-bold">{ev.title}</h2>
            <p className="text-sm mt-1">{ev.description}</p>
            <p className="text-xs text-stone-500 mt-2">
              {new Date(ev.startsAt).toLocaleString()} — {new Date(ev.endsAt).toLocaleString()} · {ev._count.rsvps} RSVPs · {ev._count.entries} entries
            </p>
            {ev.meetingUrl && (
              <a href={ev.meetingUrl} className="text-sm text-brand-700 font-semibold" target="_blank" rel="noreferrer">
                Join link
              </a>
            )}
            {user && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => void api(`/community/events/${ev.id}/rsvp`, { method: 'POST' })}
                >
                  RSVP
                </button>
                {(ev.type === 'CHALLENGE' || ev.type === 'HACKATHON') && (
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => void api(`/community/events/${ev.id}/enter`, { method: 'POST', body: JSON.stringify({ notes: 'Entering with my latest workbook' }) })}
                  >
                    Enter
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-stone-500">No events scheduled. Check back after seed/migrate.</li>}
      </ul>
    </div>
  );
}
