/**
 * Request handlers for administration endpoints.
 *
 * Each handler delegates to the admin/audit/stats services and wraps
 * the result in the standard API envelope via `successResponse`.
 */

import type { Request, Response } from 'express';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import * as adminService from '../services/admin-service.js';
import * as auditService from '../services/audit-service.js';
import * as statsService from '../services/stats-service.js';
import type { UpdateConfigInput, CreateRoleInput, UpdateRoleInput } from '../schemas/admin-schemas.js';

// ---------------------------------------------------------------------------
// Club Configuration
// ---------------------------------------------------------------------------

export const getConfig = async (_req: Request, res: Response): Promise<void> => {
  const config = await adminService.getConfig();
  res.json(successResponse(config));
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  const data: UpdateConfigInput = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const oldConfig = await adminService.getConfig();
  const config = await adminService.updateConfig(data);

  await auditService.log(
    userId, 'update', 'ClubConfig', 'default',
    oldConfig as unknown as Record<string, unknown>,
    config as unknown as Record<string, unknown>,
    ipAddress,
  );

  res.json(successResponse(config));
};

export const uploadLogo = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;

  if (!file) {
    res.status(400).json(successResponse(undefined));
    return;
  }

  const result = await adminService.uploadLogo({
    buffer: file.buffer,
    mimetype: file.mimetype,
    size: file.size,
  });

  const userId = req.user?.id;
  const ipAddress = req.ip;
  await auditService.log(
    userId, 'update', 'ClubConfig', 'default',
    undefined,
    { logo: 'updated' },
    ipAddress,
  );

  res.json(successResponse(result));
};

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const listRoles = async (_req: Request, res: Response): Promise<void> => {
  const roles = await adminService.getRoles();
  res.json(successResponse(roles));
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  const data: CreateRoleInput = req.body;
  const role = await adminService.createRole(data);

  const userId = req.user?.id;
  const ipAddress = req.ip;
  await auditService.log(
    userId, 'create', 'Role', role.id,
    undefined,
    role as unknown as Record<string, unknown>,
    ipAddress,
  );

  res.status(201).json(successResponse(role));
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data: UpdateRoleInput = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const oldRole = await adminService.getRoles().then((roles) =>
    roles.find((r) => r.id === id),
  );

  const role = await adminService.updateRole(id, data);

  await auditService.log(
    userId, 'update', 'Role', id,
    oldRole as unknown as Record<string, unknown> | undefined,
    role as unknown as Record<string, unknown>,
    ipAddress,
  );

  res.json(successResponse(role));
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const oldRole = await adminService.getRoles().then((roles) =>
    roles.find((r) => r.id === id),
  );

  await adminService.deleteRole(id);

  await auditService.log(
    userId, 'delete', 'Role', id,
    oldRole as unknown as Record<string, unknown> | undefined,
    undefined,
    ipAddress,
  );

  res.json(successResponse({ message: 'Ruolo eliminato con successo' }));
};

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  // Query has been validated and transformed by validateQuery middleware
  const query = req.query as unknown as {
    page: number;
    limit: number;
    userId?: string;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
  };

  const { items, total } = await auditService.getAuditLogs({
    page: query.page,
    limit: query.limit,
    userId: query.userId,
    entity: query.entity,
    action: query.action,
    from: query.from,
    to: query.to,
  });

  res.json(paginatedResponse(items, total, query.page, query.limit));
};

export const getAuditLogDetail = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const entry = await auditService.getAuditLogById(id);
  res.json(successResponse(entry));
};

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const stats = await statsService.getDashboardStats();
  res.json(successResponse(stats));
};
