import { env } from '../config/env';
import { logger } from '../config/logger';
import { createCircuitBreaker } from './circuitBreaker';
import { fetchWithTimeout } from './http';
import { sandboxCharge, sandboxStatus } from './sandbox';
import type { ChargeRequest, ChargeResult, ProviderStatus } from './types';

const circuit = createCircuitBreaker('orange-money');

export async function orangeCharge(req: ChargeRequest): Promise<ChargeResult> {
  if (env.paymentsMode === 'sandbox' || !env.orangeMoneyApiKey) {
    return sandboxCharge({ ...req, method: 'ORANGE_MONEY' });
  }
  return circuit.exec(async () => {
    const res = await fetchWithTimeout(`${env.orangeMoneyBaseUrl}/webpayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.orangeMoneyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_key: env.orangeMoneyMerchantId,
        currency: req.currency,
        order_id: req.reference,
        amount: req.amount,
        return_url: req.returnUrl,
        cancel_url: req.returnUrl,
        notif_url: req.webhookUrl,
        lang: 'en',
        reference: req.reference,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn('Orange Money charge failed', { status: res.status, json });
      throw new Error((json.message as string) || `Orange Money error ${res.status}`);
    }
    return {
      provider: 'ORANGE' as const,
      providerRef: String(json.pay_token ?? req.reference),
      checkoutUrl: json.payment_url as string | undefined,
      ussdCode: '#144#',
      instructions: 'Confirm the Orange Money debit on your handset.',
      raw: json,
    };
  });
}

export async function orangeVerify(reference: string): Promise<ProviderStatus> {
  if (env.paymentsMode === 'sandbox' || !env.orangeMoneyApiKey) {
    return sandboxStatus(reference);
  }
  return circuit.exec(async () => {
    const res = await fetchWithTimeout(`${env.orangeMoneyBaseUrl}/transactionstatus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.orangeMoneyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: reference, merchant_key: env.orangeMoneyMerchantId }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const statusRaw = String(json.status ?? 'PENDING').toUpperCase();
    const status = statusRaw === 'SUCCESS' ? 'COMPLETED' : statusRaw === 'FAILED' ? 'FAILED' : 'PENDING';
    return { status, providerRef: String(json.txnid ?? reference), raw: json };
  });
}
