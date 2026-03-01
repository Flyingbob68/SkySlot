/**
 * Data-access layer for qualification-related entities.
 *
 * Covers qualification definitions, member qualifications, and
 * aircraft qualification requirements.  Every function returns
 * new objects -- nothing is mutated.
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

export async function findAll() {
  return prisma.qualification.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function findById(id: string) {
  return prisma.qualification.findUnique({
    where: { id },
  });
}

interface CreateQualificationData {
  readonly name: string;
  readonly hasExpiry: boolean;
  readonly description?: string;
}

export async function create(data: CreateQualificationData) {
  return prisma.qualification.create({ data });
}

interface UpdateQualificationData {
  readonly name?: string;
  readonly description?: string;
}

export async function update(id: string, data: UpdateQualificationData) {
  return prisma.qualification.update({
    where: { id },
    data,
  });
}

export async function remove(id: string) {
  const assigned = await prisma.memberQualification.count({
    where: { qualificationId: id },
  });

  if (assigned > 0) {
    return { deleted: false, reason: 'qualification_in_use' } as const;
  }

  await prisma.qualification.delete({ where: { id } });
  return { deleted: true } as const;
}

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

export async function findMemberQualifications(memberId: string) {
  return prisma.memberQualification.findMany({
    where: { memberId },
    include: {
      qualification: true,
    },
    orderBy: { qualification: { name: 'asc' } },
  });
}

interface AssignData {
  readonly memberId: string;
  readonly qualificationId: string;
  readonly expiryDate?: Date;
}

export async function assignToMember(data: AssignData) {
  return prisma.memberQualification.create({
    data: {
      memberId: data.memberId,
      qualificationId: data.qualificationId,
      expiryDate: data.expiryDate ?? null,
    },
    include: { qualification: true },
  });
}

interface UpdateMemberQualificationData {
  readonly expiryDate?: Date | null;
  readonly noAlert?: boolean;
}

export async function updateMemberQualification(
  memberId: string,
  qualificationId: string,
  data: UpdateMemberQualificationData,
) {
  return prisma.memberQualification.update({
    where: {
      memberId_qualificationId: { memberId, qualificationId },
    },
    data,
    include: { qualification: true },
  });
}

export async function removeMemberQualification(
  memberId: string,
  qualificationId: string,
) {
  return prisma.memberQualification.delete({
    where: {
      memberId_qualificationId: { memberId, qualificationId },
    },
  });
}

// ---------------------------------------------------------------------------
// Aircraft qualification requirements
// ---------------------------------------------------------------------------

export async function findAircraftRequirements(aircraftId: string) {
  const rows = await prisma.aircraftQualification.findMany({
    where: { aircraftId },
    include: { qualification: true },
    orderBy: [{ checkGroup: 'asc' }, { qualification: { name: 'asc' } }],
  });

  // Group by checkGroup
  const groups = new Map<
    number,
    ReadonlyArray<{ readonly id: string; readonly name: string }>
  >();

  for (const row of rows) {
    const existing = groups.get(row.checkGroup) ?? [];
    groups.set(row.checkGroup, [
      ...existing,
      { id: row.qualification.id, name: row.qualification.name },
    ]);
  }

  return Array.from(groups.entries()).map(([checkGroup, qualifications]) => ({
    checkGroup,
    qualifications,
  }));
}

// ---------------------------------------------------------------------------
// Expiring qualifications report
// ---------------------------------------------------------------------------

export async function findExpiring(daysAhead: number) {
  const now = new Date();
  const futureDate = new Date(
    now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
  );

  return prisma.memberQualification.findMany({
    where: {
      qualification: { hasExpiry: true },
      expiryDate: { lte: futureDate },
      noAlert: false,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      qualification: {
        select: {
          id: true,
          name: true,
          hasExpiry: true,
        },
      },
    },
    orderBy: { expiryDate: 'asc' },
  });
}
