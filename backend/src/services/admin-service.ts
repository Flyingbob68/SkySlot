/**
 * Business logic for club administration.
 *
 * Orchestrates repository calls with validation and error handling
 * for club config, roles, and logo management.
 * Never accesses Prisma directly.
 */

import { AppError } from '../middleware/error-handler.js';
import * as adminRepo from '../repositories/admin-repository.js';
import type { UpdateConfigInput, CreateRoleInput, UpdateRoleInput } from '../schemas/admin-schemas.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOGO_SIZE = 500 * 1024; // 500KB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const;

// ---------------------------------------------------------------------------
// Club Configuration
// ---------------------------------------------------------------------------

export const getConfig = async () => {
  const config = await adminRepo.getConfig();

  if (!config) {
    throw new AppError(500, 'Configurazione club non trovata');
  }

  // Return config without the binary logo data
  const { clubLogo, ...configWithoutLogo } = config;
  return {
    ...configWithoutLogo,
    hasLogo: clubLogo !== null,
  };
};

export const updateConfig = async (data: UpdateConfigInput) => {
  const existing = await adminRepo.getConfig();

  if (!existing) {
    throw new AppError(500, 'Configurazione club non trovata');
  }

  // Validate firstHour < lastHour when both are provided or one changes
  const newFirstHour = data.firstHour ?? existing.firstHour;
  const newLastHour = data.lastHour ?? existing.lastHour;

  if (newFirstHour >= newLastHour) {
    throw new AppError(400, 'La prima ora deve essere precedente all\'ultima ora');
  }

  // Validate minSlotDuration <= defaultSlotDuration
  const newMin = data.minSlotDuration ?? existing.minSlotDuration;
  const newDefault = data.defaultSlotDuration ?? existing.defaultSlotDuration;

  if (newMin > newDefault) {
    throw new AppError(400, 'La durata minima non puo superare la durata predefinita');
  }

  const updated = await adminRepo.updateConfig(data);
  const { clubLogo, ...updatedWithoutLogo } = updated;

  return {
    ...updatedWithoutLogo,
    hasLogo: clubLogo !== null,
  };
};

export const uploadLogo = async (file: {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly size: number;
}) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
    throw new AppError(400, 'Formato logo non supportato. Usare PNG o JPG.');
  }

  if (file.size > MAX_LOGO_SIZE) {
    throw new AppError(400, 'Logo troppo grande. Dimensione massima: 500KB.');
  }

  await adminRepo.updateLogo(file.buffer, file.mimetype);

  return { message: 'Logo aggiornato con successo' };
};

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const getRoles = async () => {
  return adminRepo.getRoles();
};

export const createRole = async (data: CreateRoleInput) => {
  const existing = await adminRepo.getRoleByName(data.name);

  if (existing) {
    throw new AppError(409, 'Esiste gia un ruolo con questo nome');
  }

  return adminRepo.createRole(data);
};

export const updateRole = async (id: string, data: UpdateRoleInput) => {
  const role = await adminRepo.getRoleById(id);

  if (!role) {
    throw new AppError(404, 'Ruolo non trovato');
  }

  // System roles cannot have their name changed
  if (role.isSystem && data.name !== undefined && data.name !== role.name) {
    throw new AppError(403, 'Non e possibile modificare il nome di un ruolo di sistema');
  }

  // Check name uniqueness if changing
  if (data.name !== undefined && data.name !== role.name) {
    const existing = await adminRepo.getRoleByName(data.name);
    if (existing) {
      throw new AppError(409, 'Esiste gia un ruolo con questo nome');
    }
  }

  return adminRepo.updateRole(id, data);
};

export const deleteRole = async (id: string) => {
  const role = await adminRepo.getRoleById(id);

  if (!role) {
    throw new AppError(404, 'Ruolo non trovato');
  }

  if (role.isSystem) {
    throw new AppError(403, 'Non e possibile eliminare un ruolo di sistema');
  }

  if (role._count.memberRoles > 0) {
    throw new AppError(
      400,
      `Non e possibile eliminare il ruolo: e assegnato a ${role._count.memberRoles} utenti`,
    );
  }

  return adminRepo.deleteRole(id);
};
