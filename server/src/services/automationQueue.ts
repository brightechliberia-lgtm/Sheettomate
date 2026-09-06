import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { cronMatches } from '../automations/logic';
import { prisma } from '../config/prisma';
import { deliverWebhook, runWorkflow } from './workflowEngine';

function redisConnection() {
  if (!env.redisUrl) return null;
  try {
    const parsed = new URL(env.redisUrl);
    return { host: parsed.hostname, port: Number(parsed.port || 6379) };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = redisConnection();
export const AUTO_QUEUE = 'sheettomate-automations';

let queue: Queue | null = null;
let worker: Worker | null = null;
let cronTimer: ReturnType<typeof setInterval> | null = null;

export function getAutomationQueue(): Queue | null {
  if (!connection) return null;
  if (!queue) queue = new Queue(AUTO_QUEUE, { connection });
  return queue;
}

export async function enqueueAutomation(workflowId: string, payload: Record<string, unknown>) {
  const q = getAutomationQueue();
  if (q) {
    await q.add('run', { workflowId, payload }, { attempts: 2, removeOnComplete: 50 });
    return;
  }
  setImmediate(() => {
    void runWorkflow(workflowId, payload);
  });
}

export async function enqueueWebhookDelivery(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
  attempt = 1,
) {
  const q = getAutomationQueue();
  const delay = attempt === 1 ? 0 : attempt * 2000;
  if (q) {
    await q.add('webhook', { webhookId, event, payload, attempt }, { delay, attempts: 1, removeOnComplete: 100 });
    return;
  }
  setTimeout(() => {
    void deliverWebhook(webhookId, event, payload, attempt);
  }, delay);
}

async function tickSchedules() {
  const workflows = await prisma.automationWorkflow.findMany({ where: { enabled: true, triggerType: 'SCHEDULE' } });
  const now = new Date();
  for (const wf of workflows) {
    const cron = (wf.triggerConfig as { cron?: string }).cron;
    if (!cron || !cronMatches(cron, now)) continue;
    await enqueueAutomation(wf.id, { scheduledAt: now.toISOString() });
  }
}

export function startAutomationWorker() {
  if (connection && !worker) {
    worker = new Worker(
      AUTO_QUEUE,
      async (job) => {
        if (job.name === 'webhook') {
          await deliverWebhook(String(job.data.webhookId), String(job.data.event), job.data.payload as Record<string, unknown>, Number(job.data.attempt ?? 1));
          return;
        }
        await runWorkflow(String(job.data.workflowId), (job.data.payload ?? {}) as Record<string, unknown>);
      },
      { connection, concurrency: 4 },
    );
    worker.on('failed', (job, error) => logger.error('Automation job failed', { id: job?.id, error }));
    logger.info('Automation worker started');
  }
  if (!cronTimer) {
    cronTimer = setInterval(() => {
      void tickSchedules();
    }, 60_000);
    logger.info('Automation scheduler ticking every 60s');
  }
}
