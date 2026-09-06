import { AI_SUGGESTIONS } from '@sheetomate/shared';
import { WORKBOOK_SPEC_INSTRUCTIONS } from './spec';

const BASE_SYSTEM = `You are Sheettomate, an Excel/Google Sheets template designer for Liberia and West Africa.
Prefer dual currency (USD + LRD), mobile money, informal trade, NGOs, and small shops.
Build practical workbooks inspired by professional "Excel Skill" structures: clear headers, sample data, formulas, and a summary tab.
${WORKBOOK_SPEC_INSTRUCTIONS}`;

export const INDUSTRY_SYSTEM: Record<string, string> = {
  Finance:
    'Finance: include income statement or cashbook, variance vs budget, and a simple DCF or transaction categories when relevant.',
  FMCG:
    'FMCG: sales by route/outlet/SKU, route-to-market, and a demand forecast tab with weekly targets.',
  'E-commerce':
    'E-commerce: orders, customer analysis, and inventory on hand vs committed stock.',
  SaaS: 'SaaS: MRR, churn, and a cohort grid (months as columns, acquisition month as rows).',
  Agriculture: 'Agriculture: crop yield, input costs (seed, fertilizer, labour), and a seasonal calendar.',
  NGO: 'NGO: donors, grant periods, reporting deadlines, restricted vs unrestricted spend.',
  HR: 'HR: attendance by employee/day, leave, and a monthly summary with totals.',
  Inventory: 'Inventory: SKU, supplier contacts, reorder point, and alerts when qty < reorder.',
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
    slug: 'finance-budget',
    title: 'Small business budget',
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
    slug: 'inventory-reorder',
    title: 'Inventory reorder',
    category: 'Inventory',
    industry: 'Inventory',
    examplePrompt: AI_SUGGESTIONS[2].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Inventory,
    sortOrder: 3,
  },
  {
    slug: 'hr-attendance',
    title: 'Attendance',
    category: 'HR',
    industry: 'HR',
    examplePrompt: AI_SUGGESTIONS[3].prompt,
    systemPrompt: INDUSTRY_SYSTEM.HR,
    sortOrder: 4,
  },
  {
    slug: 'fmcg-rtm',
    title: 'FMCG sales',
    category: 'FMCG',
    industry: 'FMCG',
    examplePrompt: AI_SUGGESTIONS[5].prompt,
    systemPrompt: INDUSTRY_SYSTEM.FMCG,
    sortOrder: 5,
  },
  {
    slug: 'saas-cohort',
    title: 'SaaS cohorts',
    category: 'Finance',
    industry: 'SaaS',
    examplePrompt: AI_SUGGESTIONS[7].prompt,
    systemPrompt: INDUSTRY_SYSTEM.SaaS,
    sortOrder: 6,
  },
  {
    slug: 'agri-yield',
    title: 'Crop yield',
    category: 'Agriculture',
    industry: 'Agriculture',
    examplePrompt: AI_SUGGESTIONS[8].prompt,
    systemPrompt: INDUSTRY_SYSTEM.Agriculture,
    sortOrder: 7,
  },
];
