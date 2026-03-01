/**
 * Authentication hook.
 *
 * Provides login, register, logout, and session-init actions that
 * coordinate the auth API client, the Zustand store, and navigation.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/services/auth-service';

// We store the refresh token in memory (not localStorage) to keep it
// out of persistent storage.  The api-client's refresh interceptor
// reads it from here.
let currentRefreshToken: string | null = null;

export const getRefreshToken = () => currentRefreshToken;
export const clearRefreshToken = () => {
  currentRefreshToken = null;
};

export function useAuth() {
  const navigate = useNavigate();
  const { setAuth, clearAuth, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await authApi.login(identifier, password);

        if (result.success && result.data) {
          currentRefreshToken = result.data.refreshToken;
          setAuth(result.data.user, result.data.accessToken);
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error ?? 'Errore durante il login.');
        }
      } catch {
        setError('Errore di rete. Riprova.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, setAuth],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
    ) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await authApi.register(
          email,
          password,
          firstName,
          lastName,
        );

        if (result.success && result.data) {
          currentRefreshToken = result.data.refreshToken;
          setAuth(result.data.user, result.data.accessToken);
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error ?? 'Errore durante la registrazione.');
        }
      } catch {
        setError('Errore di rete. Riprova.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate, setAuth],
  );

  const logout = useCallback(async () => {
    try {
      if (currentRefreshToken) {
        await authApi.logout(currentRefreshToken);
      }
    } catch {
      // Logout should always succeed client-side
    } finally {
      currentRefreshToken = null;
      clearAuth();
      navigate('/login', { replace: true });
    }
  }, [navigate, clearAuth]);

  const initAuth = useCallback(async () => {
    setLoading(true);

    try {
      // Try to get current user with existing access token
      const result = await authApi.getMe();

      if (result.success && result.data) {
        const store = useAuthStore.getState();
        if (store.accessToken) {
          setAuth(result.data, store.accessToken);
        } else {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    }
  }, [setAuth, clearAuth, setLoading]);

  return {
    login,
    register,
    logout,
    initAuth,
    error,
    isSubmitting,
    setError,
  } as const;
}
