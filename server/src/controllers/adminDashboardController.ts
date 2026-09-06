import { Request, Response, NextFunction } from 'express';
import { Role, StaffRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { toPublicUser } from '../utils/userMapper';
import { revokeAllRefreshTokens } from '../services/tokenService';
import * as analytics from '../services/adminAnalytics';
import { env } from '../config/env';
import { sendCourseEmail } from '../services/emailService';
import { getCatalogConfig, saveCatalogConfig, type CatalogConfig } from '../services/catalogSettings';
import os from 'os';

function range(req: Request) {
  return {
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
  };
}

export async function overview(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await analytics.overview());
  } catch (error) {
    next(error);
  }
}

export async function revenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = range(req);
    return sendSuccess(res, await analytics.revenueAnalytics(from, to));
  } catch (error) {
    next(error);
  }
}

export async function usersAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = range(req);
    return sendSuccess(res, await analytics.userAnalytics(from, to));
  } catch (error) {
    next(error);
  }
}

export async function content(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await analytics.contentAnalytics());
  } catch (error) {
    next(error);
  }
}

export async function ai(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = range(req);
    return sendSuccess(res, await analytics.aiAnalytics(from, to));
  } catch (error) {
    next(error);
  }
}

export async function geo(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await analytics.geoAnalytics());
  } catch (error) {
    next(error);
  }
}

export async function exportReport(req: Request, res: Response, next: NextFunction) {
  try {
    const kind = String(req.query.kind || 'revenue');
    const { from, to } = range(req);
    let rows: Record<string, unknown>[] = [];
    if (kind === 'users') {
      const data = await analytics.userAnalytics(from, to);
      rows = data.byCountry as unknown as Record<string, unknown>[];
    } else if (kind === 'geo') {
      const data = await analytics.geoAnalytics();
      rows = data.users as unknown as Record<string, unknown>[];
    } else {
      const data = await analytics.revenueAnalytics(from, to);
      rows = data.byGateway as unknown as Record<string, unknown>[];
    }
    const csv = analytics.toCsv(rows);
    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(
        `<html><body><h1>Sheettomate ${kind} report</h1><pre>${csv}</pre><p>Print this page to PDF.</p></body></html>`,
      );
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${kind}.csv"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function listAdminUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
    const role = typeof req.query.role === 'string' ? (req.query.role as Role) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await prisma.user.findMany({
      where: {
        ...(q
          ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }
          : {}),
        ...(role ? { role } : {}),
        ...(status === 'suspended' ? { suspendedAt: { not: null } } : {}),
        ...(status === 'active' ? { suspendedAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return sendSuccess(res, { items: items.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
}

export async function setStaffRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const staffRole = req.body.staffRole as StaffRole | null;
    const user = await prisma.user.update({
      where: { id },
      data: { staffRole: staffRole || null },
    });
    return sendSuccess(res, { user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function setSuspended(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (id === req.user!.sub) throw new ForbiddenError('Cannot suspend yourself');
    const suspend = Boolean(req.body.suspend);
    const user = await prisma.user.update({
      where: { id },
      data: { suspendedAt: suspend ? new Date() : null },
    });
    if (suspend) await revokeAllRefreshTokens(id);
    return sendSuccess(res, { user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function bulkUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = req.body.ids as string[];
    const action = String(req.body.action);
    if (!ids?.length) throw new ValidationError('Select users');
    if (action === 'suspend') {
      await prisma.user.updateMany({
        where: { id: { in: ids.filter((id) => id !== req.user!.sub) } },
        data: { suspendedAt: new Date() },
      });
    } else if (action === 'activate') {
      await prisma.user.updateMany({ where: { id: { in: ids } }, data: { suspendedAt: null } });
    } else {
      throw new ValidationError('Unknown bulk action');
    }
    return sendSuccess(res, { ok: true, count: ids.length });
  } catch (error) {
    next(error);
  }
}

export async function listTemplatesAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.review === 'string' ? req.query.review : undefined;
    const items = await prisma.template.findMany({
      where: status ? { reviewStatus: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true, email: true } } },
      take: 150,
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function patchTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.template.update({
      where: { id: String(req.params.id) },
      data: {
        reviewStatus: req.body.reviewStatus,
        featured: req.body.featured,
        flagged: req.body.flagged,
        flagReason: req.body.flagReason,
        published: req.body.published,
      },
    });
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function listPaymentsAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const items = await prisma.payment.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, name: true, country: true } }, items: true },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function refundPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: String(req.params.id) } });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status !== 'COMPLETED') throw new ValidationError('Only completed payments can be refunded');
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', failureReason: String(req.body.reason || 'Admin refund') },
    });
    await prisma.paymentEvent.create({
      data: { paymentId: payment.id, type: 'REFUND', message: String(req.body.reason || 'Admin refund') },
    });
    return sendSuccess(res, { payment: updated });
  } catch (error) {
    next(error);
  }
}

export async function listFlags(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.contentFlag.findMany({
      orderBy: { createdAt: 'desc' },
      include: { reporter: { select: { email: true, name: true } } },
      take: 100,
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function resolveFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.contentFlag.update({
      where: { id: String(req.params.id) },
      data: { status: req.body.status },
    });
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function createFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.contentFlag.create({
      data: {
        reporterId: req.user!.sub,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        reason: req.body.reason,
      },
    });
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function listReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.templateRating.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: { user: { select: { name: true, email: true } }, template: { select: { title: true } } },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.templateRating.delete({ where: { id: String(req.params.id) } });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function listCms(_req: Request, res: Response, next: NextFunction) {
  try {
    const pages = await prisma.cmsPage.findMany({ orderBy: { updatedAt: 'desc' } });
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
    return sendSuccess(res, { pages, announcements });
  } catch (error) {
    next(error);
  }
}

export async function upsertCms(req: Request, res: Response, next: NextFunction) {
  try {
    const page = await prisma.cmsPage.upsert({
      where: { slug: req.body.slug },
      create: {
        slug: req.body.slug,
        title: req.body.title,
        body: req.body.body,
        published: Boolean(req.body.published),
        authorId: req.user!.sub,
      },
      update: { title: req.body.title, body: req.body.body, published: Boolean(req.body.published) },
    });
    return sendSuccess(res, { page });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.announcement.create({
      data: { title: req.body.title, body: req.body.body, authorId: req.user!.sub },
    });
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await prisma.platformSetting.findMany();
    return sendSuccess(res, { settings });
  } catch (error) {
    next(error);
  }
}

export async function saveSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = req.body.settings as { key: string; value: string }[];
    for (const row of entries ?? []) {
      await prisma.platformSetting.upsert({
        where: { key: row.key },
        create: { key: row.key, value: String(row.value) },
        update: { value: String(row.value) },
      });
    }
    return sendSuccess(res, { saved: true });
  } catch (error) {
    next(error);
  }
}

export async function getCatalog(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { catalog: await getCatalogConfig() });
  } catch (error) {
    next(error);
  }
}

export async function saveCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body?.catalog as CatalogConfig | undefined;
    if (!body || !Array.isArray(body.templateCategories) || !Array.isArray(body.courseCategories)) {
      throw new ValidationError('Invalid catalog payload');
    }
    const catalog = await saveCatalogConfig(body);
    return sendSuccess(res, { catalog });
  } catch (error) {
    next(error);
  }
}

export async function health(_req: Request, res: Response, next: NextFunction) {
  try {
    const mem = process.memoryUsage();
    const errors = await prisma.errorEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 15 });
    const failedPay = await prisma.payment.count({
      where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 86400000) } },
    });
    return sendSuccess(res, {
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      load: os.loadavg(),
      paymentsMode: env.paymentsMode,
      banffpayConfigured: Boolean(env.banffpayApiKey),
      orangeConfigured: Boolean(env.orangeMoneyApiKey),
      redis: Boolean(env.redisUrl),
      failedPayments24h: failedPay,
      errors,
      sentryHint: 'Set SENTRY_DSN / VITE_SENTRY_DSN to forward browser and API errors.',
    });
  } catch (error) {
    next(error);
  }
}

export async function scheduleReport(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.scheduledReport.create({
      data: {
        email: req.body.email,
        cadence: req.body.cadence || 'WEEKLY',
        reportType: req.body.reportType || 'revenue',
      },
    });
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function runScheduledReports(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.scheduledReport.findMany({ where: { active: true } });
    let sent = 0;
    for (const row of items) {
      const due =
        !row.lastSentAt ||
        (row.cadence === 'DAILY'
          ? Date.now() - row.lastSentAt.getTime() > 20 * 3600000
          : Date.now() - row.lastSentAt.getTime() > 6 * 86400000);
      if (!due) continue;
      const data = await analytics.revenueAnalytics();
      await sendCourseEmail(
        row.email,
        `Sheettomate ${row.reportType} report`,
        'Scheduled report',
        `Completed volume (range): $${data.totalUsd.toFixed(2)}. Open the admin dashboard for charts.`,
        '/admin/analytics/revenue',
      );
      await prisma.scheduledReport.update({ where: { id: row.id }, data: { lastSentAt: new Date() } });
      sent += 1;
    }
    return sendSuccess(res, { sent });
  } catch (error) {
    next(error);
  }
}

export async function listScheduled(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.scheduledReport.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}
