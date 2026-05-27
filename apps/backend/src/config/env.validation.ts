import type { StringValue } from 'ms';
import { ENV_KEYS, EnvironmentVariables } from './env.constants';

function requiredString(
  config: Record<string, unknown>,
  key: keyof EnvironmentVariables,
): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function numberFromEnv(
  config: Record<string, unknown>,
  key: keyof EnvironmentVariables,
  defaultValue?: number,
): number {
  const value = config[key];

  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Missing required environment variable: ${key}`);
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }

  return numberValue;
}

function requiredDuration(
  config: Record<string, unknown>,
  key: keyof EnvironmentVariables,
): StringValue {
  const value = requiredString(config, key);

  if (!/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error(
      `Environment variable ${key} must use a duration like 15m, 7d, or 3600s`,
    );
  }

  return value as StringValue;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return {
    PORT:
      config[ENV_KEYS.PORT] === undefined
        ? undefined
        : numberFromEnv(config, ENV_KEYS.PORT),
    DB_HOST: requiredString(config, ENV_KEYS.DB_HOST),
    DB_PORT: numberFromEnv(config, ENV_KEYS.DB_PORT),
    DB_USERNAME: requiredString(config, ENV_KEYS.DB_USERNAME),
    DB_PASSWORD: requiredString(config, ENV_KEYS.DB_PASSWORD),
    DB_DATABASE: requiredString(config, ENV_KEYS.DB_DATABASE),
    JWT_ACCESS_SECRET: requiredString(config, ENV_KEYS.JWT_ACCESS_SECRET),
    JWT_ACCESS_EXPIRES_IN: requiredDuration(
      config,
      ENV_KEYS.JWT_ACCESS_EXPIRES_IN,
    ),
    JWT_REFRESH_SECRET: requiredString(config, ENV_KEYS.JWT_REFRESH_SECRET),
    JWT_REFRESH_EXPIRES_IN: requiredDuration(
      config,
      ENV_KEYS.JWT_REFRESH_EXPIRES_IN,
    ),
    BCRYPT_SALT_ROUNDS: numberFromEnv(config, ENV_KEYS.BCRYPT_SALT_ROUNDS, 12),
  };
}
