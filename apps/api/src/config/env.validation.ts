export interface EnvConfig {
  NODE_ENV: string;
  APP_NAME: string;
  PORT: number;
  CORS_ORIGIN: string;
}

function readString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid or missing environment variable: ${key}`);
  }
  return value;
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const port = Number(config.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid PORT: must be an integer between 1 and 65535');
  }

  return {
    NODE_ENV: readString(config, 'NODE_ENV'),
    APP_NAME: readString(config, 'APP_NAME'),
    PORT: port,
    CORS_ORIGIN: readString(config, 'CORS_ORIGIN'),
  };
}
