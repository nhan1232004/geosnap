// Centralized error handling

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function getErrorMessage(error: any): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet.';
  }
  if (error instanceof TimeoutError) {
    return 'Request timeout. Please try again.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function isRetryableError(error: any): boolean {
  if (error instanceof ApiError) {
    return error.status ? error.status >= 500 : false;
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }
  return false;
}

export function logError(error: any, context?: string) {
  const message = getErrorMessage(error);
  const contextStr = context ? ` [${context}]` : '';
  console.error(`Error${contextStr}:`, message, error);

  // Send to error tracking service (e.g., Sentry) in production
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      tags: { context },
    });
  }
}
