import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AI_SUGGESTIONS } from '@sheetomate/shared';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/http';
import { enqueueAiJob } from '../services/aiQueue';
import { countToday, getDailyLimit } from '../services/aiPipeline';
import { detectCategory, detectIndustry } from '../ai/prompts';
import { withCdn } from '../services/templateService';
import { invalidateTemplateCache } from '../services/cacheService';
import {
  aiFeedbackSchema,
  aiGenerateSchema,
  aiPublishSchema,
  aiRefineSchema,
} from '../validators/schemas';

async function assertOwner(id: string, userId: string, role: Role) {
  const request = await prisma.aIRequest.findUnique({
    where: { id },
    include: { generatedTemplate: true },
  });
  if (!request) throw new NotFoundError('Generation request not found');
  if (request.userId !== userId && role !== Role.ADMIN) {
    throw new ForbiddenError();
  }
  return request;
}

export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiGenerateSchema.parse(req.body);
    const limit = await getDailyLimit(req.user!.role);
    const used = await countToday(req.user!.sub);
    if (used >= limit) {
      throw new ValidationError(`Daily AI limit reached (${limit}). Try again tomorrow.`);
    }

    const industry = detectIndustry(body.prompt, body.industry);
    const category = detectCategory(body.prompt, body.category);
    const request = await prisma.aIRequest.create({
      data: {
        userId: req.user!.sub,
        prompt: body.prompt,
        category,
        industry,
        status: 'PENDING',
        progress: 'queued',
      },
    });
    await enqueueAiJob(request.id);
    return sendSuccess(res, { request }, 202, 'Generation queued');
  } catch (error) {
    next(error);
  }
}

export async function refine(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiRefineSchema.parse(req.body);
    const parent = await assertOwner(body.requestId, req.user!.sub, req.user!.role);
    if (parent.status !== 'COMPLETED') {
      throw new ValidationError('You can only refine a completed generation');
    }
    const limit = await getDailyLimit(req.user!.role);
    const used = await countToday(req.user!.sub);
    if (used >= limit) {
      throw new ValidationError(`Daily AI limit reached (${limit}).`);
    }

    const request = await prisma.aIRequest.create({
      data: {
        userId: req.user!.sub,
        prompt: body.prompt,
        category: parent.category,
        industry: parent.industry,
        parentRequestId: parent.id,
        status: 'PENDING',
        progress: 'queued',
      },
    });
    await enqueueAiJob(request.id);
    return sendSuccess(res, { request }, 202, 'Refinement queued');
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await assertOwner(String(req.params.requestId), req.user!.sub, req.user!.role);
    return sendSuccess(res, {
      request: {
        id: request.id,
        status: request.status,
        progress: request.progress,
        errorMessage: request.errorMessage,
        tokensUsed: request.tokensUsed,
        costUsd: request.costUsd,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function streamStatus(req: Request, res: Response, next: NextFunction) {
  try {
    await assertOwner(String(req.params.requestId), req.user!.sub, req.user!.role);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const timer = setInterval(() => {
      void (async () => {
        const current = await prisma.aIRequest.findUnique({
          where: { id: String(req.params.requestId) },
        });
        if (!current) return;
        res.write(`data: ${JSON.stringify({ status: current.status, progress: current.progress })}\n\n`);
        if (current.status === 'COMPLETED' || current.status === 'FAILED') {
          clearInterval(timer);
          res.end();
        }
      })();
    }, 1000);

    req.on('close', () => clearInterval(timer));
  } catch (error) {
    next(error);
  }
}

export async function getResult(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await assertOwner(String(req.params.requestId), req.user!.sub, req.user!.role);
    if (request.status !== 'COMPLETED' || !request.generatedTemplate) {
      throw new ValidationError('Result is not ready yet');
    }
    return sendSuccess(res, {
      request,
      template: withCdn(request.generatedTemplate),
    });
  } catch (error) {
    next(error);
  }
}

export async function feedback(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiFeedbackSchema.parse(req.body);
    await assertOwner(body.requestId, req.user!.sub, req.user!.role);
    const updated = await prisma.aIRequest.update({
      where: { id: body.requestId },
      data: { feedback: body.rating },
    });
    return sendSuccess(res, { request: updated });
  } catch (error) {
    next(error);
  }
}

export async function publishGenerated(req: Request, res: Response, next: NextFunction) {
  try {
    const body = aiPublishSchema.parse(req.body);
    const request = await assertOwner(body.requestId, req.user!.sub, req.user!.role);
    if (!request.generatedTemplateId) {
      throw new ValidationError('Nothing to publish yet');
    }
    const template = await prisma.template.update({
      where: { id: request.generatedTemplateId },
      data: {
        published: true,
        price: body.price ?? 0,
        title: body.title,
      },
    });
    await prisma.aIRequest.update({
      where: { id: request.id },
      data: { publishedAt: new Date() },
    });
    await invalidateTemplateCache();
    return sendSuccess(res, { template: withCdn(template) }, 200, 'Published to marketplace');
  } catch (error) {
    next(error);
  }
}

export async function suggestions(_req: Request, res: Response, next: NextFunction) {
  try {
    const db = await prisma.aIPromptTemplate.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    const items = db.length
      ? db.map((row) => ({
          id: row.slug,
          title: row.title,
          category: row.category,
          industry: row.industry,
          prompt: row.examplePrompt,
        }))
      : [...AI_SUGGESTIONS];
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function myAiRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.aIRequest.findMany({
      where: { userId: req.user!.sub },
      include: { generatedTemplate: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const limit = await getDailyLimit(req.user!.role);
    const used = await countToday(req.user!.sub);
    return sendSuccess(res, { items, usage: { used, limit } });
  } catch (error) {
    next(error);
  }
}

export const createAiRequest = generate;
