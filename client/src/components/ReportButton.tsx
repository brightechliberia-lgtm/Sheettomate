import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ReportButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get('reason'));
    await api('/community/report', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) });
    setDone(true);
    setOpen(false);
  }

  if (!user) return null;
  if (done) return <span className="text-xs text-stone-500">Reported</span>;
  return (
    <div className="relative inline-block">
      <button type="button" className="text-xs text-stone-500" onClick={() => setOpen((v) => !v)}>
        Report
      </button>
      {open && (
        <form onSubmit={submit} className="absolute right-0 z-20 mt-1 w-64 rounded-lg border bg-white p-3 shadow">
          <textarea name="reason" required minLength={4} placeholder="Why is this inappropriate?" className="w-full rounded border p-2 text-sm" />
          <button type="submit" className="mt-2 text-xs font-semibold text-red-700">
            Send to moderators
          </button>
        </form>
      )}
    </div>
  );
}
