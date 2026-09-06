import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password'));
    setError('');
    setMessage('');
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage('Password updated. You can log in now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  if (!token) {
    return <p>Missing reset token. Request a new link from the forgot password page.</p>;
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-8">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="New password"
          className="w-full rounded-lg border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && (
          <p className="text-sm text-brand-700">
            {message}{' '}
            <Link to="/login" className="font-semibold">
              Log in
            </Link>
          </p>
        )}
        <button type="submit" className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white">
          Update password
        </button>
      </form>
    </div>
  );
}
