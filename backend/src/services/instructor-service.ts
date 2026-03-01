/**
 * Business logic for instructor management.
 *
 * Orchestrates repository calls, availability resolution, and
 * validation.  Each public function is a self-contained use case
 * that returns an immutable result.
 */

import { AppError } from '../middleware/error-handler.js';
import * as instructorRepo from '../repositories/instructor-repository.js';
import * as availabilityResolver from './availability-resolver.js';
import type { RegularAvailabilitySlot } from '../schemas/instructor-schemas.js';

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------

export const getInstructors = async () => {
  return instructorRepo.findAll();
};

export const getInstructorById = async (id: string) => {
  const instructor = await instructorRepo.findById(id);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return instructor;
};

// ---------------------------------------------------------------------------
// Resolved Availability
// ---------------------------------------------------------------------------

export const getAvailability = async (
  instructorId: string,
  from: Date,
  to: Date,
) => {
  const instructor = await instructorRepo.findById(instructorId);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return availabilityResolver.resolveAvailability(instructorId, from, to);
};

// ---------------------------------------------------------------------------
// Regular Availability (weekly schedule)
// ---------------------------------------------------------------------------

export const getRegularAvailability = async (instructorId: string) => {
  const instructor = await instructorRepo.findById(instructorId);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return instructorRepo.getRegularAvailability(instructorId);
};

export const updateRegularAvailability = async (
  instructorId: string,
  slots: readonly RegularAvailabilitySlot[],
) => {
  const instructor = await instructorRepo.findById(instructorId);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return instructorRepo.setRegularAvailability(instructorId, slots);
};

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export const getExceptions = async (
  instructorId: string,
  from?: Date,
  to?: Date,
) => {
  const instructor = await instructorRepo.findById(instructorId);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return instructorRepo.getExceptions(instructorId, { from, to });
};

interface CreateExceptionData {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly isPresent: boolean;
}

export const createException = async (
  instructorId: string,
  data: CreateExceptionData,
) => {
  const instructor = await instructorRepo.findById(instructorId);

  if (!instructor) {
    throw new AppError(404, 'Istruttore non trovato.');
  }

  return instructorRepo.createException(instructorId, data);
};

interface UpdateExceptionData {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly isPresent?: boolean;
}

export const updateException = async (
  id: string,
  data: UpdateExceptionData,
) => {
  const existing = await instructorRepo.findExceptionById(id);

  if (!existing) {
    throw new AppError(404, 'Eccezione non trovata.');
  }

  return instructorRepo.updateException(id, data);
};

export const deleteException = async (id: string) => {
  const existing = await instructorRepo.findExceptionById(id);

  if (!existing) {
    throw new AppError(404, 'Eccezione non trovata.');
  }

  return instructorRepo.deleteException(id);
};
