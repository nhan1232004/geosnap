const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = localStorage.getItem('geosnap_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('geosnap_token', token);
    } else {
      localStorage.removeItem('geosnap_token');
    }
  }

  getToken() {
    return this.token;
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

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Clear token and reload or redirect if unauthorized
      this.setToken(null);
      // We can dispatch a custom event or let the calling code handle it,
      // but reloading is a safe fallback to reset the React app state.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data as T;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    // For 204 No Content, response.json() will fail, handled by our catch inside handleResponse
    return this.handleResponse<T>(response);
  }

  async uploadFile(path: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(null), // fetch sets the boundaries automatically
      body: formData,
    });
    return this.handleResponse<{ url: string }>(response);
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
