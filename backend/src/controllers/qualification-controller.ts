/**
 * Request handlers for qualification endpoints.
 *
 * Each handler extracts validated input from the request, delegates
 * to the service layer, and returns the standard API envelope.
 */

import type { Request, Response } from 'express';
import * as qualificationService from '../services/qualification-service.js';
import { successResponse } from '../utils/api-response.js';
import type {
  CreateQualificationInput,
  UpdateQualificationInput,
  AssignQualificationInput,
  UpdateMemberQualificationInput,
} from '../schemas/qualification-schemas.js';

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

export async function listQualifications(
  _req: Request,
  res: Response,
): Promise<void> {
  const qualifications = await qualificationService.listQualifications();
  res.json(successResponse(qualifications));
}

export async function createQualification(
  req: Request,
  res: Response,
): Promise<void> {
  const data = req.body as CreateQualificationInput;
  const qualification = await qualificationService.createQualification(data);
  res.status(201).json(successResponse(qualification));
}

export async function updateQualification(
  req: Request,
  res: Response,
): Promise<void> {
  const id = req.params.id as string;
  const data = req.body as UpdateQualificationInput;
  const qualification = await qualificationService.updateQualification(
    id,
    data,
  );
  res.json(successResponse(qualification));
}

export async function deleteQualification(
  req: Request,
  res: Response,
): Promise<void> {
  const id = req.params.id as string;
  await qualificationService.deleteQualification(id);
  res.json(successResponse(null));
}

// ---------------------------------------------------------------------------
// Expiring report
// ---------------------------------------------------------------------------

export async function getExpiringReport(
  req: Request,
  res: Response,
): Promise<void> {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 60;
  const report = await qualificationService.getExpiringReport(days);
  res.json(successResponse(report));
}

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

export async function getMemberQualifications(
  req: Request,
  res: Response,
): Promise<void> {
  const memberId = req.params.memberId as string;
  const qualifications =
    await qualificationService.getMemberQualifications(memberId);
  res.json(successResponse(qualifications));
}

export async function assignQualificationToMember(
  req: Request,
  res: Response,
): Promise<void> {
  const memberId = req.params.memberId as string;
  const data = req.body as AssignQualificationInput;
  const memberQualification =
    await qualificationService.assignQualificationToMember(memberId, data);
  res.status(201).json(successResponse(memberQualification));
}

export async function updateMemberQualification(
  req: Request,
  res: Response,
): Promise<void> {
  const memberId = req.params.memberId as string;
  const qualificationId = req.params.qualificationId as string;
  const data = req.body as UpdateMemberQualificationInput;
  const memberQualification =
    await qualificationService.updateMemberQualification(
      memberId,
      qualificationId,
      data,
    );
  res.json(successResponse(memberQualification));
}

export async function removeMemberQualification(
  req: Request,
  res: Response,
): Promise<void> {
  const memberId = req.params.memberId as string;
  const qualificationId = req.params.qualificationId as string;
  await qualificationService.removeMemberQualification(
    memberId,
    qualificationId,
  );
  res.json(successResponse(null));
}
