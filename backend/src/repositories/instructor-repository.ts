/**
 * Data access layer for instructor entities.
 *
 * Handles CRUD operations for instructors, their regular weekly
 * availability, and availability exceptions.  Uses the shared
 * Prisma singleton -- never creates its own PrismaClient.
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Instructor - List / Find
// ---------------------------------------------------------------------------

export const findAll = async () => {
  return prisma.instructor.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          cellPhone: true,
          active: true,
        },
      },
    },
  });
};

export const findById = async (id: string) => {
  return prisma.instructor.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          cellPhone: true,
          active: true,
        },
      },
    },
  });
};

export const findByMemberId = async (memberId: string) => {
  return prisma.instructor.findUnique({
    where: { memberId },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          cellPhone: true,
          active: true,
        },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Instructor - Create
// ---------------------------------------------------------------------------

interface CreateInstructorData {
  readonly memberId: string;
  readonly trigram: string;
  readonly displayOrder?: number;
}

export const create = async (data: CreateInstructorData) => {
  return prisma.instructor.create({
    data: {
      memberId: data.memberId,
      trigram: data.trigram,
      displayOrder: data.displayOrder ?? 0,
    },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          cellPhone: true,
          active: true,
        },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Regular Availability
// ---------------------------------------------------------------------------

export const getRegularAvailability = async (instructorId: string) => {
  return prisma.regularAvailability.findMany({
    where: { instructorId },
    orderBy: [{ startDay: 'asc' }, { startTime: 'asc' }],
  });
};

interface RegularAvailabilitySlot {
  readonly startDay: number;
  readonly startTime: string;
  readonly endDay: number;
  readonly endTime: string;
}

export const setRegularAvailability = async (
  instructorId: string,
  slots: readonly RegularAvailabilitySlot[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.regularAvailability.deleteMany({
      where: { instructorId },
    });

    if (slots.length === 0) {
      return [];
    }

    await tx.regularAvailability.createMany({
      data: slots.map((slot) => ({
        instructorId,
        startDay: slot.startDay,
        startTime: slot.startTime,
        endDay: slot.endDay,
        endTime: slot.endTime,
      })),
    });

    return tx.regularAvailability.findMany({
      where: { instructorId },
      orderBy: [{ startDay: 'asc' }, { startTime: 'asc' }],
    });
  });
};

// ---------------------------------------------------------------------------
// Availability Exceptions
// ---------------------------------------------------------------------------

interface ExceptionFilters {
  readonly from?: Date;
  readonly to?: Date;
}

export const getExceptions = async (
  instructorId: string,
  filters: ExceptionFilters = {},
) => {
  const where: Record<string, unknown> = { instructorId };

  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {};
    if (filters.from) {
      dateFilter.gte = filters.from;
    }
    if (filters.to) {
      dateFilter.lte = filters.to;
    }
    where.endDate = dateFilter;
  }

  return prisma.availabilityException.findMany({
    where,
    orderBy: { startDate: 'asc' },
  });
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
  return prisma.availabilityException.create({
    data: {
      instructorId,
      startDate: data.startDate,
      endDate: data.endDate,
      isPresent: data.isPresent,
    },
  });
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
  return prisma.availabilityException.update({
    where: { id },
    data,
  });
};

export const deleteException = async (id: string) => {
  return prisma.availabilityException.delete({
    where: { id },
  });
};

export const findExceptionById = async (id: string) => {
  return prisma.availabilityException.findUnique({
    where: { id },
  });
};
