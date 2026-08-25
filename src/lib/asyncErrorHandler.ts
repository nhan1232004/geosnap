// Centralized Async Error Handling Utilities
import { logError, getErrorMessage } from './errorHandler';

export interface AsyncHandlerOptions {
  context?: string;
  onError?: (error: any) => void;
  showToast?: boolean;
  toastMessage?: string;
  fallbackValue?: any;
  rethrow?: boolean;
}

let toastNotifier: ((message: string, type: 'error' | 'warning' | 'info' | 'success') => void) | null = null;

/**
 * Register toast notifier instance for asyncErrorHandler
 */
export function registerToastNotifier(
  fn: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
) {
  toastNotifier = fn;
}

/**
 * Higher-Order Function to wrap async functions with error boundary logic,
 * structured logging, and optional user notifications.
 */
export function withAsyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: AsyncHandlerOptions = {}
): (...args: T) => Promise<R | undefined> {
  const {
    context,
    onError,
    showToast = false,
    toastMessage,
    fallbackValue,
    rethrow = true,
  } = options;

  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      logError(error, context);

      if (onError) {
        try {
          onError(error);
        } catch (callbackErr) {
          console.error('Error inside onError callback:', callbackErr);
        }
      }

      if (showToast && toastNotifier) {
        const msg = toastMessage || getErrorMessage(error);
        toastNotifier(msg, 'error');
      }

      if (rethrow) {
        throw error;
      }

      return fallbackValue;
    }
  };
}

/**
 * Golang-style tuple error handling:
 * const [data, error] = await safeAsync(api.get('/endpoint'));
 */
export async function safeAsync<T, E = Error>(
  promise: Promise<T>,
  context?: string
): Promise<[T | null, E | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error: any) {
    if (context) {
      logError(error, context);
    }
    return [null, error as E];
  }
}

/**
 * Setup global unhandled promise rejection and runtime error handlers
 */
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Catch unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[GlobalAsync] Unhandled Promise Rejection caught:', event.reason);
    logError(event.reason, 'UnhandledPromiseRejection');
  });

  // Catch global runtime uncaught errors
  window.addEventListener('error', (event) => {
    console.warn('[GlobalRuntime] Uncaught error caught:', event.error || event.message);
    logError(event.error || new Error(event.message), 'WindowRuntimeError');
  });

  console.log('[ErrorHandling] Global error listeners initialized');
}
