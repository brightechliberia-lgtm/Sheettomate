import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import type { StaffRole as PrismaStaff } from '@prisma/client';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { hasPermission, staffCan, type StaffScope, type UserRole } from '@sheetomate/shared';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  staffRole?: PrismaStaff | null;
  type: 'access';
}

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;
    if (!token) {
      next();
      return;
    }
    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    if (payload.type === 'access') {
      req.user = payload;
    }
  } catch {
    /* public catalog still loads */
  }
  next();
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have access to this resource'));
      return;
    }
    next();
  };
}

export function requireStaff(scope: StaffScope) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (req.user.role !== Role.ADMIN) {
      next(new ForbiddenError('Admin access required'));
      return;
    }
    if (!staffCan(req.user.staffRole ?? 'SUPER', scope)) {
      next(new ForbiddenError('This admin role cannot access this section'));
      return;
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!hasPermission(req.user.role as UserRole, permission)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}
