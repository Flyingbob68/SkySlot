/**
 * Qualification verification service.
 *
 * Implements the AND/OR group logic used to determine whether a
 * pilot holds all required qualifications for a given aircraft.
 *
 * Logic:
 *   - Aircraft requirements are grouped by `checkGroup` (AND).
 *   - Within each group, the pilot needs ANY ONE qualification (OR).
 *   - If a qualification has `hasExpiry`, its `expiryDate` must not
 *     be in the past.
 */

import * as qualificationRepo from '../repositories/qualification-repository.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualificationCheckResult {
  readonly qualified: boolean;
  readonly missingGroups: readonly number[];
  readonly expiredQualifications: readonly string[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function checkPilotQualifications(
  memberId: string,
  aircraftId: string,
): Promise<QualificationCheckResult> {
  const [requirements, memberQualifications] = await Promise.all([
    qualificationRepo.findAircraftRequirements(aircraftId),
    qualificationRepo.findMemberQualifications(memberId),
  ]);

  // No requirements configured means the pilot qualifies by default
  if (requirements.length === 0) {
    return { qualified: true, missingGroups: [], expiredQualifications: [] };
  }

  const now = new Date();
  const missingGroups: number[] = [];
  const expiredQualifications: string[] = [];

  // Build a map of member's qualifications for fast lookup
  const memberQualMap = new Map(
    memberQualifications.map((mq) => [mq.qualificationId, mq]),
  );

  for (const group of requirements) {
    let groupSatisfied = false;

    for (const requiredQual of group.qualifications) {
      const memberQual = memberQualMap.get(requiredQual.id);

      if (!memberQual) {
        continue;
      }

      // Check expiry if applicable
      if (
        memberQual.qualification.hasExpiry &&
        memberQual.expiryDate !== null
      ) {
        const expiry = new Date(memberQual.expiryDate);
        if (expiry < now) {
          expiredQualifications.push(memberQual.qualification.name);
          continue;
        }
      }

      // This qualification in the group is valid
      groupSatisfied = true;
      break;
    }

    if (!groupSatisfied) {
      missingGroups.push(group.checkGroup);
    }
  }

  return {
    qualified: missingGroups.length === 0,
    missingGroups,
    expiredQualifications: [...new Set(expiredQualifications)],
  };
}
