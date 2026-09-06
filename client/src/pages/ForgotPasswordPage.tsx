import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    setError('');
    setMessage('');
    try {
      const data = await api<{ sent: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage('If that email is registered, a reset link is on its way.');
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-8">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-brand-700">{message}</p>}
        <button type="submit" className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white">
          Send reset link
        </button>
      </form>
    </div>
  );
}
