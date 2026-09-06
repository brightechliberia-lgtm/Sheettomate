import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env, isProduction, allowedClientOrigins, isAllowedClientOrigin } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import templateRoutes from './routes/templateRoutes';
import cartRoutes from './routes/cartRoutes';
import creatorRoutes from './routes/creatorRoutes';
import courseRoutes from './routes/courseRoutes';
import paymentRoutes from './routes/paymentRoutes';
import aiRoutes from './routes/aiRoutes';
import adminRoutes from './routes/adminRoutes';
import pushRoutes from './routes/pushRoutes';
import marketingRoutes from './routes/marketingRoutes';
import communityRoutes from './routes/communityRoutes';
import automationRoutes from './routes/automationRoutes';
import { sitemapXml } from './services/marketingService';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isAllowedClientOrigin(origin)) {
          callback(null, origin ?? allowedClientOrigins()[0]);
          return;
        }
        callback(new Error('Origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as typeof req & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const origin = req.headers.origin;
    if (
      mutating &&
      origin &&
      !isAllowedClientOrigin(origin) &&
      !req.path.startsWith('/api/payments/webhook') &&
      !req.path.startsWith('/api/automations/hooks/')
    ) {
      return res.status(403).json({ success: false, message: 'Origin not allowed' });
    }
    next();
  });

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 200 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      const userHint = auth?.startsWith('Bearer ') ? auth.slice(7, 23) : 'anon';
      return `${req.ip ?? 'unknown'}:${userHint}`;
    },
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts.' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  app.use('/api/auth/resend-verification', authLimiter);
  app.use('/api/auth/verify-email', authLimiter);

  app.use('/uploads', express.static(path.resolve(env.localUploadDir)));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', service: 'sheettomate-api' } });
  });
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, data: { status: 'ready', db: true } });
    } catch {
      res.status(503).json({ success: false, message: 'Database unavailable' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/creator', creatorRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/marketing', marketingRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/automations', automationRoutes);
  app.use('/api/v1', automationRoutes);
  app.use('/api/push', pushRoutes);

  app.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').send(sitemapXml());
  });
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${env.publicApiUrl}/sitemap.xml\n`);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app configured');

  return app;
}
