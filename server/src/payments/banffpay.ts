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

function pickString(json: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = json[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function mapRemoteStatus(raw: string): ProviderStatus['status'] {
  const statusRaw = raw.toUpperCase();
  if (
    statusRaw.includes('SUCCESS') ||
    statusRaw === 'PAID' ||
    statusRaw === 'COMPLETED' ||
    statusRaw === 'COMPLETE' ||
    statusRaw === 'SUCCESSFUL'
  ) {
    return 'COMPLETED';
  }
  if (statusRaw.includes('FAIL') || statusRaw.includes('CANCEL') || statusRaw.includes('DECLIN')) {
    return 'FAILED';
  }
  return 'PENDING';
}

export async function banffpayCharge(req: ChargeRequest): Promise<ChargeResult> {
  if (env.paymentsMode === 'sandbox') {
    return sandboxCharge(req);
  }
  if (!env.banffpayApiKey) {
    throw new Error('BanffPay is not configured (set BANFFPAY_API_KEY and PAYMENTS_MODE=live)');
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
        customer: {
          email: req.customer.email,
          name: req.customer.name,
          phone: req.customer.phone ?? undefined,
        },
        callback_url: req.webhookUrl,
        return_url: req.returnUrl,
        metadata: {
          platform: 'sheettomate',
          method: req.method,
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn('BanffPay charge failed', { status: res.status, json });
      throw new Error(
        (pickString(json, ['message', 'error', 'detail']) as string) || `BanffPay error ${res.status}`,
      );
    }
    const data = (json.data && typeof json.data === 'object' ? (json.data as Record<string, unknown>) : json) as Record<
      string,
      unknown
    >;
    return {
      provider: 'BANFFPAY' as const,
      providerRef: pickString(data, ['id', 'transaction_id', 'reference']) ?? req.reference,
      checkoutUrl: pickString(data, ['checkout_url', 'checkoutUrl', 'payment_url', 'redirect_url', 'url']),
      ussdCode: pickString(data, ['ussd', 'ussd_code', 'ussdCode']),
      qrPayload: pickString(data, ['qr', 'qr_code', 'qrPayload', 'qr_payload']),
      instructions:
        req.method === 'BANFFPAY_VISA'
          ? 'Complete card checkout on BanffPay. Card numbers never touch Sheettomate servers.'
          : 'Approve the mobile money prompt on your phone.',
      raw: json,
    };
  });
}

export async function banffpayVerify(reference: string): Promise<ProviderStatus> {
  if (env.paymentsMode === 'sandbox') {
    return sandboxStatus(reference);
  }
  if (!env.banffpayApiKey) {
    throw new Error('BanffPay is not configured');
  }
  return circuit.exec(async () => {
    const res = await fetchWithTimeout(`${env.banffpayBaseUrl}/payments/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.banffpayApiKey}` },
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const data = (json.data && typeof json.data === 'object' ? (json.data as Record<string, unknown>) : json) as Record<
      string,
      unknown
    >;
    const status = mapRemoteStatus(String(data.status ?? json.status ?? 'PENDING'));
    return {
      status,
      providerRef: pickString(data, ['id', 'transaction_id', 'reference']) ?? reference,
      raw: json,
    };
  });
}
