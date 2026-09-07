import { useState } from 'react';
import { Link } from 'react-router-dom';
import RegistrationForm from '../components/RegistrationForm';
import { api } from '../lib/api';

export default function RegisterPage() {
  const [result, setResult] = useState<{
    email: string;
    verifyUrl?: string;
    emailDelivery?: string;
  } | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  if (result) {
    const showLink = Boolean(result.verifyUrl);
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold">Confirm your email</h1>
        <p className="mt-3 text-stone-600">
          We prepared a verification link for <strong>{result.email}</strong>.
        </p>
        {showLink ? (
          <p className="mt-4 text-sm text-stone-700">
            {result.emailDelivery === 'smtp_failed'
              ? 'We could not send email from the server right now (SMTP error). Open this link to verify:'
              : 'Email could not be delivered automatically. Open this link to verify:'}
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
            void api<{ verifyUrl?: string; emailDelivery?: string }>('/auth/resend-verification', {
              method: 'POST',
              body: JSON.stringify({ email: result.email }),
            }).then((d) => {
              setResult({
                email: result.email,
                verifyUrl: d.verifyUrl,
                emailDelivery: d.emailDelivery ?? (d.verifyUrl ? 'smtp_failed' : 'smtp'),
              });
              setResent(d.verifyUrl ? 'Link refreshed (email still not sent).' : 'If SMTP works, check your inbox.');
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
