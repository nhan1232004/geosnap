// Centralized error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed. Please check your internet.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function isAuthError(error: any): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  return error?.status === 401 || error?.status === 403;
}

export function isNetworkError(error: any): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }
  const msg = error?.message?.toLowerCase() || '';
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout');
}

export function getErrorMessage(error: any): string {
  if (!error) return 'Đã xảy ra lỗi không xác định';
  if (typeof error === 'string') return error;

  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
  }
  if (error instanceof TimeoutError) {
    return 'Hết thời gian chờ phản hồi từ máy chủ. Vui lòng thử lại.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error.error && typeof error.error === 'string') {
    return error.error;
  }
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }
  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.';
}

export function isRetryableError(error: any): boolean {
  if (error instanceof ApiError) {
    return error.status ? error.status >= 500 : false;
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }
  return isNetworkError(error);
}

export function logError(error: any, context?: string) {
  const message = getErrorMessage(error);
  const contextStr = context ? ` [${context}]` : '';
  console.error(`[GeoSnap Error]${contextStr}:`, message, error);

  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(error, {
        tags: { context: context || 'general' },
        extra: { message },
      });
    } catch (sentryErr) {
      console.warn('Sentry report failed:', sentryErr);
    }
  }
}
