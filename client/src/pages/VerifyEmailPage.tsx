import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAccessToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '@sheetomate/shared';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing verification token.');
      return;
    }
    api<{ user: AuthUser; accessToken: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async (data) => {
        setAccessToken(data.accessToken);
        await refreshUser();
        setDone(true);
        navigate('/dashboard', { replace: true });
      })
      .catch((err: Error) => setError(err.message));
  }, [token, navigate, refreshUser]);

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold">Verification failed</h1>
        <p className="mt-3 text-red-600">{error}</p>
        <Link to="/login" className="mt-4 inline-block text-brand-700 font-semibold">
          Back to login
        </Link>
      </div>
    );
  }

  return <p>{done ? 'Email verified.' : 'Verifying your email...'}</p>;
}
