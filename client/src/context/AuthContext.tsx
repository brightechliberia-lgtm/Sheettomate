import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@sheetomate/shared';
import { api, getAccessToken, setAccessToken } from '../lib/api';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  country?: string;
  role?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ verifyUrl?: string; emailDelivery?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const data = await api<{ user: AuthUser }>('/users/profile');
    setUser(data.user);
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        if (getAccessToken()) {
          const data = await api<{ user: AuthUser }>('/users/profile');
          setUser(data.user);
          return;
        }
        const data = await api<{ user: AuthUser; accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refreshUser,
      async login(email, password) {
        const data = await api<{ user: AuthUser; accessToken: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
      },
      async register(payload) {
        return api<{ verifyUrl?: string; emailDelivery?: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        setAccessToken(null);
        setUser(null);
      },
    }),
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
