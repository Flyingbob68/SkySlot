/**
 * Data access layer for authentication-related entities.
 *
 * Handles refresh tokens, login attempts, and member lookups needed by
 * the auth service. Uses the shared Prisma singleton -- never creates
 * its own PrismaClient.
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

export const findRefreshToken = async (tokenHash: string) => {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      member: {
        include: {
          memberRoles: {
            include: { role: true },
          },
        },
      },
    },
  });
};

export const createRefreshToken = async (
  memberId: string,
  tokenHash: string,
  expiresAt: Date,
) => {
  return prisma.refreshToken.create({
    data: { memberId, tokenHash, expiresAt },
  });
};

export const revokeRefreshToken = async (id: string) => {
  return prisma.refreshToken.update({
    where: { id },
    data: { revoked: true },
  });
};

export const revokeAllMemberTokens = async (memberId: string) => {
  return prisma.refreshToken.updateMany({
    where: { memberId, revoked: false },
    data: { revoked: true },
  });
};

export const cleanExpiredTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revoked: true },
      ],
    },
  });
};

// ---------------------------------------------------------------------------
// Login attempts (brute-force tracking)
// ---------------------------------------------------------------------------

export const recordLoginAttempt = async (
  identifier: string,
  type: string,
  success: boolean,
) => {
  return prisma.loginAttempt.create({
    data: { identifier, type, success },
  });
};

export const countRecentFailedAttempts = async (
  identifier: string,
  type: string,
  windowMinutes: number,
): Promise<number> => {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  return prisma.loginAttempt.count({
    where: {
      identifier,
      type,
      success: false,
      attemptedAt: { gte: since },
    },
  });
};

// ---------------------------------------------------------------------------
// Member lookups
// ---------------------------------------------------------------------------

export const findMemberByEmail = async (email: string) => {
  return prisma.member.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberRoles: {
        include: { role: true },
      },
    },
  });
};

export const findMemberByMemberNumber = async (memberNumber: string) => {
  return prisma.member.findMany({
    where: { memberNumber },
    include: {
      memberRoles: {
        include: { role: true },
      },
    },
  });
};

export const findMemberById = async (id: string) => {
  return prisma.member.findUnique({
    where: { id },
    include: {
      memberRoles: {
        include: { role: true },
      },
    },
  });
};

interface CreateMemberData {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
}

export const createMember = async (data: CreateMemberData) => {
  const pilotRole = await prisma.role.findUnique({
    where: { name: 'pilot' },
  });

  if (!pilotRole) {
    throw new Error('Default role "pilot" not found. Please seed the database.');
  }

  return prisma.member.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      memberRoles: {
        create: { roleId: pilotRole.id },
      },
    },
    include: {
      memberRoles: {
        include: { role: true },
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Password reset token (stored in passwordHash temporarily)
// ---------------------------------------------------------------------------

export const updateMemberPasswordHash = async (
  memberId: string,
  passwordHash: string,
) => {
  return prisma.member.update({
    where: { id: memberId },
    data: { passwordHash },
  });
};
