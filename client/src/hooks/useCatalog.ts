import { useEffect, useState } from 'react';
import { TEMPLATE_CATEGORIES } from '@sheetomate/shared';
import { api } from '../lib/api';

export type LevelPrices = { BASIC: number; ADVANCED: number; EXPERT: number };

export type CatalogConfig = {
  templateCategories: string[];
  courseCategories: string[];
  subscriptionPackages: {
    id: string;
    name: string;
    audience: string;
    interval: string;
    priceUsd: number;
    features: string[];
    active: boolean;
  }[];
  templateLevelPrices: Record<string, LevelPrices>;
};

const fallback: CatalogConfig = {
  templateCategories: [...TEMPLATE_CATEGORIES],
  courseCategories: ['Excel basics', 'Finance & cashbooks', 'NGO & grants', 'Shop & inventory', 'Automation'],
  subscriptionPackages: [],
  templateLevelPrices: Object.fromEntries(
    TEMPLATE_CATEGORIES.map((c) => [c, { BASIC: 4.99, ADVANCED: 9.99, EXPERT: 19.99 }]),
  ),
};

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogConfig>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ catalog: CatalogConfig }>('/marketing/catalog')
      .then((d) => {
        if (d.catalog) setCatalog(d.catalog);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  return { catalog, loaded };
}
