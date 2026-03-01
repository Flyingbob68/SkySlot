export interface MemberRole {
  readonly role: {
    readonly id: string;
    readonly name: string;
  };
}

export interface MemberQualification {
  readonly id: string;
  readonly expiryDate: string | null;
  readonly noAlert: boolean;
  readonly qualification: {
    readonly id: string;
    readonly name: string;
    readonly hasExpiry: boolean;
  };
}

export interface Member {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly memberNumber?: string | null;
  readonly active: boolean;
  readonly roles: readonly string[];
  readonly memberRoles?: readonly MemberRole[];
  readonly subscriptionExpiry?: string | null;
  readonly createdAt?: string;
}

export interface MemberDetail {
  readonly id: string;
  readonly email: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly fiscalCode: string | null;
  readonly dateOfBirth: string | null;
  readonly address: string | null;
  readonly zipCode: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly country: string | null;
  readonly homePhone: string | null;
  readonly workPhone: string | null;
  readonly cellPhone: string | null;
  readonly memberNumber: string | null;
  readonly subscriptionExpiry: string | null;
  readonly flightsPaid: boolean;
  readonly emailVerified: boolean;
  readonly active: boolean;
  readonly language: string;
  readonly timezone: string;
  readonly notificationEnabled: boolean;
  readonly privacyFlags: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly memberRoles: readonly MemberRole[];
  readonly qualifications: readonly MemberQualification[];
}

export interface DirectoryMember {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly cellPhone: string | null;
  readonly homePhone: string | null;
  readonly workPhone: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly privacyFlags: number;
  readonly memberRoles: readonly MemberRole[];
}

export interface MemberCreateResult {
  readonly member: MemberDetail | null;
  readonly generatedPassword?: string;
}

export interface ImportResult {
  readonly created: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}
