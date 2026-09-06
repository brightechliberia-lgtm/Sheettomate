import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UnauthorizedError } from '../utils/errors';
import { verifyAndSettle } from '../services/paymentService';

export function verifyWebhookSignature(rawBody: string, signature?: string): void {
  if (env.paymentsMode === 'sandbox' && !signature) {
    return;
  }
  if (!signature) {
    throw new UnauthorizedError('Missing webhook signature');
  }
  const digest = crypto.createHmac('sha256', env.banffpayWebhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(signature.replace(/^sha256=/, ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    logger.warn('Webhook signature mismatch');
    throw new UnauthorizedError('Invalid webhook signature');
  }
}

export async function handleWebhook(body: Record<string, unknown>) {
  const reference = String(body.reference ?? body.order_id ?? '');
  const statusRaw = String(body.status ?? body.event ?? '').toUpperCase();
  if (!reference) {
    throw new Error('Webhook missing reference');
  }
  const expected = statusRaw.includes('SUCCESS') || statusRaw.includes('COMPLETE') || statusRaw === 'PAID'
    ? 'COMPLETED'
    : statusRaw.includes('FAIL') || statusRaw.includes('CANCEL')
      ? 'FAILED'
      : undefined;
  logger.info('Payment webhook received', { reference, statusRaw });
  return verifyAndSettle(reference, expected as 'COMPLETED' | 'FAILED' | undefined);
}
