import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { createLogger } from '../../../../libs/shared-utils/src';
import { getEnv } from '../config/env';
import { createDataSource, createTypeOrmOptions } from './typeorm.config';

const createServiceLogger = () => {
  const env = getEnv();

  return createLogger({
    serviceName: 'listings-service',
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async (): Promise<TypeOrmModuleOptions> => ({
        ...createTypeOrmOptions(),
        autoLoadEntities: true,
      }),
      dataSourceFactory: async (options) =>
        createDataSource(options, createServiceLogger()),
    }),
  ],
})
export class DatabaseModule {}
