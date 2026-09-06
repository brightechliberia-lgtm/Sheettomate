import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { env } from '../config/env';
import { sendSuccess } from '../utils/http';
import { savePushSubscription } from '../services/pushService';

const router = Router();

router.get('/key', (_req, res) => {
  return sendSuccess(res, { publicKey: env.vapidPublicKey });
});

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const body = subSchema.parse(req.body);
    await savePushSubscription(req.user!.sub, body, req.headers['user-agent']);
    return sendSuccess(res, { saved: true }, 201);
  } catch (error) {
    next(error);
  }
});

export default router;
