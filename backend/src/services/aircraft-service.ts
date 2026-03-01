/**
 * Business logic for aircraft management.
 *
 * Orchestrates repository calls with validation, event emission,
 * and error handling.  Never accesses Prisma directly.
 */

import { AppError } from '../middleware/error-handler.js';
import { eventBus } from '../utils/event-bus.js';
import * as aircraftRepo from '../repositories/aircraft-repository.js';
import type { CreateAircraftInput, UpdateAircraftInput } from '../schemas/aircraft-schemas.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QualificationRequirement {
  readonly checkGroup: number;
  readonly qualificationId: string;
}

interface GroupedRequirements {
  readonly [checkGroup: number]: ReadonlyArray<{
    readonly id: string;
    readonly qualificationId: string;
    readonly qualificationName: string;
  }>;
}

// ---------------------------------------------------------------------------
// List / detail
// ---------------------------------------------------------------------------

export const getAircraft = async (options: { active?: boolean } = {}) => {
  return aircraftRepo.findAll(options);
};

export const getAircraftById = async (id: string) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  return aircraft;
};

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createAircraft = async (data: CreateAircraftInput) => {
  const existing = await aircraftRepo.findByCallsign(data.callsign);

  if (existing) {
    throw new AppError(409, 'Immatricolazione gia in uso');
  }

  return aircraftRepo.create(data);
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateAircraft = async (id: string, data: UpdateAircraftInput) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  if (data.callsign && data.callsign !== aircraft.callsign) {
    const existing = await aircraftRepo.findByCallsign(data.callsign);
    if (existing) {
      throw new AppError(409, 'Immatricolazione gia in uso');
    }
  }

  return aircraftRepo.update(id, data);
};

// ---------------------------------------------------------------------------
// Deactivate (soft delete)
// ---------------------------------------------------------------------------

export const deactivateAircraft = async (id: string) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  if (!aircraft.active) {
    throw new AppError(400, 'Aeromobile gia disattivato');
  }

  return aircraftRepo.deactivate(id);
};

// ---------------------------------------------------------------------------
// Freeze / Unfreeze
// ---------------------------------------------------------------------------

export const freezeAircraft = async (id: string) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  if (aircraft.nonBookable) {
    throw new AppError(400, 'Aeromobile gia in manutenzione');
  }

  return aircraftRepo.setNonBookable(id, true);
};

export const unfreezeAircraft = async (id: string) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  if (!aircraft.nonBookable) {
    throw new AppError(400, 'Aeromobile non e in manutenzione');
  }

  return aircraftRepo.setNonBookable(id, false);
};

// ---------------------------------------------------------------------------
// Qualification requirements
// ---------------------------------------------------------------------------

export const getQualificationRequirements = async (id: string) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  const requirements = await aircraftRepo.getQualificationRequirements(id);

  const grouped: Record<number, Array<{
    readonly id: string;
    readonly qualificationId: string;
    readonly qualificationName: string;
  }>> = {};

  for (const req of requirements) {
    const group = req.checkGroup;
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push({
      id: req.id,
      qualificationId: req.qualificationId,
      qualificationName: req.qualification.name,
    });
  }

  return grouped as GroupedRequirements;
};

export const updateQualificationRequirements = async (
  id: string,
  requirements: readonly QualificationRequirement[],
) => {
  const aircraft = await aircraftRepo.findById(id);

  if (!aircraft) {
    throw new AppError(404, 'Aeromobile non trovato');
  }

  return aircraftRepo.setQualificationRequirements(id, requirements);
};
