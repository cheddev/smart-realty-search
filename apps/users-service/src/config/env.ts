import type { StringValue } from 'ms';
import { z } from 'zod';
import { createEnv } from '../../../../libs/shared-utils/src';

const ttlSchema = z.union([
  z.coerce.number().int().positive(),
  z
    .string()
    .regex(/^\d+(ms|s|m|h|d)$/)
    .transform((value) => value as StringValue),
]);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().optional().default(3001),
  LOG_LEVEL: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: ttlSchema.default('15m'),
  JWT_REFRESH_TTL: ttlSchema.default('7d'),
  REFRESH_TOKEN_SALT: z.string().min(1),
});

export const getEnv = () => createEnv(envSchema, process.env);
