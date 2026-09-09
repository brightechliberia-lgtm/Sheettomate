import crypto from 'crypto';
import { PaymentGateway, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { sendPurchaseConfirmationEmail } from './emailService';
import { banffpayCharge, banffpayVerify } from '../payments/banffpay';
import { orangeCharge, orangeVerify } from '../payments/orangeMoney';
import { CircuitOpenError } from '../payments/circuitBreaker';
import { convert } from '../payments/http';
import { sandboxMark } from '../payments/sandbox';
import type { ChargeMethod, ChargeResult, ProviderStatus } from '../payments/types';

async function logEvent(paymentId: string, type: string, message: string, payload?: unknown) {
  await prisma.paymentEvent.create({
    data: { paymentId, type, message, payload: payload as object | undefined },
  });
}

function reference(): string {
  return `SMT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

async function chargeProvider(method: ChargeMethod, req: Parameters<typeof banffpayCharge>[0]): Promise<ChargeResult> {
  if (method === 'ORANGE_MONEY') {
    const preferOrange = !env.orangeViaBanffpay && (env.paymentsMode === 'sandbox' || Boolean(env.orangeMoneyApiKey));
    if (preferOrange) {
      try {
        return await orangeCharge(req);
      } catch (error) {
        if (env.banffpayApiKey || env.paymentsMode === 'sandbox') {
          logger.warn('Orange Money unavailable, falling back to BanffPay', { error });
          return banffpayCharge(req);
        }
        throw error;
      }
    }
    try {
      return await banffpayCharge(req);
    } catch (error) {
      logger.warn('BanffPay unavailable, falling back to Orange Money', { error });
      return orangeCharge(req);
    }
  }
  return banffpayCharge(req);
}

export async function initiateCheckout(input: {
  userId: string;
  gateway: PaymentGateway;
  currency: 'USD' | 'LRD';
  phone?: string;
  templateIds?: string[];
  courseIds?: string[];
  purpose?: PaymentPurpose;
  amountUsd?: number;
  description?: string;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && (existing.status === 'PENDING' || existing.status === 'COMPLETED')) {
      return { payment: existing, reuse: true };
    }
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new NotFoundError('User not found');

  let amountUsd = 0;
  const items: { templateId?: string; courseId?: string; title: string; amountUsd: number }[] = [];

  if (input.purpose === PaymentPurpose.COURSE) {
    const ids = input.courseIds ?? [];
    if (!ids.length) throw new ValidationError('Select a course');
    const courses = await prisma.course.findMany({ where: { id: { in: ids } } });
    if (courses.length !== ids.length) throw new NotFoundError('Course not found');
    const { effectivePrice } = await import('./courseService');
    for (const course of courses) {
      const price = effectivePrice(course);
      amountUsd += price;
      items.push({ courseId: course.id, title: course.title, amountUsd: price });
    }
  } else if (input.purpose !== PaymentPurpose.WALLET_TOPUP) {
    const ids = input.templateIds ?? [];
    if (!ids.length) throw new ValidationError('Select at least one template');
    const templates = await prisma.template.findMany({ where: { id: { in: ids } } });
    if (templates.length !== ids.length) throw new NotFoundError('One or more templates were not found');
    for (const template of templates) {
      const price = Number(template.price);
      amountUsd += price;
      items.push({ templateId: template.id, title: template.title, amountUsd: price });
    }
  } else {
    if (!input.amountUsd || input.amountUsd <= 0) {
      throw new ValidationError('Top-up amount is required');
    }
    amountUsd = input.amountUsd;
    items.push({ title: 'Wallet top-up', amountUsd });
  }

  const money = convert(amountUsd, input.currency);
  const ref = reference();
  const purpose = input.purpose ?? PaymentPurpose.TEMPLATE;

  if (input.gateway === PaymentGateway.WALLET) {
    return debitWalletAndComplete({
      userId: input.userId,
      currency: input.currency,
      money,
      items,
      description: input.description ?? 'Wallet purchase',
      reference: ref,
      purpose,
    });
  }

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      amount: money.chargeAmount,
      amountUsd: money.amountUsd,
      amountLrd: money.amountLrd,
      fxRate: money.fxRate,
      currency: input.currency,
      gateway: input.gateway,
      provider: 'BANFFPAY',
      purpose,
      description: input.description ?? items.map((i) => i.title).join(', '),
      phone: input.phone ?? user.phone,
      reference: ref,
      idempotencyKey: input.idempotencyKey,
      items: {
        create: items.map((item) => ({
          templateId: item.templateId,
          courseId: item.courseId,
          title: item.title,
          amountUsd: item.amountUsd,
        })),
      },
    },
  });
  await logEvent(payment.id, 'INITIATED', 'Payment intent created');

  try {
    const charged = await chargeProvider(input.gateway as ChargeMethod, {
      reference: ref,
      amount: money.chargeAmount,
      currency: input.currency,
      method: input.gateway as ChargeMethod,
      description: payment.description ?? 'Sheettomate',
      customer: { email: user.email, name: user.name, phone: payment.phone },
      returnUrl: `${env.clientOrigin}/payments/${payment.id}`,
      webhookUrl: `${env.publicApiUrl}/api/payments/webhook`,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: charged.provider,
        transactionId: charged.providerRef,
        checkoutUrl: charged.checkoutUrl,
        ussdCode: charged.ussdCode,
        qrPayload: charged.qrPayload,
        rawPayload: charged.raw as object,
      },
      include: { items: true },
    });
    await logEvent(payment.id, 'PROVIDER_OK', charged.instructions, charged.raw);
    logger.info('Payment initiated', { id: payment.id, gateway: input.gateway, reference: ref });
    return { payment: updated, checkout: charged };
  } catch (error) {
    const message = error instanceof CircuitOpenError ? error.message : error instanceof Error ? error.message : 'Payment provider error';
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: message },
    });
    await logEvent(payment.id, 'PROVIDER_FAIL', message);
    logger.error('Payment initiation failed', { id: payment.id, message });
    throw new AppError(502, message, 'PAYMENT_PROVIDER');
  }
}

async function debitWalletAndComplete(input: {
  userId: string;
  currency: 'USD' | 'LRD';
  money: ReturnType<typeof convert>;
  items: { templateId?: string; courseId?: string; title: string; amountUsd: number }[];
  description: string;
  reference: string;
  purpose: PaymentPurpose;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new NotFoundError('User not found');
  const field = input.currency === 'LRD' ? 'walletLrd' : 'walletUsd';
  const available = Number(user[field]);
  const need = input.currency === 'LRD' ? input.money.amountLrd : input.money.amountUsd;
  if (available < need) {
    throw new ValidationError('Insufficient wallet balance');
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        userId: input.userId,
        amount: need,
        amountUsd: input.money.amountUsd,
        amountLrd: input.money.amountLrd,
        fxRate: input.money.fxRate,
        currency: input.currency,
        gateway: 'WALLET',
        provider: 'WALLET',
        purpose: input.purpose,
        description: input.description,
        reference: input.reference,
        status: 'COMPLETED',
        verifiedAt: new Date(),
        items: {
          create: input.items.map((item) => ({
            templateId: item.templateId,
            courseId: item.courseId,
            title: item.title,
            amountUsd: item.amountUsd,
          })),
        },
      },
    });
    const next = Number((available - need).toFixed(2));
    await tx.user.update({ where: { id: input.userId }, data: { [field]: next } });
    await tx.walletLedger.create({
      data: {
        userId: input.userId,
        paymentId: created.id,
        currency: input.currency,
        delta: -need,
        balanceAfter: next,
        reason: 'purchase',
      },
    });
    return created;
  });

  await fulfillPayment(payment.id);
  return {
    payment,
    checkout: {
      provider: 'WALLET' as const,
      providerRef: payment.reference,
      instructions: 'Paid from your Sheettomate wallet.',
      raw: { wallet: true },
    },
  };
}

export async function verifyAndSettle(reference: string, expectedStatus?: ProviderStatus['status']) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status === 'COMPLETED') return payment;

  let remote: ProviderStatus =
    payment.provider === 'ORANGE' ? await orangeVerify(reference) : await banffpayVerify(reference);

  if (env.paymentsMode === 'sandbox' && expectedStatus) {
    sandboxMark(reference, expectedStatus);
    remote = { ...remote, status: expectedStatus };
  }

  if (remote.status === 'PENDING') {
    await logEvent(payment.id, 'VERIFY_PENDING', 'Provider still pending', remote.raw);
    return payment;
  }

  if (remote.status === 'FAILED') {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'Provider declined', rawPayload: remote.raw as object },
    });
    await logEvent(payment.id, 'FAILED', 'Provider declined', remote.raw);
    return updated;
  }

  const counter =
    payment.provider === 'ORANGE' ? await orangeVerify(reference) : await banffpayVerify(reference);
  if (counter.status !== 'COMPLETED' && env.paymentsMode !== 'sandbox') {
    await logEvent(payment.id, 'COUNTER_MISMATCH', 'Counter-verification did not confirm success', counter.raw);
    throw new AppError(409, 'Could not confirm payment with provider', 'VERIFY_MISMATCH');
  }

  const completed = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'COMPLETED',
      verifiedAt: new Date(),
      transactionId: remote.providerRef ?? payment.transactionId,
      rawPayload: remote.raw as object,
    },
  });
  await logEvent(payment.id, 'COMPLETED', 'Counter-verified with provider');
  await fulfillPayment(completed.id);
  return completed;
}

export async function fulfillPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { items: true, user: true },
  });
  if (!payment || payment.status !== 'COMPLETED') return;

  if (payment.purpose === PaymentPurpose.WALLET_TOPUP) {
    const field = payment.currency === 'LRD' ? 'walletLrd' : 'walletUsd';
    const credit = Number(payment.amount);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: payment.userId },
        data: { [field]: { increment: credit } },
      });
      await tx.walletLedger.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          currency: payment.currency,
          delta: credit,
          balanceAfter: Number(user[field]),
          reason: 'topup',
        },
      });
    });
    await logEvent(payment.id, 'WALLET_CREDIT', `Credited ${credit} ${payment.currency}`);
    const { notify } = await import('./notificationService');
    await notify(payment.userId, 'PAYMENT', 'Wallet topped up', `Credited ${credit} ${payment.currency}`, '/payments/history');
    return;
  }

  if (payment.purpose === PaymentPurpose.COURSE) {
    const { enrollFromPayment } = await import('./courseService');
    for (const item of payment.items) {
      if (!item.courseId) continue;
      await enrollFromPayment(payment.userId, item.courseId);
    }
    return;
  }

  for (const item of payment.items) {
    if (!item.templateId) continue;
    await prisma.templateDownload.upsert({
      where: {
        userId_templateId_paymentId: {
          userId: payment.userId,
          templateId: item.templateId,
          paymentId: payment.id,
        },
      },
      update: {},
      create: { userId: payment.userId, templateId: item.templateId, paymentId: payment.id },
    });
    await sendPurchaseConfirmationEmail(
      payment.user.email,
      payment.user.name,
      item.title,
      String(payment.currency === 'LRD' ? payment.amountLrd : payment.amountUsd),
      payment.currency,
    ).catch((error) => logger.warn('Purchase email failed', { error }));
  }
  await prisma.cartItem.deleteMany({
    where: { userId: payment.userId, templateId: { in: payment.items.map((i) => i.templateId).filter(Boolean) as string[] } },
  });
  const { notify } = await import('./notificationService');
  await notify(payment.userId, 'PAYMENT', 'Payment confirmed', 'Your Sheettomate purchase is complete.', '/payments/history');
  const { triggerEvent } = await import('./workflowEngine');
  await triggerEvent(payment.userId, 'purchase', {
    email: payment.user.email,
    phone: payment.user.phone,
    paymentId: payment.id,
  });
}

export async function markFailed(paymentId: string, reason: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED', failureReason: reason },
  });
  await logEvent(paymentId, 'FAILED', reason);
  return payment;
}

export { PaymentStatus };
