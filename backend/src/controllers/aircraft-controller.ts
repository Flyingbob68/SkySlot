/**
 * Request handlers for aircraft endpoints.
 *
 * Each handler delegates to the aircraft service and wraps the result
 * in the standard API envelope via `successResponse`.
 */

import type { Request, Response } from 'express';
import { successResponse } from '../utils/api-response.js';
import * as aircraftService from '../services/aircraft-service.js';
import type { CreateAircraftInput, UpdateAircraftInput } from '../schemas/aircraft-schemas.js';

// ---------------------------------------------------------------------------
// List / detail
// ---------------------------------------------------------------------------

export const list = async (req: Request, res: Response): Promise<void> => {
  const active = req.query.active as boolean | undefined;
  const aircraft = await aircraftService.getAircraft({ active });
  res.json(successResponse(aircraft));
};

export const detail = async (req: Request, res: Response): Promise<void> => {
  const aircraft = await aircraftService.getAircraftById(req.params.id as string);
  res.json(successResponse(aircraft));
};

// ---------------------------------------------------------------------------
// Create / Update / Deactivate
// ---------------------------------------------------------------------------

export const create = async (req: Request, res: Response): Promise<void> => {
  const data: CreateAircraftInput = req.body;
  const aircraft = await aircraftService.createAircraft(data);
  res.status(201).json(successResponse(aircraft));
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const data: UpdateAircraftInput = req.body;
  const aircraft = await aircraftService.updateAircraft(req.params.id as string, data);
  res.json(successResponse(aircraft));
};

export const deactivate = async (req: Request, res: Response): Promise<void> => {
  const aircraft = await aircraftService.deactivateAircraft(req.params.id as string);
  res.json(successResponse(aircraft));
};

// ---------------------------------------------------------------------------
// Freeze / Unfreeze
// ---------------------------------------------------------------------------

export const freeze = async (req: Request, res: Response): Promise<void> => {
  const aircraft = await aircraftService.freezeAircraft(req.params.id as string);
  res.json(successResponse(aircraft));
};

export const unfreeze = async (req: Request, res: Response): Promise<void> => {
  const aircraft = await aircraftService.unfreezeAircraft(req.params.id as string);
  res.json(successResponse(aircraft));
};

// ---------------------------------------------------------------------------
// Qualification requirements
// ---------------------------------------------------------------------------

export const getQualifications = async (req: Request, res: Response): Promise<void> => {
  const requirements = await aircraftService.getQualificationRequirements(req.params.id as string);
  res.json(successResponse(requirements));
};

export const updateQualifications = async (req: Request, res: Response): Promise<void> => {
  const { requirements } = req.body as { requirements: Array<{ checkGroup: number; qualificationId: string }> };
  const result = await aircraftService.updateQualificationRequirements(req.params.id as string, requirements);
  res.json(successResponse(result));
};
