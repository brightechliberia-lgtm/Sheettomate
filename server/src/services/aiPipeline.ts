import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { cacheGet, cacheSet, invalidateTemplateCache } from './cacheService';
import { storeTemplateFile } from './storageService';
import { generatePreviewFromBuffer } from './previewService';
import { buildSystemPrompt, buildUserPrompt, detectCategory, detectIndustry } from '../ai/prompts';
import { generateWorkbookSpec } from '../ai/llmClient';
import { buildWorkbookBuffer } from '../ai/excelBuilder';
import type { WorkbookSpec } from '../ai/spec';

async function setting(key: string, fallback: string): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getDailyLimit(role: Role): Promise<number> {
  if (role === Role.ADMIN) return Number(await setting('ai.dailyLimit.admin', String(env.aiDailyLimitAdmin)));
  if (role === Role.CREATOR) return Number(await setting('ai.dailyLimit.creator', String(env.aiDailyLimitCreator)));
  return Number(await setting('ai.dailyLimit.user', String(env.aiDailyLimitUser)));
}

export async function countToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.aIRequest.count({
    where: {
      userId,
      createdAt: { gte: start },
      status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
    },
  });
}

export async function processAiGeneration(requestId: string): Promise<void> {
  const request = await prisma.aIRequest.findUnique({
    where: { id: requestId },
    include: { parent: true },
  });
  if (!request) return;

  try {
    await prisma.aIRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING', progress: 'parse' },
    });

    const industry = detectIndustry(request.prompt, request.industry ?? undefined);
    const category = detectCategory(request.prompt, request.category ?? undefined);
    const cacheKey = `ai:spec:${crypto.createHash('sha256').update(`${industry}:${request.prompt.toLowerCase().trim()}`).digest('hex')}`;

    await prisma.aIRequest.update({
      where: { id: requestId },
      data: { progress: 'generate', category, industry },
    });

    let spec = request.parent?.specJson
      ? undefined
      : await cacheGet<WorkbookSpec>(cacheKey);

    const templateRow = await prisma.aIPromptTemplate.findFirst({
      where: { enabled: true, industry },
      orderBy: { sortOrder: 'asc' },
    });

    const llm = await generateWorkbookSpec({
      system: buildSystemPrompt(industry, templateRow?.systemPrompt),
      user: buildUserPrompt(request.prompt, industry, request.parent?.specJson ?? spec),
      prompt: request.prompt,
    });
    spec = llm.spec;

    if (llm.provider !== 'fallback' && !request.parentRequestId) {
      await cacheSet(cacheKey, spec, 60 * 60 * 12);
    }

    await prisma.aIRequest.update({
      where: { id: requestId },
      data: { progress: 'preview', specJson: spec as object, tokensUsed: llm.tokensUsed, costUsd: llm.costUsd },
    });

    const xlsx = await buildWorkbookBuffer(spec);
    const stored = await storeTemplateFile(
      {
        originalname: `${spec.title.replace(/\s+/g, '-').slice(0, 40)}.xlsx`,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: xlsx,
      } as Express.Multer.File,
      'templates/ai',
    );

    const preview = await generatePreviewFromBuffer(xlsx);
    let previewUrl: string | undefined;
    let previewKey: string | undefined;
    if (preview) {
      const previewStored = await storeTemplateFile(
        {
          originalname: 'preview.svg',
          mimetype: 'image/svg+xml',
          buffer: preview.svg,
        } as Express.Multer.File,
        'templates/previews',
      );
      previewUrl = previewStored.url;
      previewKey = previewStored.key;
    }

    await prisma.aIRequest.update({ where: { id: requestId }, data: { progress: 'save' } });

    const template = await prisma.template.create({
      data: {
        title: spec.title,
        description: spec.description,
        category: spec.category || category,
        tags: Array.from(
          new Set([...(spec.tags ?? []), 'ai-generated', llm.provider === 'fallback' ? 'ai-starter' : 'ai-llm']),
        ),
        price: 0,
        fileUrl: stored.url,
        fileKey: stored.key,
        previewUrl,
        previewKey,
        rows: preview?.rows,
        columns: preview?.columns,
        softwareRequired: 'Excel / Google Sheets',
        isAiGenerated: true,
        published: false,
        createdById: request.userId,
      },
    });

    await prisma.aIRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        progress: llm.provider === 'fallback' ? 'done:starter' : 'done',
        generatedTemplateId: template.id,
        tokensUsed: llm.tokensUsed,
        costUsd: llm.costUsd,
      },
    });
    await invalidateTemplateCache();
    logger.info('AI workbook generated', { requestId, provider: llm.provider, templateId: template.id });
    const { notify } = await import('./notificationService');
    await notify(
      request.userId,
      'AI_DONE',
      'Template generation complete',
      `${template.title} is ready to preview.`,
      `/templates/${template.id}`,
    );
  } catch (error) {
    logger.error('AI generation job failed', { requestId, error });
    await prisma.aIRequest.update({
      where: { id: requestId },
      data: {
        status: 'FAILED',
        progress: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Generation failed',
      },
    });
  }
}
