import { create } from 'zustand';
import type { AuthUser } from '@/types/domain';

interface AuthState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isLoading: false }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setAccessToken: (accessToken) => set({ accessToken }),
}));
