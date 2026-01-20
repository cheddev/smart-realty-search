import { join } from 'node:path';
import type { Logger } from 'pino';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { getEnv } from '../config/env';

export const createTypeOrmOptions = (): DataSourceOptions => {
  const env = getEnv();

  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
};

export const createDataSource = async (
  options: DataSourceOptions,
  logger: Logger,
) => {
  const dataSource = new DataSource(options);

  try {
    await dataSource.initialize();
    logger.info('Database connected');
    return dataSource;
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    throw error;
  }
};
