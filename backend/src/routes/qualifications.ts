/**
 * Express routes for qualifications.
 *
 * Defines REST endpoints for qualification definitions,
 * member qualifications, and the expiring report.
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createQualificationSchema,
  updateQualificationSchema,
  assignQualificationSchema,
  updateMemberQualificationSchema,
} from '../schemas/qualification-schemas.js';
import * as controller from '../controllers/qualification-controller.js';
import { AppError } from '../middleware/error-handler.js';

export const qualificationsRouter = Router();

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

qualificationsRouter.get(
  '/',
  authenticate,
  controller.listQualifications,
);

qualificationsRouter.post(
  '/',
  authenticate,
  requirePermission('qualification:manage'),
  validateBody(createQualificationSchema),
  controller.createQualification,
);

qualificationsRouter.put(
  '/:id',
  authenticate,
  requirePermission('qualification:manage'),
  validateBody(updateQualificationSchema),
  controller.updateQualification,
);

qualificationsRouter.delete(
  '/:id',
  authenticate,
  requirePermission('qualification:manage'),
  controller.deleteQualification,
);

// ---------------------------------------------------------------------------
// Expiring report (must be before /members/:memberId to avoid conflict)
// ---------------------------------------------------------------------------

qualificationsRouter.get(
  '/expiring',
  authenticate,
  requirePermission('qualification:manage'),
  controller.getExpiringReport,
);

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

qualificationsRouter.get(
  '/members/:memberId/qualifications',
  authenticate,
  controller.getMemberQualifications,
);

qualificationsRouter.post(
  '/members/:memberId/qualifications',
  authenticate,
  requirePermission('qualification:manage'),
  validateBody(assignQualificationSchema),
  controller.assignQualificationToMember,
);

qualificationsRouter.put(
  '/members/:memberId/qualifications/:qualificationId',
  authenticate,
  canEditMemberQualification,
  validateBody(updateMemberQualificationSchema),
  controller.updateMemberQualification,
);

qualificationsRouter.delete(
  '/members/:memberId/qualifications/:qualificationId',
  authenticate,
  requirePermission('qualification:manage'),
  controller.removeMemberQualification,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Middleware that allows access if the user has `qualification:manage`
 * permission OR if they are editing their own qualifications and have
 * `qualification:edit_own`.
 */
function canEditMemberQualification(
  req: Express.Request & { params: Record<string, string> },
  _res: unknown,
  next: () => void,
): void {
  const userPermissions = req.user?.permissions ?? [];
  const { memberId } = req.params;

  if (userPermissions.includes('qualification:manage')) {
    next();
    return;
  }

  if (
    req.user?.id === memberId &&
    userPermissions.includes('qualification:edit_own')
  ) {
    next();
    return;
  }

  throw new AppError(403, 'Permessi insufficienti');
}
