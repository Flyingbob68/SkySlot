/**
 * Business-logic layer for member operations.
 *
 * All mutations return new objects — nothing is mutated in place.
 * Privacy filtering is applied via a bitmask:
 *   bit 0 (1) = phone visible
 *   bit 1 (2) = address visible
 *   bit 2 (4) = email visible
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';
import { eventBus } from '../utils/event-bus.js';
import * as memberRepo from '../repositories/member-repository.js';
import type { CreateMemberInput, UpdateMemberInput, PreferencesInput } from '../schemas/member-schemas.js';

// ---------------------------------------------------------------------------
// Privacy helpers
// ---------------------------------------------------------------------------

const PRIVACY_PHONE = 1;   // bit 0
const PRIVACY_ADDRESS = 2; // bit 1
const PRIVACY_EMAIL = 4;   // bit 2

function hasPermission(
  permissions: readonly string[],
  perm: string,
): boolean {
  return permissions.includes(perm);
}

function applyPrivacyFilter<T extends Record<string, unknown>>(
  member: T,
  requesterId: string,
  requesterPermissions: readonly string[],
): T {
  const isOwn = (member as { id?: string }).id === requesterId;
  const isManager = hasPermission(requesterPermissions, 'member:manage');

  if (isOwn || isManager) {
    return member;
  }

  const flags = (member as { privacyFlags?: number }).privacyFlags ?? 0;
  const filtered = { ...member };

  if (!(flags & PRIVACY_PHONE)) {
    (filtered as Record<string, unknown>).homePhone = null;
    (filtered as Record<string, unknown>).workPhone = null;
    (filtered as Record<string, unknown>).cellPhone = null;
  }

  if (!(flags & PRIVACY_ADDRESS)) {
    (filtered as Record<string, unknown>).address = null;
    (filtered as Record<string, unknown>).zipCode = null;
    (filtered as Record<string, unknown>).city = null;
    (filtered as Record<string, unknown>).state = null;
  }

  if (!(flags & PRIVACY_EMAIL)) {
    (filtered as Record<string, unknown>).email = null;
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

function generateRandomPassword(): string {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getMembers(options: {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly active?: boolean;
  readonly roleId?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}) {
  const [members, total] = await Promise.all([
    memberRepo.findAll(options),
    memberRepo.countAll({
      active: options.active,
      roleId: options.roleId,
      search: options.search,
    }),
  ]);

  return { members, total };
}

export async function getMemberById(
  id: string,
  requesterId: string,
  requesterPermissions: readonly string[],
) {
  const member = await memberRepo.findById(id);

  if (!member) {
    throw new AppError(404, 'Socio non trovato');
  }

  return applyPrivacyFilter(member, requesterId, requesterPermissions);
}

export async function createMember(
  data: CreateMemberInput,
  creatorId: string,
) {
  const existing = await memberRepo.findByEmail(data.email);

  if (existing) {
    throw new AppError(409, 'Un socio con questa email esiste già');
  }

  const plainPassword = data.password ?? generateRandomPassword();
  const passwordHash = await hashPassword(plainPassword);

  const createData: Record<string, unknown> = {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    passwordHash,
    fiscalCode: data.fiscalCode,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    address: data.address,
    zipCode: data.zipCode,
    city: data.city,
    state: data.state,
    country: data.country ?? 'IT',
    homePhone: data.homePhone,
    workPhone: data.workPhone,
    cellPhone: data.cellPhone,
    memberNumber: data.memberNumber,
    subscriptionExpiry: data.subscriptionExpiry
      ? new Date(data.subscriptionExpiry)
      : undefined,
  };

  // Remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(createData).filter(([, v]) => v !== undefined),
  );

  const member = await memberRepo.create(cleanData as Parameters<typeof memberRepo.create>[0]);

  if (data.roleId) {
    await memberRepo.assignRole(member.id, data.roleId);
  }

  eventBus.emit('member.created', {
    memberId: member.id,
    email: data.email,
  });

  // Re-fetch to include the assigned role
  const fullMember = await memberRepo.findById(member.id);

  return { member: fullMember, generatedPassword: data.password ? undefined : plainPassword };
}

export async function updateMember(
  id: string,
  data: UpdateMemberInput,
  requesterId: string,
  requesterPermissions: readonly string[],
) {
  const isOwn = id === requesterId;
  const isManager = hasPermission(requesterPermissions, 'member:manage');

  if (!isOwn && !isManager) {
    throw new AppError(403, 'Permessi insufficienti');
  }

  const existing = await memberRepo.findById(id);

  if (!existing) {
    throw new AppError(404, 'Socio non trovato');
  }

  if (data.email && data.email !== existing.email) {
    const emailTaken = await memberRepo.findByEmail(data.email);
    if (emailTaken) {
      throw new AppError(409, 'Questa email è già utilizzata da un altro socio');
    }
  }

  const updateData: Record<string, unknown> = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.fiscalCode !== undefined) updateData.fiscalCode = data.fiscalCode;
  if (data.dateOfBirth !== undefined) {
    updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  }
  if (data.address !== undefined) updateData.address = data.address;
  if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.homePhone !== undefined) updateData.homePhone = data.homePhone;
  if (data.workPhone !== undefined) updateData.workPhone = data.workPhone;
  if (data.cellPhone !== undefined) updateData.cellPhone = data.cellPhone;
  if (data.memberNumber !== undefined) updateData.memberNumber = data.memberNumber;
  // subscriptionExpiry requires finance:association permission
  if (data.subscriptionExpiry !== undefined) {
    if (!hasPermission(requesterPermissions, 'finance:association') && !isManager) {
      throw new AppError(403, 'Permesso finance:association richiesto per modificare la scadenza quota associativa');
    }
    updateData.subscriptionExpiry = data.subscriptionExpiry
      ? new Date(data.subscriptionExpiry)
      : null;
  }

  // flightsPaid requires finance:flights permission
  if (data.flightsPaid !== undefined) {
    if (!hasPermission(requesterPermissions, 'finance:flights')) {
      throw new AppError(403, 'Permesso finance:flights richiesto per modificare lo stato pagamento voli');
    }
    updateData.flightsPaid = data.flightsPaid;
  }

  return memberRepo.update(id, updateData as Parameters<typeof memberRepo.update>[1]);
}

export async function deactivateMember(id: string) {
  const existing = await memberRepo.findById(id);

  if (!existing) {
    throw new AppError(404, 'Socio non trovato');
  }

  if (!existing.active) {
    throw new AppError(400, 'Il socio è già disattivato');
  }

  return memberRepo.deactivate(id);
}

export async function reactivateMember(id: string) {
  const existing = await memberRepo.findById(id);

  if (!existing) {
    throw new AppError(404, 'Socio non trovato');
  }

  if (existing.active) {
    throw new AppError(400, 'Il socio è già attivo');
  }

  return memberRepo.reactivate(id);
}

export async function getDirectory(
  options: {
    readonly page: number;
    readonly limit: number;
    readonly search?: string;
  },
  requesterId: string,
  requesterPermissions: readonly string[],
) {
  const [members, total] = await Promise.all([
    memberRepo.findDirectory(options),
    memberRepo.countDirectory(options.search),
  ]);

  const filtered = members.map((m) =>
    applyPrivacyFilter(m, requesterId, requesterPermissions),
  );

  return { members: filtered, total };
}

export async function updatePreferences(
  id: string,
  prefs: PreferencesInput,
  requesterId: string,
) {
  if (id !== requesterId) {
    throw new AppError(403, 'Puoi modificare solo le tue preferenze');
  }

  const existing = await memberRepo.findById(id);

  if (!existing) {
    throw new AppError(404, 'Socio non trovato');
  }

  return memberRepo.updatePreferences(id, prefs);
}

export async function importFromCsv(
  csvData: string,
  _creatorId: string,
) {
  const lines = csvData
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Skip header row if present
  const hasHeader =
    lines.length > 0 &&
    lines[0]!.toLowerCase().includes('cognome') &&
    lines[0]!.toLowerCase().includes('email');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  // CSV format (semicolon-separated, matching export):
  // Cognome;Nome;Email;Codice Fiscale;Data di Nascita;Indirizzo;CAP;
  // Città;Provincia;Nazione;Telefono Casa;Telefono Lavoro;Cellulare;
  // Numero Tessera;Scadenza Quota;Attivo
  for (const line of dataLines) {
    const parts = line.split(';').map((p) => p.trim());

    if (parts.length < 3) {
      results.errors.push(`Riga non valida (servono almeno cognome;nome;email): "${line}"`);
      continue;
    }

    const [
      lastName, firstName, email,
      fiscalCode, dateOfBirth, address, zipCode,
      city, state, country,
      homePhone, workPhone, cellPhone,
      memberNumber, subscriptionExpiry, activeStr,
    ] = parts;

    if (!email || !firstName || !lastName) {
      results.errors.push(`Campi mancanti nella riga: "${line}"`);
      continue;
    }

    try {
      const existing = await memberRepo.findByEmail(email);

      if (existing) {
        results.skipped += 1;
        continue;
      }

      const plainPassword = generateRandomPassword();
      const passwordHash = await hashPassword(plainPassword);

      const parsedDob = dateOfBirth ? new Date(dateOfBirth) : undefined;
      const parsedExpiry = subscriptionExpiry ? new Date(subscriptionExpiry) : undefined;
      const isActive = activeStr ? activeStr.toLowerCase() !== 'no' : true;

      const createData: Record<string, unknown> = {
        email,
        firstName,
        lastName,
        passwordHash,
        fiscalCode: fiscalCode || undefined,
        dateOfBirth: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : undefined,
        address: address || undefined,
        zipCode: zipCode || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || 'IT',
        homePhone: homePhone || undefined,
        workPhone: workPhone || undefined,
        cellPhone: cellPhone || undefined,
        memberNumber: memberNumber || undefined,
        subscriptionExpiry: parsedExpiry && !isNaN(parsedExpiry.getTime()) ? parsedExpiry : undefined,
        active: isActive,
      };

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(createData).filter(([, v]) => v !== undefined),
      );

      await memberRepo.create(cleanData as Parameters<typeof memberRepo.create>[0]);

      results.created += 1;
    } catch {
      results.errors.push(`Errore durante la creazione del socio: ${email}`);
    }
  }

  return results;
}

export async function exportToCsv(filters: {
  readonly active?: boolean;
  readonly roleId?: string;
  readonly search?: string;
}) {
  const members = await memberRepo.findAllForExport(filters);

  const header =
    'Cognome;Nome;Email;Codice Fiscale;Data di Nascita;Indirizzo;CAP;Città;Provincia;Nazione;Telefono Casa;Telefono Lavoro;Cellulare;Numero Tessera;Scadenza Quota;Attivo';

  const rows = members.map((m) => {
    const fields = [
      m.lastName,
      m.firstName,
      m.email,
      m.fiscalCode ?? '',
      m.dateOfBirth ? new Date(m.dateOfBirth).toISOString().slice(0, 10) : '',
      m.address ?? '',
      m.zipCode ?? '',
      m.city ?? '',
      m.state ?? '',
      m.country ?? '',
      m.homePhone ?? '',
      m.workPhone ?? '',
      m.cellPhone ?? '',
      m.memberNumber ?? '',
      m.subscriptionExpiry
        ? new Date(m.subscriptionExpiry).toISOString().slice(0, 10)
        : '',
      m.active ? 'Sì' : 'No',
    ];
    return fields.join(';');
  });

  return [header, ...rows].join('\n');
}
