import { AI_SUGGESTIONS } from '@sheetomate/shared';
import { WORKBOOK_SPEC_INSTRUCTIONS } from './spec';

const BASE_SYSTEM = `You are Sheettomate, an Excel/Google Sheets template designer for Liberia and West Africa.
Prefer dual currency (USD + LRD), Orange Money, Lonestar MTN Mobile Money, informal trade, NGOs, schools, clinics, and small shops in Monrovia and counties.
Use realistic Liberian names, +231 phone numbers, LRD amounts where local, and USD for donor/import costs.
Label LRD headers clearly (e.g. "Amount (LRD)" or "L$") so currency formatting can apply.
Build practical workbooks: clear headers, 6–12 sample rows, formulas, and a Summary tab.
${WORKBOOK_SPEC_INSTRUCTIONS}`;

export const INDUSTRY_SYSTEM: Record<string, string> = {
  Finance:
    'Finance: cashbooks with USD+LRD, mobile-money fees, income vs expense, variance vs budget, school/clinic fee registers when relevant.',
  FMCG:
    'FMCG: sales by route/outlet/SKU across Liberian markets, route-to-market, weekly targets in LRD, and collection method (cash/Orange/MTN).',
  'E-commerce':
    'E-commerce: WhatsApp/social orders, +231 phones, delivery areas (Monrovia suburbs), inventory on hand vs committed stock.',
  SaaS: 'SaaS: MRR, churn, and a cohort grid (months as columns, acquisition month as rows); keep pricing simple in USD.',
  Agriculture: 'Agriculture: crop yield, input costs in LRD (seed, fertilizer, labour), and a seasonal calendar for Liberian crops.',
  NGO: 'NGO: donors, grant periods, reporting deadlines, restricted vs unrestricted spend, dual currency (USD awards, LRD local spend).',
  HR: 'HR: attendance by employee/day, leave, late marks, and a monthly summary with totals for Liberian SMEs.',
  Inventory: 'Inventory: SKU, supplier contacts (+231), reorder point, rice/palm-oil/soap style goods, alerts when qty < reorder.',
};

export function detectIndustry(prompt: string, explicit?: string): string {
  if (explicit) return explicit;
  const text = prompt.toLowerCase();
  const hits: Array<[string, string[]]> = [
    ['SaaS', ['saas', 'churn', 'mrr', 'subscription', 'cohort']],
    ['E-commerce', ['ecommerce', 'e-commerce', 'order tracking', 'shopify']],
    ['FMCG', ['fmcg', 'sku', 'route-to-market', 'outlet']],
    ['Agriculture', ['crop', 'farm', 'yield', 'fertilizer', 'seasonal']],
    ['NGO', ['grant', 'donor', 'ngo', 'nonprofit']],
    ['HR', ['attendance', 'payroll', 'employee', 'leave']],
    ['Inventory', ['inventory', 'reorder', 'stock', 'warehouse']],
    ['Finance', ['budget', 'dcf', 'income', 'expense', 'variance', 'cashbook']],
  ];
  for (const [industry, keys] of hits) {
    if (keys.some((key) => text.includes(key))) return industry;
  }
  return 'Finance';
}

export function detectCategory(prompt: string, explicit?: string): string {
  if (explicit) return explicit;
  const industry = detectIndustry(prompt);
  const map: Record<string, string> = {
    Finance: 'Finance',
    FMCG: 'FMCG',
    'E-commerce': 'E-commerce',
    SaaS: 'Finance',
    Agriculture: 'Agriculture',
    NGO: 'NGO',
    HR: 'HR',
    Inventory: 'Inventory',
  };
  return map[industry] ?? 'Finance';
}

export function buildSystemPrompt(industry: string, extra?: string): string {
  return `${BASE_SYSTEM}\n${INDUSTRY_SYSTEM[industry] ?? INDUSTRY_SYSTEM.Finance}${extra ? `\n${extra}` : ''}`;
}

export function buildUserPrompt(prompt: string, industry: string, previousSpec?: unknown): string {
  const related = AI_SUGGESTIONS.filter((item) => item.industry === industry)
    .map((item) => item.prompt)
    .slice(0, 2);
  return [
    `User request: ${prompt}`,
    related.length ? `Related patterns: ${related.join(' | ')}` : '',
    previousSpec ? `Refine this existing spec JSON:\n${JSON.stringify(previousSpec).slice(0, 8000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export const DEFAULT_PROMPT_TEMPLATES = [
  {
    slug: 'finance-cashbook',
    title: 'Monrovia shop cashbook',
    category: 'Finance',
    industry: 'Finance',
    examplePrompt: AI_SUGGESTIONS[0].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Finance,
    sortOrder: 1,
  },
  {
    slug: 'ngo-grants',
    title: 'Grant tracker',
    category: 'NGO',
    industry: 'NGO',
    examplePrompt: AI_SUGGESTIONS[1].prompt,
    systemPrompt: INDUSTRY_SYSTEM.NGO,
    sortOrder: 2,
  },
  {
    slug: 'inventory-market',
    title: 'Market stall inventory',
    category: 'Inventory',
    industry: 'Inventory',
    examplePrompt: AI_SUGGESTIONS[2].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Inventory,
    sortOrder: 3,
  },
  {
    slug: 'hr-attendance',
    title: 'Staff attendance',
    category: 'HR',
    industry: 'HR',
    examplePrompt: AI_SUGGESTIONS[3].prompt,
    systemPrompt: INDUSTRY_SYSTEM.HR,
    sortOrder: 4,
  },
  {
    slug: 'fmcg-rtm',
    title: 'FMCG route sales',
    category: 'FMCG',
    industry: 'FMCG',
    examplePrompt: AI_SUGGESTIONS[4].prompt,
    systemPrompt: INDUSTRY_SYSTEM.FMCG,
    sortOrder: 5,
  },
  {
    slug: 'finance-fees',
    title: 'School / clinic fees',
    category: 'Finance',
    industry: 'Finance',
    examplePrompt: AI_SUGGESTIONS[5].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Finance,
    sortOrder: 6,
  },
  {
    slug: 'agri-yield',
    title: 'Crop yield',
    category: 'Agriculture',
    industry: 'Agriculture',
    examplePrompt: AI_SUGGESTIONS[6].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Agriculture,
    sortOrder: 7,
  },
  {
    slug: 'ecom-orders',
    title: 'WhatsApp orders',
    category: 'E-commerce',
    industry: 'E-commerce',
    examplePrompt: AI_SUGGESTIONS[7].prompt,
    systemPrompt: INDUSTRY_SYSTEM['E-commerce'],
    sortOrder: 8,
  },
];
