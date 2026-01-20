import { LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';
import {
  correlationMiddleware,
  createEnv,
  createLogger,
} from '../../../libs/shared-utils/src';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().optional().default(3001),
    LOG_LEVEL: z
      .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    DATABASE_URL: z.string().optional(),
  });

  const env = createEnv(envSchema, process.env);
  const logger = createLogger({
    serviceName: 'users-service',
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });
  const nestLogger: LoggerService = {
    log: (message) => logger.info(message),
    error: (message, trace) => logger.error({ trace }, message),
    warn: (message) => logger.warn(message),
    debug: (message) => logger.debug(message),
    verbose: (message) => logger.trace(message),
  };

  const app = await NestFactory.create(AppModule, { logger: nestLogger });
  app.use(correlationMiddleware);

  await app.listen(env.PORT);
}
bootstrap();