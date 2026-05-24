import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'lu_';

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const rawKey = `${KEY_PREFIX}${secret}`;
  const prefix = rawKey.slice(0, 12);
  const hash = hashApiKey(rawKey);
  return { rawKey, prefix, hash };
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function isApiKeyFormat(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length > 20;
}
