import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function GoogleDonePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = params.get('accessToken');
    if (!token) {
      navigate('/login?google=invalid', { replace: true });
      return;
    }
    setAccessToken(token);
    void refreshUser().then(() => navigate('/dashboard', { replace: true }));
  }, [params, navigate, refreshUser]);

  return <p className="p-8 text-sm text-stone-600">Signing you in with Google…</p>;
}
