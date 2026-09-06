import { env } from '../config/env';
import type { ChargeRequest, ChargeResult, ProviderStatus } from './types';

export function sandboxCharge(req: ChargeRequest): ChargeResult {
  const ussd =
    req.method === 'ORANGE_MONEY'
      ? '#144*1*1#'
      : req.method === 'MTN_MOMO' || req.method === 'MOBILE_MONEY'
        ? '*165*1#'
        : undefined;
  return {
    provider: 'SANDBOX',
    providerRef: `sandbox_${req.reference}`,
    checkoutUrl:
      req.method === 'BANFFPAY_VISA'
        ? `${env.clientOrigin}/payments/sandbox-card?reference=${req.reference}`
        : undefined,
    ussdCode: ussd,
    qrPayload: `sheettomate://pay/${req.reference}`,
    instructions:
      req.method === 'BANFFPAY_VISA'
        ? 'Sandbox card page — no PAN is collected by Sheettomate.'
        : `Sandbox mobile money: dial ${ussd ?? 'USSD'} then approve. Use verify to complete.`,
    raw: { mode: 'sandbox', reference: req.reference },
  };
}

const sandboxStore = new Map<string, 'PENDING' | 'COMPLETED' | 'FAILED'>();

export function sandboxMark(reference: string, status: 'PENDING' | 'COMPLETED' | 'FAILED') {
  sandboxStore.set(reference, status);
}

export function sandboxStatus(reference: string): ProviderStatus {
  return { status: sandboxStore.get(reference) ?? 'PENDING', providerRef: `sandbox_${reference}`, raw: { mode: 'sandbox' } };
}
