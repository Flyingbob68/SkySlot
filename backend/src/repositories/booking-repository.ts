/**
 * Data access layer for bookings.
 *
 * Uses the shared Prisma singleton and leverages `$transaction` with raw
 * `SELECT ... FOR UPDATE` for pessimistic locking during create/update.
 */

import { prisma } from '../utils/prisma.js';
import type { SlotType } from '../generated/prisma/enums.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FindAllOptions {
  readonly page: number;
  readonly limit: number;
  readonly memberId?: string;
  readonly aircraftId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly slotType?: SlotType;
}

interface CreateBookingData {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly aircraftId: string;
  readonly memberId: string;
  readonly slotType: SlotType;
  readonly instructorId?: string;
  readonly freeSeats?: number;
  readonly comments?: string;
  readonly createdBy: string;
}

interface UpdateBookingData {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly aircraftId?: string;
  readonly slotType?: SlotType;
  readonly instructorId?: string | null;
  readonly freeSeats?: number;
  readonly comments?: string | null;
}

// ---------------------------------------------------------------------------
// Include fragments
// ---------------------------------------------------------------------------

const bookingWithRelations = {
  aircraft: true,
  member: { select: { id: true, firstName: true, lastName: true, email: true } },
  instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
  creator: { select: { id: true, firstName: true, lastName: true } },
} as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const findAll = async (options: FindAllOptions) => {
  const { page, limit, memberId, aircraftId, from, to, slotType } = options;

  const where = {
    ...(memberId ? { memberId } : {}),
    ...(aircraftId ? { aircraftId } : {}),
    ...(slotType ? { slotType } : {}),
    ...(from || to
      ? {
          startDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingWithRelations,
      orderBy: { startDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
};

export const findById = async (id: string) => {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingWithRelations,
  });
};

export const findByMember = async (
  memberId: string,
  options: { readonly page: number; readonly limit: number },
) => {
  const where = { memberId };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingWithRelations,
      orderBy: { startDate: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
};

export const findCalendarData = async (
  date: Date,
  aircraftIds?: readonly string[],
) => {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  return prisma.booking.findMany({
    where: {
      startDate: { lt: dayEnd },
      endDate: { gt: dayStart },
      ...(aircraftIds && aircraftIds.length > 0
        ? { aircraftId: { in: [...aircraftIds] } }
        : {}),
    },
    include: bookingWithRelations,
    orderBy: { startDate: 'asc' },
  });
};

export const findConflicts = async (
  aircraftId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
) => {
  return prisma.booking.findMany({
    where: {
      aircraftId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, startDate: true, endDate: true },
  });
};

export const findMemberConflicts = async (
  memberId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
) => {
  return prisma.booking.findMany({
    where: {
      memberId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, startDate: true, endDate: true },
  });
};

export const findInstructorConflicts = async (
  instructorId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
) => {
  return prisma.booking.findMany({
    where: {
      instructorId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, startDate: true, endDate: true },
  });
};

// ---------------------------------------------------------------------------
// Mutations (with pessimistic locking)
// ---------------------------------------------------------------------------

export const create = async (data: CreateBookingData) => {
  return prisma.$transaction(async (tx) => {
    // Pessimistic lock: acquire row-level lock on conflicting bookings
    await tx.$queryRawUnsafe(
      `SELECT id FROM bookings WHERE aircraft_id = $1
       AND start_date < $2 AND end_date > $3 FOR UPDATE`,
      data.aircraftId,
      data.endDate.toISOString(),
      data.startDate.toISOString(),
    );

    // Double-check no conflict exists after acquiring lock
    const conflicts = await tx.booking.findMany({
      where: {
        aircraftId: data.aircraftId,
        startDate: { lt: data.endDate },
        endDate: { gt: data.startDate },
      },
      select: { id: true },
    });

    if (conflicts.length > 0) {
      throw new Error('CONFLICT');
    }

    return tx.booking.create({
      data: {
        startDate: data.startDate,
        endDate: data.endDate,
        aircraftId: data.aircraftId,
        memberId: data.memberId,
        slotType: data.slotType,
        instructorId: data.instructorId ?? null,
        freeSeats: data.freeSeats ?? 0,
        comments: data.comments ?? null,
        createdBy: data.createdBy,
      },
      include: bookingWithRelations,
    });
  });
};

export const update = async (id: string, data: UpdateBookingData) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUniqueOrThrow({ where: { id } });

    const newStart = data.startDate ?? existing.startDate;
    const newEnd = data.endDate ?? existing.endDate;
    const newAircraftId = data.aircraftId ?? existing.aircraftId;

    // Pessimistic lock on the time range
    await tx.$queryRawUnsafe(
      `SELECT id FROM bookings WHERE aircraft_id = $1
       AND start_date < $2 AND end_date > $3 AND id != $4 FOR UPDATE`,
      newAircraftId,
      newEnd.toISOString(),
      newStart.toISOString(),
      id,
    );

    // Double-check no conflict after acquiring lock
    const conflicts = await tx.booking.findMany({
      where: {
        aircraftId: newAircraftId,
        startDate: { lt: newEnd },
        endDate: { gt: newStart },
        id: { not: id },
      },
      select: { id: true },
    });

    if (conflicts.length > 0) {
      throw new Error('CONFLICT');
    }

    return tx.booking.update({
      where: { id },
      data: {
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
        ...(data.aircraftId !== undefined ? { aircraftId: data.aircraftId } : {}),
        ...(data.slotType !== undefined ? { slotType: data.slotType } : {}),
        ...(data.instructorId !== undefined ? { instructorId: data.instructorId } : {}),
        ...(data.freeSeats !== undefined ? { freeSeats: data.freeSeats } : {}),
        ...(data.comments !== undefined ? { comments: data.comments } : {}),
      },
      include: bookingWithRelations,
    });
  });
};

export const deleteBooking = async (id: string) => {
  return prisma.booking.delete({ where: { id } });
};

export const countByDateRange = async (from: Date, to: Date) => {
  return prisma.booking.count({
    where: {
      startDate: { gte: from },
      endDate: { lte: to },
    },
  });
};
