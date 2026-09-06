import webpush from 'web-push';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';

function configured() {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}

if (configured()) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!configured()) return;
  const rows = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(payload),
        );
      } catch (error) {
        logger.warn('Push send failed', { endpoint: row.endpoint, error });
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: row.id } }).catch(() => undefined);
        }
      }
    }),
  );
}
