import { env } from '../config/env';
import { logger } from '../config/logger';
import { createCircuitBreaker } from './circuitBreaker';
import { fetchWithTimeout } from './http';
import { sandboxCharge, sandboxStatus } from './sandbox';
import type { ChargeRequest, ChargeResult, ProviderStatus } from './types';

const circuit = createCircuitBreaker('banffpay');

function mapMethod(method: ChargeRequest['method']): string {
  if (method === 'ORANGE_MONEY') return 'orange_money';
  if (method === 'MTN_MOMO' || method === 'MOBILE_MONEY') return 'mtn_momo';
  return 'card';
}

export async function banffpayCharge(req: ChargeRequest): Promise<ChargeResult> {
  if (env.paymentsMode === 'sandbox' || !env.banffpayApiKey) {
    return sandboxCharge(req);
  }

  return circuit.exec(async () => {
    const res = await fetchWithTimeout(`${env.banffpayBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.banffpayApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': req.reference,
      },
      body: JSON.stringify({
        amount: req.amount,
        currency: req.currency,
        reference: req.reference,
        method: mapMethod(req.method),
        description: req.description,
        customer: req.customer,
        callback_url: req.webhookUrl,
        return_url: req.returnUrl,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn('BanffPay charge failed', { status: res.status, json });
      throw new Error((json.message as string) || `BanffPay error ${res.status}`);
    }
    return {
      provider: 'BANFFPAY' as const,
      providerRef: String(json.id ?? json.reference ?? req.reference),
      checkoutUrl: json.checkout_url as string | undefined,
      ussdCode: json.ussd as string | undefined,
      qrPayload: json.qr as string | undefined,
      instructions:
        req.method === 'BANFFPAY_VISA'
          ? 'Complete card checkout on BanffPay. Card numbers never touch Sheettomate servers.'
          : 'Approve the mobile money prompt on your phone.',
      raw: json,
    };
  });
}

export async function banffpayVerify(reference: string): Promise<ProviderStatus> {
  if (env.paymentsMode === 'sandbox' || !env.banffpayApiKey) {
    return sandboxStatus(reference);
  }
  return circuit.exec(async () => {
    const res = await fetchWithTimeout(`${env.banffpayBaseUrl}/payments/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.banffpayApiKey}` },
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const statusRaw = String(json.status ?? 'PENDING').toUpperCase();
    const status = statusRaw.includes('SUCCESS') || statusRaw === 'PAID' || statusRaw === 'COMPLETED'
      ? 'COMPLETED'
      : statusRaw.includes('FAIL') || statusRaw.includes('CANCEL')
        ? 'FAILED'
        : 'PENDING';
    return { status, providerRef: String(json.id ?? reference), raw: json };
  });
}
