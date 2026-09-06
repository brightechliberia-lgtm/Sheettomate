import type { TemplateCategory } from '@sheetomate/shared';

export interface CategoryMeta {
  name: TemplateCategory;
  blurb: string;
  /** Relatable stock photo — shops, NGOs, clinics, etc. */
  image: string;
  tint: string;
}

export const CATEGORY_CATALOG: CategoryMeta[] = [
  {
    name: 'Finance',
    blurb: 'Cashbooks, budgets, FX',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'FMCG',
    blurb: 'Sales and stock for shops',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'Inventory',
    blurb: 'Counts and reorder points',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'HR',
    blurb: 'Payroll and attendance',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'NGO',
    blurb: 'Grants and field reports',
    image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'Education',
    blurb: 'School records and fees',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'Real Estate',
    blurb: 'Rent rolls and listings',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'Agriculture',
    blurb: 'Farms, harvest, costs',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'Health',
    blurb: 'Clinics and pharmacy stock',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
  {
    name: 'E-commerce',
    blurb: 'Orders and delivery logs',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=480&h=320&fit=crop&q=80',
    tint: 'from-brand-900/95',
  },
];

const byName = new Map(CATEGORY_CATALOG.map((c) => [c.name, c]));

export function getCategoryMeta(name: string): CategoryMeta {
  return byName.get(name as TemplateCategory) ?? CATEGORY_CATALOG[0];
}

/** Institute topic areas for course browse */
export const INSTITUTE_TOPICS = [
  { label: 'Excel basics', q: 'excel', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=260&fit=crop&q=80' },
  { label: 'Finance & cashbooks', q: 'finance', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=260&fit=crop&q=80' },
  { label: 'NGO & grants', q: 'ngo', image: 'https://images.unsplash.com/photo-1488524719130-59e028a8cfe4?w=400&h=260&fit=crop&q=80' },
  { label: 'Shop & inventory', q: 'inventory', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=260&fit=crop&q=80' },
  { label: 'Automation', q: 'automation', image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=260&fit=crop&q=80' },
] as const;
