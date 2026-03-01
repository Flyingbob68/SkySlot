/**
 * Domain types for the aircraft module.
 */

export interface Aircraft {
  readonly id: string;
  readonly callsign: string;
  readonly type: string;
  readonly seats: number;
  readonly hourlyRate: string | null;
  readonly nonBookable: boolean;
  readonly displayOrder: number;
  readonly comments: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QualificationInfo {
  readonly id: string;
  readonly name: string;
  readonly hasExpiry: boolean;
  readonly description: string | null;
}

export interface AircraftQualificationRequirement {
  readonly id: string;
  readonly qualificationId: string;
  readonly qualificationName: string;
}

export interface GroupedQualificationRequirements {
  readonly [checkGroup: number]: readonly AircraftQualificationRequirement[];
}

export interface AircraftWithQualifications extends Aircraft {
  readonly qualificationRequirements: ReadonlyArray<{
    readonly id: string;
    readonly aircraftId: string;
    readonly checkGroup: number;
    readonly qualificationId: string;
    readonly qualification: QualificationInfo;
  }>;
}

export interface CreateAircraftPayload {
  readonly callsign: string;
  readonly type: string;
  readonly seats: number;
  readonly hourlyRate?: number;
  readonly comments?: string;
  readonly displayOrder?: number;
}

export interface UpdateAircraftPayload {
  readonly callsign?: string;
  readonly type?: string;
  readonly seats?: number;
  readonly hourlyRate?: number | null;
  readonly comments?: string | null;
  readonly displayOrder?: number;
}

export interface QualificationRequirementPayload {
  readonly checkGroup: number;
  readonly qualificationId: string;
}
