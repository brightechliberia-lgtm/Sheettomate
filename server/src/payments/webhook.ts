import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../utils/errors';
import { verifyAndSettle } from '../services/paymentService';

function hmacValid(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = signature.replace(/^sha256=/i, '').trim();
  const a = Buffer.from(digest);
  const b = Buffer.from(normalized);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature?: string): void {
  if (env.paymentsMode === 'sandbox' && !signature) {
    return;
  }
  if (!signature) {
    throw new UnauthorizedError('Missing webhook signature');
  }
  const secrets = [env.banffpayWebhookSecret, env.orangeMoneyWebhookSecret].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  for (const secret of secrets) {
    try {
      if (hmacValid(rawBody, signature, secret)) return;
    } catch {
      /* length mismatch */
    }
  }
  logger.warn('Webhook signature mismatch');
  throw new UnauthorizedError('Invalid webhook signature');
}

export async function handleWebhook(body: Record<string, unknown>) {
  const reference = String(
    body.reference ?? body.order_id ?? body.orderId ?? body.merchant_reference ?? body.txnid ?? '',
  );
  const statusRaw = String(body.status ?? body.event ?? body.payment_status ?? body.state ?? '').toUpperCase();
  if (!reference) {
    throw new Error('Webhook missing reference');
  }
  const expected =
    statusRaw.includes('SUCCESS') || statusRaw.includes('COMPLETE') || statusRaw === 'PAID'
      ? 'COMPLETED'
      : statusRaw.includes('FAIL') || statusRaw.includes('CANCEL') || statusRaw.includes('DECLIN')
        ? 'FAILED'
        : undefined;
  logger.info('Payment webhook received', { reference, statusRaw });
  return verifyAndSettle(reference, expected as 'COMPLETED' | 'FAILED' | undefined);
}
