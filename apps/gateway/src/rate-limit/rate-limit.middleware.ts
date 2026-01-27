import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createClient, type RedisClientType } from 'redis';
import { getEnv } from '../config/env';

const logger = new Logger('RateLimit');

const connectTimeoutMs = 500;
const operationTimeoutMs = 500;

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Redis timeout')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const getRedisClient = async () => {
  if (client?.isOpen) {
    return client;
  }

  if (connecting) {
    return connecting;
  }

  const env = getEnv();
  const nextClient = createClient({
    url: env.REDIS_URL,
    socket: { connectTimeout: connectTimeoutMs },
  });

  nextClient.on('error', (error) => {
    logger.warn(`Redis error: ${error.message}`);
  });

  connecting = withTimeout(nextClient.connect(), connectTimeoutMs)
    .then(() => {
      client = nextClient;
      return client;
    })
    .catch((error) => {
      logger.warn(`Redis unavailable: ${error.message}`);
      return null;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
};

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const env = getEnv();
  const windowSec = env.RATE_LIMIT_WINDOW_SEC ?? 60;
  const maxRequests = env.RATE_LIMIT_MAX ?? 60;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl:${req.ip}:${req.path}:${bucket}`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      return next();
    }

    const count = await withTimeout(redis.incr(key), operationTimeoutMs);
    if (count === 1) {
      await withTimeout(redis.expire(key, windowSec), operationTimeoutMs);
    }

    if (count > maxRequests) {
      return res.status(429).send('Too Many Requests');
    }
  } catch (error) {
    logger.warn('Rate limit skipped due to Redis error');
  }

  return next();
};
