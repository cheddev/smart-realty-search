import { LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  correlationMiddleware,
  createLogger,
} from '../../../libs/shared-utils/src';
import { getEnv } from './config/env';
import { AppModule } from './app/app.module';
import { rateLimitMiddleware } from './rate-limit/rate-limit.middleware';

async function bootstrap() {
  const env = getEnv();
  const logger = createLogger({
    serviceName: 'gateway',
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
  app.use('/api', rateLimitMiddleware);

  await app.listen(env.PORT);
}
bootstrap();
