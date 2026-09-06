import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { initiateCheckout, verifyAndSettle } from '../services/paymentService';
import { handleWebhook, verifyWebhookSignature } from '../payments/webhook';
import { sandboxMark } from '../payments/sandbox';
import { env } from '../config/env';
import { initiatePaymentSchema, walletTopupSchema } from '../validators/schemas';
import { logger } from '../config/logger';

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = initiatePaymentSchema.parse(req.body);
    const result = await initiateCheckout({
      userId: req.user!.sub,
      gateway: body.gateway,
      currency: body.currency,
      phone: body.phone,
      templateIds: body.templateIds,
      courseIds: body.courseIds,
      purpose: body.purpose,
      amountUsd: body.amountUsd,
      description: body.description,
      idempotencyKey: body.idempotencyKey,
    });
    return sendSuccess(res, result, 201, 'Payment initiated');
  } catch (error) {
    next(error);
  }
}

export const checkout = initiate;

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const reference = String(req.params.reference);
    if (env.paymentsMode === 'sandbox' && req.body?.simulate === 'success') {
      sandboxMark(reference, 'COMPLETED');
    }
    const payment = await verifyAndSettle(reference);
    return sendSuccess(res, { payment });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: String(req.params.id) },
      include: { items: true, events: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.userId !== req.user!.sub && req.user!.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }
    return sendSuccess(res, { payment });
  } catch (error) {
    next(error);
  }
}

export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    const signature = req.header('x-banffpay-signature') ?? req.header('x-orange-signature');
    verifyWebhookSignature(raw, signature ?? undefined);
    const payment = await handleWebhook(req.body as Record<string, unknown>);
    return sendSuccess(res, { received: true, paymentId: payment.id });
  } catch (error) {
    logger.warn('Webhook rejected', { error });
    next(error);
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.payment.findMany({
      where: { userId: req.user!.sub },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export const myPayments = history;

export async function analytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const [byStatus, totals, recent] = await Promise.all([
      prisma.payment.groupBy({ by: ['status'], _count: true, _sum: { amountUsd: true } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountUsd: true, amountLrd: true },
        _count: true,
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);
    const failed = await prisma.payment.count({
      where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    return sendSuccess(res, { byStatus, totals, recent, failedLast24h: failed });
  } catch (error) {
    next(error);
  }
}

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { walletUsd: true, walletLrd: true },
    });
    const ledger = await prisma.walletLedger.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return sendSuccess(res, { wallet: user, ledger });
  } catch (error) {
    next(error);
  }
}

export async function topUpWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const body = walletTopupSchema.parse(req.body);
    const result = await initiateCheckout({
      userId: req.user!.sub,
      gateway: body.gateway,
      currency: body.currency,
      phone: body.phone,
      purpose: 'WALLET_TOPUP',
      amountUsd: body.amountUsd,
      description: 'Wallet top-up',
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}
