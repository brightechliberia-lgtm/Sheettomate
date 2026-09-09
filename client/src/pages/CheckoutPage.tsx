import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PaymentGateway } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import type { MarketplaceTemplate } from '@sheetomate/shared';

interface PaymentsConfig {
  mode: 'sandbox' | 'live';
  sandbox: boolean;
  note: string;
  methods: Partial<Record<PaymentGateway, boolean>>;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { ids } = useCart();
  const { currency, setCurrency, formatUsd } = useCurrency();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [gateway, setGateway] = useState<PaymentGateway>('ORANGE_MONEY');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [items, setItems] = useState<{ id: string; title: string; price: number }[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [payments, setPayments] = useState<PaymentsConfig | null>(null);
  const [wallet, setWallet] = useState<{ walletUsd: number; walletLrd: number } | null>(null);

  const courseId = params.get('courseId');
  const templateId = params.get('templateId');
  const selected = templateId ? [templateId] : courseId ? [] : ids;
  const idempotencyKey = useMemo(() => {
    const scope = courseId || selected.slice().sort().join('-') || 'empty';
    return `chk-${scope}-${currency}`;
  }, [courseId, selected.join(','), currency]);

  useEffect(() => {
    api<{ payments: PaymentsConfig }>('/payments/config')
      .then((d) => {
        setPayments(d.payments);
        const methods = d.payments.methods;
        const first = (['ORANGE_MONEY', 'MTN_MOMO', 'BANFFPAY_VISA', 'WALLET'] as PaymentGateway[]).find(
          (m) => methods[m] !== false,
        );
        if (first) setGateway(first);
      })
      .catch(() => undefined);
    api<{ wallet: { walletUsd: string | number; walletLrd: string | number } }>('/payments/wallet')
      .then((d) =>
        setWallet({
          walletUsd: Number(d.wallet.walletUsd),
          walletLrd: Number(d.wallet.walletLrd),
        }),
      )
      .catch(() => setWallet(null));
  }, []);

  useEffect(() => {
    if (courseId) {
      api<{ course: { id: string; title: string; price: string | number; promoPercent?: number } }>(`/courses/${courseId}`)
        .then((d) => {
          const price = Number(d.course.price) * (1 - (d.course.promoPercent ?? 0) / 100);
          setItems([{ id: d.course.id, title: d.course.title, price }]);
        })
        .catch(() => setItems([]));
      return;
    }
    Promise.all(
      selected.map((id) =>
        api<{ template: MarketplaceTemplate }>(`/templates/${id}`).then((d) => ({
          id,
          title: d.template.title,
          price: Number(d.template.price),
        })),
      ),
    )
      .then(setItems)
      .catch(() => setItems([]));
  }, [courseId, selected.join(',')]);

  const total = items.reduce((sum, row) => sum + row.price, 0);

  async function pay() {
    setError('');
    setPending(true);
    try {
      const data = await api<{ payment: { id: string }; checkout: { checkoutUrl?: string } }>('/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({
          gateway,
          currency,
          phone: phone || undefined,
          purpose: courseId ? 'COURSE' : 'TEMPLATE',
          courseId: courseId || undefined,
          templateIds: courseId ? undefined : selected,
          idempotencyKey,
        }),
      });
      if (data.checkout?.checkoutUrl) {
        window.location.href = data.checkout.checkoutUrl;
        return;
      }
      navigate(`/payments/${data.payment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setPending(false);
    }
  }

  if (!user) return <p>Log in to check out.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span>{formatUsd(item.price)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-bold">Total {formatUsd(total)}</p>
        <div className="mt-4 flex gap-2 text-sm">
          <button type="button" onClick={() => setCurrency('USD')} className={currency === 'USD' ? 'font-bold' : ''}>
            USD
          </button>
          <button type="button" onClick={() => setCurrency('LRD')} className={currency === 'LRD' ? 'font-bold' : ''}>
            LRD
          </button>
        </div>
        {wallet && (
          <p className="mt-4 text-sm text-stone-600">
            Wallet: ${wallet.walletUsd.toFixed(2)} · L${wallet.walletLrd.toFixed(2)}
          </p>
        )}
        {payments?.sandbox && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            {payments.note}
          </p>
        )}
      </section>
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <PaymentMethodSelector value={gateway} onChange={setGateway} enabled={payments?.methods} />
        {gateway !== 'BANFFPAY_VISA' && gateway !== 'WALLET' && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile money phone (+231…)"
            className="w-full rounded-lg border px-3 py-2"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={pending || !items.length}
          onClick={pay}
          className="w-full rounded-lg bg-brand-600 py-2 text-white font-semibold disabled:opacity-60"
        >
          {pending ? 'Starting payment…' : 'Pay now'}
        </button>
        <p className="text-xs text-stone-500">
          Cards open a hosted BanffPay page. Sheettomate never stores PAN/CVV. Mobile money settles via Orange or BanffPay
          rails.
        </p>
      </section>
    </div>
  );
}
