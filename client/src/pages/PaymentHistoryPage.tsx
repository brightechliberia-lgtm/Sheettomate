import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PaymentGateway } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import PaymentMethodSelector from '../components/PaymentMethodSelector';

interface Row {
  id: string;
  reference: string;
  status: string;
  gateway: string;
  amountUsd: string;
  currency: string;
  createdAt: string;
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const { currency, formatUsd } = useCurrency();
  const [wallet, setWallet] = useState<{ walletUsd: number; walletLrd: number } | null>(null);
  const [topupAmount, setTopupAmount] = useState('10');
  const [gateway, setGateway] = useState<PaymentGateway>('ORANGE_MONEY');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [methods, setMethods] = useState<Partial<Record<PaymentGateway, boolean>>>({});

  async function load() {
    const [history, walletData, config] = await Promise.all([
      api<{ items: Row[] }>('/payments/history'),
      api<{ wallet: { walletUsd: string | number; walletLrd: string | number } }>('/payments/wallet'),
      api<{ payments: { methods: Partial<Record<PaymentGateway, boolean>>; sandbox: boolean } }>('/payments/config'),
    ]);
    setItems(history.items);
    setWallet({
      walletUsd: Number(walletData.wallet.walletUsd),
      walletLrd: Number(walletData.wallet.walletLrd),
    });
    const nextMethods = { ...config.payments.methods, WALLET: false };
    setMethods(nextMethods);
    const first = (['ORANGE_MONEY', 'MTN_MOMO', 'BANFFPAY_VISA'] as PaymentGateway[]).find((m) => nextMethods[m] !== false);
    if (first) setGateway(first);
  }

  useEffect(() => {
    load().catch(() => {
      setItems([]);
      setWallet(null);
    });
  }, []);

  async function topUp(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await api<{ payment: { id: string }; checkout: { checkoutUrl?: string } }>('/payments/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({
          gateway,
          currency,
          amountUsd: Number(topupAmount),
          phone: phone || undefined,
        }),
      });
      if (data.checkout?.checkoutUrl) {
        window.location.href = data.checkout.checkoutUrl;
        return;
      }
      navigate(`/payments/${data.payment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed');
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Payment history</h1>

      <section className="rounded-2xl border bg-white p-6 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-lg">Wallet</h2>
          <p className="mt-2 text-sm text-stone-600">
            Balance: ${wallet?.walletUsd.toFixed(2) ?? '0.00'} · L${wallet?.walletLrd.toFixed(2) ?? '0.00'}
          </p>
          <p className="mt-1 text-xs text-stone-500">Top up in the currency selected in the nav (currently {currency}).</p>
        </div>
        <form onSubmit={topUp} className="space-y-3">
          <h3 className="font-semibold text-sm">Top up wallet</h3>
          <input
            type="number"
            min="1"
            step="0.01"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Amount in USD"
          />
          <PaymentMethodSelector value={gateway} onChange={setGateway} enabled={methods} />
          {gateway !== 'BANFFPAY_VISA' && (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile money phone"
              className="w-full rounded-lg border px-3 py-2"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-semibold">
            Top up
          </button>
        </form>
      </section>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                <td className="px-4 py-3">{row.gateway}</td>
                <td className="px-4 py-3">{formatUsd(Number(row.amountUsd))}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-stone-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
