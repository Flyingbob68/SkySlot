/**
 * Notification route definitions.
 *
 * Wires authentication middleware and Zod validation to the
 * notification controller handlers.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updatePreferencesSchema } from '../schemas/notification-schemas.js';
import * as notificationController from '../controllers/notification-controller.js';

export const notificationsRouter = Router();

// GET /preferences -- get own notification preferences
notificationsRouter.get(
  '/preferences',
  authenticate,
  notificationController.getPreferences,
);

// PUT /preferences -- update own notification preferences
notificationsRouter.put(
  '/preferences',
  authenticate,
  validateBody(updatePreferencesSchema),
  notificationController.updatePreferences,
);
