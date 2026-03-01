/**
 * React hooks for member data fetching.
 *
 * Built on top of the generic useApi hook and the member API client.
 */

import { useApi } from '@/hooks/use-api';
import {
  fetchMembers,
  fetchMemberById,
  fetchDirectory,
} from '@/services/member-service';

export function useMembers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  roleId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 25;
  const search = options?.search;
  const active = options?.active;
  const roleId = options?.roleId;
  const sortBy = options?.sortBy;
  const sortOrder = options?.sortOrder;

  return useApi(
    () => fetchMembers({ page, limit, search, active, roleId, sortBy, sortOrder }),
    [page, limit, search, active, roleId, sortBy, sortOrder],
  );
}

export function useMember(id: string | undefined) {
  return useApi(
    () => {
      if (!id) {
        return Promise.resolve({
          success: false as const,
          data: null,
          error: 'ID non fornito',
        });
      }
      return fetchMemberById(id);
    },
    [id],
  );
}

export function useMemberDirectory(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 25;
  const search = options?.search;

  return useApi(
    () => fetchDirectory({ page, limit, search }),
    [page, limit, search],
  );
}
