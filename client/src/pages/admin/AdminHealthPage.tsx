import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StaffGate from '../../admin/StaffGate';

type HealthData = {
  uptimeSec?: number;
  memoryMb?: number;
  load?: number[];
  paymentsMode?: string;
  banffpayConfigured?: boolean;
  orangeConfigured?: boolean;
  paymentsLiveReady?: boolean;
  webhookUrl?: string;
  redis?: boolean;
  failedPayments24h?: number;
  errors?: { id?: string; message?: string; createdAt?: string; source?: string }[];
  sentryHint?: string;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-600' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  useEffect(() => {
    api<HealthData>('/admin/health')
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const uptime =
    data?.uptimeSec != null
      ? `${Math.floor(data.uptimeSec / 3600)}h ${Math.floor((data.uptimeSec % 3600) / 60)}m`
      : '—';

  return (
    <StaffGate scope="health">
      <h1 className="text-2xl font-bold">System health</h1>
      <p className="text-sm text-stone-600 mt-2">
        API process metrics, payment gateway config, and recent errors.
      </p>
      {!data && <p className="mt-4 text-sm text-stone-500">Loading…</p>}
      {data && (
        <>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Uptime</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{uptime}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Memory</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{data.memoryMb ?? '—'} MB</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Failed payments (24h)</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{data.failedPayments24h ?? 0}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">Payments mode</p>
              <p className="mt-1 text-lg font-bold text-brand-900">{data.paymentsMode ?? '—'}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill ok={Boolean(data.banffpayConfigured)} label={data.banffpayConfigured ? 'BanffPay configured' : 'BanffPay missing'} />
            <StatusPill ok={Boolean(data.orangeConfigured)} label={data.orangeConfigured ? 'Orange Money configured' : 'Orange Money missing'} />
            <StatusPill
              ok={Boolean(data.paymentsLiveReady) || data.paymentsMode === 'sandbox'}
              label={
                data.paymentsMode === 'sandbox'
                  ? 'Sandbox payments OK'
                  : data.paymentsLiveReady
                    ? 'Live payments ready'
                    : 'Live mode needs API keys'
              }
            />
            <StatusPill ok={Boolean(data.redis)} label={data.redis ? 'Redis connected' : 'Redis optional / off'} />
          </div>
          {data.webhookUrl && (
            <p className="mt-3 text-xs text-stone-500 break-all">Webhook URL for providers: {data.webhookUrl}</p>
          )}

          {data.load && (
            <p className="mt-3 text-sm text-stone-600">
              Load average: {data.load.map((n) => n.toFixed(2)).join(' · ')}
            </p>
          )}

          <div className="mt-6 rounded-2xl border bg-white overflow-hidden">
            <h2 className="font-semibold px-4 py-3 border-b bg-stone-50">Recent errors</h2>
            {(data.errors?.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-stone-500">No recent error events.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="px-4 py-2">When</th>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errors!.map((e, i) => (
                    <tr key={e.id ?? i} className="border-t">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{e.source ?? '—'}</td>
                      <td className="px-4 py-2">{e.message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.sentryHint && <p className="mt-3 text-xs text-stone-500">{data.sentryHint}</p>}
        </>
      )}
    </StaffGate>
  );
}
