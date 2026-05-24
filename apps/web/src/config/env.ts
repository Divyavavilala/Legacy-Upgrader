function requireEnv(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  appName: requireEnv('VITE_APP_NAME', 'LegacyUpgrader'),
  apiUrl: requireEnv('VITE_API_URL', '/api'),
} as const;
