/**
 * Data-access layer for the Member entity.
 *
 * Every function returns new objects — nothing is mutated.
 * The Prisma singleton is imported once and reused throughout.
 */

import { prisma } from '../utils/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

// ---------------------------------------------------------------------------
// Query option types
// ---------------------------------------------------------------------------

export interface MemberListOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly active?: boolean;
  readonly roleId?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface DirectoryOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
}

export interface MemberFilters {
  readonly active?: boolean;
  readonly roleId?: string;
  readonly search?: string;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MEMBER_SELECT_BRIEF = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  memberNumber: true,
  active: true,
  flightsPaid: true,
  subscriptionExpiry: true,
  createdAt: true,
  memberRoles: {
    select: { role: { select: { id: true, name: true } } },
  },
  qualifications: {
    select: {
      expiryDate: true,
      qualification: { select: { hasExpiry: true } },
    },
  },
} as const;

const MEMBER_SELECT_FULL = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  fiscalCode: true,
  dateOfBirth: true,
  address: true,
  zipCode: true,
  city: true,
  state: true,
  country: true,
  homePhone: true,
  workPhone: true,
  cellPhone: true,
  memberNumber: true,
  subscriptionExpiry: true,
  flightsPaid: true,
  emailVerified: true,
  active: true,
  language: true,
  timezone: true,
  notificationEnabled: true,
  privacyFlags: true,
  createdAt: true,
  updatedAt: true,
  memberRoles: {
    select: { role: { select: { id: true, name: true } } },
  },
  qualifications: {
    select: {
      id: true,
      expiryDate: true,
      noAlert: true,
      qualification: { select: { id: true, name: true, hasExpiry: true } },
    },
  },
} as const;

const MEMBER_SELECT_DIRECTORY = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  cellPhone: true,
  homePhone: true,
  workPhone: true,
  address: true,
  city: true,
  privacyFlags: true,
  memberRoles: {
    select: { role: { select: { id: true, name: true } } },
  },
} as const;

function buildWhereClause(options: MemberFilters): Prisma.MemberWhereInput {
  const where: Prisma.MemberWhereInput = {};

  if (options.active !== undefined) {
    where.active = options.active;
  }

  if (options.roleId) {
    where.memberRoles = { some: { roleId: options.roleId } };
  }

  if (options.search) {
    const term = options.search;
    where.OR = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { memberNumber: { contains: term, mode: 'insensitive' } },
    ];
  }

  return where;
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

const SORTABLE_COLUMNS = new Set([
  'lastName', 'firstName', 'email', 'memberNumber', 'active', 'createdAt',
]);

export async function findAll(options: MemberListOptions) {
  const where = buildWhereClause(options);
  const skip = (options.page - 1) * options.limit;

  const orderBy: Prisma.MemberOrderByWithRelationInput[] =
    options.sortBy && SORTABLE_COLUMNS.has(options.sortBy)
      ? [{ [options.sortBy]: options.sortOrder ?? 'asc' }]
      : [{ lastName: 'asc' }, { firstName: 'asc' }];

  return prisma.member.findMany({
    where,
    select: MEMBER_SELECT_BRIEF,
    orderBy,
    skip,
    take: options.limit,
  });
}

export async function countAll(filters: MemberFilters = {}) {
  const where = buildWhereClause(filters);
  return prisma.member.count({ where });
}

export async function findById(id: string) {
  return prisma.member.findUnique({
    where: { id },
    select: MEMBER_SELECT_FULL,
  });
}

export async function findByEmail(email: string) {
  return prisma.member.findUnique({
    where: { email },
    select: { ...MEMBER_SELECT_FULL, passwordHash: true },
  });
}

export async function create(
  data: Prisma.MemberCreateInput,
) {
  return prisma.member.create({
    data,
    select: MEMBER_SELECT_FULL,
  });
}

export async function update(
  id: string,
  data: Prisma.MemberUpdateInput,
) {
  return prisma.member.update({
    where: { id },
    data,
    select: MEMBER_SELECT_FULL,
  });
}

export async function deactivate(id: string) {
  return prisma.member.update({
    where: { id },
    data: { active: false },
    select: MEMBER_SELECT_FULL,
  });
}

export async function reactivate(id: string) {
  return prisma.member.update({
    where: { id },
    data: { active: true },
    select: MEMBER_SELECT_FULL,
  });
}

export async function findDirectory(options: DirectoryOptions) {
  const where: Prisma.MemberWhereInput = { active: true };

  if (options.search) {
    const term = options.search;
    where.OR = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
    ];
  }

  const skip = (options.page - 1) * options.limit;

  return prisma.member.findMany({
    where,
    select: MEMBER_SELECT_DIRECTORY,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    skip,
    take: options.limit,
  });
}

export async function countDirectory(search?: string) {
  const where: Prisma.MemberWhereInput = { active: true };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.member.count({ where });
}

export async function updatePreferences(
  id: string,
  prefs: {
    readonly language?: string;
    readonly timezone?: string;
    readonly notificationEnabled?: boolean;
    readonly privacyFlags?: number;
  },
) {
  return prisma.member.update({
    where: { id },
    data: prefs,
    select: MEMBER_SELECT_FULL,
  });
}

export async function assignRole(memberId: string, roleId: string) {
  return prisma.memberRole.create({
    data: { memberId, roleId },
  });
}

export async function findAllForExport(filters: MemberFilters = {}) {
  const where = buildWhereClause(filters);

  return prisma.member.findMany({
    where,
    select: MEMBER_SELECT_FULL,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}
