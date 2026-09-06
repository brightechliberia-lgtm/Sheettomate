import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/http';
import { subscribeEmail } from '../services/marketingService';
import { logger } from '../config/logger';
import { getCatalogConfig } from '../services/catalogSettings';

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(80).optional(),
  source: z.enum(['newsletter', 'waitlist', 'contact']).default('newsletter'),
  message: z.string().max(2000).optional(),
});

const router = Router();

router.get('/catalog', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, { catalog: await getCatalogConfig() });
  } catch (error) {
    next(error);
  }
});

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = subscribeSchema.parse(req.body);
    await subscribeEmail(body.email, body.source, body.name);
    if (body.source === 'contact' && body.message) {
      logger.info('Contact form', { email: body.email, message: body.message });
    }
    return sendSuccess(res, { subscribed: true }, 201, 'Check your inbox for a welcome note.');
  } catch (error) {
    next(error);
  }
});

router.get('/pages/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = await prisma.cmsPage.findFirst({
      where: { slug: String(req.params.slug), published: true },
    });
    return sendSuccess(res, { page });
  } catch (error) {
    next(error);
  }
});

export default router;
