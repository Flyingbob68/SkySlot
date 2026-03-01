/**
 * Data access layer for aircraft entities.
 *
 * Handles CRUD operations, soft-delete, freeze/unfreeze, and
 * qualification requirements for the fleet.  Uses the shared
 * Prisma singleton -- never creates its own PrismaClient.
 */

import { prisma } from '../utils/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

// ---------------------------------------------------------------------------
// List / find
// ---------------------------------------------------------------------------

interface FindAllOptions {
  readonly active?: boolean;
}

export const findAll = async (options: FindAllOptions = {}) => {
  const where: Prisma.AircraftWhereInput = {};

  if (options.active !== undefined) {
    where.active = options.active;
  }

  return prisma.aircraft.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  });
};

export const findById = async (id: string) => {
  return prisma.aircraft.findUnique({
    where: { id },
    include: {
      qualificationRequirements: {
        include: { qualification: true },
        orderBy: { checkGroup: 'asc' },
      },
    },
  });
};

export const findByCallsign = async (callsign: string) => {
  return prisma.aircraft.findUnique({
    where: { callsign },
  });
};

export const findByType = async (type: string) => {
  return prisma.aircraft.findMany({
    where: { type, active: true },
    orderBy: { displayOrder: 'asc' },
  });
};

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

interface CreateAircraftData {
  readonly callsign: string;
  readonly type: string;
  readonly seats: number;
  readonly hourlyRate?: number;
  readonly comments?: string;
  readonly displayOrder?: number;
}

export const create = async (data: CreateAircraftData) => {
  return prisma.aircraft.create({
    data: {
      callsign: data.callsign,
      type: data.type,
      seats: data.seats,
      hourlyRate: data.hourlyRate ?? null,
      comments: data.comments ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  });
};

interface UpdateAircraftData {
  readonly callsign?: string;
  readonly type?: string;
  readonly seats?: number;
  readonly hourlyRate?: number | null;
  readonly comments?: string | null;
  readonly displayOrder?: number;
}

export const update = async (id: string, data: UpdateAircraftData) => {
  return prisma.aircraft.update({
    where: { id },
    data,
  });
};

// ---------------------------------------------------------------------------
// Soft delete / freeze
// ---------------------------------------------------------------------------

export const deactivate = async (id: string) => {
  return prisma.aircraft.update({
    where: { id },
    data: { active: false },
  });
};

export const setNonBookable = async (id: string, nonBookable: boolean) => {
  return prisma.aircraft.update({
    where: { id },
    data: { nonBookable },
  });
};

// ---------------------------------------------------------------------------
// Qualification requirements
// ---------------------------------------------------------------------------

export const getQualificationRequirements = async (id: string) => {
  return prisma.aircraftQualification.findMany({
    where: { aircraftId: id },
    include: { qualification: true },
    orderBy: { checkGroup: 'asc' },
  });
};

interface QualificationRequirement {
  readonly checkGroup: number;
  readonly qualificationId: string;
}

export const setQualificationRequirements = async (
  id: string,
  requirements: readonly QualificationRequirement[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.aircraftQualification.deleteMany({
      where: { aircraftId: id },
    });

    if (requirements.length === 0) {
      return [];
    }

    await tx.aircraftQualification.createMany({
      data: requirements.map((req) => ({
        aircraftId: id,
        checkGroup: req.checkGroup,
        qualificationId: req.qualificationId,
      })),
    });

    return tx.aircraftQualification.findMany({
      where: { aircraftId: id },
      include: { qualification: true },
      orderBy: { checkGroup: 'asc' },
    });
  });
};
