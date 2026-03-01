/**
 * Dashboard statistics service.
 *
 * Aggregates data from multiple tables to produce summary statistics
 * for the administration dashboard.  Uses the shared Prisma singleton
 * directly since these are read-only aggregate queries.
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  readonly activeMembers: number;
  readonly monthlyBookings: number;
  readonly monthlyFlightHours: number;
  readonly mostUsedAircraft: readonly AircraftUsage[];
  readonly expiringQualifications: number;
}

interface AircraftUsage {
  readonly aircraftId: string;
  readonly callsign: string;
  readonly type: string;
  readonly bookingCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthRange(): { readonly start: Date; readonly end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function computeHours(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60);
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { start, end } = getMonthRange();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    activeMembers,
    monthlyBookings,
    bookingsWithTimes,
    aircraftUsage,
    expiringQualifications,
  ] = await Promise.all([
    // Active members count
    prisma.member.count({
      where: { active: true },
    }),

    // Monthly bookings count
    prisma.booking.count({
      where: {
        startDate: { gte: start },
        endDate: { lte: end },
      },
    }),

    // Monthly bookings with times for hours calculation
    prisma.booking.findMany({
      where: {
        startDate: { gte: start },
        endDate: { lte: end },
      },
      select: { startDate: true, endDate: true },
    }),

    // Top 5 most used aircraft this month
    prisma.booking.groupBy({
      by: ['aircraftId'],
      where: {
        startDate: { gte: start },
        endDate: { lte: end },
      },
      _count: { aircraftId: true },
      orderBy: { _count: { aircraftId: 'desc' } },
      take: 5,
    }),

    // Expiring qualifications count (within 30 days)
    prisma.memberQualification.count({
      where: {
        expiryDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
        noAlert: false,
        member: { active: true },
      },
    }),
  ]);

  // Calculate total flight hours this month
  const monthlyFlightHours = bookingsWithTimes.reduce(
    (total, booking) => total + computeHours(booking.startDate, booking.endDate),
    0,
  );

  // Enrich aircraft usage with callsign and type
  const aircraftIds = aircraftUsage.map((a) => a.aircraftId);
  const aircraftDetails = aircraftIds.length > 0
    ? await prisma.aircraft.findMany({
        where: { id: { in: aircraftIds } },
        select: { id: true, callsign: true, type: true },
      })
    : [];

  const aircraftMap = new Map(
    aircraftDetails.map((a) => [a.id, a]),
  );

  const mostUsedAircraft: readonly AircraftUsage[] = aircraftUsage.map((usage) => {
    const detail = aircraftMap.get(usage.aircraftId);
    return {
      aircraftId: usage.aircraftId,
      callsign: detail?.callsign ?? 'Sconosciuto',
      type: detail?.type ?? 'Sconosciuto',
      bookingCount: usage._count.aircraftId,
    };
  });

  return {
    activeMembers,
    monthlyBookings,
    monthlyFlightHours: Math.round(monthlyFlightHours * 10) / 10,
    mostUsedAircraft,
    expiringQualifications,
  };
};
