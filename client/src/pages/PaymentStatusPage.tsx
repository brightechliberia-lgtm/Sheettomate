import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface Payment {
  id: string;
  status: string;
  reference: string;
  amount: string;
  currency: string;
  gateway: string;
  ussdCode?: string | null;
  qrPayload?: string | null;
  checkoutUrl?: string | null;
  failureReason?: string | null;
}

export default function PaymentStatusPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let delay = 1500;
    let timer: number;
    let stopped = false;

    async function tick() {
      try {
        const data = await api<{ payment: Payment }>(`/payments/status/${id}`);
        setPayment(data.payment);
        if (data.payment.status === 'PENDING') {
          delay = Math.min(delay * 1.6, 12_000);
          timer = window.setTimeout(() => void tick(), delay);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status check failed');
      }
    }
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      void stopped;
    };
  }, [id]);

  async function simulate() {
    if (!payment) return;
    await api(`/payments/verify/${payment.reference}`, {
      method: 'POST',
      body: JSON.stringify({ simulate: 'success' }),
    });
    const data = await api<{ payment: Payment }>(`/payments/status/${payment.id}`);
    setPayment(data.payment);
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!payment) return <p>Checking payment…</p>;

  if (payment.status === 'COMPLETED') {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-700">Payment received</h1>
        <p className="mt-2">Reference {payment.reference}</p>
        <Link to="/payments/history" className="mt-4 inline-block font-semibold text-brand-700">
          View history
        </Link>
      </div>
    );
  }

  if (payment.status === 'FAILED') {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-red-700">Payment failed</h1>
        <p className="mt-2 text-sm">{payment.failureReason || 'The provider declined this charge.'}</p>
        <Link to="/checkout" className="mt-4 inline-block font-semibold">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-8 space-y-4">
      <h1 className="text-2xl font-bold">Waiting for payment</h1>
      <p className="text-sm text-stone-600">
        {payment.amount} {payment.currency} via {payment.gateway.replace('_', ' ')}
      </p>
      <div className="h-2 rounded bg-stone-100 overflow-hidden">
        <div className="h-2 w-1/2 bg-brand-600 animate-pulse" />
      </div>
      {payment.ussdCode && (
        <a
          href={`tel:${payment.ussdCode.replace(/#/g, '%23')}`}
          className="block rounded-lg bg-brand-600 text-white text-center font-semibold py-3 min-h-11"
        >
          Dial USSD {payment.ussdCode}
        </a>
      )}
      {payment.qrPayload && (
        <div className="grid place-items-center gap-2">
          <img
            alt="Payment QR"
            width={180}
            height={180}
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payment.qrPayload)}`}
          />
          <p className="text-xs break-all text-stone-500">{payment.qrPayload}</p>
        </div>
      )}
      {payment.checkoutUrl && (
        <a href={payment.checkoutUrl} className="text-brand-700 font-semibold">
          Open secure card page
        </a>
      )}
      <button type="button" onClick={simulate} className="rounded border px-4 py-2 text-sm">
        Sandbox: mark paid
      </button>
    </div>
  );
}
