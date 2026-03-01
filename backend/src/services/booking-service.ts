/**
 * Business logic for the booking domain.
 *
 * Orchestrates validation, repository calls, event emission, and
 * permission checks.  Every public function is pure in the sense
 * that it never mutates its arguments.
 */

import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { eventBus } from '../utils/event-bus.js';
import * as bookingRepo from '../repositories/booking-repository.js';
import {
  validateBooking,
  type BookingValidationInput,
  type UserPermissions,
  type ValidationResult,
} from './booking-validation-service.js';
import { getSunriseSunset, type SunTimes } from './sunrise-service.js';
import type { SlotType } from '../generated/prisma/enums.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBookingData {
  readonly startDate: string;
  readonly endDate: string;
  readonly aircraftId: string;
  readonly slotType: SlotType;
  readonly instructorId?: string;
  readonly freeSeats?: number;
  readonly comments?: string;
}

interface UpdateBookingData {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly aircraftId?: string;
  readonly slotType?: SlotType;
  readonly instructorId?: string | null;
  readonly freeSeats?: number;
  readonly comments?: string | null;
}

interface BookingListOptions {
  readonly page: number;
  readonly limit: number;
  readonly memberId?: string;
  readonly aircraftId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly slotType?: SlotType;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

function extractOverrides(permissions: readonly string[]): UserPermissions {
  return {
    overrideDateLimit: permissions.includes('booking:override_date_limit'),
    overrideDuration: permissions.includes('booking:override_duration'),
    overrideInstructor: permissions.includes('booking:override_instructor'),
  };
}

function canCreateSlotType(slotType: SlotType, permissions: readonly string[]): boolean {
  switch (slotType) {
    case 'SOLO':
      return permissions.includes('booking:create_solo') || permissions.includes('booking:create_any');
    case 'DUAL':
      return permissions.includes('booking:create_dual') || permissions.includes('booking:create_any');
    case 'MAINTENANCE':
      return permissions.includes('booking:create_maintenance') || permissions.includes('booking:create_any');
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createBooking = async (
  data: CreateBookingData,
  userId: string,
  userPermissions: readonly string[],
  confirmed = false,
): Promise<{ booking: unknown; validation: ValidationResult }> => {
  // Permission check
  if (!canCreateSlotType(data.slotType, userPermissions)) {
    throw new AppError(403, 'Non hai i permessi per creare questo tipo di prenotazione');
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const validationInput: BookingValidationInput = {
    startDate,
    endDate,
    aircraftId: data.aircraftId,
    memberId: userId,
    slotType: data.slotType,
    instructorId: data.instructorId,
  };

  const validation = await validateBooking(validationInput, extractOverrides(userPermissions));

  // If there are errors, always block
  if (!validation.valid) {
    return { booking: null, validation };
  }

  // If there are warnings and user has not confirmed, return for confirmation
  if (validation.warnings.length > 0 && !confirmed) {
    return { booking: null, validation };
  }

  // Create the booking
  try {
    const booking = await bookingRepo.create({
      startDate,
      endDate,
      aircraftId: data.aircraftId,
      memberId: userId,
      slotType: data.slotType,
      instructorId: data.instructorId,
      freeSeats: data.freeSeats,
      comments: data.comments,
      createdBy: userId,
    });

    // Emit event
    eventBus.emit('booking.created', {
      bookingId: booking.id,
      memberId: userId,
      instructorId: data.instructorId,
    });

    return { booking, validation };
  } catch (err) {
    if (err instanceof Error && err.message === 'CONFLICT') {
      throw new AppError(409, "Lo slot richiesto non e' piu' disponibile. Ricarica e riprova.");
    }
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateBooking = async (
  id: string,
  data: UpdateBookingData,
  userId: string,
  userPermissions: readonly string[],
  confirmed = false,
): Promise<{ booking: unknown; validation: ValidationResult }> => {
  const existing = await bookingRepo.findById(id);
  if (!existing) {
    throw new AppError(404, 'Prenotazione non trovata');
  }

  // Permission check: owner or create_any
  const isOwner = existing.memberId === userId;
  const canUpdateAny = userPermissions.includes('booking:update_any');

  if (!isOwner && !canUpdateAny) {
    throw new AppError(403, 'Non hai i permessi per modificare questa prenotazione');
  }

  const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
  const aircraftId = data.aircraftId ?? existing.aircraftId;
  const slotType = data.slotType ?? existing.slotType;
  const instructorId = data.instructorId !== undefined ? data.instructorId : existing.instructorId;

  const validationInput: BookingValidationInput = {
    startDate,
    endDate,
    aircraftId,
    memberId: existing.memberId,
    slotType,
    instructorId: instructorId ?? undefined,
    excludeBookingId: id,
  };

  const validation = await validateBooking(validationInput, extractOverrides(userPermissions));

  if (!validation.valid) {
    return { booking: null, validation };
  }

  if (validation.warnings.length > 0 && !confirmed) {
    return { booking: null, validation };
  }

  try {
    const booking = await bookingRepo.update(id, {
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      aircraftId: data.aircraftId,
      slotType: data.slotType,
      instructorId: data.instructorId,
      freeSeats: data.freeSeats,
      comments: data.comments,
    });

    // Emit event
    eventBus.emit('booking.updated', {
      bookingId: id,
      memberId: existing.memberId,
      oldInstructorId: existing.instructorId ?? undefined,
      newInstructorId: instructorId ?? undefined,
    });

    return { booking, validation };
  } catch (err) {
    if (err instanceof Error && err.message === 'CONFLICT') {
      throw new AppError(409, "Lo slot richiesto non e' piu' disponibile. Ricarica e riprova.");
    }
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export const deleteBooking = async (
  id: string,
  userId: string,
  userPermissions: readonly string[],
): Promise<void> => {
  const existing = await bookingRepo.findById(id);
  if (!existing) {
    throw new AppError(404, 'Prenotazione non trovata');
  }

  const isOwner = existing.memberId === userId;
  const canDeleteAny = userPermissions.includes('booking:delete_any');

  if (!isOwner && !canDeleteAny) {
    throw new AppError(403, 'Non hai i permessi per cancellare questa prenotazione');
  }

  // If booking is currently in progress, truncate end time to now
  const now = new Date();
  if (existing.startDate <= now && existing.endDate > now) {
    await bookingRepo.update(id, { endDate: now });
  } else {
    await bookingRepo.deleteBooking(id);
  }

  eventBus.emit('booking.deleted', {
    bookingId: id,
    memberId: existing.memberId,
    instructorId: existing.instructorId ?? undefined,
  });
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const getBookings = async (options: BookingListOptions) => {
  return bookingRepo.findAll(options);
};

export const getBookingById = async (id: string) => {
  const booking = await bookingRepo.findById(id);
  if (!booking) {
    throw new AppError(404, 'Prenotazione non trovata');
  }
  return booking;
};

export const getMyBookings = async (
  memberId: string,
  options: { readonly page: number; readonly limit: number },
) => {
  return bookingRepo.findByMember(memberId, options);
};

export const getCalendarData = async (
  date: string,
  aircraftIds?: readonly string[],
) => {
  const dateObj = new Date(date);

  // Load aircraft list
  const aircraftWhere = aircraftIds && aircraftIds.length > 0
    ? { id: { in: [...aircraftIds] }, active: true }
    : { active: true };

  const [bookings, aircraft, clubConfig] = await Promise.all([
    bookingRepo.findCalendarData(dateObj, aircraftIds),
    prisma.aircraft.findMany({
      where: aircraftWhere,
      orderBy: { displayOrder: 'asc' },
      select: { id: true, callsign: true, type: true, seats: true },
    }),
    prisma.clubConfig.findUnique({ where: { id: 'default' } }),
  ]);

  // Get sunrise/sunset if ICAO code configured
  let sunTimes: SunTimes = { sunrise: null, sunset: null, aeroDawn: null, aeroDusk: null };
  if (clubConfig?.icaoCode) {
    sunTimes = await getSunriseSunset(dateObj, clubConfig.icaoCode);
  }

  return {
    date: dateObj.toISOString(),
    firstHour: clubConfig?.firstHour ?? '07:00',
    lastHour: clubConfig?.lastHour ?? '21:00',
    aircraft,
    bookings,
    sunTimes,
  };
};

export const checkConflicts = async (data: {
  readonly startDate: string;
  readonly endDate: string;
  readonly aircraftId: string;
  readonly memberId?: string;
  readonly instructorId?: string;
  readonly excludeBookingId?: string;
}) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  const [aircraftConflicts, memberConflicts, instructorConflicts] = await Promise.all([
    bookingRepo.findConflicts(data.aircraftId, start, end, data.excludeBookingId),
    data.memberId
      ? bookingRepo.findMemberConflicts(data.memberId, start, end, data.excludeBookingId)
      : [],
    data.instructorId
      ? bookingRepo.findInstructorConflicts(data.instructorId, start, end, data.excludeBookingId)
      : [],
  ]);

  return {
    hasConflicts:
      aircraftConflicts.length > 0 ||
      memberConflicts.length > 0 ||
      instructorConflicts.length > 0,
    aircraft: aircraftConflicts,
    member: memberConflicts,
    instructor: instructorConflicts,
  };
};
