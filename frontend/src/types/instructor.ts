/**
 * TypeScript types for the instructor module.
 *
 * All interfaces are readonly/immutable to prevent accidental mutation.
 */

export interface InstructorMember {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly cellPhone: string | null;
  readonly active: boolean;
}

export interface Instructor {
  readonly id: string;
  readonly memberId: string;
  readonly trigram: string;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly member: InstructorMember;
}

export interface RegularAvailabilitySlot {
  readonly id: string;
  readonly instructorId: string;
  readonly startDay: number;
  readonly startTime: string;
  readonly endDay: number;
  readonly endTime: string;
}

export interface RegularAvailabilityInput {
  readonly startDay: number;
  readonly startTime: string;
  readonly endDay: number;
  readonly endTime: string;
}

export interface AvailabilityException {
  readonly id: string;
  readonly instructorId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isPresent: boolean;
}

export interface AvailabilityBlock {
  readonly start: string;
  readonly end: string;
  readonly available: boolean;
}

export interface CreateExceptionInput {
  readonly startDate: string;
  readonly endDate: string;
  readonly isPresent: boolean;
}

export interface UpdateExceptionInput {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly isPresent?: boolean;
}
