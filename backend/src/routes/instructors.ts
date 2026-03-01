/**
 * Express route definitions for instructor endpoints.
 *
 * All routes are prefixed with /api/instructors by the parent router.
 * Authentication is required for all endpoints; write operations
 * additionally require the 'instructor:manage_availability' permission.
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  regularAvailabilitySchema,
  exceptionSchema,
  updateExceptionSchema,
  availabilityQuerySchema,
  exceptionQuerySchema,
} from '../schemas/instructor-schemas.js';
import * as controller from '../controllers/instructor-controller.js';

export const instructorsRouter = Router();

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------

instructorsRouter.get(
  '/',
  authenticate,
  controller.listInstructors,
);

instructorsRouter.get(
  '/:id',
  authenticate,
  controller.getInstructor,
);

// ---------------------------------------------------------------------------
// Resolved Availability
// ---------------------------------------------------------------------------

instructorsRouter.get(
  '/:id/availability',
  authenticate,
  validateQuery(availabilityQuerySchema),
  controller.getAvailability,
);

// ---------------------------------------------------------------------------
// Regular Availability
// ---------------------------------------------------------------------------

instructorsRouter.get(
  '/:id/regular-availability',
  authenticate,
  controller.getRegularAvailability,
);

instructorsRouter.put(
  '/:id/regular-availability',
  authenticate,
  requirePermission('instructor:manage_availability'),
  validateBody(regularAvailabilitySchema),
  controller.updateRegularAvailability,
);

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

instructorsRouter.get(
  '/:id/exceptions',
  authenticate,
  validateQuery(exceptionQuerySchema),
  controller.listExceptions,
);

instructorsRouter.post(
  '/:id/exceptions',
  authenticate,
  requirePermission('instructor:manage_availability'),
  validateBody(exceptionSchema),
  controller.createException,
);

instructorsRouter.put(
  '/:id/exceptions/:eid',
  authenticate,
  requirePermission('instructor:manage_availability'),
  validateBody(updateExceptionSchema),
  controller.updateException,
);

instructorsRouter.delete(
  '/:id/exceptions/:eid',
  authenticate,
  requirePermission('instructor:manage_availability'),
  controller.deleteException,
);
