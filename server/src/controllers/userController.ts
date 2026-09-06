import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/http';
import { toPublicUser } from '../utils/userMapper';
import {
  persistRefreshToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
  revokeAllRefreshTokens,
  signAccessToken,
  signRefreshToken,
} from '../services/tokenService';
import { storeTemplateFile } from '../services/storageService';
import { changePasswordSchema, updateProfileSchema } from '../validators/schemas';
import { Role } from '@prisma/client';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new UnauthorizedError();
    }
    return sendSuccess(res, { user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.expertise !== undefined ? { expertise: body.expertise } : {}),
        ...(body.digestOptIn !== undefined ? { digestOptIn: body.digestOptIn } : {}),
      },
    });
    return sendSuccess(res, { user: toPublicUser(user) }, 200, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      throw new UnauthorizedError();
    }

    const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Current password is incorrect');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 12) },
    });
    await revokeAllRefreshTokens(user.id);
    return sendSuccess(res, { updated: true }, 200, 'Password changed. Please log in again.');
  } catch (error) {
    next(error);
  }
}

export async function getPurchasedTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.templateDownload.findMany({
      where: {
        userId: req.user!.sub,
        OR: [{ payment: { status: 'COMPLETED' } }, { paymentId: null }],
      },
      include: { template: true, payment: true },
      orderBy: { downloadDate: 'desc' },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function getEnrolledCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.courseEnrollment.findMany({
      where: { userId: req.user!.sub },
      include: { course: true },
      orderBy: { enrollmentDate: 'desc' },
    });
    return sendSuccess(res, { items });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      throw new ValidationError('Choose a photo (JPG, PNG, or WebP, max 4MB).');
    }
    const stored = await storeTemplateFile(file, 'avatars');
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatarUrl: stored.url },
    });
    return sendSuccess(res, { user: toPublicUser(user) }, 200, 'Photo updated');
  } catch (error) {
    next(error);
  }
}

export async function becomeCreator(req: Request, res: Response, next: NextFunction) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!current) {
      throw new UnauthorizedError();
    }
    if (current.role === 'ADMIN') {
      return sendSuccess(res, { user: toPublicUser(current) });
    }
    const user = await prisma.user.update({
      where: { id: current.id },
      data: { role: Role.CREATOR },
    });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);
    await persistRefreshToken(user.id, refreshToken);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    return sendSuccess(res, { user: toPublicUser(user), accessToken }, 200, 'You can upload templates now');
  } catch (error) {
    next(error);
  }
}
