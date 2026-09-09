import { env } from '../config/env';
import { logger } from '../config/logger';
import { createCircuitBreaker } from './circuitBreaker';
import { fetchWithTimeout } from './http';
import { sandboxCharge, sandboxStatus } from './sandbox';
import type { ChargeRequest, ChargeResult, ProviderStatus } from './types';

const circuit = createCircuitBreaker('orange-money');

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
    statusRaw === 'SUCCESS' ||
    statusRaw === 'SUCCESSFUL' ||
    statusRaw === 'SUCCEEDED' ||
    statusRaw === 'PAID' ||
    statusRaw === 'COMPLETED' ||
    statusRaw.includes('SUCCESS')
  ) {
    return 'COMPLETED';
  }
  if (statusRaw.includes('FAIL') || statusRaw.includes('CANCEL') || statusRaw === 'EXPIRED') {
    return 'FAILED';
  }
  return 'PENDING';
}

export async function orangeCharge(req: ChargeRequest): Promise<ChargeResult> {
  if (env.paymentsMode === 'sandbox') {
    return sandboxCharge({ ...req, method: 'ORANGE_MONEY' });
  }
  if (!env.orangeMoneyApiKey || !env.orangeMoneyMerchantId) {
    throw new Error(
      'Orange Money is not configured (set ORANGE_MONEY_API_KEY, ORANGE_MONEY_MERCHANT_ID, and PAYMENTS_MODE=live)',
    );
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
        customer: {
          email: req.customer.email,
          name: req.customer.name,
          phone: req.customer.phone ?? undefined,
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      logger.warn('Orange Money charge failed', { status: res.status, json });
      throw new Error(
        pickString(json, ['message', 'error', 'detail', 'description']) || `Orange Money error ${res.status}`,
      );
    }
    return {
      provider: 'ORANGE' as const,
      providerRef: pickString(json, ['pay_token', 'payToken', 'txnid', 'transaction_id']) ?? req.reference,
      checkoutUrl: pickString(json, ['payment_url', 'paymentUrl', 'redirect_url', 'checkout_url']),
      ussdCode: pickString(json, ['ussd', 'ussd_code']) ?? '#144#',
      instructions: 'Confirm the Orange Money debit on your handset, or open the Orange checkout link.',
      raw: json,
    };
  });
}

export async function orangeVerify(reference: string): Promise<ProviderStatus> {
  if (env.paymentsMode === 'sandbox') {
    return sandboxStatus(reference);
  }
  if (!env.orangeMoneyApiKey || !env.orangeMoneyMerchantId) {
    throw new Error('Orange Money is not configured');
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
    const status = mapRemoteStatus(String(json.status ?? json.payment_status ?? 'PENDING'));
    return {
      status,
      providerRef: pickString(json, ['txnid', 'transaction_id', 'pay_token']) ?? reference,
      raw: json,
    };
  });
}
