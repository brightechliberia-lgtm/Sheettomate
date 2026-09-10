import { TEMPLATE_CATEGORIES } from '@sheetomate/shared';
import { prisma } from '../config/prisma';

export const TEMPLATE_LEVELS = ['FREE', 'BASIC', 'ADVANCED', 'EXPERT'] as const;
export type TemplateLevel = (typeof TEMPLATE_LEVELS)[number];

export type SubscriptionPackage = {
  id: string;
  name: string;
  audience: 'CREATOR' | 'LEARNER' | 'ALL';
  interval: 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
  priceUsd: number;
  features: string[];
  active: boolean;
};

export type LevelPrices = { FREE: number; BASIC: number; ADVANCED: number; EXPERT: number };

const DEFAULT_LEVEL_PRICES: LevelPrices = { FREE: 0, BASIC: 4.99, ADVANCED: 9.99, EXPERT: 19.99 };

function normalizeLevelPrices(row?: Partial<LevelPrices> | null): LevelPrices {
  return {
    FREE: Number(row?.FREE) || 0,
    BASIC: Number(row?.BASIC) || 0,
    ADVANCED: Number(row?.ADVANCED) || 0,
    EXPERT: Number(row?.EXPERT) || 0,
  };
}

export type CatalogConfig = {
  templateCategories: string[];
  courseCategories: string[];
  subscriptionPackages: SubscriptionPackage[];
  templateLevelPrices: Record<string, LevelPrices>;
};

export const CATALOG_SETTING_KEY = 'catalog.v1';

const DEFAULT_COURSE_CATEGORIES = [
  'Excel basics',
  'Finance & cashbooks',
  'NGO & grants',
  'Shop & inventory',
  'Automation',
  'Data analysis',
];

function defaultLevelPrices(categories: string[]): Record<string, LevelPrices> {
  const prices: Record<string, LevelPrices> = {};
  for (const c of categories) {
    prices[c] = { ...DEFAULT_LEVEL_PRICES };
  }
  return prices;
}

export function defaultCatalog(): CatalogConfig {
  const templateCategories = [...TEMPLATE_CATEGORIES];
  return {
    templateCategories,
    courseCategories: [...DEFAULT_COURSE_CATEGORIES],
    subscriptionPackages: [
      {
        id: 'creator-starter',
        name: 'Creator Starter',
        audience: 'CREATOR',
        interval: 'MONTHLY',
        priceUsd: 9.99,
        features: ['Upload templates', 'Basic analytics', 'Community badge'],
        active: true,
      },
      {
        id: 'creator-pro',
        name: 'Creator Pro',
        audience: 'CREATOR',
        interval: 'MONTHLY',
        priceUsd: 24.99,
        features: ['Unlimited uploads', 'Featured placement', 'Priority support'],
        active: true,
      },
      {
        id: 'learner-plus',
        name: 'Learner Plus',
        audience: 'LEARNER',
        interval: 'MONTHLY',
        priceUsd: 7.99,
        features: ['Course library access', 'Certificates', 'Practice files'],
        active: true,
      },
    ],
    templateLevelPrices: defaultLevelPrices(templateCategories),
  };
}

export async function getCatalogConfig(): Promise<CatalogConfig> {
  const row = await prisma.platformSetting.findUnique({ where: { key: CATALOG_SETTING_KEY } });
  if (!row?.value) return defaultCatalog();
  try {
    const parsed = JSON.parse(row.value) as Partial<CatalogConfig>;
    const base = defaultCatalog();
    const templateCategories =
      parsed.templateCategories?.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()) ??
      base.templateCategories;
    const courseCategories =
      parsed.courseCategories?.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()) ??
      base.courseCategories;
    const templateLevelPrices: Record<string, LevelPrices> = {};
    for (const cat of templateCategories) {
      templateLevelPrices[cat] = normalizeLevelPrices({
        ...DEFAULT_LEVEL_PRICES,
        ...(parsed.templateLevelPrices?.[cat] ?? {}),
      });
    }
    return {
      templateCategories,
      courseCategories,
      subscriptionPackages: Array.isArray(parsed.subscriptionPackages) && parsed.subscriptionPackages.length
        ? parsed.subscriptionPackages
        : base.subscriptionPackages,
      templateLevelPrices,
    };
  } catch {
    return defaultCatalog();
  }
}

export async function saveCatalogConfig(config: CatalogConfig): Promise<CatalogConfig> {
  const cleaned: CatalogConfig = {
    templateCategories: config.templateCategories.map((c) => c.trim()).filter(Boolean),
    courseCategories: config.courseCategories.map((c) => c.trim()).filter(Boolean),
    subscriptionPackages: config.subscriptionPackages.map((p) => ({
      ...p,
      id: p.id.trim() || p.name.toLowerCase().replace(/\s+/g, '-').slice(0, 40),
      name: p.name.trim(),
      priceUsd: Number(p.priceUsd) || 0,
      features: (p.features ?? []).map((f) => f.trim()).filter(Boolean),
      active: Boolean(p.active),
    })),
    templateLevelPrices: {},
  };
  for (const cat of cleaned.templateCategories) {
    cleaned.templateLevelPrices[cat] = normalizeLevelPrices({
      ...DEFAULT_LEVEL_PRICES,
      ...(config.templateLevelPrices[cat] ?? {}),
    });
  }
  const value = JSON.stringify(cleaned);
  await prisma.platformSetting.upsert({
    where: { key: CATALOG_SETTING_KEY },
    create: { key: CATALOG_SETTING_KEY, value },
    update: { value },
  });
  return cleaned;
}
