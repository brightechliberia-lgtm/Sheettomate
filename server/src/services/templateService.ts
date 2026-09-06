import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { cacheGet, cacheSet, invalidateTemplateCache } from './cacheService';
import { logger } from '../config/logger';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { publicAssetUrl } from './storageService';
import type { templateListQuerySchema } from '../validators/schemas';
import type { z } from 'zod';

type ListQuery = z.infer<typeof templateListQuerySchema>;

const includeCreator = { createdBy: { select: { id: true, name: true } } } as const;

export function withCdn<T extends { fileUrl?: string; previewUrl?: string | null }>(template: T): T {
  return {
    ...template,
    ...(template.fileUrl ? { fileUrl: publicAssetUrl(template.fileUrl) } : {}),
    ...(template.previewUrl ? { previewUrl: publicAssetUrl(template.previewUrl) } : {}),
  };
}

export function buildTemplateWhere(query: ListQuery): Prisma.TemplateWhereInput {
  return {
    published: true,
    reviewStatus: 'APPROVED',
    flagged: false,
    ...(query.category ? { category: query.category } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.minRating !== undefined ? { averageRating: { gte: query.minRating } } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { description: { contains: query.q, mode: 'insensitive' } },
            { tags: { has: query.q.toLowerCase() } },
          ],
        }
      : {}),
  };
}

function orderBy(sort: ListQuery['sort']): Prisma.TemplateOrderByWithRelationInput {
  if (sort === 'popular') return { downloadCount: 'desc' };
  if (sort === 'price_asc') return { price: 'asc' };
  if (sort === 'price_desc') return { price: 'desc' };
  return { createdAt: 'desc' };
}

export async function listPublishedTemplates(query: ListQuery) {
  const cacheKey = `templates:list:${JSON.stringify(query)}`;
  const cached = await cacheGet<{ items: unknown; total: number; page: number; pageSize: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  const where = buildTemplateWhere(query);
  const [rows, total] = await Promise.all([
    prisma.template.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: orderBy(query.sort),
      include: includeCreator,
    }),
    prisma.template.count({ where }),
  ]);

  const payload = {
    items: rows.map((item) => withCdn(item)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
  await cacheSet(cacheKey, payload, 60);
  return payload;
}

export async function searchTemplates(q: string, limit: number) {
  const cacheKey = `templates:search:${q}:${limit}`;
  const cached = await cacheGet<{ items: unknown; recommendations: unknown }>(cacheKey);
  if (cached) return cached;

  const matches = await prisma.template.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: q.toLowerCase().split(/\s+/).slice(0, 5) } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    include: includeCreator,
    orderBy: [{ averageRating: 'desc' }, { downloadCount: 'desc' }],
  });

  const categories = [...new Set(matches.map((item) => item.category))];
  const recommendations = await prisma.template.findMany({
    where: {
      published: true,
      id: { notIn: matches.map((item) => item.id) },
      ...(categories.length ? { category: { in: categories } } : {}),
    },
    take: 4,
    orderBy: { downloadCount: 'desc' },
    include: includeCreator,
  });

  const payload = {
    items: matches.map((item) => withCdn(item)),
    recommendations: recommendations.map((item) => withCdn(item)),
    strategy: 'keyword-overlap + popular-in-category',
  };
  await cacheSet(cacheKey, payload, 45);
  logger.info('Template search', { q, hits: matches.length });
  return payload;
}

export async function assertCanManageTemplate(templateId: string, user: { sub: string; role: Role }) {
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) {
    throw new NotFoundError('Template not found');
  }
  if (user.role !== Role.ADMIN && template.createdById !== user.sub) {
    throw new ForbiddenError('You can only manage your own templates');
  }
  return template;
}

export async function refreshTemplateRating(templateId: string) {
  const agg = await prisma.templateRating.aggregate({
    where: { templateId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.template.update({
    where: { id: templateId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      ratingCount: agg._count,
    },
  });
  await invalidateTemplateCache();
}
