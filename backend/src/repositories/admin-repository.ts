/**
 * Data access layer for administration entities.
 *
 * Handles club configuration, roles, and audit log persistence.
 * Uses the shared Prisma singleton -- never creates its own PrismaClient.
 */

import { prisma } from '../utils/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

// ---------------------------------------------------------------------------
// Club Configuration
// ---------------------------------------------------------------------------

export const getConfig = async () => {
  return prisma.clubConfig.findUnique({
    where: { id: 'default' },
  });
};

export const updateConfig = async (data: Prisma.ClubConfigUpdateInput) => {
  return prisma.clubConfig.update({
    where: { id: 'default' },
    data,
  });
};

export const updateLogo = async (logo: Buffer, mime: string) => {
  return prisma.clubConfig.update({
    where: { id: 'default' },
    data: {
      clubLogo: new Uint8Array(logo),
      clubLogoMime: mime,
    },
  });
};

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const getRoles = async () => {
  return prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { memberRoles: true } },
    },
  });
};

export const getRoleById = async (id: string) => {
  return prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { memberRoles: true } },
    },
  });
};

export const getRoleByName = async (name: string) => {
  return prisma.role.findUnique({
    where: { name },
  });
};

interface CreateRoleData {
  readonly name: string;
  readonly permissions: readonly string[];
}

export const createRole = async (data: CreateRoleData) => {
  return prisma.role.create({
    data: {
      name: data.name,
      permissions: [...data.permissions],
      isSystem: false,
    },
    include: {
      _count: { select: { memberRoles: true } },
    },
  });
};

interface UpdateRoleData {
  readonly name?: string;
  readonly permissions?: readonly string[];
}

export const updateRole = async (id: string, data: UpdateRoleData) => {
  const updateData: Prisma.RoleUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.permissions !== undefined) {
    updateData.permissions = [...data.permissions];
  }

  return prisma.role.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { memberRoles: true } },
    },
  });
};

export const deleteRole = async (id: string) => {
  return prisma.role.delete({
    where: { id },
  });
};

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

interface AuditLogQueryOptions {
  readonly page: number;
  readonly limit: number;
  readonly userId?: string;
  readonly entity?: string;
  readonly action?: string;
  readonly from?: string;
  readonly to?: string;
}

export const getAuditLogs = async (options: AuditLogQueryOptions) => {
  const where: Prisma.AuditLogWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }
  if (options.entity) {
    where.entity = options.entity;
  }
  if (options.action) {
    where.action = options.action;
  }
  if (options.from || options.to) {
    where.timestamp = {};
    if (options.from) {
      where.timestamp.gte = new Date(options.from);
    }
    if (options.to) {
      where.timestamp.lte = new Date(options.to);
    }
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: options.limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
};

export const getAuditLogById = async (id: string) => {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
};

interface CreateAuditLogData {
  readonly userId?: string;
  readonly action: string;
  readonly entity: string;
  readonly entityId?: string;
  readonly oldValues?: Prisma.InputJsonValue;
  readonly newValues?: Prisma.InputJsonValue;
  readonly ipAddress?: string;
}

export const createAuditLog = async (data: CreateAuditLogData) => {
  return prisma.auditLog.create({
    data: {
      userId: data.userId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      oldValues: data.oldValues ?? undefined,
      newValues: data.newValues ?? undefined,
      ipAddress: data.ipAddress ?? null,
    },
  });
};
