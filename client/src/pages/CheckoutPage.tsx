import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PaymentGateway } from '@sheetomate/shared';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import type { MarketplaceTemplate } from '@sheetomate/shared';

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

  const courseId = params.get('courseId');
  const templateId = params.get('templateId');
  const selected = templateId ? [templateId] : courseId ? [] : ids;

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
          idempotencyKey: `chk-${(courseId || selected.join('-'))}-${Date.now()}`,
        }),
      });
      if (data.checkout?.checkoutUrl) {
        window.location.href = data.checkout.checkoutUrl;
        return;
      }
      navigate(`/payments/${data.payment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
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
      </section>
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <PaymentMethodSelector value={gateway} onChange={setGateway} />
        {gateway !== 'BANFFPAY_VISA' && gateway !== 'WALLET' && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile money phone"
            className="w-full rounded-lg border px-3 py-2"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={pay} className="w-full rounded-lg bg-brand-600 py-2 text-white font-semibold">
          Pay now
        </button>
        <p className="text-xs text-stone-500">
          Card payments open BanffPay. Sheettomate never stores PAN/CVV (PCI DSS). Sandbox mode completes via Verify.
        </p>
      </section>
    </div>
  );
}
