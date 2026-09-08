import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function NewsletterForm({
  source = 'newsletter',
  label = 'Get product updates',
  onDark = false,
}: {
  source?: 'newsletter' | 'waitlist' | 'contact';
  label?: string;
  onDark?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus('');
    try {
      await api('/marketing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email, source }),
      });
      setStatus('Welcome email is on the way. You can also create a free account.');
      setEmail('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not subscribe');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <label className="sr-only" htmlFor={`email-${source}`}>
        {label}
      </label>
      <input
        id={`email-${source}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className={`flex-1 rounded-full border px-4 py-2.5 text-sm ${
          onDark ? 'border-white/30 bg-white text-stone-900 placeholder:text-stone-500' : 'border-stone-300 bg-white'
        }`}
      />
      <button type="submit" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
        Join free
      </button>
      {status && <p className={`sm:col-span-2 text-xs w-full ${onDark ? 'text-white/70' : 'text-stone-500'}`}>{status}</p>}
    </form>
  );
}
