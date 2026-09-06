import crypto from 'crypto';
import { AuthTokenType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { hashToken } from './tokenService';
import { UnauthorizedError } from '../utils/errors';

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
  ttlMs: number,
): Promise<string> {
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = generateRawToken();
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return raw;
}

export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<string> {
  const record = await prisma.authToken.findFirst({
    where: { tokenHash: hashToken(raw), type, usedAt: null },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new UnauthorizedError('This link is invalid or has expired');
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
