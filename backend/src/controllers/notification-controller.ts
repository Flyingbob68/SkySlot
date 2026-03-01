/**
 * Request handlers for notification preference endpoints.
 *
 * Each handler delegates to the notification repository and wraps
 * the result in the standard API envelope via `successResponse`.
 */

import type { Request, Response } from 'express';
import { successResponse } from '../utils/api-response.js';
import * as notificationRepo from '../repositories/notification-repository.js';
import { AppError } from '../middleware/error-handler.js';
import type { UpdatePreferencesInput } from '../schemas/notification-schemas.js';

// ---------------------------------------------------------------------------
// GET /preferences
// ---------------------------------------------------------------------------

export const getPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const memberId = req.user!.id;

  const preferences = await notificationRepo.getPreferences(memberId);

  if (!preferences) {
    throw new AppError(404, 'Utente non trovato.');
  }

  res.json(successResponse(preferences));
};

// ---------------------------------------------------------------------------
// PUT /preferences
// ---------------------------------------------------------------------------

export const updatePreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const memberId = req.user!.id;
  const data: UpdatePreferencesInput = req.body;

  const updated = await notificationRepo.updatePreferences(memberId, {
    notificationEnabled: data.notificationEnabled,
  });

  res.json(successResponse(updated));
};
