export const AI_INDUSTRIES = ['Finance', 'FMCG', 'E-commerce', 'SaaS', 'Agriculture', 'NGO', 'HR', 'Inventory'] as const;
export type AIIndustry = (typeof AI_INDUSTRIES)[number];

export const AI_SUGGESTIONS = [
  {
    id: 'finance-cashbook',
    category: 'Finance',
    industry: 'Finance',
    title: 'Monrovia shop cashbook',
    prompt:
      'Create a daily cashbook for a small shop in Monrovia with USD and LRD columns, Orange Money and Lonestar MTN Mobile Money inflows, cash on hand, and a weekly variance summary',
  },
  {
    id: 'ngo-grants',
    category: 'NGO',
    industry: 'NGO',
    title: 'Grant tracker (LRD + USD)',
    prompt:
      'Build a Liberia NGO grant tracker with donor name, award currency (USD/LRD), reporting deadlines, restricted vs unrestricted spend, and remaining balance formulas',
  },
  {
    id: 'inventory-market',
    category: 'Inventory',
    industry: 'Inventory',
    title: 'Market stall inventory',
    prompt:
      'Generate an inventory sheet for a Red Light / Duala market stall selling rice, palm oil, and soap — SKU, unit cost in LRD, selling price, reorder point, and supplier phone (+231)',
  },
  {
    id: 'hr-attendance',
    category: 'HR',
    industry: 'HR',
    title: 'Staff attendance',
    prompt:
      'Create an employee attendance tracker for a Liberian SME with daily present/absent marks, late arrivals, and a monthly summary with totals per staff',
  },
  {
    id: 'fmcg-sales',
    category: 'FMCG',
    industry: 'FMCG',
    title: 'Route-to-market sales',
    prompt:
      'Create a FMCG route-to-market sales sheet for Liberia with routes, outlets in Montserrado, SKUs, weekly targets in LRD, and Orange Money collections',
  },
  {
    id: 'finance-fees',
    category: 'Finance',
    industry: 'Finance',
    title: 'School / clinic fees',
    prompt:
      'Build a school or clinic fee register with student/patient name, fee type, amount due in LRD, amount paid, balance, and payment method (cash, Orange Money, MTN MoMo)',
  },
  {
    id: 'agri-yield',
    category: 'Agriculture',
    industry: 'Agriculture',
    title: 'Crop & input costs',
    prompt:
      'Build a crop yield planner for Liberian farmers with plot size, seed/fertilizer/labour costs in LRD, expected yield, and seasonal calendar',
  },
  {
    id: 'ecom-orders',
    category: 'E-commerce',
    industry: 'E-commerce',
    title: 'WhatsApp order tracker',
    prompt:
      'Generate an order tracker for a Liberian WhatsApp/e-commerce seller with customer phone (+231), items, delivery area, USD/LRD amounts, and stock remaining',
  },
  {
    id: 'saas-cohort',
    category: 'Finance',
    industry: 'SaaS',
    title: 'SaaS cohort & churn',
    prompt:
      'Create a SaaS workbook for subscription revenue, churn analysis, and cohort tracking with USD pricing suitable for West African startups',
  },
] as const;
