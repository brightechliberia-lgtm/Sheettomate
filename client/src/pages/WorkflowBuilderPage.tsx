import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const STEP_TYPES = ['condition', 'email', 'sms', 'slack', 'whatsapp', 'webhook', 'drive', 'crm', 'quickbooks', 'sheets', 'export'] as const;

type StepType = (typeof STEP_TYPES)[number];
type Step = { id: string; type: StepType; config: Record<string, string> };

const STEP_META: Record<StepType, { label: string; hint: string }> = {
  condition: { label: 'If / then', hint: 'Continue only when a field matches' },
  email: { label: 'Send email', hint: 'SMTP / SendGrid when configured' },
  sms: { label: 'Send SMS', hint: 'Twilio or Africa’s Talking' },
  slack: { label: 'Post to Slack', hint: 'Incoming webhook' },
  whatsapp: { label: 'WhatsApp message', hint: 'Business API' },
  webhook: { label: 'Call webhook', hint: 'POST JSON to any URL' },
  drive: { label: 'Save to Drive', hint: 'Sandbox unless Google keys set' },
  crm: { label: 'Sync CRM', hint: 'HubSpot / Salesforce' },
  quickbooks: { label: 'QuickBooks export', hint: 'Journal / sandbox' },
  sheets: { label: 'Google Sheets sync', hint: 'Write rows / sandbox' },
  export: { label: 'Export file', hint: 'CSV or PDF snapshot' },
};

const DEFAULT_CONFIG: Record<StepType, Record<string, string>> = {
  condition: { field: 'sales', op: 'gt', value: '100' },
  email: { to: '{{user.email}}', subject: 'Sheettomate alert', body: 'Sales {{sales}} vs target {{target}}' },
  sms: { to: '{{user.phone}}', body: 'Alert: stock {{stock}} for {{item}}' },
  slack: { text: 'Sheettomate: {{item}} stock is {{stock}}' },
  whatsapp: { to: '{{user.phone}}', body: 'Update from Sheettomate' },
  webhook: { url: 'https://hooks.example.com/sheettomate' },
  drive: { filename: 'report-{{item}}.csv' },
  crm: { provider: 'hubspot' },
  quickbooks: { memo: 'Sheettomate sync' },
  sheets: { sheet: 'Dashboard' },
  export: { format: 'csv' },
};

function updateConfig(steps: Step[], id: string, patch: Record<string, string>): Step[] {
  return steps.map((s) => (s.id === id ? { ...s, config: { ...s.config, ...patch } } : s));
}

export default function WorkflowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const [name, setName] = useState('New workflow');
  const [enabled, setEnabled] = useState(true);
  const [triggerType, setTriggerType] = useState('MANUAL');
  const [cron, setCron] = useState('0 9 * * 1');
  const [event, setEvent] = useState('purchase');
  const [steps, setSteps] = useState<Step[]>([{ id: '1', type: 'email', config: { ...DEFAULT_CONFIG.email } }]);
  const [runs, setRuns] = useState<{ id: string; status: string; createdAt: string; error?: string | null }[]>([]);
  const [testPayload, setTestPayload] = useState('{"sales":150,"target":100,"stock":3,"item":"Rice"}');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    if (isNew) return;
    api<{
      item: {
        name: string;
        enabled: boolean;
        triggerType: string;
        triggerConfig: Record<string, string>;
        steps: Step[];
        runs: typeof runs;
      };
    }>(`/automations/workflows/${id}`)
      .then((d) => {
        setName(d.item.name);
        setEnabled(d.item.enabled);
        setTriggerType(d.item.triggerType);
        setCron(d.item.triggerConfig.cron ?? '0 9 * * 1');
        setEvent(d.item.triggerConfig.event ?? 'purchase');
        setSteps(d.item.steps?.length ? d.item.steps : steps);
        setRuns(d.item.runs ?? []);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const triggerConfig = triggerType === 'SCHEDULE' ? { cron } : triggerType === 'EVENT' ? { event } : {};
      const body = JSON.stringify({ name, triggerType, triggerConfig, steps, enabled });
      if (isNew) {
        const created = await api<{ item: { id: string } }>('/automations/workflows', { method: 'POST', body });
        setMessage('Workflow saved.');
        navigate(`/automations/${created.item.id}`);
      } else {
        await api(`/automations/workflows/${id}`, { method: 'PUT', body });
        setMessage('Workflow saved.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setPending(false);
    }
  }

  async function runNow() {
    if (isNew) {
      setMessage('Save the workflow before running it.');
      return;
    }
    setPending(true);
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(testPayload) as Record<string, unknown>;
      } catch {
        setMessage('Test payload must be valid JSON.');
        return;
      }
      await api(`/automations/workflows/${id}/run`, { method: 'POST', body: JSON.stringify({ payload }) });
      setMessage('Run started.');
      const d = await api<{ item: { runs: typeof runs } }>(`/automations/workflows/${id}`);
      setRuns(d.item.runs ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setPending(false);
    }
  }

  function drop(index: number) {
    if (dragging === null || dragging === index) return;
    const next = [...steps];
    const [moved] = next.splice(dragging, 1);
    next.splice(index, 0, moved);
    setDragging(null);
    setSteps(next);
  }

  function addStep(type: StepType = 'sms') {
    setSteps([...steps, { id: String(Date.now()), type, config: { ...DEFAULT_CONFIG[type] } }]);
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-6 pb-10">
      <header className="rounded-2xl border bg-gradient-to-r from-brand-800 to-brand-600 text-white p-6 shadow-lg flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Automation</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Workflow builder</h1>
          <p className="mt-1 text-white/80 text-sm">Triggers · conditions · email/SMS/Slack/WhatsApp · Drive · CRM · exports</p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Link to="/automations" className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold">
            Back
          </Link>
          <button type="button" disabled={pending} onClick={() => void runNow()} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            Run now
          </button>
          <button type="submit" disabled={pending} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-white">
            {pending ? 'Saving…' : 'Save workflow'}
          </button>
        </div>
      </header>

      {message && <p className="text-sm rounded-lg border bg-brand-50 border-brand-100 px-4 py-2 text-brand-800">{message}</p>}

      <section className="rounded-2xl border bg-white p-5 shadow-sm grid gap-4">
        <label className="block text-sm font-medium">
          Workflow name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-semibold" />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled (schedules and events will fire)
        </label>
        <div className="flex flex-wrap gap-3 text-sm items-end">
          <label className="font-medium">
            Trigger
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2">
              <option value="MANUAL">Manual</option>
              <option value="SCHEDULE">Schedule (cron UTC)</option>
              <option value="EVENT">App event</option>
              <option value="WEBHOOK">Inbound webhook</option>
            </select>
          </label>
          {triggerType === 'SCHEDULE' && (
            <label className="font-medium">
              Cron
              <input value={cron} onChange={(e) => setCron(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2 font-mono" />
            </label>
          )}
          {triggerType === 'EVENT' && (
            <label className="font-medium">
              Event
              <select value={event} onChange={(e) => setEvent(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2">
                <option value="purchase">On purchase</option>
                <option value="form">On form / Zapier hook</option>
                <option value="sheet.change">On spreadsheet change</option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <h2 className="font-bold text-lg text-brand-800">Steps</h2>
          <div className="flex flex-wrap gap-2">
            {(['email', 'sms', 'condition', 'slack', 'webhook'] as StepType[]).map((t) => (
              <button key={t} type="button" onClick={() => addStep(t)} className="rounded-full border px-3 py-1 text-xs font-semibold hover:border-brand-600">
                + {STEP_META[t].label}
              </button>
            ))}
            <button type="button" onClick={() => addStep('sheets')} className="rounded-full border px-3 py-1 text-xs font-semibold">
              + More…
            </button>
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li
              key={step.id}
              draggable
              onDragStart={() => setDragging(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(i)}
              className="rounded-2xl border bg-white p-4 shadow-sm cursor-move"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase text-stone-400">Step {i + 1}</p>
                  <p className="font-bold text-brand-800">{STEP_META[step.type].label}</p>
                  <p className="text-xs text-stone-500">{STEP_META[step.type].hint}</p>
                </div>
                <div className="flex gap-2 items-start">
                  <button
                    type="button"
                    className="text-xs"
                    disabled={i === 0}
                    onClick={() =>
                      setSteps((s) => {
                        if (i === 0) return s;
                        const next = [...s];
                        const [m] = next.splice(i, 1);
                        next.splice(i - 1, 0, m);
                        return next;
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs"
                    disabled={i === steps.length - 1}
                    onClick={() =>
                      setSteps((s) => {
                        if (i >= s.length - 1) return s;
                        const next = [...s];
                        const [m] = next.splice(i, 1);
                        next.splice(i + 1, 0, m);
                        return next;
                      })
                    }
                  >
                    ↓
                  </button>
                  <button type="button" className="text-xs text-red-600" onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}>
                    Remove
                  </button>
                </div>
              </div>

              <label className="mt-3 block text-sm font-medium">
                Action type
                <select
                  value={step.type}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  onChange={(e) => {
                    const type = e.target.value as StepType;
                    setSteps(steps.map((s) => (s.id === step.id ? { ...s, type, config: { ...DEFAULT_CONFIG[type] } } : s)));
                  }}
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {STEP_META[t].label}
                    </option>
                  ))}
                </select>
              </label>

              {step.type === 'condition' && (
                <div className="mt-3 grid sm:grid-cols-3 gap-2">
                  <input
                    placeholder="field (sales)"
                    value={step.config.field ?? ''}
                    onChange={(e) => setSteps(updateConfig(steps, step.id, { field: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <select
                    value={step.config.op ?? 'gt'}
                    onChange={(e) => setSteps(updateConfig(steps, step.id, { op: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="gt">greater than</option>
                    <option value="gte">≥</option>
                    <option value="lt">less than</option>
                    <option value="lte">≤</option>
                    <option value="eq">equals</option>
                    <option value="neq">not equals</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    placeholder="value"
                    value={step.config.value ?? ''}
                    onChange={(e) => setSteps(updateConfig(steps, step.id, { value: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              )}

              {step.type === 'email' && (
                <div className="mt-3 grid gap-2">
                  <input value={step.config.to ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { to: e.target.value }))} placeholder="To" className="rounded-lg border px-3 py-2 text-sm" />
                  <input value={step.config.subject ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { subject: e.target.value }))} placeholder="Subject" className="rounded-lg border px-3 py-2 text-sm" />
                  <textarea value={step.config.body ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { body: e.target.value }))} placeholder="Body" className="rounded-lg border px-3 py-2 text-sm min-h-20" />
                </div>
              )}

              {(step.type === 'sms' || step.type === 'whatsapp') && (
                <div className="mt-3 grid gap-2">
                  <input value={step.config.to ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { to: e.target.value }))} placeholder="Phone" className="rounded-lg border px-3 py-2 text-sm" />
                  <textarea value={step.config.body ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { body: e.target.value }))} placeholder="Message" className="rounded-lg border px-3 py-2 text-sm min-h-16" />
                </div>
              )}

              {step.type === 'slack' && (
                <textarea value={step.config.text ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { text: e.target.value }))} placeholder="Slack message" className="mt-3 w-full rounded-lg border px-3 py-2 text-sm min-h-16" />
              )}

              {step.type === 'webhook' && (
                <input value={step.config.url ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { url: e.target.value }))} placeholder="https://..." className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" />
              )}

              {step.type === 'drive' && (
                <input value={step.config.filename ?? ''} onChange={(e) => setSteps(updateConfig(steps, step.id, { filename: e.target.value }))} placeholder="filename.csv" className="mt-3 w-full rounded-lg border px-3 py-2 text-sm" />
              )}

              {step.type === 'crm' && (
                <select value={step.config.provider ?? 'hubspot'} onChange={(e) => setSteps(updateConfig(steps, step.id, { provider: e.target.value }))} className="mt-3 rounded-lg border px-3 py-2 text-sm">
                  <option value="hubspot">HubSpot</option>
                  <option value="salesforce">Salesforce</option>
                </select>
              )}

              {step.type === 'export' && (
                <select value={step.config.format ?? 'csv'} onChange={(e) => setSteps(updateConfig(steps, step.id, { format: e.target.value }))} className="mt-3 rounded-lg border px-3 py-2 text-sm">
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF snapshot</option>
                </select>
              )}

              {(step.type === 'sheets' || step.type === 'quickbooks') && (
                <textarea
                  className="mt-3 w-full rounded-lg border p-2 text-sm min-h-16 font-mono"
                  value={JSON.stringify(step.config, null, 2)}
                  onChange={(e) => {
                    try {
                      setSteps(steps.map((s) => (s.id === step.id ? { ...s, config: JSON.parse(e.target.value) as Record<string, string> } : s)));
                    } catch {
                      /* keep typing */
                    }
                  }}
                />
              )}

              <p className="mt-2 text-[11px] text-stone-400">Use {'{{user.email}}'}, {'{{sales}}'}, {'{{item}}'} etc. in fields.</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-brand-800">Test payload (JSON)</h2>
        <textarea value={testPayload} onChange={(e) => setTestPayload(e.target.value)} className="w-full rounded-lg border p-3 font-mono text-xs min-h-24" />
        <button type="button" onClick={() => void runNow()} className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white">
          Run with this payload
        </button>
      </section>

      {runs.length > 0 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-bold text-brand-800">Recent runs</h2>
          <ul className="text-sm mt-3 divide-y">
            {runs.map((r) => (
              <li key={r.id} className="py-2 flex justify-between gap-3">
                <span className={r.status === 'FAILED' ? 'text-red-600 font-semibold' : 'font-semibold text-brand-800'}>{r.status}</span>
                <span className="text-stone-500">{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
}
