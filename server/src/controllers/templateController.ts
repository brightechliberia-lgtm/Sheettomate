import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { TEMPLATE_CATEGORIES } from '@sheetomate/shared';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/http';
import { publicAssetUrl, resolveLocalFile, storeTemplateFile } from '../services/storageService';
import { generateSheetPreview } from '../services/previewService';
import { invalidateTemplateCache } from '../services/cacheService';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { hashToken } from '../services/tokenService';
import { notifyMatchingTemplate } from '../services/notificationService';
import { createGoogleSheetFromUpload, googleSheetsConfigured } from '../services/googleSheetsService';
import {
  assertCanManageTemplate,
  listPublishedTemplates,
  refreshTemplateRating,
  searchTemplates,
  withCdn,
} from '../services/templateService';
import {
  answerSchema,
  createTemplateSchema,
  questionSchema,
  ratingSchema,
  templateListQuerySchema,
  templateSearchSchema,
  updateTemplateSchema,
} from '../validators/schemas';

function filesOf(req: Request) {
  const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
  return {
    file: files?.file?.[0] ?? req.file,
    preview: files?.preview?.[0],
  };
}

async function persistUploads(req: Request, existing?: { fileUrl?: string; previewUrl?: string | null; fileKey?: string | null; previewKey?: string | null; rows?: number | null; columns?: number | null }) {
  const { file, preview } = filesOf(req);
  let fileUrl = existing?.fileUrl;
  let fileKey = existing?.fileKey ?? undefined;
  let previewUrl = existing?.previewUrl ?? undefined;
  let previewKey = existing?.previewKey ?? undefined;
  let rows = existing?.rows ?? undefined;
  let columns = existing?.columns ?? undefined;

  if (file) {
    const stored = await storeTemplateFile(file, 'templates/files');
    fileUrl = stored.url;
    fileKey = stored.key;
    const generated = await generateSheetPreview(file);
    if (generated) {
      rows = generated.rows;
      columns = generated.columns;
      const previewFile = {
        ...file,
        originalname: `${path.parse(file.originalname).name}-preview.svg`,
        mimetype: 'image/svg+xml',
        buffer: generated.svg,
      } as Express.Multer.File;
      const previewStored = await storeTemplateFile(previewFile, 'templates/previews');
      previewUrl = previewStored.url;
      previewKey = previewStored.key;
    }
  }

  if (preview) {
    const stored = await storeTemplateFile(preview, 'templates/previews');
    previewUrl = stored.url;
    previewKey = stored.key;
  }

  return { fileUrl, fileKey, previewUrl, previewKey, rows, columns };
}

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const query = templateListQuerySchema.parse(req.query);
    const payload = await listPublishedTemplates(query);
    return sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
}

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const counts = await prisma.template.groupBy({
      by: ['category'],
      where: { published: true },
      _count: true,
    });
    const items = TEMPLATE_CATEGORIES.map((name) => ({
      name,
      count: counts.find((row) => row.category === name)?._count ?? 0,
    }));
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function searchTemplatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, limit } = templateSearchSchema.parse(req.query);
    const payload = await searchTemplates(q, limit);
    return sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: String(req.params.id) },
      include: {
        createdBy: { select: { id: true, name: true } },
        questions: {
          include: {
            user: { select: { id: true, name: true } },
            answers: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    return sendSuccess(res, { template: withCdn(template) });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createTemplateSchema.parse(req.body);
    const uploads = await persistUploads(req);
    const fileUrl = body.fileUrl || uploads.fileUrl;
    if (!fileUrl) {
      throw new ValidationError('Choose an .xlsx or .csv file to upload.');
    }

    let demoUrl = body.demoUrl || null;
    const uploadFile = filesOf(req).file;
    if (body.createGoogleSheet) {
      if (!uploadFile) {
        throw new ValidationError('Upload a spreadsheet file to auto-create Google Sheets.');
      }
      if (!googleSheetsConfigured()) {
        throw new ValidationError(
          'Google Sheets auto-create is not configured on the server. Ask an admin to set GOOGLE_SHEETS_REFRESH_TOKEN or a service account.',
        );
      }
      const sheet = await createGoogleSheetFromUpload(uploadFile, body.title);
      if (!sheet?.url) {
        throw new ValidationError('Could not create the Google Sheet. Try again or upload without that option.');
      }
      demoUrl = sheet.url;
    }

    const template = await prisma.template.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        tags: body.tags ?? [],
        price: body.price,
        fileUrl,
        fileKey: uploads.fileKey,
        previewUrl: body.previewUrl || uploads.previewUrl,
        previewKey: uploads.previewKey,
        demoUrl,
        videoTutorial: body.videoTutorial || null,
        rows: body.rows ?? uploads.rows,
        columns: body.columns ?? uploads.columns,
        softwareRequired: body.softwareRequired ?? 'Excel / Google Sheets',
        version: body.version ?? '1.0',
        language: body.language ?? 'en',
        isAiGenerated: body.isAiGenerated ?? false,
        published: body.published ?? true,
        createdById: req.user!.sub,
      },
    });
    await invalidateTemplateCache();
    void notifyMatchingTemplate(template);
    const { awardBadge, maybeTopCreator, logActivity, BADGES } = await import('../services/communityService');
    await awardBadge(req.user!.sub, BADGES.FIRST_TEMPLATE);
    await maybeTopCreator(req.user!.sub);
    await logActivity(req.user!.sub, 'TEMPLATE', `shared ${template.title}`, `/templates/${template.id}`);
    logger.info('Template created', { id: template.id, createdBy: req.user!.sub });
    return sendSuccess(res, { template: withCdn(template) }, 201, 'Template published');
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await assertCanManageTemplate(String(req.params.id), req.user!);
    const body = updateTemplateSchema.parse(req.body);
    const uploads = await persistUploads(req, existing);

    let demoUrl = body.demoUrl === '' ? null : body.demoUrl ?? existing.demoUrl;
    const uploadFile = filesOf(req).file;
    if (body.createGoogleSheet) {
      if (!uploadFile) {
        throw new ValidationError('Upload a new spreadsheet file to regenerate the Google Sheet.');
      }
      if (!googleSheetsConfigured()) {
        throw new ValidationError(
          'Google Sheets auto-create is not configured on the server. Ask an admin to set GOOGLE_SHEETS_REFRESH_TOKEN or a service account.',
        );
      }
      const sheet = await createGoogleSheetFromUpload(uploadFile, body.title ?? existing.title);
      if (!sheet?.url) {
        throw new ValidationError('Could not create the Google Sheet. Try again or save without that option.');
      }
      demoUrl = sheet.url;
    }

    const { createGoogleSheet: _createGoogleSheet, ...rest } = body;
    const template = await prisma.template.update({
      where: { id: existing.id },
      data: {
        ...rest,
        tags: body.tags,
        fileUrl: uploads.fileUrl ?? existing.fileUrl,
        fileKey: uploads.fileKey ?? existing.fileKey,
        previewUrl: body.previewUrl || uploads.previewUrl || existing.previewUrl,
        previewKey: uploads.previewKey ?? existing.previewKey,
        demoUrl,
        videoTutorial: body.videoTutorial === '' ? null : body.videoTutorial ?? existing.videoTutorial,
        rows: body.rows ?? uploads.rows ?? existing.rows,
        columns: body.columns ?? uploads.columns ?? existing.columns,
      },
    });
    await invalidateTemplateCache();
    logger.info('Template updated', { id: template.id });
    return sendSuccess(res, { template: withCdn(template) });
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await assertCanManageTemplate(String(req.params.id), req.user!);
    await prisma.template.delete({ where: { id: existing.id } });
    await invalidateTemplateCache();
    logger.info('Template deleted', { id: existing.id });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function getPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await prisma.template.findUnique({ where: { id: String(req.params.id) } });
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    return sendSuccess(res, {
      previewUrl: template.previewUrl ? publicAssetUrl(template.previewUrl) : null,
      demoUrl: template.demoUrl,
      videoTutorial: template.videoTutorial,
    });
  } catch (error) {
    next(error);
  }
}

async function userCanDownload(userId: string, role: Role, template: { id: string; createdById: string; price: PrismaDecimal }) {
  if (role === Role.ADMIN || template.createdById === userId || Number(template.price) === 0) {
    return true;
  }
  const paid = await prisma.templateDownload.findFirst({
    where: { userId, templateId: template.id, payment: { status: 'COMPLETED' } },
  });
  return Boolean(paid);
}

type PrismaDecimal = { toString(): string } | number;

export async function initiateDownload(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await prisma.template.findUnique({ where: { id: String(req.params.id) } });
    if (!template) {
      throw new NotFoundError('Template not found');
    }
    if (!(await userCanDownload(req.user!.sub, req.user!.role, template))) {
      throw new ForbiddenError('Purchase this template before downloading');
    }

    const raw = crypto.randomBytes(32).toString('hex');
    await prisma.downloadToken.create({
      data: {
        tokenHash: hashToken(raw),
        userId: req.user!.sub,
        templateId: template.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    logger.info('Download token issued', { templateId: template.id, userId: req.user!.sub });
    return sendSuccess(res, {
      token: raw,
      downloadUrl: `${env.publicApiUrl.replace(/\/$/, '')}/api/templates/download/${raw}`,
      expiresInSeconds: 600,
    });
  } catch (error) {
    next(error);
  }
}

export async function consumeDownload(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = String(req.params.token);
    const record = await prisma.downloadToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { template: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Download link is invalid or expired');
    }

    await prisma.$transaction([
      prisma.downloadToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.template.update({
        where: { id: record.templateId },
        data: { downloadCount: { increment: 1 } },
      }),
      prisma.templateDownload.create({
        data: { userId: record.userId, templateId: record.templateId },
      }),
    ]);
    await invalidateTemplateCache();

    const local = resolveLocalFile(record.template.fileUrl, record.template.fileKey);
    if (local && fs.existsSync(local)) {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(local)}"`);
      return fs.createReadStream(local).pipe(res);
    }

    return res.redirect(publicAssetUrl(record.template.fileUrl));
  } catch (error) {
    next(error);
  }
}

export async function rateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ratingSchema.parse(req.body);
    const templateId = String(req.params.id);
    await prisma.templateRating.upsert({
      where: { userId_templateId: { userId: req.user!.sub, templateId } },
      create: { userId: req.user!.sub, templateId, rating: body.rating, comment: body.comment },
      update: { rating: body.rating, comment: body.comment },
    });
    await refreshTemplateRating(templateId);
    const tpl = await prisma.template.findUnique({ where: { id: templateId } });
    if (tpl) {
      const { bumpReputation, logActivity } = await import('../services/communityService');
      await bumpReputation(tpl.createdById, 2);
      await logActivity(req.user!.sub, 'REVIEW', `reviewed ${tpl.title}`, `/templates/${templateId}`);
    }
    return sendSuccess(res, { rated: true });
  } catch (error) {
    next(error);
  }
}

export async function askQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { body } = questionSchema.parse(req.body);
    const question = await prisma.templateQuestion.create({
      data: { body, userId: req.user!.sub, templateId: String(req.params.id) },
    });
    return sendSuccess(res, { question }, 201);
  } catch (error) {
    next(error);
  }
}

export async function answerQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    await assertCanManageTemplate(String(req.params.id), req.user!);
    const { body } = answerSchema.parse(req.body);
    const question = await prisma.templateQuestion.findFirst({
      where: { id: String(req.params.questionId), templateId: String(req.params.id) },
    });
    if (!question) {
      throw new NotFoundError('Question not found');
    }
    const answer = await prisma.templateAnswer.create({
      data: { body, questionId: question.id, userId: req.user!.sub },
    });
    return sendSuccess(res, { answer }, 201);
  } catch (error) {
    next(error);
  }
}
