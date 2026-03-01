/**
 * Administration route definitions.
 *
 * Wires middleware (validation, auth, permissions) to the controller
 * handlers for each admin endpoint.
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  updateConfigSchema,
  createRoleSchema,
  updateRoleSchema,
  auditQuerySchema,
} from '../schemas/admin-schemas.js';
import * as adminController from '../controllers/admin-controller.js';

export const adminRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
});

// ---------------------------------------------------------------------------
// Club Configuration
// ---------------------------------------------------------------------------

// GET /config
adminRouter.get(
  '/config',
  authenticate,
  requirePermission('club:configure'),
  adminController.getConfig,
);

// PUT /config
adminRouter.put(
  '/config',
  authenticate,
  requirePermission('club:configure'),
  validateBody(updateConfigSchema),
  adminController.updateConfig,
);

// POST /config/logo
adminRouter.post(
  '/config/logo',
  authenticate,
  requirePermission('club:configure'),
  upload.single('logo'),
  adminController.uploadLogo,
);

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

// GET /roles
adminRouter.get(
  '/roles',
  authenticate,
  requirePermission('role:manage'),
  adminController.listRoles,
);

// POST /roles
adminRouter.post(
  '/roles',
  authenticate,
  requirePermission('role:manage'),
  validateBody(createRoleSchema),
  adminController.createRole,
);

// PUT /roles/:id
adminRouter.put(
  '/roles/:id',
  authenticate,
  requirePermission('role:manage'),
  validateBody(updateRoleSchema),
  adminController.updateRole,
);

// DELETE /roles/:id
adminRouter.delete(
  '/roles/:id',
  authenticate,
  requirePermission('role:manage'),
  adminController.deleteRole,
);

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

// GET /audit
adminRouter.get(
  '/audit',
  authenticate,
  requirePermission('audit:view'),
  validateQuery(auditQuerySchema),
  adminController.listAuditLogs,
);

// GET /audit/:id
adminRouter.get(
  '/audit/:id',
  authenticate,
  requirePermission('audit:view'),
  adminController.getAuditLogDetail,
);

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

// GET /stats
adminRouter.get(
  '/stats',
  authenticate,
  requirePermission('club:configure'),
  adminController.getStats,
);
