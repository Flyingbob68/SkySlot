/**
 * API client for qualification endpoints.
 *
 * Wraps the generic api-client functions with typed qualification
 * payloads and return types.
 */

import { get, post, put, del } from '@/services/api-client';
import type {
  Qualification,
  MemberQualification,
  ExpiringQualification,
  QualificationRequirementGroup,
  CreateQualificationPayload,
  UpdateQualificationPayload,
  AssignQualificationPayload,
  UpdateMemberQualificationPayload,
} from '@/types/qualification';
import type { ApiResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

export function getQualifications(): Promise<ApiResponse<Qualification[]>> {
  return get<Qualification[]>('/qualifications');
}

export function createQualification(
  data: CreateQualificationPayload,
): Promise<ApiResponse<Qualification>> {
  return post<Qualification>('/qualifications', data);
}

export function updateQualification(
  id: string,
  data: UpdateQualificationPayload,
): Promise<ApiResponse<Qualification>> {
  return put<Qualification>(`/qualifications/${id}`, data);
}

export function deleteQualification(
  id: string,
): Promise<ApiResponse<null>> {
  return del<null>(`/qualifications/${id}`);
}

// ---------------------------------------------------------------------------
// Expiring report
// ---------------------------------------------------------------------------

export function getExpiringReport(
  days: number = 60,
): Promise<ApiResponse<ExpiringQualification[]>> {
  return get<ExpiringQualification[]>(
    `/qualifications/expiring?days=${days}`,
  );
}

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

export function getMemberQualifications(
  memberId: string,
): Promise<ApiResponse<MemberQualification[]>> {
  return get<MemberQualification[]>(
    `/qualifications/members/${memberId}/qualifications`,
  );
}

export function assignQualification(
  memberId: string,
  data: AssignQualificationPayload,
): Promise<ApiResponse<MemberQualification>> {
  return post<MemberQualification>(
    `/qualifications/members/${memberId}/qualifications`,
    data,
  );
}

export function updateMemberQualification(
  memberId: string,
  qualificationId: string,
  data: UpdateMemberQualificationPayload,
): Promise<ApiResponse<MemberQualification>> {
  return put<MemberQualification>(
    `/qualifications/members/${memberId}/qualifications/${qualificationId}`,
    data,
  );
}

export function removeMemberQualification(
  memberId: string,
  qualificationId: string,
): Promise<ApiResponse<null>> {
  return del<null>(
    `/qualifications/members/${memberId}/qualifications/${qualificationId}`,
  );
}

// ---------------------------------------------------------------------------
// Aircraft requirements (read from qualifications module)
// ---------------------------------------------------------------------------

export function getAircraftRequirements(
  aircraftId: string,
): Promise<ApiResponse<QualificationRequirementGroup[]>> {
  return get<QualificationRequirementGroup[]>(
    `/aircraft/${aircraftId}/qualifications`,
  );
}
