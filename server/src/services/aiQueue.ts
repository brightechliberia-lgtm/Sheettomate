import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { processAiGeneration } from './aiPipeline';

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

export const AI_QUEUE_NAME = 'sheettomate-ai-generate';

let queue: Queue | null = null;
let worker: Worker | null = null;

export function getAiQueue(): Queue | null {
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(AI_QUEUE_NAME, { connection });
  }
  return queue;
}

export async function enqueueAiJob(requestId: string): Promise<void> {
  const q = getAiQueue();
  if (q) {
    await q.add('generate', { requestId }, { attempts: 2, removeOnComplete: 100 });
    logger.info('AI job queued', { requestId });
    return;
  }
  logger.info('Redis not configured; running AI job inline', { requestId });
  setImmediate(() => {
    void processAiGeneration(requestId);
  });
}

export function startAiWorker(): void {
  if (!connection || worker) return;
  worker = new Worker(
    AI_QUEUE_NAME,
    async (job) => {
      await processAiGeneration(String(job.data.requestId));
    },
    { connection, concurrency: 2 },
  );
  worker.on('failed', (job, error) => {
    logger.error('AI worker job failed', { id: job?.id, error });
  });
  logger.info('AI generation worker started');
}
