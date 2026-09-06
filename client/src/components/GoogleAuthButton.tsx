import { useEffect, useState } from 'react';
import { api } from '../lib/api';

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
        Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env, plus Authorized redirect URI{' '}
        <code className="break-all">http://127.0.0.1:5180/api/auth/google/callback</code>.
      </p>
    );
  }

  return (
    <a
      href="/api/auth/google"
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
    >
      {label}
    </a>
  );
}
