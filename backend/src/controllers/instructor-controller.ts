/**
 * Request handlers for instructor API endpoints.
 *
 * Each handler extracts validated input from the request, delegates
 * to the service layer, and returns a consistent API envelope.
 */

import type { Request, Response } from 'express';
import { successResponse } from '../utils/api-response.js';
import * as instructorService from '../services/instructor-service.js';

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------

export const listInstructors = async (_req: Request, res: Response) => {
  const instructors = await instructorService.getInstructors();
  res.json(successResponse(instructors));
};

export const getInstructor = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const instructor = await instructorService.getInstructorById(id);
  res.json(successResponse(instructor));
};

// ---------------------------------------------------------------------------
// Resolved Availability
// ---------------------------------------------------------------------------

export const getAvailability = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { from, to } = req.query as unknown as { from: Date; to: Date };
  const blocks = await instructorService.getAvailability(id, from, to);
  res.json(successResponse(blocks));
};

// ---------------------------------------------------------------------------
// Regular Availability
// ---------------------------------------------------------------------------

export const getRegularAvailability = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const slots = await instructorService.getRegularAvailability(id);
  res.json(successResponse(slots));
};

export const updateRegularAvailability = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { slots } = req.body;
  const updated = await instructorService.updateRegularAvailability(id, slots);
  res.json(successResponse(updated));
};

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export const listExceptions = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { from, to } = req.query as unknown as { from?: Date; to?: Date };
  const exceptions = await instructorService.getExceptions(id, from, to);
  res.json(successResponse(exceptions));
};

export const createException = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const exception = await instructorService.createException(id, req.body);
  res.status(201).json(successResponse(exception));
};

export const updateException = async (req: Request, res: Response) => {
  const eid = req.params.eid as string;
  const exception = await instructorService.updateException(eid, req.body);
  res.json(successResponse(exception));
};

export const deleteException = async (req: Request, res: Response) => {
  const eid = req.params.eid as string;
  await instructorService.deleteException(eid);
  res.json(successResponse(null));
};
