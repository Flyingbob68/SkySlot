/**
 * Route definitions for the members module.
 *
 * Middleware chain: authenticate -> requirePermission -> validate -> handler
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createMemberSchema,
  updateMemberSchema,
  memberQuerySchema,
  directoryQuerySchema,
  preferencesSchema,
  importSchema,
  memberIdParamSchema,
} from '../schemas/member-schemas.js';
import {
  listMembers,
  getDirectory,
  exportCsv,
  getMemberById,
  createMember,
  importMembers,
  updateMember,
  updatePreferences,
  deactivateMember,
} from '../controllers/member-controller.js';

export const membersRouter = Router();

// GET /members - List (admin/manager)
membersRouter.get(
  '/',
  authenticate,
  requirePermission('member:manage'),
  validateQuery(memberQuerySchema),
  listMembers,
);

// GET /members/directory - Public directory
membersRouter.get(
  '/directory',
  authenticate,
  validateQuery(directoryQuerySchema),
  getDirectory,
);

// GET /members/export/csv - Export CSV
membersRouter.get(
  '/export/csv',
  authenticate,
  requirePermission('member:export'),
  validateQuery(memberQuerySchema),
  exportCsv,
);

// GET /members/:id - Detail
membersRouter.get(
  '/:id',
  authenticate,
  validateParams(memberIdParamSchema),
  getMemberById,
);

// POST /members - Create
membersRouter.post(
  '/',
  authenticate,
  requirePermission('member:manage'),
  validateBody(createMemberSchema),
  createMember,
);

// POST /members/import - CSV import
membersRouter.post(
  '/import',
  authenticate,
  requirePermission('member:import'),
  validateBody(importSchema),
  importMembers,
);

// PUT /members/:id - Update
membersRouter.put(
  '/:id',
  authenticate,
  validateParams(memberIdParamSchema),
  validateBody(updateMemberSchema),
  updateMember,
);

// PUT /members/:id/preferences - Update preferences
membersRouter.put(
  '/:id/preferences',
  authenticate,
  validateParams(memberIdParamSchema),
  validateBody(preferencesSchema),
  updatePreferences,
);

// DELETE /members/:id - Deactivate
membersRouter.delete(
  '/:id',
  authenticate,
  requirePermission('member:manage'),
  validateParams(memberIdParamSchema),
  deactivateMember,
);
