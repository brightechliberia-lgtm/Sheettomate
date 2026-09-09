import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { downloadTemplateFile } from '../lib/download';

interface PaymentItem {
  id: string;
  title: string;
  templateId?: string | null;
  courseId?: string | null;
}

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
  items?: PaymentItem[];
}

export default function PaymentStatusPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const [sandbox, setSandbox] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');

  useEffect(() => {
    api<{ payments: { sandbox: boolean } }>('/payments/config')
      .then((d) => setSandbox(Boolean(d.payments.sandbox)))
      .catch(() => setSandbox(false));
  }, []);

  useEffect(() => {
    if (!id) return;
    let delay = 1500;
    let timer: number;

    async function tick() {
      try {
        const data = await api<{ payment: Payment }>(`/payments/status/${id}`);
        setPayment(data.payment);
        if (data.payment.status === 'PENDING') {
          if (data.payment.reference) {
            void api(`/payments/verify/${data.payment.reference}`, { method: 'POST', body: JSON.stringify({}) }).catch(
              () => undefined,
            );
          }
          delay = Math.min(delay * 1.6, 12_000);
          timer = window.setTimeout(() => void tick(), delay);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status check failed');
      }
    }
    void tick();
    return () => {
      window.clearTimeout(timer);
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

  async function downloadItem(templateId: string) {
    setDownloadMsg('');
    try {
      await downloadTemplateFile(templateId);
      setDownloadMsg('Download started.');
    } catch (err) {
      setDownloadMsg(err instanceof Error ? err.message : 'Download failed');
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!payment) return <p>Checking payment…</p>;

  if (payment.status === 'COMPLETED') {
    const templates = (payment.items ?? []).filter((item) => item.templateId);
    return (
      <div className="rounded-2xl border bg-white p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-brand-700">Payment received</h1>
        <p className="mt-2">Reference {payment.reference}</p>
        {templates.length > 0 && (
          <div className="space-y-2">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void downloadItem(String(item.templateId))}
                className="block w-full rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold"
              >
                Download {item.title}
              </button>
            ))}
            {downloadMsg && <p className="text-sm text-stone-600">{downloadMsg}</p>}
          </div>
        )}
        <Link to="/dashboard" className="mt-2 inline-block font-semibold text-brand-700">
          Go to dashboard
        </Link>
        <Link to="/payments/history" className="block text-sm text-stone-600">
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
        {payment.amount} {payment.currency} via {payment.gateway.replace(/_/g, ' ')}
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
          Open secure checkout
        </a>
      )}
      {sandbox && (
        <button type="button" onClick={simulate} className="rounded border px-4 py-2 text-sm">
          Sandbox: mark paid
        </button>
      )}
    </div>
  );
}
