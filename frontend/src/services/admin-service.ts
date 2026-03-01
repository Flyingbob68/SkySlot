/**
 * Frontend admin API client.
 *
 * Thin wrappers around the generic api-client that call the backend
 * admin endpoints and return typed responses.
 */

import { get, post, put, del } from '@/services/api-client';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ClubConfig {
  readonly id: string;
  readonly clubName: string;
  readonly clubLogoMime: string | null;
  readonly clubWebsite: string | null;
  readonly icaoCode: string | null;
  readonly firstHour: string;
  readonly lastHour: string;
  readonly defaultTimezone: string;
  readonly defaultLanguage: string;
  readonly defaultSlotDuration: number;
  readonly minSlotDuration: number;
  readonly infoMessage: string | null;
  readonly mailFromAddress: string | null;
  readonly smtpHost: string | null;
  readonly smtpPort: number | null;
  readonly smtpUser: string | null;
  readonly smtpPass: string | null;
  readonly bookDateLimitWeeks: number;
  readonly bookDurationLimitHours: number;
  readonly bookInstructionMinMinutes: number;
  readonly bookAllocatingRule: 'SPECIFIC' | 'BY_TYPE';
  readonly bookCommentEnabled: boolean;
  readonly qualificationMode: 'OFF' | 'WARNING' | 'RESTRICTED';
  readonly subscriptionMode: 'OFF' | 'WARNING' | 'RESTRICTED';
  readonly registrationMode: 'OPEN' | 'INVITE' | 'DISABLED';
  readonly hasLogo: boolean;
  readonly updatedAt: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly isSystem: boolean;
  readonly createdAt: string;
  readonly _count: { readonly memberRoles: number };
}

export interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly userId: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly oldValues: unknown;
  readonly newValues: unknown;
  readonly ipAddress: string | null;
  readonly user: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  } | null;
}

export interface DashboardStats {
  readonly activeMembers: number;
  readonly monthlyBookings: number;
  readonly monthlyFlightHours: number;
  readonly mostUsedAircraft: readonly AircraftUsage[];
  readonly expiringQualifications: number;
}

export interface AircraftUsage {
  readonly aircraftId: string;
  readonly callsign: string;
  readonly type: string;
  readonly bookingCount: number;
}

interface MessageResponse {
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Audit query params
// ---------------------------------------------------------------------------

export interface AuditQueryParams {
  readonly page?: number;
  readonly limit?: number;
  readonly userId?: string;
  readonly entity?: string;
  readonly action?: string;
  readonly from?: string;
  readonly to?: string;
}

// ---------------------------------------------------------------------------
// Config API
// ---------------------------------------------------------------------------

export const getConfig = () =>
  get<ClubConfig>('/admin/config');

export const updateConfig = (data: Partial<ClubConfig>) =>
  put<ClubConfig>('/admin/config', data);

export const uploadLogo = async (file: File): Promise<ApiResponse<MessageResponse>> => {
  const formData = new FormData();
  formData.append('logo', file);

  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch('/api/admin/config/logo', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    return await response.json();
  } catch {
    return {
      success: false,
      data: null,
      error: 'Errore durante il caricamento del logo',
    };
  }
};

// ---------------------------------------------------------------------------
// Roles API
// ---------------------------------------------------------------------------

export const getRoles = () =>
  get<Role[]>('/admin/roles');

export const createRole = (data: { name: string; permissions: string[] }) =>
  post<Role>('/admin/roles', data);

export const updateRole = (id: string, data: { name?: string; permissions?: string[] }) =>
  put<Role>(`/admin/roles/${id}`, data);

export const deleteRole = (id: string) =>
  del<MessageResponse>(`/admin/roles/${id}`);

// ---------------------------------------------------------------------------
// Audit API
// ---------------------------------------------------------------------------

export const getAuditLogs = (params: AuditQueryParams = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.entity) searchParams.set('entity', params.entity);
  if (params.action) searchParams.set('action', params.action);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);

  const qs = searchParams.toString();
  return get<AuditLogEntry[]>(`/admin/audit${qs ? `?${qs}` : ''}`);
};

export const getAuditLogDetail = (id: string) =>
  get<AuditLogEntry>(`/admin/audit/${id}`);

// ---------------------------------------------------------------------------
// Stats API
// ---------------------------------------------------------------------------

export const getStats = () =>
  get<DashboardStats>('/admin/stats');
