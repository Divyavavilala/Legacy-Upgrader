export class AiRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`);
    this.name = 'AiRequestTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiRequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delayMs: number; shouldRetry?: (error: unknown) => boolean },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = options.shouldRetry?.(error) ?? true;
      if (!retryable || attempt >= options.maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, options.delayMs * attempt));
    }
  }
  throw lastError;
}
