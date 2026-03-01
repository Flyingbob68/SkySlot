/**
 * API client for aircraft endpoints.
 *
 * Wraps the generic api-client functions with typed aircraft payloads
 * and return types.
 */

import { get, post, put, del } from '@/services/api-client';
import type {
  Aircraft,
  AircraftWithQualifications,
  CreateAircraftPayload,
  UpdateAircraftPayload,
  GroupedQualificationRequirements,
  QualificationRequirementPayload,
} from '@/types/aircraft';
import type { ApiResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// List / detail
// ---------------------------------------------------------------------------

export function getAircraft(
  options: { active?: boolean } = {},
): Promise<ApiResponse<Aircraft[]>> {
  const params = new URLSearchParams();
  if (options.active !== undefined) {
    params.set('active', String(options.active));
  }
  const query = params.toString();
  const url = query ? `/aircraft?${query}` : '/aircraft';
  return get<Aircraft[]>(url);
}

export function getAircraftById(
  id: string,
): Promise<ApiResponse<AircraftWithQualifications>> {
  return get<AircraftWithQualifications>(`/aircraft/${id}`);
}

// ---------------------------------------------------------------------------
// Create / Update / Deactivate
// ---------------------------------------------------------------------------

export function createAircraft(
  data: CreateAircraftPayload,
): Promise<ApiResponse<Aircraft>> {
  return post<Aircraft>('/aircraft', data);
}

export function updateAircraft(
  id: string,
  data: UpdateAircraftPayload,
): Promise<ApiResponse<Aircraft>> {
  return put<Aircraft>(`/aircraft/${id}`, data);
}

export function deactivateAircraft(
  id: string,
): Promise<ApiResponse<Aircraft>> {
  return del<Aircraft>(`/aircraft/${id}`);
}

// ---------------------------------------------------------------------------
// Freeze / Unfreeze
// ---------------------------------------------------------------------------

export function freezeAircraft(
  id: string,
): Promise<ApiResponse<Aircraft>> {
  return post<Aircraft>(`/aircraft/${id}/freeze`);
}

export function unfreezeAircraft(
  id: string,
): Promise<ApiResponse<Aircraft>> {
  return post<Aircraft>(`/aircraft/${id}/unfreeze`);
}

// ---------------------------------------------------------------------------
// Qualification requirements
// ---------------------------------------------------------------------------

export function getQualificationRequirements(
  id: string,
): Promise<ApiResponse<GroupedQualificationRequirements>> {
  return get<GroupedQualificationRequirements>(`/aircraft/${id}/qualifications`);
}

export function updateQualificationRequirements(
  id: string,
  requirements: readonly QualificationRequirementPayload[],
): Promise<ApiResponse<unknown>> {
  return put(`/aircraft/${id}/qualifications`, { requirements });
}
