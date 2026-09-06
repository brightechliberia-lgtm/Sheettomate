import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { NotFoundError } from '../utils/errors';
import { CONNECTOR_CATALOG } from '../automations/connectors';
import { cronMatches } from '../automations/logic';
import { ocrStub, parseCsv, rowsToCsv, rowsToJson, rowsToPdf } from '../automations/export';
import { enqueueAutomation } from '../services/automationQueue';
import { installTemplate, listTemplates, triggerEvent } from '../services/workflowEngine';
import { generateApiKey } from '../middleware/apiKey';
import { env } from '../config/env';

const stepSchema = z.object({
  id: z.string(),
  type: z.enum(['condition', 'email', 'sms', 'slack', 'whatsapp', 'webhook', 'drive', 'crm', 'quickbooks', 'sheets', 'export']),
  config: z.record(z.string()),
});

const workflowSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  triggerType: z.enum(['SCHEDULE', 'WEBHOOK', 'EVENT', 'MANUAL']),
  triggerConfig: z.record(z.string()).optional(),
  steps: z.array(stepSchema).max(20),
});

export async function catalog(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, { connectors: CONNECTOR_CATALOG, templates: listTemplates(), cronOk: cronMatches('* * * * *') });
  } catch (error) {
    next(error);
  }
}

export async function listWorkflows(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.automationWorkflow.findMany({
      where: { userId: req.user!.sub },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function createWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const body = workflowSchema.parse(req.body);
    const item = await prisma.automationWorkflow.create({
      data: {
        userId: req.user!.sub,
        name: body.name,
        description: body.description ?? '',
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig ?? {},
        steps: body.steps,
        enabled: body.enabled ?? true,
      },
    });
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.automationWorkflow.findFirst({ where: { id: String(req.params.id), userId: req.user!.sub } });
    if (!existing) throw new NotFoundError();
    const body = workflowSchema.partial().parse(req.body);
    const item = await prisma.automationWorkflow.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.triggerType ? { triggerType: body.triggerType } : {}),
        ...(body.triggerConfig ? { triggerConfig: body.triggerConfig } : {}),
        ...(body.steps ? { steps: body.steps } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      },
    });
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.automationWorkflow.deleteMany({ where: { id: String(req.params.id), userId: req.user!.sub } });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function getWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.automationWorkflow.findFirst({
      where: { id: String(req.params.id), userId: req.user!.sub },
      include: { runs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!item) throw new NotFoundError();
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function runNow(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await prisma.automationWorkflow.findFirst({ where: { id: String(req.params.id), userId: req.user!.sub } });
    if (!item) throw new NotFoundError();
    const payload = (req.body?.payload as Record<string, unknown>) ?? { source: 'manual' };
    await enqueueAutomation(item.id, payload);
    return sendSuccess(res, { queued: true });
  } catch (error) {
    next(error);
  }
}

export async function install(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = z.string().parse(req.body.slug);
    const item = await installTemplate(req.user!.sub, slug);
    if (!item) throw new NotFoundError('Unknown template');
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function listWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.outboundWebhook.findMany({
      where: { userId: req.user!.sub },
      include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 8 } },
    });
    const inbound = await prisma.inboundHook.findMany({ where: { userId: req.user!.sub } });
    return sendSuccess(res, { items, inbound });
  } catch (error) {
    next(error);
  }
}

export async function createWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ name: z.string().min(2), url: z.string().url(), events: z.array(z.string()).optional() }).parse(req.body);
    const item = await prisma.outboundWebhook.create({
      data: {
        userId: req.user!.sub,
        name: body.name,
        url: body.url,
        events: body.events ?? ['*'],
        secret: crypto.randomBytes(16).toString('hex'),
      },
    });
    return sendSuccess(res, { item }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.outboundWebhook.findFirst({ where: { id: String(req.params.id), userId: req.user!.sub } });
    if (!existing) throw new NotFoundError();
    const body = z.object({ name: z.string().optional(), url: z.string().url().optional(), enabled: z.boolean().optional(), events: z.array(z.string()).optional() }).parse(req.body);
    const item = await prisma.outboundWebhook.update({ where: { id: existing.id }, data: body });
    return sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.outboundWebhook.deleteMany({ where: { id: String(req.params.id), userId: req.user!.sub } });
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function testWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.outboundWebhook.findFirst({ where: { id: String(req.params.id), userId: req.user!.sub } });
    if (!existing) throw new NotFoundError();
    const { enqueueWebhookDelivery } = await import('../services/automationQueue');
    await enqueueWebhookDelivery(existing.id, 'test', { ping: true, at: new Date().toISOString() });
    return sendSuccess(res, { queued: true });
  } catch (error) {
    next(error);
  }
}

export async function retryDelivery(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await prisma.webhookDelivery.findFirst({
      where: { id: String(req.params.id), webhook: { userId: req.user!.sub } },
      include: { webhook: true },
    });
    if (!row) throw new NotFoundError();
    const payload = JSON.parse(row.requestBody) as { payload?: Record<string, unknown> };
    const { enqueueWebhookDelivery } = await import('../services/automationQueue');
    await enqueueWebhookDelivery(row.webhookId, row.event, payload.payload ?? {}, row.attempts + 1);
    return sendSuccess(res, { queued: true });
  } catch (error) {
    next(error);
  }
}

export async function createInbound(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ name: z.string().min(2), workflowId: z.string().optional() }).parse(req.body);
    const token = crypto.randomBytes(18).toString('hex');
    const item = await prisma.inboundHook.create({
      data: { userId: req.user!.sub, name: body.name, workflowId: body.workflowId, token },
    });
    return sendSuccess(res, { item, url: `${env.publicApiUrl}/api/automations/hooks/${token}` }, 201);
  } catch (error) {
    next(error);
  }
}

export async function inboundFire(req: Request, res: Response, next: NextFunction) {
  try {
    const hook = await prisma.inboundHook.findUnique({ where: { token: String(req.params.token) } });
    if (!hook) throw new NotFoundError('Unknown hook');
    const payload = (req.body ?? {}) as Record<string, unknown>;
    if (hook.workflowId) await enqueueAutomation(hook.workflowId, payload);
    else await triggerEvent(hook.userId, 'form', payload);
    return sendSuccess(res, { accepted: true });
  } catch (error) {
    next(error);
  }
}

export async function listKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.apiKey.findMany({
      where: { userId: req.user!.sub },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function createKey(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ name: z.string().min(2), scopes: z.array(z.string()).min(1) }).parse(req.body);
    const gen = generateApiKey();
    await prisma.apiKey.create({
      data: { userId: req.user!.sub, name: body.name, prefix: gen.prefix, keyHash: gen.hash, scopes: body.scopes },
    });
    return sendSuccess(res, { key: gen.raw, prefix: gen.prefix }, 201, 'Copy this key now; it will not be shown again.');
  } catch (error) {
    next(error);
  }
}

export async function revokeKey(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.apiKey.updateMany({ where: { id: String(req.params.id), userId: req.user!.sub }, data: { revokedAt: new Date() } });
    return sendSuccess(res, { revoked: true });
  } catch (error) {
    next(error);
  }
}

export async function oauthStart(req: Request, res: Response, next: NextFunction) {
  try {
    const provider = String(req.params.provider);
    const redirect = `${env.publicApiUrl}/api/automations/oauth/${provider}/callback`;
    const url =
      provider === 'google'
        ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.googleClientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=https://www.googleapis.com/auth/drive.file%20https://www.googleapis.com/auth/spreadsheets&state=${req.user!.sub}`
        : `${env.clientOrigin}/automations/oauth?provider=${provider}&sandbox=1`;
    return sendSuccess(res, { url, sandbox: !env.googleClientId });
  } catch (error) {
    next(error);
  }
}

export async function oauthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const provider = String(req.params.provider);
    const userId = String(req.query.state || req.user?.sub || '');
    if (!userId) throw new NotFoundError();
    await prisma.oAuthConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, accessToken: `sandbox_${crypto.randomBytes(8).toString('hex')}`, scopes: ['drive:write'] },
      update: { accessToken: `sandbox_${crypto.randomBytes(8).toString('hex')}` },
    });
    res.redirect(`${env.clientOrigin}/automations?oauth=${provider}`);
  } catch (error) {
    next(error);
  }
}

export async function listOauth(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.oAuthConnection.findMany({
      where: { userId: req.user!.sub },
      select: { provider: true, scopes: true, createdAt: true },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function importData(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const text = typeof req.body?.csv === 'string' ? req.body.csv : file ? undefined : '';
    let rows: string[][] = [];
    let ocr = '';
    if (file) {
      const parsed = ocrStub(file.originalname, file.mimetype, file.buffer);
      rows = parsed.rows;
      ocr = parsed.text;
    } else if (text) {
      rows = parseCsv(text);
    }
    await triggerEvent(req.user!.sub, 'sheet.change', { rows, stock: Number(rows[1]?.[1] ?? 0), item: rows[1]?.[0] ?? 'item' });
    return sendSuccess(res, { rows, ocr, json: rowsToJson(rows) });
  } catch (error) {
    next(error);
  }
}

export async function exportData(req: Request, res: Response, next: NextFunction) {
  try {
    const format = String(req.query.format ?? 'json');
    const rows = (req.body?.rows as string[][]) ?? [['metric', 'value'], ['sales', '1200'], ['target', '1000']];
    if (format === 'csv') {
      res.type('text/csv').send(rowsToCsv(rows));
      return;
    }
    if (format === 'pdf') {
      res.type('application/pdf').send(Buffer.from(rowsToPdf(rows)));
      return;
    }
    return sendSuccess(res, { json: rowsToJson(rows), sheets: 'Use Google OAuth then Drive step to sync.' });
  } catch (error) {
    next(error);
  }
}

export async function audit(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.automationEvent.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function fireEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const event = z.string().parse(req.body.event);
    await triggerEvent(req.user!.sub, event, (req.body.payload ?? {}) as Record<string, unknown>);
    return sendSuccess(res, { fired: true });
  } catch (error) {
    next(error);
  }
}
