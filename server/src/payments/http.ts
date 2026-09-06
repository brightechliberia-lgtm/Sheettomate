import { env } from '../config/env';

const TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(url: string, init: RequestInit = {}, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
        continue;
      }
      return res;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Payment provider timeout');
}

export function convert(amountUsd: number, currency: 'USD' | 'LRD') {
  const rate = env.fxUsdLrd;
  const amountLrd = Number((amountUsd * rate).toFixed(2));
  return {
    amountUsd,
    amountLrd,
    fxRate: rate,
    chargeAmount: currency === 'LRD' ? amountLrd : amountUsd,
    currency,
  };
}

export function displayPrice(amountUsd: number, currency: 'USD' | 'LRD') {
  const { amountLrd } = convert(amountUsd, currency);
  return currency === 'LRD' ? `L$${amountLrd.toFixed(2)}` : `$${amountUsd.toFixed(2)}`;
}
