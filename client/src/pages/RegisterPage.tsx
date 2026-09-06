import { useState } from 'react';
import { Link } from 'react-router-dom';
import RegistrationForm from '../components/RegistrationForm';
import { api } from '../lib/api';

export default function RegisterPage() {
  const [result, setResult] = useState<{ email: string; verifyUrl?: string } | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  if (result) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold">Confirm your email</h1>
        <p className="mt-3 text-stone-600">
          We prepared a verification link for <strong>{result.email}</strong>.
        </p>
        {result.verifyUrl ? (
          <p className="mt-4 text-sm text-stone-700">
            Mail delivery is not configured on this computer, so Gmail will not receive a message. Open this link to verify:
            <a href={result.verifyUrl} className="mt-2 block break-all font-semibold text-brand-700">
              {result.verifyUrl}
            </a>
          </p>
        ) : (
          <p className="mt-3 text-stone-600">Check your inbox (and spam) for a message from Sheettomate.</p>
        )}
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-brand-700"
          onClick={() => {
            void api<{ verifyUrl?: string }>('/auth/resend-verification', {
              method: 'POST',
              body: JSON.stringify({ email: result.email }),
            }).then((d) => {
              if (d.verifyUrl) setResult({ email: result.email, verifyUrl: d.verifyUrl });
              setResent('Link refreshed.');
            });
          }}
        >
          Resend link
        </button>
        {resent && <p className="mt-2 text-xs text-stone-500">{resent}</p>}
        <Link to="/login" className="mt-6 inline-block font-semibold text-brand-700">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold">Create your Sheettomate account</h1>
      <div className="mt-6">
        <RegistrationForm onSuccess={setResult} />
      </div>
    </div>
  );
}
