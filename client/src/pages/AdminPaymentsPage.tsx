import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminPaymentsPage() {
  const [data, setData] = useState<{
    totals: { _count: number; _sum: { amountUsd: string | null } };
    failedLast24h: number;
    byStatus: { status: string; _count: number }[];
    recent: { id: string; reference: string; status: string; amountUsd: string; user: { email: string } }[];
  } | null>(null);

  useEffect(() => {
    api<NonNullable<typeof data>>('/payments/analytics')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <p>Loading analytics…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Completed volume (USD)" value={`$${Number(data.totals._sum.amountUsd ?? 0).toFixed(2)}`} />
        <Stat label="Completed count" value={String(data.totals._count)} />
        <Stat label="Failures (24h)" value={String(data.failedLast24h)} />
      </div>
      <ul className="text-sm">
        {data.byStatus.map((row) => (
          <li key={row.status}>
            {row.status}: {row._count}
          </li>
        ))}
      </ul>
      <table className="w-full text-sm rounded-2xl border bg-white">
        <thead>
          <tr className="text-left bg-stone-50">
            <th className="px-3 py-2">Ref</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">USD</th>
          </tr>
        </thead>
        <tbody>
          {data.recent.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{row.reference}</td>
              <td className="px-3 py-2">{row.user.email}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2">{Number(row.amountUsd).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
