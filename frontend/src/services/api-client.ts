import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';

const BASE_URL = '/api';

function getAuthHeaders(): Record<string, string> {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    return {};
  }
  return { Authorization: `Bearer ${accessToken}` };
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const result: ApiResponse<{ accessToken: string }> = await response.json();

    if (result.success && result.data) {
      useAuthStore.getState().setAccessToken(result.data.accessToken);
      return result.data.accessToken;
    }

    return null;
  } catch {
    return null;
  }
}

async function apiRequest<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const fullUrl = `${BASE_URL}${url}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    let response = await fetch(fullUrl, config);

    if (response.status === 401) {
      const newToken = await refreshAccessToken();

      if (newToken) {
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        };

        const retryConfig: RequestInit = {
          method,
          headers: retryHeaders,
          credentials: 'include',
        };

        if (body !== undefined) {
          retryConfig.body = JSON.stringify(body);
        }

        response = await fetch(fullUrl, retryConfig);
      } else {
        useAuthStore.getState().clearAuth();
        return {
          success: false,
          data: null,
          error: 'Sessione scaduta. Effettua nuovamente il login.',
        };
      }
    }

    const result: ApiResponse<T> = await response.json();
    return result;
  } catch {
    return {
      success: false,
      data: null,
      error: 'Errore di rete. Verifica la tua connessione e riprova.',
    };
  }
}

export function get<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>('GET', url);
}

export function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>('POST', url, body);
}

export function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>('PUT', url, body);
}

export function del<T>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>('DELETE', url);
}
