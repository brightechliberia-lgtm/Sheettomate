import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

const memory = new Map<string, { value: string; expiresAt: number }>();

let redis: Redis | null = null;

if (env.redisUrl) {
  redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  redis.on('error', (error) => {
    logger.warn('Redis unavailable; falling back to in-memory cache', { message: error.message });
  });
  void redis.connect().catch(() => {
    redis = null;
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  } catch (error) {
    logger.warn('Redis get failed', { error });
  }
  const hit = memory.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(hit.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const serialized = JSON.stringify(value);
  try {
    if (redis) {
      await redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    }
  } catch (error) {
    logger.warn('Redis set failed', { error });
  }
  memory.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  try {
    if (redis) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    logger.warn('Redis delete failed', { error });
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) {
      memory.delete(key);
    }
  }
}

export async function invalidateTemplateCache(): Promise<void> {
  await cacheDeleteByPrefix('templates:');
  logger.info('Template cache invalidated');
}
