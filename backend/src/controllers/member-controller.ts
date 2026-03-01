/**
 * Express request handlers for member endpoints.
 *
 * Each handler delegates to the member service and wraps the result in the
 * standard SkySlot API envelope.
 */

import type { Request, Response } from 'express';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import * as memberService from '../services/member-service.js';
import type {
  CreateMemberInput,
  UpdateMemberInput,
  MemberQueryInput,
  DirectoryQueryInput,
  PreferencesInput,
  ImportInput,
} from '../schemas/member-schemas.js';

// ---------------------------------------------------------------------------
// GET /members
// ---------------------------------------------------------------------------

export async function listMembers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as MemberQueryInput;

  const { members, total } = await memberService.getMembers({
    page: query.page,
    limit: query.limit,
    search: query.search,
    active: query.active,
    roleId: query.roleId,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  res.json(paginatedResponse(members, total, query.page, query.limit));
}

// ---------------------------------------------------------------------------
// GET /members/directory
// ---------------------------------------------------------------------------

export async function getDirectory(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as DirectoryQueryInput;
  const user = req.user!;

  const { members, total } = await memberService.getDirectory(
    { page: query.page, limit: query.limit, search: query.search },
    user.id,
    user.permissions,
  );

  res.json(paginatedResponse(members, total, query.page, query.limit));
}

// ---------------------------------------------------------------------------
// GET /members/export/csv
// ---------------------------------------------------------------------------

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as MemberQueryInput;

  const csv = await memberService.exportToCsv({
    active: query.active,
    roleId: query.roleId,
    search: query.search,
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="soci.csv"');
  res.send(csv);
}

// ---------------------------------------------------------------------------
// GET /members/:id
// ---------------------------------------------------------------------------

export async function getMemberById(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const user = req.user!;

  const member = await memberService.getMemberById(
    id,
    user.id,
    user.permissions,
  );

  res.json(successResponse(member));
}

// ---------------------------------------------------------------------------
// POST /members
// ---------------------------------------------------------------------------

export async function createMember(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateMemberInput;
  const user = req.user!;

  const result = await memberService.createMember(data, user.id);

  res.status(201).json(successResponse(result));
}

// ---------------------------------------------------------------------------
// POST /members/import
// ---------------------------------------------------------------------------

export async function importMembers(req: Request, res: Response): Promise<void> {
  const { csvData } = req.body as ImportInput;
  const user = req.user!;

  const result = await memberService.importFromCsv(csvData, user.id);

  res.json(successResponse(result));
}

// ---------------------------------------------------------------------------
// PUT /members/:id
// ---------------------------------------------------------------------------

export async function updateMember(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body as UpdateMemberInput;
  const user = req.user!;

  const member = await memberService.updateMember(
    id,
    data,
    user.id,
    user.permissions,
  );

  res.json(successResponse(member));
}

// ---------------------------------------------------------------------------
// PUT /members/:id/preferences
// ---------------------------------------------------------------------------

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body as PreferencesInput;
  const user = req.user!;

  const member = await memberService.updatePreferences(id, data, user.id);

  res.json(successResponse(member));
}

// ---------------------------------------------------------------------------
// DELETE /members/:id
// ---------------------------------------------------------------------------

export async function deactivateMember(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  const member = await memberService.deactivateMember(id);

  res.json(successResponse(member));
}
