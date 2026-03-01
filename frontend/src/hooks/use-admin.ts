/**
 * Admin hooks for data fetching.
 *
 * Wraps the admin API service calls with the generic `useApi` hook
 * to provide reactive data, loading states, and refetch capabilities.
 */

import { useApi } from '@/hooks/use-api';
import * as adminApi from '@/services/admin-service';
import type { ClubConfig, Role, AuditLogEntry, DashboardStats, AuditQueryParams } from '@/services/admin-service';

// ---------------------------------------------------------------------------
// Club Config
// ---------------------------------------------------------------------------

export function useConfig() {
  return useApi<ClubConfig>(
    () => adminApi.getConfig(),
    [],
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export function useRoles() {
  return useApi<Role[]>(
    () => adminApi.getRoles(),
    [],
  );
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export function useAuditLogs(options: AuditQueryParams) {
  const { page, limit, userId, entity, action, from, to } = options;

  return useApi<AuditLogEntry[]>(
    () => adminApi.getAuditLogs(options),
    [page, limit, userId, entity, action, from, to],
  );
}

// ---------------------------------------------------------------------------
// Dashboard Statistics
// ---------------------------------------------------------------------------

export function useStats() {
  return useApi<DashboardStats>(
    () => adminApi.getStats(),
    [],
  );
}
