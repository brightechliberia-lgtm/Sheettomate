import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { authenticate } from './auth';

export function hashApiKey(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey() {
  const raw = `smk_${crypto.randomBytes(24).toString('hex')}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) };
}

export async function authenticateJwtOrApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token.startsWith('smk_')) {
    try {
      const row = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(token) } });
      if (!row || row.revokedAt) throw new UnauthorizedError('Invalid API key');
      const user = await prisma.user.findUnique({ where: { id: row.userId } });
      if (!user || user.suspendedAt) throw new UnauthorizedError();
      await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
      req.user = { sub: user.id, email: user.email, role: user.role, staffRole: user.staffRole, type: 'access' };
      req.apiKeyScopes = row.scopes;
      next();
      return;
    } catch (error) {
      next(error);
      return;
    }
  }
  return authenticate(req, res, next);
}

export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.apiKeyScopes && !req.apiKeyScopes.includes(scope) && !req.apiKeyScopes.includes('*')) {
      next(new ForbiddenError('API key missing scope'));
      return;
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      apiKeyScopes?: string[];
    }
  }
}
