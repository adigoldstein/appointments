import { config as loadEnvironment } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

loadEnvironment();

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getRequiredNumberEnv(key: string): number {
  const value = Number(getRequiredEnv(key));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }

  return value;
}

export default new DataSource({
  type: 'postgres',
  host: getRequiredEnv('DB_HOST'),
  port: getRequiredNumberEnv('DB_PORT'),
  username: getRequiredEnv('DB_USERNAME'),
  password: getRequiredEnv('DB_PASSWORD'),
  database: getRequiredEnv('DB_DATABASE'),
  entities: [join(process.cwd(), 'apps/backend/src/**/*.entity{.ts,.js}')],
  migrations: [
    join(process.cwd(), 'apps/backend/src/database/migrations/*{.ts,.js}'),
  ],
  synchronize: false,
});
