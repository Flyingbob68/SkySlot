/**
 * React hooks for qualification data fetching.
 *
 * Wraps the useApi generic hook with typed qualification fetchers
 * so that pages can consume qualification data declaratively.
 */

import { useApi } from '@/hooks/use-api';
import * as qualificationService from '@/services/qualification-service';
import type {
  Qualification,
  MemberQualification,
  ExpiringQualification,
} from '@/types/qualification';

/**
 * Fetch all qualification definitions.
 */
export function useQualifications() {
  return useApi<Qualification[]>(
    () => qualificationService.getQualifications(),
    [],
  );
}

/**
 * Fetch a member's qualifications.
 *
 * @param memberId - The member ID (cuid).
 */
export function useMemberQualifications(memberId: string) {
  return useApi<MemberQualification[]>(
    () => qualificationService.getMemberQualifications(memberId),
    [memberId],
  );
}

/**
 * Fetch expiring qualifications report.
 *
 * @param days - Number of days to look ahead (default 60).
 */
export function useExpiringQualifications(days: number = 60) {
  return useApi<ExpiringQualification[]>(
    () => qualificationService.getExpiringReport(days),
    [days],
  );
}
