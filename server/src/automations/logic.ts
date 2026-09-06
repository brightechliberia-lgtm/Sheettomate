export type StepType =
  | 'condition'
  | 'email'
  | 'sms'
  | 'slack'
  | 'whatsapp'
  | 'webhook'
  | 'drive'
  | 'crm'
  | 'quickbooks'
  | 'sheets'
  | 'export';

export type WorkflowStep = {
  id: string;
  type: StepType;
  config: Record<string, string>;
};

export function getByPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, payload);
}

export function evaluateCondition(payload: Record<string, unknown>, field: string, op: string, value: string): boolean {
  const left = getByPath(payload, field);
  const nLeft = Number(left);
  const nRight = Number(value);
  const numeric = !Number.isNaN(nLeft) && !Number.isNaN(nRight);
  switch (op) {
    case 'gt':
      return numeric && nLeft > nRight;
    case 'gte':
      return numeric && nLeft >= nRight;
    case 'lt':
      return numeric && nLeft < nRight;
    case 'lte':
      return numeric && nLeft <= nRight;
    case 'eq':
      return String(left) === value;
    case 'neq':
      return String(left) !== value;
    case 'contains':
      return String(left ?? '').toLowerCase().includes(value.toLowerCase());
    default:
      return false;
  }
}

/** Supports star, numbers, lists, and step syntax in 5-field UTC cron. */
export function cronMatches(expr: string, date = new Date()): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const vals = [date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCDay()];
  return parts.every((part, i) => matchField(part, vals[i]));
}

function matchField(part: string, value: number): boolean {
  if (part === '*') return true;
  if (part.startsWith('*/')) {
    const n = Number(part.slice(2));
    return n > 0 && value % n === 0;
  }
  return part.split(',').some((bit) => Number(bit) === value);
}

export const AUTOMATION_TEMPLATES: {
  slug: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, string>;
  steps: WorkflowStep[];
}[] = [
  {
    slug: 'monthly-business-report',
    name: 'Automated Monthly Business Report',
    description: 'Gather spreadsheet metrics, attach a visual summary, and email the report.',
    triggerType: 'SCHEDULE',
    triggerConfig: { cron: '0 8 1 * *' },
    steps: [
      { id: '1', type: 'email', config: { to: '{{user.email}}', subject: 'Monthly business report', body: 'Sales {{sales}} vs target {{target}}' } },
      { id: '2', type: 'drive', config: { filename: 'monthly-report.csv' } },
      { id: '3', type: 'export', config: { format: 'pdf' } },
    ],
  },
  {
    slug: 'inventory-alert',
    name: 'Inventory Alert System',
    description: 'Send SMS when stock falls below the threshold.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'sheet.change' },
    steps: [
      { id: '1', type: 'condition', config: { field: 'stock', op: 'lt', value: '10' } },
      { id: '2', type: 'sms', config: { to: '{{user.phone}}', body: 'Low stock: {{item}} has {{stock}} units' } },
      { id: '3', type: 'slack', config: { text: 'Inventory alert for {{item}}' } },
    ],
  },
  {
    slug: 'customer-followup',
    name: 'Customer Follow-up Automation',
    description: 'WhatsApp a customer after purchase confirmation.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'purchase' },
    steps: [
      { id: '1', type: 'whatsapp', config: { to: '{{phone}}', body: 'Thanks for your Sheettomate purchase. Download is ready in your dashboard.' } },
      { id: '2', type: 'email', config: { to: '{{email}}', subject: 'Follow-up', body: 'Need help setting up the template?' } },
    ],
  },
];
