import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export default function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>('/auth/google/status')
      .then((d) => setEnabled(d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) {
    return (
      <p className="text-xs text-stone-500">
        Google sign-in is not enabled yet. Add <code>GOOGLE_CLIENT_ID</code> and{' '}
        <code>GOOGLE_CLIENT_SECRET</code> on the API, with redirect URI{' '}
        <code className="break-all">https://api.sheettomate.com/api/auth/google/callback</code>.
      </p>
    );
  }

  return (
    <a
      href={`${API_BASE}/auth/google`}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
    >
      {label}
    </a>
  );
}
