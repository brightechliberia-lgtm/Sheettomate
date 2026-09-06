import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

interface Pay {
  id: string;
  reference: string;
  status: string;
  amountUsd: string;
  gateway: string;
  user: { email: string };
}

export default function AdminPaymentsManagePage() {
  const [items, setItems] = useState<Pay[]>([]);
  async function load() {
    const d = await api<{ items: Pay[] }>('/admin/payments');
    setItems(d.items);
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <StaffGate scope="payments">
      <h1 className="text-2xl font-bold">Payments & disputes</h1>
      <table className="mt-4 w-full text-sm bg-white rounded-2xl border">
        <thead>
          <tr className="text-left bg-stone-50">
            <th className="p-2">Ref</th>
            <th>User</th>
            <th>Gateway</th>
            <th>Status</th>
            <th>USD</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2 font-mono text-xs">{p.reference}</td>
              <td>{p.user.email}</td>
              <td>{p.gateway}</td>
              <td>{p.status}</td>
              <td>{Number(p.amountUsd).toFixed(2)}</td>
              <td>
                {p.status === 'COMPLETED' && (
                  <button
                    type="button"
                    className="text-red-700 text-xs"
                    onClick={() =>
                      void api(`/admin/payments/${p.id}/refund`, {
                        method: 'POST',
                        body: JSON.stringify({ reason: 'Admin refund / dispute' }),
                      }).then(load)
                    }
                  >
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StaffGate>
  );
}
