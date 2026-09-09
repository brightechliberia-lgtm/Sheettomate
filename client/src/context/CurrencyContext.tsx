import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Currency = 'USD' | 'LRD';
const FX_KEY = 'sheettomate_fx';
const FX_RATE_KEY = 'sheettomate_fx_rate';
const DEFAULT_RATE = 190;

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number;
  formatUsd: (amountUsd: number) => string;
  googleSheetsUpload: boolean;
} | null>(null);

function detectCurrency(): Currency {
  const saved = localStorage.getItem(FX_KEY);
  if (saved === 'USD' || saved === 'LRD') return saved;

  const lang = (navigator.language || '').toLowerCase();
  const languages = (navigator.languages ?? []).map((l) => l.toLowerCase());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const liberian =
    lang.includes('-lr') ||
    lang === 'lr' ||
    languages.some((l) => l.includes('-lr') || l === 'lr') ||
    tz === 'Africa/Monrovia';
  return liberian ? 'LRD' : 'USD';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => detectCurrency());
  const [rate, setRate] = useState(() => {
    const stored = Number(localStorage.getItem(FX_RATE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_RATE;
  });
  const [googleSheetsUpload, setGoogleSheetsUpload] = useState(false);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? '/api';
    void fetch(`${apiBase}/marketing/fx`)
      .then((res) => res.json())
      .then((body: { data?: { rate?: number; googleSheetsUpload?: boolean; googleSheets?: { ready?: boolean } } }) => {
        const nextRate = Number(body.data?.rate);
        if (Number.isFinite(nextRate) && nextRate > 0) {
          localStorage.setItem(FX_RATE_KEY, String(nextRate));
          setRate(nextRate);
        }
        setGoogleSheetsUpload(Boolean(body.data?.googleSheets?.ready ?? body.data?.googleSheetsUpload));
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      currency,
      rate,
      googleSheetsUpload,
      setCurrency: (c: Currency) => {
        localStorage.setItem(FX_KEY, c);
        setCurrencyState(c);
      },
      formatUsd: (amountUsd: number) =>
        currency === 'LRD' ? `L$${(amountUsd * rate).toFixed(2)}` : `$${Number(amountUsd).toFixed(2)}`,
    }),
    [currency, rate, googleSheetsUpload],
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency requires CurrencyProvider');
  return ctx;
}
