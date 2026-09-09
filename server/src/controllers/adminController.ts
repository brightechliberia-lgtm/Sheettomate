import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { updateRoleSchema, aiPromptTemplateSchema, aiSettingsSchema, adminUpdateUserSchema } from '../validators/schemas';
import { toPublicUser } from '../utils/userMapper';
import { revokeAllRefreshTokens } from '../services/tokenService';
import { getAiProviderStatus } from '../ai/providers';
import { pingAiProvider } from '../ai/llmClient';
import { z } from 'zod';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
    const items = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, { items: items.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = updateRoleSchema.parse(req.body);
    const id = String(req.params.id);
    if (id === req.user!.sub && role !== Role.ADMIN) {
      throw new ForbiddenError('You cannot remove your own admin role');
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role },
    });
    return sendSuccess(res, { user: toPublicUser(updated) });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const body = adminUpdateUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User not found');

    if (body.role && id === req.user!.sub && body.role !== Role.ADMIN) {
      throw new ForbiddenError('You cannot remove your own admin role');
    }
    if (body.email && body.email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email } });
      if (taken) throw new ConflictError('Email already in use');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
      },
    });
    return sendSuccess(res, { user: toPublicUser(updated) });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (id === req.user!.sub) {
      throw new ForbiddenError('You cannot delete your own account from admin tools');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { templates: true, instructedCourses: true } } },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user._count.templates > 0 || user._count.instructedCourses > 0) {
      throw new ConflictError('Reassign or remove this user\'s templates and courses before deleting');
    }

    await revokeAllRefreshTokens(id);
    await prisma.user.delete({ where: { id } });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function aiUsage(_req: Request, res: Response, next: NextFunction) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [today, totals, byStatus, recent] = await Promise.all([
      prisma.aIRequest.aggregate({
        where: { createdAt: { gte: start } },
        _count: true,
        _sum: { tokensUsed: true, costUsd: true },
      }),
      prisma.aIRequest.aggregate({
        _count: true,
        _sum: { tokensUsed: true, costUsd: true },
      }),
      prisma.aIRequest.groupBy({ by: ['status'], _count: true }),
      prisma.aIRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);
    const settings = await prisma.platformSetting.findMany();
    return sendSuccess(res, {
      today,
      totals,
      byStatus,
      recent,
      settings,
      providers: getAiProviderStatus(),
    });
  } catch (error) {
    next(error);
  }
}

export async function listPromptTemplates(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.aIPromptTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function upsertPromptTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiPromptTemplateSchema.parse(req.body);
    const slug = body.slug ?? body.title.toLowerCase().replace(/\s+/g, '-').slice(0, 80);
    const item = await prisma.aIPromptTemplate.upsert({
      where: { slug },
      create: {
        slug,
        title: body.title,
        category: body.category,
        industry: body.industry,
        examplePrompt: body.examplePrompt,
        systemPrompt: body.systemPrompt,
        enabled: body.enabled ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
      update: {
        title: body.title,
        category: body.category,
        industry: body.industry,
        examplePrompt: body.examplePrompt,
        systemPrompt: body.systemPrompt,
        enabled: body.enabled,
        sortOrder: body.sortOrder,
      },
    });
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function deletePromptTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.aIPromptTemplate.delete({ where: { id: String(req.params.id) } });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function updateAiSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiSettingsSchema.parse(req.body);
    const writes = [
      body.dailyLimitUser !== undefined
        ? prisma.platformSetting.upsert({
            where: { key: 'ai.dailyLimit.user' },
            create: { key: 'ai.dailyLimit.user', value: String(body.dailyLimitUser) },
            update: { value: String(body.dailyLimitUser) },
          })
        : null,
      body.dailyLimitCreator !== undefined
        ? prisma.platformSetting.upsert({
            where: { key: 'ai.dailyLimit.creator' },
            create: { key: 'ai.dailyLimit.creator', value: String(body.dailyLimitCreator) },
            update: { value: String(body.dailyLimitCreator) },
          })
        : null,
      body.dailyLimitAdmin !== undefined
        ? prisma.platformSetting.upsert({
            where: { key: 'ai.dailyLimit.admin' },
            create: { key: 'ai.dailyLimit.admin', value: String(body.dailyLimitAdmin) },
            update: { value: String(body.dailyLimitAdmin) },
          })
        : null,
    ].filter(Boolean);
    await Promise.all(writes.filter((item) => item !== null));
    return sendSuccess(res, { saved: true });
  } catch (error) {
    next(error);
  }
}

const aiTestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).default('openai'),
});

export async function testAiProvider(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiTestSchema.parse(req.body ?? {});
    const result = await pingAiProvider(body.provider);
    return sendSuccess(res, { result, providers: getAiProviderStatus() }, result.ok ? 200 : 502, result.message);
  } catch (error) {
    next(error);
  }
}
