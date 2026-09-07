import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { attachRealtime } from './realtime';
import { startAiWorker } from './services/aiQueue';
import { startAutomationWorker } from './services/automationQueue';

async function main() {
  startAiWorker();
  startAutomationWorker();
  const app = createApp();
  const server = createServer(app);
  attachRealtime(server);

  // Bind all interfaces so Railway/Docker healthchecks can reach the process.
  server.listen(env.port, '0.0.0.0', () => {
    logger.info(`Sheettomate API listening on 0.0.0.0:${env.port}`);
  });
}

main().catch(async (error) => {
  logger.error('Failed to start server', { error });
  await prisma.$disconnect();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
