import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from './GoogleAuthButton';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [params] = useSearchParams();
  const googleHint = params.get('google');
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError('');
    setPending(true);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      {googleHint === 'off' && (
        <p className="text-sm text-brand-600">Google sign-in is not configured on the server yet.</p>
      )}
      {googleHint === 'denied' && <p className="text-sm text-brand-600">Google sign-in was cancelled.</p>}
      {googleHint === 'invalid' && <p className="text-sm text-brand-600">Google sign-in could not be completed. Try email login.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Signing in...' : 'Log in'}
      </button>
      <div className="relative py-2 text-center text-xs text-stone-400">or</div>
      <GoogleAuthButton />
      <p className="text-sm text-stone-600">
        <Link to="/forgot-password" className="text-brand-700 font-semibold">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
