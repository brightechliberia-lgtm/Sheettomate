import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthTokenType, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env, appOriginFromRequest } from '../config/env';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/http';
import { toPublicUser } from '../utils/userMapper';
import {
  persistRefreshToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  signRefreshToken,
} from '../services/tokenService';
import { consumeAuthToken, issueAuthToken } from '../services/authTokenService';
import { sendPasswordResetEmail, sendWelcomeEmail, emailsDeliveredViaSmtp } from '../services/emailService';
import { logger } from '../config/logger';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/schemas';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function issueSession(res: Response, user: { id: string; email: string; role: Role }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.id);
  return { accessToken, refreshToken };
}

async function attachSession(
  res: Response,
  user: { id: string; email: string; role: Role },
) {
  const { accessToken, refreshToken } = issueSession(res, user);
  await persistRefreshToken(user.id, refreshToken);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  return accessToken;
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const role = body.role && body.role !== Role.ADMIN ? body.role : Role.USER;
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await bcrypt.hash(body.password, 12),
        role,
        country: body.country,
        phone: body.phone,
      },
    });

    const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, VERIFY_TTL_MS);
    const origin = appOriginFromRequest(req.headers.origin);
    const verifyUrl = `${origin}/verify-email?token=${token}`;
    await sendWelcomeEmail(user.email, user.name, verifyUrl);

    return sendSuccess(
      res,
      {
        user: toPublicUser(user),
        verifyUrl: emailsDeliveredViaSmtp() ? undefined : verifyUrl,
        emailDelivery: emailsDeliveredViaSmtp() ? 'smtp' : 'link',
      },
      201,
      emailsDeliveredViaSmtp()
        ? 'Account created. Check your email to verify before logging in.'
        : 'Account created. SMTP is not configured, so use the verification link on this page.',
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenError('Verify your email before logging in');
    }
    if (user.suspendedAt) {
      throw new ForbiddenError('This account is suspended. Contact Sheettomate support.');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = await attachSession(res, user);
    return sendSuccess(res, { user: toPublicUser(user), accessToken });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedError('Refresh token missing');
    }

    const payload = jwt.verify(token, env.jwtRefreshSecret) as { sub: string; type: string };
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (user.suspendedAt) {
      throw new ForbiddenError('This account is suspended');
    }

    const nextRefresh = await rotateRefreshToken(token, user.id);
    res.cookie(REFRESH_COOKIE, nextRefresh, refreshCookieOptions);
    return sendSuccess(res, { accessToken: signAccessToken(user), user: toPublicUser(user) });
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid refresh token'));
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await revokeRefreshToken(token);
    }

    const header = req.headers.authorization;
    const access = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (access) {
      try {
        const payload = jwt.verify(access, env.jwtAccessSecret) as { sub: string };
        await revokeAllRefreshTokens(payload.sub);
      } catch {
        // Access token may already be expired; cookie revocation is enough.
      }
    }

    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 });
    return sendSuccess(res, { loggedOut: true });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const userId = await consumeAuthToken(token, AuthTokenType.EMAIL_VERIFICATION);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    const accessToken = await attachSession(res, user);
    return sendSuccess(res, { user: toPublicUser(user), accessToken }, 200, 'Email verified');
  } catch (error) {
    next(error);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) {
      const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, VERIFY_TTL_MS);
      const origin = appOriginFromRequest(req.headers.origin);
      const verifyUrl = `${origin}/verify-email?token=${token}`;
      await sendWelcomeEmail(user.email, user.name, verifyUrl);
      return sendSuccess(
        res,
        { sent: true, verifyUrl: emailsDeliveredViaSmtp() ? undefined : verifyUrl },
        200,
        emailsDeliveredViaSmtp()
          ? 'If that account exists, a verification email was sent.'
          : 'SMTP is not configured. Use the verification link below.',
      );
    } else {
      logger.info('Verification resend skipped', { email });
    }
    return sendSuccess(res, { sent: true }, 200, 'If that account exists, a verification email was sent.');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await issueAuthToken(user.id, AuthTokenType.PASSWORD_RESET, RESET_TTL_MS);
      const resetUrl = `${appOriginFromRequest(req.headers.origin)}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    } else {
      logger.info('Password reset skipped for unknown email');
    }
    return sendSuccess(
      res,
      { sent: true },
      200,
      'If that email is registered, you will receive a reset link shortly.',
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const userId = await consumeAuthToken(token, AuthTokenType.PASSWORD_RESET);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await revokeAllRefreshTokens(userId);
    return sendSuccess(res, { reset: true }, 200, 'Password updated. You can log in now.');
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
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
