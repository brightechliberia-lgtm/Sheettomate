import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'sheettomate_low_data';

interface LowDataState {
  lowData: boolean;
  setLowData: (v: boolean) => void;
  online: boolean;
}

const Ctx = createContext<LowDataState | undefined>(undefined);

export function LowDataProvider({ children }: { children: ReactNode }) {
  const [lowData, setLowDataState] = useState(() => localStorage.getItem(KEY) === '1');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const value = useMemo(
    () => ({
      lowData,
      online,
      setLowData: (v: boolean) => {
        localStorage.setItem(KEY, v ? '1' : '0');
        setLowDataState(v);
      },
    }),
    [lowData, online],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLowData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('LowDataProvider required');
  return ctx;
}
