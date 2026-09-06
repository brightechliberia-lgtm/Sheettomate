export const AI_INDUSTRIES = ['Finance', 'FMCG', 'E-commerce', 'SaaS', 'Agriculture', 'NGO', 'HR', 'Inventory'] as const;
export type AIIndustry = (typeof AI_INDUSTRIES)[number];

export const AI_SUGGESTIONS = [
  {
    id: 'finance-budget',
    category: 'Finance',
    industry: 'Finance',
    title: 'Small business budget',
    prompt:
      'Create an Excel budget template for a small business with monthly income, expenses, and variance analysis',
  },
  {
    id: 'ngo-grants',
    category: 'NGO',
    industry: 'NGO',
    title: 'Grant tracker',
    prompt:
      'Build a grant tracking spreadsheet with donor info, reporting deadlines, and expense categories',
  },
  {
    id: 'inventory-reorder',
    category: 'Inventory',
    industry: 'FMCG',
    title: 'Inventory + reorder alerts',
    prompt: 'Generate an inventory management sheet with reorder alerts and supplier contact details',
  },
  {
    id: 'hr-attendance',
    category: 'HR',
    industry: 'HR',
    title: 'Attendance tracker',
    prompt: 'Create an employee attendance tracker with monthly summary',
  },
  {
    id: 'finance-dcf',
    category: 'Finance',
    industry: 'Finance',
    title: 'DCF model',
    prompt: 'Build a simple DCF model with revenue forecast, WACC, and enterprise value',
  },
  {
    id: 'fmcg-sales',
    category: 'FMCG',
    industry: 'FMCG',
    title: 'Route-to-market sales',
    prompt: 'Create a sales tracking sheet with routes, outlets, SKUs, and weekly targets for FMCG',
  },
  {
    id: 'ecom-orders',
    category: 'E-commerce',
    industry: 'E-commerce',
    title: 'Order tracker',
    prompt: 'Generate an e-commerce order tracking workbook with customer analysis and inventory',
  },
  {
    id: 'saas-cohort',
    category: 'Finance',
    industry: 'SaaS',
    title: 'SaaS cohort & churn',
    prompt: 'Create a SaaS workbook for subscription revenue, churn analysis, and cohort tracking',
  },
  {
    id: 'agri-yield',
    category: 'Agriculture',
    industry: 'Agriculture',
    title: 'Crop yield planner',
    prompt: 'Build a crop yield tracking sheet with input costs and seasonal planning',
  },
] as const;
