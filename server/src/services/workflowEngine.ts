import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { publishToUser } from '../realtime';
import { AUTOMATION_TEMPLATES, evaluateCondition, type WorkflowStep } from '../automations/logic';
import {
  exportQuickBooks,
  saveToDrive,
  sendEmailReport,
  sendSlack,
  sendSms,
  sendWhatsApp,
  signWebhookBody,
  syncCrm,
} from '../automations/connectors';
import { interpolate, rowsToCsv, rowsToPdf } from '../automations/export';

export async function appendEvent(userId: string, type: string, stream: string, payload: Record<string, unknown>) {
  await prisma.automationEvent.create({ data: { userId, type, stream, payload: payload as Prisma.InputJsonValue } });
}

function asSteps(raw: unknown): WorkflowStep[] {
  return Array.isArray(raw) ? (raw as WorkflowStep[]) : [];
}

export async function runWorkflow(workflowId: string, payload: Record<string, unknown>) {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { id: workflowId }, include: { user: true } });
  if (!workflow || !workflow.enabled) return null;
  const run = await prisma.automationRun.create({
    data: { workflowId, status: 'RUNNING', payload: payload as Prisma.InputJsonValue },
  });
  const ctx: Record<string, unknown> = {
    ...payload,
    user: { email: workflow.user.email, phone: workflow.user.phone, name: workflow.user.name },
  };
  const logs: unknown[] = [];
  try {
    await appendEvent(workflow.userId, 'run.started', `workflow:${workflow.id}`, { runId: run.id });
    for (const step of asSteps(workflow.steps)) {
      const result = await executeStep(step, ctx, workflow.userId);
      logs.push(result);
      if (step.type === 'condition' && result && typeof result === 'object' && 'ok' in result && !(result as { ok: boolean }).ok) {
        break;
      }
    }
    const updated = await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', result: logs as object[], finishedAt: new Date() },
    });
    await appendEvent(workflow.userId, 'run.completed', `workflow:${workflow.id}`, { runId: run.id });
    publishToUser(workflow.userId, { type: 'automation', runId: run.id, status: 'COMPLETED', name: workflow.name });
    await fanOutOutbound(workflow.userId, 'automation.completed', { workflowId, runId: run.id, name: workflow.name });
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Run failed';
    logger.warn('Automation run failed', { workflowId, error: message });
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    });
    await appendEvent(workflow.userId, 'run.failed', `workflow:${workflow.id}`, { runId: run.id, error: message });
    publishToUser(workflow.userId, { type: 'automation', runId: run.id, status: 'FAILED' });
    return null;
  }
}

async function executeStep(step: WorkflowStep, ctx: Record<string, unknown>, userId: string) {
  const cfg = Object.fromEntries(Object.entries(step.config).map(([k, v]) => [k, interpolate(v, ctx)]));
  switch (step.type) {
    case 'condition':
      return { type: 'condition', ok: evaluateCondition(ctx, cfg.field, cfg.op, cfg.value) };
    case 'email':
      return sendEmailReport(cfg.to, cfg.subject || 'Sheettomate', `<p>${cfg.body || ''}</p>`);
    case 'sms':
      return sendSms(cfg.to, cfg.body || '');
    case 'slack':
      return sendSlack(cfg.text || cfg.body || '');
    case 'whatsapp':
      return sendWhatsApp(cfg.to, cfg.body || '');
    case 'drive':
      return saveToDrive(cfg.filename || 'export.csv', String(ctx.csv ?? JSON.stringify(ctx)));
    case 'crm':
      return syncCrm(cfg.provider === 'salesforce' ? 'salesforce' : 'hubspot', ctx);
    case 'quickbooks':
      return exportQuickBooks(ctx);
    case 'sheets':
      return saveToDrive(`sheets-sync-${Date.now()}.csv`, rowsToCsv((ctx.rows as string[][]) ?? [['metric', 'value']]));
    case 'export':
      if (cfg.format === 'pdf') return { connector: 'export', ok: true, detail: rowsToPdf([['Sheettomate export'], [JSON.stringify(ctx).slice(0, 200)]]) };
      return { connector: 'export', ok: true, detail: 'csv' };
    case 'webhook':
      await fanOutOutbound(userId, 'step.webhook', { url: cfg.url, ctx });
      return { connector: 'webhook', ok: true, detail: cfg.url };
    default:
      return { type: step.type, ok: true };
  }
}

export async function triggerEvent(userId: string, event: string, payload: Record<string, unknown>) {
  const workflows = await prisma.automationWorkflow.findMany({
    where: { userId, enabled: true, triggerType: 'EVENT' },
  });
  for (const wf of workflows) {
    const cfg = wf.triggerConfig as { event?: string };
    if (cfg.event && cfg.event !== event) continue;
    const { enqueueAutomation } = await import('./automationQueue');
    await enqueueAutomation(wf.id, payload);
  }
  await fanOutOutbound(userId, event, payload);
}

export async function fanOutOutbound(userId: string, event: string, payload: Record<string, unknown>) {
  const hooks = await prisma.outboundWebhook.findMany({ where: { userId, enabled: true } });
  for (const hook of hooks) {
    if (hook.events.length && !hook.events.includes(event) && !hook.events.includes('*')) continue;
    const { enqueueWebhookDelivery } = await import('./automationQueue');
    await enqueueWebhookDelivery(hook.id, event, payload);
  }
}

export async function deliverWebhook(webhookId: string, event: string, payload: Record<string, unknown>, attempt = 1) {
  const hook = await prisma.outboundWebhook.findUnique({ where: { id: webhookId } });
  if (!hook) return;
  const body = JSON.stringify({ event, payload, sentAt: new Date().toISOString() });
  const sig = signWebhookBody(hook.secret, body);
  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sheettomate-Signature': sig, 'X-Sheettomate-Event': event },
      body,
    });
    await prisma.webhookDelivery.create({
      data: { webhookId, event, requestBody: body, statusCode: res.status, success: res.ok, attempts: attempt },
    });
    if (!res.ok && attempt < 3) {
      const { enqueueWebhookDelivery } = await import('./automationQueue');
      await enqueueWebhookDelivery(webhookId, event, payload, attempt + 1);
    }
  } catch (error) {
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        requestBody: body,
        success: false,
        attempts: attempt,
        error: error instanceof Error ? error.message : 'network',
      },
    });
    if (attempt < 3) {
      const { enqueueWebhookDelivery } = await import('./automationQueue');
      await enqueueWebhookDelivery(webhookId, event, payload, attempt + 1);
    }
  }
}

export function listTemplates() {
  return AUTOMATION_TEMPLATES;
}

export async function installTemplate(userId: string, slug: string) {
  const tpl = AUTOMATION_TEMPLATES.find((t) => t.slug === slug);
  if (!tpl) return null;
  return prisma.automationWorkflow.create({
    data: {
      userId,
      name: tpl.name,
      description: tpl.description,
      templateSlug: tpl.slug,
      triggerType: tpl.triggerType,
      triggerConfig: tpl.triggerConfig,
      steps: tpl.steps,
    },
  });
}
