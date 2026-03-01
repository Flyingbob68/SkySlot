/**
 * Frontend auth API client.
 *
 * Thin wrappers around the generic api-client that call the backend
 * auth endpoints and return typed responses.
 */

import { post, get } from '@/services/api-client';
import type { AuthUser } from '@/types/domain';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface AuthTokensResponse {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly refreshToken: string;
}

interface RefreshResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
}

interface MessageResponse {
  readonly message: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const login = (identifier: string, password: string) =>
  post<AuthTokensResponse>('/auth/login', { identifier, password });

export const register = (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) =>
  post<AuthTokensResponse>('/auth/register', {
    email,
    password,
    firstName,
    lastName,
  });

export const logout = (refreshToken: string) =>
  post<MessageResponse>('/auth/logout', { refreshToken });

export const refreshToken = (token: string) =>
  post<RefreshResponse>('/auth/refresh', { token });

export const forgotPassword = (email: string) =>
  post<MessageResponse>('/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
  post<MessageResponse>('/auth/reset-password', { token, password });

export const getMe = () => get<AuthUser>('/auth/me');
