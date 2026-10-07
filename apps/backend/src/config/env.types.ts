import type { StringValue } from 'ms';

/** Validated environment (see env.validation.ts); keys in ENV_KEYS (env.constants.ts). */
export interface EnvironmentVariables {
  PORT?: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: StringValue;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: StringValue;
  BCRYPT_SALT_ROUNDS: number;
}
