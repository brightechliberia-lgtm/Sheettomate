import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export function parseRange(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fillDays(start: Date, end: Date, values: Map<string, number>) {
  const out: { date: string; value: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = dayKey(cursor);
    out.push({ date: key, value: values.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

async function revenueBetween(start: Date, end: Date) {
  const row = await prisma.payment.aggregate({
    where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
    _sum: { amountUsd: true },
    _count: true,
  });
  return { usd: Number(row._sum.amountUsd ?? 0), count: row._count };
}

export async function overview() {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday.getTime() - 6 * 86400000);
  const startMonth = new Date(startToday.getTime() - 29 * 86400000);

  const [users, templates, courses, revToday, revWeek, revMonth, growth, dailyRev, topTemplates, topCourses, activity] =
    await Promise.all([
      prisma.user.count(),
      prisma.template.count(),
      prisma.course.count(),
      revenueBetween(startToday, now),
      revenueBetween(startWeek, now),
      revenueBetween(startMonth, now),
      prisma.user.findMany({
        where: { createdAt: { gte: startMonth } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startMonth } },
        select: { createdAt: true, amountUsd: true },
      }),
      prisma.template.findMany({
        orderBy: { downloadCount: 'desc' },
        take: 8,
        select: { id: true, title: true, downloadCount: true, averageRating: true, price: true },
      }),
      prisma.course.findMany({
        orderBy: { enrollments: { _count: 'desc' } },
        take: 8,
        select: { id: true, title: true, _count: { select: { enrollments: true } } },
      }),
      recentActivity(),
    ]);

  const growthMap = new Map<string, number>();
  for (const u of growth) {
    const k = dayKey(u.createdAt);
    growthMap.set(k, (growthMap.get(k) ?? 0) + 1);
  }
  const revMap = new Map<string, number>();
  for (const p of dailyRev) {
    const k = dayKey(p.createdAt);
    revMap.set(k, (revMap.get(k) ?? 0) + Number(p.amountUsd));
  }

  return {
    metrics: {
      users,
      templates,
      courses,
      revenue: { today: revToday, week: revWeek, month: revMonth },
    },
    charts: {
      revenue30d: fillDays(startMonth, now, revMap),
      userGrowth30d: fillDays(startMonth, now, growthMap),
    },
    topTemplates,
    topCourses,
    activity,
    generatedAt: now.toISOString(),
  };
}

async function recentActivity() {
  const [payments, users, flags] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { email: true } } },
    }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { name: true, email: true, createdAt: true } }),
    prisma.contentFlag.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { reporter: { select: { email: true } } },
    }),
  ]);
  const items: { at: string; text: string }[] = [];
  for (const p of payments) {
    items.push({ at: p.createdAt.toISOString(), text: `Payment ${p.reference} ${p.status} (${p.user.email})` });
  }
  for (const u of users) {
    items.push({ at: u.createdAt.toISOString(), text: `Signup ${u.name} <${u.email}>` });
  }
  for (const f of flags) {
    items.push({ at: f.createdAt.toISOString(), text: `Flag ${f.targetType} ${f.status} from ${f.reporter.email}` });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
}

export async function revenueAnalytics(from?: string, to?: string) {
  const { start, end } = parseRange(from, to);
  const where: Prisma.PaymentWhereInput = { status: 'COMPLETED', createdAt: { gte: start, lte: end } };
  const [byGateway, byPurpose, payments] = await Promise.all([
    prisma.payment.groupBy({ by: ['gateway'], where, _sum: { amountUsd: true }, _count: true }),
    prisma.payment.groupBy({ by: ['purpose'], where, _sum: { amountUsd: true }, _count: true }),
    prisma.payment.findMany({
      where,
      include: { user: { select: { country: true } } },
    }),
  ]);
  const byCountry = new Map<string, number>();
  for (const p of payments) {
    const c = p.user.country || 'Unknown';
    byCountry.set(c, (byCountry.get(c) ?? 0) + Number(p.amountUsd));
  }
  return {
    range: { start, end },
    byGateway,
    byPurpose,
    byCountry: [...byCountry.entries()].map(([country, usd]) => ({ country, usd })),
    totalUsd: payments.reduce((s, p) => s + Number(p.amountUsd), 0),
  };
}

export async function userAnalytics(from?: string, to?: string) {
  const { start, end } = parseRange(from, to);
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { createdAt: true, country: true, role: true, lastLoginAt: true },
  });
  const byCountry = new Map<string, number>();
  const byRole = new Map<string, number>();
  for (const u of users) {
    const c = u.country || 'Unknown';
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
    byRole.set(u.role, (byRole.get(u.role) ?? 0) + 1);
  }
  const total = await prisma.user.count();
  const suspended = await prisma.user.count({ where: { suspendedAt: { not: null } } });
  const dormant = await prisma.user.count({
    where: {
      OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: new Date(Date.now() - 30 * 86400000) } }],
      createdAt: { lt: new Date(Date.now() - 14 * 86400000) },
    },
  });
  return {
    signupsInRange: users.length,
    total,
    suspended,
    churnProxy: dormant,
    retentionProxy: total ? Math.round(((total - dormant) / total) * 100) : 0,
    byCountry: [...byCountry.entries()].map(([country, count]) => ({ country, count })),
    byRole: [...byRole.entries()].map(([role, count]) => ({ role, count })),
  };
}

export async function contentAnalytics() {
  const [templates, courses, enrollments] = await Promise.all([
    prisma.template.findMany({
      orderBy: { downloadCount: 'desc' },
      take: 15,
      select: { id: true, title: true, downloadCount: true, averageRating: true, ratingCount: true, category: true },
    }),
    prisma.course.findMany({
      take: 15,
      include: { _count: { select: { enrollments: true, lessons: true } } },
      orderBy: { enrollments: { _count: 'desc' } },
    }),
    prisma.courseEnrollment.aggregate({ _avg: { progress: true }, _count: true }),
  ]);
  return { templates, courses, enrollmentAvgProgress: enrollments._avg.progress ?? 0, enrollmentCount: enrollments._count };
}

export async function aiAnalytics(from?: string, to?: string) {
  const { start, end } = parseRange(from, to);
  const [agg, prompts, recent] = await Promise.all([
    prisma.aIRequest.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
      _sum: { costUsd: true, tokensUsed: true },
    }),
    prisma.aIRequest.groupBy({
      by: ['category'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.aIRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, prompt: true, category: true, costUsd: true, status: true, createdAt: true },
    }),
  ]);
  return { totals: agg, byCategory: prompts, recent };
}

export async function geoAnalytics() {
  const users = await prisma.user.groupBy({ by: ['country'], _count: true });
  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.COMPLETED },
    include: { user: { select: { country: true } } },
  });
  const payMap = new Map<string, number>();
  for (const p of payments) {
    const c = p.user.country || 'Unknown';
    payMap.set(c, (payMap.get(c) ?? 0) + Number(p.amountUsd));
  }
  return {
    users: users.map((u) => ({ country: u.country || 'Unknown', count: u._count })),
    payments: [...payMap.entries()].map(([country, usd]) => ({ country, usd })),
  };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}
