import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Currency = 'USD' | 'LRD';
const RATE = 190;

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatUsd: (amountUsd: number) => string;
} | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => (localStorage.getItem('sheettomate_fx') as Currency) || 'USD');
  const value = useMemo(
    () => ({
      currency,
      setCurrency: (c: Currency) => {
        localStorage.setItem('sheettomate_fx', c);
        setCurrency(c);
      },
      formatUsd: (amountUsd: number) =>
        currency === 'LRD' ? `L$${(amountUsd * RATE).toFixed(2)}` : `$${amountUsd.toFixed(2)}`,
    }),
    [currency],
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency requires CurrencyProvider');
  return ctx;
}
