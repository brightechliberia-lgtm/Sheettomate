import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MarketplaceTemplate } from '@sheetomate/shared';

interface CartRow {
  id: string;
  templateId: string;
  template: MarketplaceTemplate;
}

export default function CartPage() {
  const { user } = useAuth();
  const { ids, remove } = useCart();
  const { formatUsd } = useCurrency();
  const [items, setItems] = useState<CartRow[]>([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    api<{ items: CartRow[] }>('/cart')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [ids, user]);

  const total = items.reduce((sum, row) => sum + Number(row.template.price), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold">Cart</h1>
      {!user && <p className="mt-4 text-stone-600">Log in to check out {ids.length} saved item(s).</p>}
      <ul className="mt-6 space-y-3">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border bg-white p-4 flex justify-between">
            <Link to={`/templates/${row.templateId}`} className="font-medium">
              {row.template.title}
            </Link>
            <div className="flex gap-4">
              <span>{formatUsd(Number(row.template.price))}</span>
              <button type="button" onClick={() => remove(row.templateId)} className="text-red-600 text-sm">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-bold">Total {formatUsd(total)}</p>
      {user && items.length > 0 && (
        <Link to="/checkout" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold">
          Checkout
        </Link>
      )}
    </div>
  );
}
