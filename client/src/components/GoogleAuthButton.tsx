import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAccessToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed'));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const handled = useRef(false);

  useEffect(() => {
    api<{ enabled: boolean; clientId?: string | null }>('/auth/google/status')
      .then((d) => {
        setEnabled(d.enabled);
        setClientId(d.clientId ?? null);
      })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled || !clientId) return;
    let cancelled = false;

    async function finish(credential: string) {
      if (handled.current) return;
      handled.current = true;
      setError('');
      try {
        const data = await api<{ accessToken: string }>('/auth/google/id-token', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });
        setAccessToken(data.accessToken);
        await refreshUser();
        navigate('/dashboard', { replace: true });
      } catch (err) {
        handled.current = false;
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    }

    void loadGsi()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) void finish(response.credential);
          },
          auto_select: true,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
        });
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: buttonRef.current.offsetWidth || 320,
            logo_alignment: 'left',
          });
        }
        // Suggest accounts already signed into this browser
        window.google.accounts.id.prompt();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, clientId, navigate, refreshUser]);

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
    <div className="space-y-2">
      <div ref={buttonRef} className="flex min-h-10 w-full justify-center" />
      <a
        href={`${API_BASE}/auth/google`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      >
        {label}
      </a>
      <p className="text-xs text-stone-500 text-center">
        Uses your active Google account in this browser when available.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
