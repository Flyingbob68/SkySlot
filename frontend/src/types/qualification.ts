/**
 * Domain types for the qualifications module.
 */

export interface Qualification {
  readonly id: string;
  readonly name: string;
  readonly hasExpiry: boolean;
  readonly description: string | null;
  readonly createdAt: string;
}

export interface MemberQualification {
  readonly id: string;
  readonly memberId: string;
  readonly qualificationId: string;
  readonly expiryDate: string | null;
  readonly noAlert: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly qualification: Qualification;
}

export interface ExpiringQualification {
  readonly id: string;
  readonly expiryDate: string | null;
  readonly noAlert: boolean;
  readonly member: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  };
  readonly qualification: {
    readonly id: string;
    readonly name: string;
    readonly hasExpiry: boolean;
  };
}

export interface QualificationRequirementGroup {
  readonly checkGroup: number;
  readonly qualifications: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}

export interface CreateQualificationPayload {
  readonly name: string;
  readonly hasExpiry: boolean;
  readonly description?: string;
}

export interface UpdateQualificationPayload {
  readonly name?: string;
  readonly description?: string | null;
}

export interface AssignQualificationPayload {
  readonly qualificationId: string;
  readonly expiryDate?: string;
}

export interface UpdateMemberQualificationPayload {
  readonly expiryDate?: string | null;
  readonly noAlert?: boolean;
}
