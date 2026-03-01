/**
 * Business logic for qualification definitions and member qualifications.
 *
 * Orchestrates repository calls, enforces business rules, and emits
 * domain events.  All functions return new objects (immutable).
 */

import * as qualificationRepo from '../repositories/qualification-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { eventBus } from '../utils/event-bus.js';
import type {
  CreateQualificationInput,
  UpdateQualificationInput,
  AssignQualificationInput,
  UpdateMemberQualificationInput,
} from '../schemas/qualification-schemas.js';

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

export async function listQualifications() {
  return qualificationRepo.findAll();
}

export async function getQualification(id: string) {
  const qualification = await qualificationRepo.findById(id);

  if (!qualification) {
    throw new AppError(404, 'Qualifica non trovata');
  }

  return qualification;
}

export async function createQualification(data: CreateQualificationInput) {
  return qualificationRepo.create({
    name: data.name,
    hasExpiry: data.hasExpiry,
    description: data.description,
  });
}

export async function updateQualification(
  id: string,
  data: UpdateQualificationInput,
) {
  await getQualification(id);

  return qualificationRepo.update(id, {
    name: data.name,
    description: data.description ?? undefined,
  });
}

export async function deleteQualification(id: string) {
  await getQualification(id);

  const result = await qualificationRepo.remove(id);

  if (!result.deleted) {
    throw new AppError(
      409,
      'Impossibile eliminare: la qualifica è assegnata a dei soci',
    );
  }
}

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

export async function getMemberQualifications(memberId: string) {
  return qualificationRepo.findMemberQualifications(memberId);
}

export async function assignQualificationToMember(
  memberId: string,
  data: AssignQualificationInput,
) {
  const qualification = await getQualification(data.qualificationId);

  // If the qualification requires expiry, validate it was provided
  if (qualification.hasExpiry && !data.expiryDate) {
    throw new AppError(
      400,
      'La data di scadenza è obbligatoria per questa qualifica',
    );
  }

  try {
    return await qualificationRepo.assignToMember({
      memberId,
      qualificationId: data.qualificationId,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      throw new AppError(
        409,
        'Il socio possiede già questa qualifica',
      );
    }
    throw error;
  }
}

export async function updateMemberQualification(
  memberId: string,
  qualificationId: string,
  data: UpdateMemberQualificationInput,
) {
  const updateData: { expiryDate?: Date | null; noAlert?: boolean } = {};

  if (data.expiryDate !== undefined) {
    updateData.expiryDate =
      data.expiryDate === null ? null : new Date(data.expiryDate);
  }

  if (data.noAlert !== undefined) {
    updateData.noAlert = data.noAlert;
  }

  try {
    return await qualificationRepo.updateMemberQualification(
      memberId,
      qualificationId,
      updateData,
    );
  } catch {
    throw new AppError(404, 'Qualifica del socio non trovata');
  }
}

export async function removeMemberQualification(
  memberId: string,
  qualificationId: string,
) {
  try {
    await qualificationRepo.removeMemberQualification(
      memberId,
      qualificationId,
    );
  } catch {
    throw new AppError(404, 'Qualifica del socio non trovata');
  }
}

// ---------------------------------------------------------------------------
// Expiring report
// ---------------------------------------------------------------------------

export async function getExpiringReport(daysAhead: number) {
  const expiring = await qualificationRepo.findExpiring(daysAhead);

  // Emit events for each expiring qualification
  for (const mq of expiring) {
    if (mq.expiryDate) {
      eventBus.emit('qualification.expiring', {
        memberId: mq.member.id,
        qualificationId: mq.qualification.id,
        expiryDate: mq.expiryDate.toISOString(),
      });
    }
  }

  return expiring;
}
