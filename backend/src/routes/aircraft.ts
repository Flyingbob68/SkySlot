/**
 * Express routes for the aircraft domain.
 *
 * All routes are prefixed with `/api/aircraft` when mounted in the
 * main router.  Authentication is required on every route; management
 * operations additionally require specific permissions.
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createAircraftSchema,
  updateAircraftSchema,
  qualificationRequirementsSchema,
  listAircraftQuerySchema,
} from '../schemas/aircraft-schemas.js';
import * as aircraftController from '../controllers/aircraft-controller.js';

export const aircraftRouter = Router();

// Every aircraft route requires authentication
aircraftRouter.use(authenticate);

// ---------------------------------------------------------------------------
// Read-only routes (any authenticated user)
// ---------------------------------------------------------------------------

aircraftRouter.get(
  '/',
  validateQuery(listAircraftQuerySchema),
  aircraftController.list,
);

aircraftRouter.get(
  '/:id',
  aircraftController.detail,
);

aircraftRouter.get(
  '/:id/qualifications',
  aircraftController.getQualifications,
);

// ---------------------------------------------------------------------------
// Management routes (aircraft:manage permission)
// ---------------------------------------------------------------------------

aircraftRouter.post(
  '/',
  requirePermission('aircraft:manage'),
  validateBody(createAircraftSchema),
  aircraftController.create,
);

aircraftRouter.put(
  '/:id',
  requirePermission('aircraft:manage'),
  validateBody(updateAircraftSchema),
  aircraftController.update,
);

aircraftRouter.delete(
  '/:id',
  requirePermission('aircraft:manage'),
  aircraftController.deactivate,
);

aircraftRouter.put(
  '/:id/qualifications',
  requirePermission('aircraft:manage'),
  validateBody(qualificationRequirementsSchema),
  aircraftController.updateQualifications,
);

// ---------------------------------------------------------------------------
// Freeze routes (aircraft:freeze permission)
// ---------------------------------------------------------------------------

aircraftRouter.post(
  '/:id/freeze',
  requirePermission('aircraft:freeze'),
  aircraftController.freeze,
);

aircraftRouter.post(
  '/:id/unfreeze',
  requirePermission('aircraft:freeze'),
  aircraftController.unfreeze,
);
