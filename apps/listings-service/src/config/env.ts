import { z } from 'zod';
import { createEnv } from '../../../../libs/shared-utils/src';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().optional().default(3002),
  LOG_LEVEL: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  DATABASE_URL: z.string().min(1),
});

export const getEnv = () => createEnv(envSchema, process.env);
