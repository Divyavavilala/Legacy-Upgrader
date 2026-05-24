import { env } from '@/config/env';
import type { ApiError, ApiSuccess, AuthTokens } from './types';

const STORAGE_ACCESS = 'lu_access_token';
const STORAGE_REFRESH = 'lu_refresh_token';
const STORAGE_EXPIRES = 'lu_token_expires_at';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RefreshListener = (tokens: AuthTokens | null) => void;

let refreshPromise: Promise<AuthTokens | null> | null = null;
let onTokensRefreshed: RefreshListener | null = null;

export function setTokenRefreshListener(listener: RefreshListener) {
  onTokensRefreshed = listener;
}

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
} {
  return {
    accessToken: localStorage.getItem(STORAGE_ACCESS),
    refreshToken: localStorage.getItem(STORAGE_REFRESH),
    expiresAt: Number(localStorage.getItem(STORAGE_EXPIRES) || 0) || null,
  };
}

export function persistTokens(tokens: AuthTokens): void {
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  localStorage.setItem(STORAGE_ACCESS, tokens.accessToken);
  localStorage.setItem(STORAGE_REFRESH, tokens.refreshToken);
  localStorage.setItem(STORAGE_EXPIRES, String(expiresAt));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_EXPIRES);
}

async function refreshAccessToken(): Promise<AuthTokens | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  const response = await fetch(`${env.apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearStoredTokens();
    onTokensRefreshed?.(null);
    return null;
  }

  const json = (await response.json()) as ApiSuccess<AuthTokens>;
  persistTokens(json.data);
  onTokensRefreshed?.(json.data);
  return json.data;
}

async function getValidAccessToken(): Promise<string | null> {
  const { accessToken, expiresAt } = getStoredTokens();
  if (!accessToken) return null;

  const bufferMs = 30_000;
  if (expiresAt && Date.now() < expiresAt - bufferMs) {
    return accessToken;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  const tokens = await refreshPromise;
  return tokens?.accessToken ?? getStoredTokens().accessToken;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  retries?: number;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth = false, retries = 1, headers: initHeaders, ...init } = options;

  const headers = new Headers(initHeaders);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = await getValidAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401 && !skipAuth && attempt < retries) {
        await refreshAccessToken();
        const token = await getValidAccessToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        continue;
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const json = (await response.json()) as ApiSuccess<T> | ApiError;

      if (!response.ok || !('success' in json) || !json.success) {
        const err = json as ApiError;
        throw new ApiClientError(
          err.error?.message ?? `Request failed (${response.status})`,
          err.error?.statusCode ?? response.status,
          err.error?.details,
        );
      }

      return json.data;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError || attempt >= retries) {
        throw error;
      }
    }
  }

  throw lastError;
}
