import type { MarketplaceTemplate } from '@sheetomate/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface CartState {
  ids: string[];
  add: (templateId: string) => Promise<void>;
  remove: (templateId: string) => Promise<void>;
  has: (templateId: string) => boolean;
}

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sheettomate_cart') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const value = useMemo<CartState>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      async add(templateId) {
        setIds((current) => {
          const next = current.includes(templateId) ? current : [...current, templateId];
          localStorage.setItem('sheettomate_cart', JSON.stringify(next));
          return next;
        });
        await api('/cart', { method: 'POST', body: JSON.stringify({ templateId }) }).catch(() => undefined);
      },
      async remove(templateId) {
        setIds((current) => {
          const next = current.filter((id) => id !== templateId);
          localStorage.setItem('sheettomate_cart', JSON.stringify(next));
          return next;
        });
        await api(`/cart/${templateId}`, { method: 'DELETE' }).catch(() => undefined);
      },
    }),
    [ids],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export type { MarketplaceTemplate };
