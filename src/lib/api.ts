import { ApiError, TimeoutError, NetworkError } from './errorHandler';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}

interface ApiErrorResponse {
  error: string;
  code?: string;
}

// Event system for token refresh
const tokenRefreshEvent = new EventTarget();

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private readonly TIMEOUT = 10000; // 10s timeout
  private readonly MAX_RETRIES = 3;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    // Use sessionStorage for better security than localStorage
    const stored = this.getStoredTokens();
    this.token = stored.accessToken;
    this.refreshToken = stored.refreshToken;
  }

  private getStoredTokens() {
    try {
      const stored = sessionStorage.getItem('geosnap_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
        };
      }
    } catch (err) {
      console.error('Failed to parse stored tokens:', err);
    }
    return { accessToken: null, refreshToken: null };
  }

  setToken(token: string | null, refreshToken?: string | null) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    if (token) {
      sessionStorage.setItem(
        'geosnap_auth',
        JSON.stringify({
          accessToken: token,
          refreshToken: this.refreshToken || null,
        })
      );
    } else {
      sessionStorage.removeItem('geosnap_auth');
      this.refreshToken = null;
    }

    // Emit token changed event
    tokenRefreshEvent.dispatchEvent(new CustomEvent('tokenChanged', { detail: { token } }));
  }

  getToken() {
    return this.token;
  }

  clearAuth() {
    this.setToken(null, null);
  }

  private getHeaders(contentType: string | null = 'application/json') {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.fetchWithTimeout(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.clearAuth();
          this.redirectToLogin();
          throw new Error('Refresh token expired');
        }
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = (await response.json()) as TokenResponse;
      this.setToken(data.accessToken, data.refreshToken || this.refreshToken);
      return data.accessToken;
    } catch (error) {
      this.clearAuth();
      this.redirectToLogin();
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const newToken = await this.refreshAccessToken();
          this.isRefreshing = false;
          this.onRefreshed(newToken);
          // Retry the original request
          return this.retryRequest<T>(response);
        } catch (error) {
          this.isRefreshing = false;
          throw error;
        }
      } else {
        // Token is being refreshed, wait for it
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber((token: string) => {
            this.token = token;
            this.retryRequest<T>(response)
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    const text = await response.text();
    let data: any = {};

    try {
      if (text) {
        data = JSON.parse(text);
      }
    } catch (err) {
      console.error('Failed to parse response:', err);
    }

    if (!response.ok) {
      const message = (data as ApiErrorResponse)?.error || `HTTP error! status: ${response.status}`;
      const code = (data as ApiErrorResponse)?.code;
      throw new ApiError(message, response.status, code, data);
    }

    return data as T;
  }

  private async retryRequest<T>(originalResponse: Response): Promise<T> {
    const url = originalResponse.url;
    const response = await fetch(url, {
      method: originalResponse.request?.method || 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout = this.TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${timeout}ms`);
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(error.message);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error.message?.includes('timeout') ||
        error.message?.includes('Failed to fetch') ||
        (error.status && error.status >= 500);

      if (attempt < this.MAX_RETRIES && isRetryable) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, attempt + 1);
      }
      throw error;
    }
  }

  private redirectToLogin() {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?session_expired=true';
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.retryWithBackoff(async () => {
      const response = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return this.handleResponse<T>(response);
    });
  }

  async post<T>(path: string, body: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      const response = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return this.handleResponse<T>(response);
    });
  }

  async put<T>(path: string, body: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      const response = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return this.handleResponse<T>(response);
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.retryWithBackoff(async () => {
      const response = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: this.getHeaders(null),
      });
      return this.handleResponse<T>(response);
    });
  }

  async uploadFile(path: string, file: File): Promise<{ url: string }> {
    return this.retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.fetchWithTimeout(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: this.getHeaders(null),
        body: formData,
      });
      return this.handleResponse<{ url: string }>(response);
    });
  }

  async uploadPhoto(file: File): Promise<{ url: string }> {
    return this.uploadFile('/api/v1/upload/photo', file);
  }

  async uploadAvatar(file: File): Promise<{ url: string }> {
    return this.uploadFile('/api/v1/upload/avatar', file);
  }

  async uploadCover(file: File): Promise<{ url: string }> {
    return this.uploadFile('/api/v1/upload/cover', file);
  }
}

export const api = new ApiClient();

tokenRefreshEvent.addEventListener('tokenChanged', (event: any) => {
  console.log('[API] Token updated');
});
