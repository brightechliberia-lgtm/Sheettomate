import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { appOriginFromRequest, env, isAllowedClientOrigin } from '../config/env';
import { sendSuccess } from '../utils/http';
import { AppError } from '../utils/errors';
import {
  persistRefreshToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
} from './tokenService';

const STATE_COOKIE = 'sm_google_oauth';
const ORIGIN_COOKIE = 'sm_oauth_origin';

function googleRedirectUri(): string {
  // Must be the API host in production (api.sheettomate.com), not the static frontend.
  const base = (env.publicApiUrl || env.clientOrigin).replace(/\/$/, '');
  return `${base}/api/auth/google/callback`;
}

export function googleAuthStatus(_req: Request, res: Response) {
  return sendSuccess(res, { enabled: Boolean(env.googleClientId && env.googleClientSecret) });
}

export function startGoogleAuth(req: Request, res: Response) {
  const origin = appOriginFromRequest(req.headers.origin);
  if (!env.googleClientId || !env.googleClientSecret) {
    res.redirect(`${origin}/login?google=off`);
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/',
  };
  res.cookie(STATE_COOKIE, state, cookieOpts);
  res.cookie(ORIGIN_COOKIE, origin, cookieOpts);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.googleClientId);
  url.searchParams.set('redirect_uri', googleRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
}

export async function googleAuthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const cookieOrigin = req.cookies?.[ORIGIN_COOKIE] as string | undefined;
    const frontend = cookieOrigin && isAllowedClientOrigin(cookieOrigin) ? cookieOrigin : env.clientOrigin;
    const cookieState = req.cookies?.[STATE_COOKIE] as string | undefined;
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    res.clearCookie(STATE_COOKIE, { path: '/' });
    res.clearCookie(ORIGIN_COOKIE, { path: '/' });
    if (error) {
      res.redirect(`${frontend}/login?google=denied`);
      return;
    }
    if (!code || !state || !cookieState || state !== cookieState) {
      res.redirect(`${frontend}/login?google=invalid`);
      return;
    }
    if (!env.googleClientId || !env.googleClientSecret) {
      res.redirect(`${frontend}/login?google=off`);
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new AppError(401, 'Google sign-in failed');
    }
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!profile.email || !profile.id) {
      throw new AppError(401, 'Google did not return an email');
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email.toLowerCase() }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          name: profile.name || profile.email.split('@')[0],
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          googleId: profile.id,
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: new Date(),
          role: 'USER',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? profile.id,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          avatarUrl: user.avatarUrl ?? profile.picture ?? null,
        },
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);
    await persistRefreshToken(user.id, refreshToken);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    const dest = new URL(`${frontend}/auth/google/done`);
    dest.searchParams.set('accessToken', accessToken);
    res.redirect(dest.toString());
  } catch (error) {
    next(error);
  }
}
