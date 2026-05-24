export class AiJobTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI job timed out after ${timeoutMs}ms`);
    this.name = 'AiJobTimeoutError';
  }
}

export function withJobTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AiJobTimeoutError(timeoutMs)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
