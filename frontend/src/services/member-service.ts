/**
 * API client functions for the members module.
 *
 * Every function returns a Promise<ApiResponse<T>>.
 */

import { get, post, put, del } from '@/services/api-client';
import type { ApiResponse } from '@/types/api';
import type {
  Member,
  MemberDetail,
  DirectoryMember,
  MemberCreateResult,
  ImportResult,
} from '@/types/domain';

// ---------------------------------------------------------------------------
// Query-string builder
// ---------------------------------------------------------------------------

function toQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return `?${qs}`;
}

// ---------------------------------------------------------------------------
// List types used by the API
// ---------------------------------------------------------------------------

interface MemberQualificationBrief {
  readonly expiryDate: string | null;
  readonly qualification: { readonly hasExpiry: boolean };
}

export interface MemberListItem {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly memberNumber: string | null;
  readonly active: boolean;
  readonly flightsPaid: boolean;
  readonly subscriptionExpiry: string | null;
  readonly createdAt: string;
  readonly memberRoles: readonly { readonly role: { readonly id: string; readonly name: string } }[];
  readonly qualifications: readonly MemberQualificationBrief[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function fetchMembers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  roleId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ApiResponse<MemberListItem[]>> {
  const qs = toQueryString({
    page: options?.page,
    limit: options?.limit,
    search: options?.search,
    active: options?.active,
    roleId: options?.roleId,
    sortBy: options?.sortBy,
    sortOrder: options?.sortOrder,
  });
  return get<MemberListItem[]>(`/members${qs}`);
}

export function fetchMemberById(id: string): Promise<ApiResponse<MemberDetail>> {
  return get<MemberDetail>(`/members/${id}`);
}

export function fetchDirectory(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ApiResponse<DirectoryMember[]>> {
  const qs = toQueryString({
    page: options?.page,
    limit: options?.limit,
    search: options?.search,
  });
  return get<DirectoryMember[]>(`/members/directory${qs}`);
}

export function createMember(data: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  fiscalCode?: string;
  dateOfBirth?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
  homePhone?: string;
  workPhone?: string;
  cellPhone?: string;
  memberNumber?: string;
  subscriptionExpiry?: string;
  roleId?: string;
}): Promise<ApiResponse<MemberCreateResult>> {
  return post<MemberCreateResult>('/members', data);
}

export function updateMember(
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<MemberDetail>> {
  return put<MemberDetail>(`/members/${id}`, data);
}

export function updatePreferences(
  id: string,
  prefs: {
    language?: string;
    timezone?: string;
    notificationEnabled?: boolean;
    privacyFlags?: number;
  },
): Promise<ApiResponse<MemberDetail>> {
  return put<MemberDetail>(`/members/${id}/preferences`, prefs);
}

export function deactivateMember(id: string): Promise<ApiResponse<MemberDetail>> {
  return del<MemberDetail>(`/members/${id}`);
}

export function importMembersCsv(csvData: string): Promise<ApiResponse<ImportResult>> {
  return post<ImportResult>('/members/import', { csvData });
}

export function exportMembersCsv(options?: {
  active?: boolean;
  roleId?: string;
  search?: string;
}): string {
  const qs = toQueryString({
    active: options?.active,
    roleId: options?.roleId,
    search: options?.search,
  });
  return `/api/members/export/csv${qs}`;
}
