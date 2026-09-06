import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';

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
  const [items, setItems] = useState<Row[]>([]);
  const { formatUsd } = useCurrency();

  useEffect(() => {
    api<{ items: Row[] }>('/payments/history')
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Payment history</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
