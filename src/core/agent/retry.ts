export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export async function withRetry<T>(fn: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = opts.shouldRetry ? opts.shouldRetry(error) : isRetryableError(error);
      if (!shouldRetry || attempt === opts.maxAttempts) {
        throw error;
      }

      const delay = Math.min(opts.baseDelayMs * Math.pow(2, attempt - 1), opts.maxDelayMs);
      const jitter = Math.random() * delay * 0.1;
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableMessages = ['rate_limit', 'timeout', '429', '503', '502', 'ECONNRESET', 'ETIMEDOUT', 'overloaded'];
    return retryableMessages.some(msg => error.message.toLowerCase().includes(msg));
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
