/**
 * Booking validation pipeline.
 *
 * Runs temporal, conflict, qualification, subscription and instructor
 * checks in sequence.  Returns structured errors and warnings so the
 * controller/service can decide whether to proceed, block, or ask the
 * user for confirmation.
 */

import { prisma } from '../utils/prisma.js';
import { isWithinOperatingHours } from '../utils/date.js';
import * as bookingRepo from '../repositories/booking-repository.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationError {
  readonly code: string;
  readonly message: string;
}

export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface BookingValidationInput {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly aircraftId: string;
  readonly memberId: string;
  readonly slotType: 'SOLO' | 'DUAL' | 'MAINTENANCE';
  readonly instructorId?: string;
  readonly excludeBookingId?: string;
}

export interface UserPermissions {
  readonly overrideDateLimit: boolean;
  readonly overrideDuration: boolean;
  readonly overrideInstructor: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOnQuarterHour(date: Date): boolean {
  return date.getMinutes() % 15 === 0 && date.getSeconds() === 0;
}

function durationMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

// ---------------------------------------------------------------------------
// Temporal validation
// ---------------------------------------------------------------------------

async function validateTemporal(
  input: BookingValidationInput,
  permissions: UserPermissions,
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const now = new Date();

  // Not in the past
  if (input.startDate <= now) {
    errors.push({
      code: 'PAST_START',
      message: 'La data di inizio deve essere nel futuro',
    });
  }

  // End > Start
  if (input.endDate <= input.startDate) {
    errors.push({
      code: 'INVALID_RANGE',
      message: "L'ora di fine deve essere successiva all'ora di inizio",
    });
  }

  // 15-minute granularity
  if (!isOnQuarterHour(input.startDate)) {
    errors.push({
      code: 'GRANULARITY_START',
      message: "L'ora di inizio deve essere a quarti d'ora (00, 15, 30, 45)",
    });
  }
  if (!isOnQuarterHour(input.endDate)) {
    errors.push({
      code: 'GRANULARITY_END',
      message: "L'ora di fine deve essere a quarti d'ora (00, 15, 30, 45)",
    });
  }

  // Load club config for operating hours and limits
  const clubConfig = await prisma.clubConfig.findUnique({ where: { id: 'default' } });
  if (!clubConfig) {
    errors.push({ code: 'NO_CONFIG', message: 'Configurazione club non trovata' });
    return { errors, warnings };
  }

  // Operating hours
  if (!isWithinOperatingHours(input.startDate, input.endDate, clubConfig.firstHour, clubConfig.lastHour)) {
    errors.push({
      code: 'OUTSIDE_HOURS',
      message: `Prenotazione fuori dall'orario operativo (${clubConfig.firstHour} - ${clubConfig.lastHour})`,
    });
  }

  // Max advance date
  if (!permissions.overrideDateLimit && clubConfig.bookDateLimitWeeks > 0) {
    const maxDate = new Date(now.getTime() + clubConfig.bookDateLimitWeeks * 7 * 86_400_000);
    if (input.startDate > maxDate) {
      errors.push({
        code: 'TOO_FAR_AHEAD',
        message: `Non e' possibile prenotare oltre ${clubConfig.bookDateLimitWeeks} settimane in anticipo`,
      });
    }
  }

  // Max duration
  const duration = durationMinutes(input.startDate, input.endDate);
  if (!permissions.overrideDuration && clubConfig.bookDurationLimitHours > 0) {
    const maxMinutes = clubConfig.bookDurationLimitHours * 60;
    if (duration > maxMinutes) {
      errors.push({
        code: 'TOO_LONG',
        message: `Durata massima superata (${clubConfig.bookDurationLimitHours} ore)`,
      });
    }
  }

  // Min instruction duration for DUAL
  if (input.slotType === 'DUAL' && clubConfig.bookInstructionMinMinutes > 0) {
    if (duration < clubConfig.bookInstructionMinMinutes) {
      errors.push({
        code: 'TOO_SHORT_DUAL',
        message: `Durata minima per voli con istruttore: ${clubConfig.bookInstructionMinMinutes} minuti`,
      });
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Conflict validation
// ---------------------------------------------------------------------------

async function validateConflicts(
  input: BookingValidationInput,
): Promise<{ errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  // Aircraft overlap
  const aircraftConflicts = await bookingRepo.findConflicts(
    input.aircraftId,
    input.startDate,
    input.endDate,
    input.excludeBookingId,
  );
  if (aircraftConflicts.length > 0) {
    errors.push({
      code: 'AIRCRAFT_CONFLICT',
      message: "L'aeromobile e' gia' prenotato in questo orario",
    });
  }

  // Pilot overlap
  const memberConflicts = await bookingRepo.findMemberConflicts(
    input.memberId,
    input.startDate,
    input.endDate,
    input.excludeBookingId,
  );
  if (memberConflicts.length > 0) {
    errors.push({
      code: 'PILOT_CONFLICT',
      message: 'Hai gia\' una prenotazione sovrapposta in questo orario',
    });
  }

  // Instructor overlap
  if (input.instructorId) {
    const instrConflicts = await bookingRepo.findInstructorConflicts(
      input.instructorId,
      input.startDate,
      input.endDate,
      input.excludeBookingId,
    );
    if (instrConflicts.length > 0) {
      errors.push({
        code: 'INSTRUCTOR_CONFLICT',
        message: "L'istruttore ha gia' un impegno sovrapposto in questo orario",
      });
    }
  }

  // Pilot !== Instructor
  if (input.instructorId && input.memberId === input.instructorId) {
    errors.push({
      code: 'SELF_INSTRUCTION',
      message: "Il pilota e l'istruttore devono essere persone diverse",
    });
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// Qualification validation
// ---------------------------------------------------------------------------

async function validateQualifications(
  input: BookingValidationInput,
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Only check qualifications for SOLO flights
  if (input.slotType !== 'SOLO') {
    return { errors, warnings };
  }

  const clubConfig = await prisma.clubConfig.findUnique({ where: { id: 'default' } });
  if (!clubConfig || clubConfig.qualificationMode === 'OFF') {
    return { errors, warnings };
  }

  // Get aircraft qualification requirements (grouped by checkGroup)
  const requirements = await prisma.aircraftQualification.findMany({
    where: { aircraftId: input.aircraftId },
    include: { qualification: true },
  });

  if (requirements.length === 0) {
    return { errors, warnings };
  }

  // Get member's qualifications
  const memberQuals = await prisma.memberQualification.findMany({
    where: { memberId: input.memberId },
    include: { qualification: true },
  });

  const memberQualIds = new Set(
    memberQuals
      .filter((mq) => {
        // Check expiry
        if (mq.expiryDate && mq.expiryDate < new Date()) return false;
        return true;
      })
      .map((mq) => mq.qualificationId),
  );

  // Group requirements by checkGroup -- pilot must have at least one from each group
  const groups = new Map<number, typeof requirements>();
  for (const req of requirements) {
    const group = groups.get(req.checkGroup) ?? [];
    groups.set(req.checkGroup, [...group, req]);
  }

  for (const [groupNum, groupReqs] of groups) {
    const hasAny = groupReqs.some((r) => memberQualIds.has(r.qualificationId));
    if (!hasAny) {
      const names = groupReqs.map((r) => r.qualification.name).join(' / ');
      const msg = `Qualifica mancante (gruppo ${groupNum}): ${names}`;

      if (clubConfig.qualificationMode === 'RESTRICTED') {
        errors.push({ code: 'MISSING_QUALIFICATION', message: msg });
      } else {
        warnings.push({ code: 'MISSING_QUALIFICATION', message: msg });
      }
    }
  }

  // Check for expired qualifications that the member does have
  const expiredQuals = memberQuals.filter(
    (mq) => mq.expiryDate && mq.expiryDate < new Date(),
  );
  for (const eq of expiredQuals) {
    const isRequired = requirements.some((r) => r.qualificationId === eq.qualificationId);
    if (isRequired) {
      const msg = `Qualifica scaduta: ${eq.qualification.name}`;
      if (clubConfig.qualificationMode === 'RESTRICTED') {
        errors.push({ code: 'EXPIRED_QUALIFICATION', message: msg });
      } else {
        warnings.push({ code: 'EXPIRED_QUALIFICATION', message: msg });
      }
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Subscription validation
// ---------------------------------------------------------------------------

async function validateSubscription(
  input: BookingValidationInput,
): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const clubConfig = await prisma.clubConfig.findUnique({ where: { id: 'default' } });
  if (!clubConfig || clubConfig.subscriptionMode === 'OFF') {
    return { errors, warnings };
  }

  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    select: { subscriptionExpiry: true },
  });

  if (!member) {
    errors.push({ code: 'MEMBER_NOT_FOUND', message: 'Socio non trovato' });
    return { errors, warnings };
  }

  if (member.subscriptionExpiry && member.subscriptionExpiry < new Date()) {
    const msg = 'Quota associativa scaduta';
    if (clubConfig.subscriptionMode === 'RESTRICTED') {
      errors.push({ code: 'SUBSCRIPTION_EXPIRED', message: msg });
    } else {
      warnings.push({ code: 'SUBSCRIPTION_EXPIRED', message: msg });
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Instructor availability validation
// ---------------------------------------------------------------------------

async function validateInstructor(
  input: BookingValidationInput,
  permissions: UserPermissions,
): Promise<{ errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  if (input.slotType !== 'DUAL' || !input.instructorId) {
    return { errors };
  }

  if (permissions.overrideInstructor) {
    return { errors };
  }

  // Find instructor record by memberId
  const instructor = await prisma.instructor.findUnique({
    where: { memberId: input.instructorId },
    include: { regularAvailability: true, exceptions: true },
  });

  if (!instructor) {
    errors.push({
      code: 'INSTRUCTOR_NOT_FOUND',
      message: 'Istruttore non trovato',
    });
    return { errors };
  }

  // Check exceptions first (they override regular availability)
  const matchingException = instructor.exceptions.find(
    (ex) => input.startDate >= ex.startDate && input.endDate <= ex.endDate,
  );

  if (matchingException) {
    if (!matchingException.isPresent) {
      errors.push({
        code: 'INSTRUCTOR_UNAVAILABLE',
        message: "L'istruttore non e' disponibile in questo periodo (eccezione)",
      });
    }
    // If isPresent, the exception confirms availability -- skip regular check
    return { errors };
  }

  // Check regular availability
  const bookingDay = input.startDate.getUTCDay(); // 0=Sun
  const startMinutes = input.startDate.getUTCHours() * 60 + input.startDate.getUTCMinutes();
  const endMinutes = input.endDate.getUTCHours() * 60 + input.endDate.getUTCMinutes();

  const isAvailable = instructor.regularAvailability.some((ra) => {
    if (ra.startDay !== bookingDay) return false;
    const raStart = parseAvailTime(ra.startTime);
    const raEnd = parseAvailTime(ra.endTime);
    return startMinutes >= raStart && endMinutes <= raEnd;
  });

  if (!isAvailable) {
    errors.push({
      code: 'INSTRUCTOR_UNAVAILABLE',
      message: "L'istruttore non e' disponibile in questo orario",
    });
  }

  return { errors };
}

function parseAvailTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Aircraft bookability
// ---------------------------------------------------------------------------

async function validateAircraft(
  input: BookingValidationInput,
): Promise<{ errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  const aircraft = await prisma.aircraft.findUnique({
    where: { id: input.aircraftId },
    select: { nonBookable: true, active: true, callsign: true },
  });

  if (!aircraft) {
    errors.push({ code: 'AIRCRAFT_NOT_FOUND', message: 'Aeromobile non trovato' });
    return { errors };
  }

  if (!aircraft.active) {
    errors.push({ code: 'AIRCRAFT_INACTIVE', message: 'Aeromobile non attivo' });
  }

  if (aircraft.nonBookable && input.slotType !== 'MAINTENANCE') {
    errors.push({
      code: 'AIRCRAFT_NOT_BOOKABLE',
      message: `L'aeromobile ${aircraft.callsign} non e' prenotabile`,
    });
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// Financial status validation
// ---------------------------------------------------------------------------

async function validateFinancialStatus(
  input: BookingValidationInput,
): Promise<{ errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    select: { flightsPaid: true },
  });

  if (!member) {
    errors.push({ code: 'MEMBER_NOT_FOUND', message: 'Socio non trovato' });
    return { errors };
  }

  if (!member.flightsPaid) {
    errors.push({
      code: 'FLIGHTS_NOT_PAID',
      message: 'Pagamento voli non in regola. Contattare la segreteria.',
    });
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// Main validation pipeline
// ---------------------------------------------------------------------------

export const validateBooking = async (
  input: BookingValidationInput,
  permissions: UserPermissions,
): Promise<ValidationResult> => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Run independent validations in parallel
  const [temporal, conflicts, qualifications, subscription, instructor, aircraft, financial] =
    await Promise.all([
      validateTemporal(input, permissions),
      validateConflicts(input),
      validateQualifications(input),
      validateSubscription(input),
      validateInstructor(input, permissions),
      validateAircraft(input),
      validateFinancialStatus(input),
    ]);

  allErrors.push(
    ...temporal.errors,
    ...conflicts.errors,
    ...qualifications.errors,
    ...subscription.errors,
    ...instructor.errors,
    ...aircraft.errors,
    ...financial.errors,
  );

  allWarnings.push(
    ...temporal.warnings,
    ...qualifications.warnings,
    ...subscription.warnings,
  );

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};
