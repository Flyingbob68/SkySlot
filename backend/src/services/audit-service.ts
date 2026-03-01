/**
 * Shared audit logging service.
 *
 * This service is imported by ALL modules that need to record audit entries.
 * It wraps the admin repository's audit operations and provides a clean,
 * consistent API for creating and querying audit log records.
 */

import type { Prisma } from '../generated/prisma/client.js';
import * as adminRepo from '../repositories/admin-repository.js';
import { AppError } from '../middleware/error-handler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogOptions {
  readonly page: number;
  readonly limit: number;
  readonly userId?: string;
  readonly entity?: string;
  readonly action?: string;
  readonly from?: string;
  readonly to?: string;
}

// ---------------------------------------------------------------------------
// Create audit entry
// ---------------------------------------------------------------------------

export const log = async (
  userId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  oldValues?: unknown,
  newValues?: unknown,
  ipAddress?: string,
) => {
  return adminRepo.createAuditLog({
    userId,
    action,
    entity,
    entityId,
    oldValues: oldValues as Prisma.InputJsonValue | undefined,
    newValues: newValues as Prisma.InputJsonValue | undefined,
    ipAddress,
  });
};

// ---------------------------------------------------------------------------
// Query audit logs
// ---------------------------------------------------------------------------

export const getAuditLogs = async (options: AuditLogOptions) => {
  return adminRepo.getAuditLogs(options);
};

export const getAuditLogById = async (id: string) => {
  const entry = await adminRepo.getAuditLogById(id);

  if (!entry) {
    throw new AppError(404, 'Voce di audit non trovata');
  }

  return entry;
};
