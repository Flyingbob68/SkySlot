/**
 * Core authentication business logic.
 *
 * Orchestrates password hashing, token generation, brute-force
 * protection, and domain events.  Each public function is a
 * self-contained use case that returns an immutable result.
 */

import { AppError } from '../middleware/error-handler.js';
import { eventBus } from '../utils/event-bus.js';
import { ROLE_PERMISSIONS } from '../types/auth.js';
import type { Permission } from '../types/auth.js';
import * as authRepo from '../repositories/auth-repository.js';
import * as tokenService from './token-service.js';
import * as passwordService from './password-service.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRUTE_FORCE_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS_EMAIL = 5;
const MAX_FAILED_ATTEMPTS_IP = 20;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MemberWithRoles {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string;
  readonly active: boolean;
  readonly memberRoles: ReadonlyArray<{
    readonly role: {
      readonly name: string;
      readonly permissions: readonly string[];
    };
  }>;
}

const extractRoles = (member: MemberWithRoles): readonly string[] =>
  member.memberRoles.map((mr) => mr.role.name);

const extractPermissions = (member: MemberWithRoles): readonly string[] => {
  const permissionSet = new Set<string>();

  for (const mr of member.memberRoles) {
    // Add role-level permissions from the ROLE_PERMISSIONS map
    const rolePerms = ROLE_PERMISSIONS[mr.role.name] ?? [];
    for (const perm of rolePerms) {
      permissionSet.add(perm);
    }

    // Add any custom permissions stored on the role record itself
    for (const perm of mr.role.permissions) {
      permissionSet.add(perm);
    }
  }

  return [...permissionSet] as readonly Permission[];
};

const buildUserResponse = (member: MemberWithRoles) => {
  const roles = extractRoles(member);
  const permissions = extractPermissions(member);

  return {
    id: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    roles,
    permissions,
  } as const;
};

const generateTokenPair = async (member: MemberWithRoles) => {
  const roles = extractRoles(member);
  const permissions = extractPermissions(member);

  const accessToken = tokenService.generateAccessToken({
    sub: member.id,
    email: member.email,
    roles,
    permissions,
  });

  const refreshToken = tokenService.generateRefreshToken();
  const refreshTokenHash = tokenService.hashToken(refreshToken);
  const expiresAt = tokenService.getRefreshTokenExpiry();

  await authRepo.createRefreshToken(member.id, refreshTokenHash, expiresAt);

  return { accessToken, refreshToken } as const;
};

// ---------------------------------------------------------------------------
// Brute-force protection
// ---------------------------------------------------------------------------

const checkBruteForce = async (email: string, ip?: string) => {
  const emailAttempts = await authRepo.countRecentFailedAttempts(
    email,
    'email',
    BRUTE_FORCE_WINDOW_MINUTES,
  );

  if (emailAttempts >= MAX_FAILED_ATTEMPTS_EMAIL) {
    throw new AppError(
      429,
      'Troppi tentativi di accesso. Riprova tra qualche minuto.',
    );
  }

  if (ip) {
    const ipAttempts = await authRepo.countRecentFailedAttempts(
      ip,
      'ip',
      BRUTE_FORCE_WINDOW_MINUTES,
    );

    if (ipAttempts >= MAX_FAILED_ATTEMPTS_IP) {
      throw new AppError(
        429,
        'Troppi tentativi di accesso. Riprova tra qualche minuto.',
      );
    }
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const register = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) => {
  const existing = await authRepo.findMemberByEmail(email);

  if (existing) {
    throw new AppError(409, 'Un account con questa email esiste gia\'.');
  }

  const passwordHash = await passwordService.hashPassword(password);

  const member = await authRepo.createMember({
    email,
    passwordHash,
    firstName,
    lastName,
  });

  const tokens = await generateTokenPair(member);
  const user = buildUserResponse(member);

  eventBus.emit('member.created', {
    memberId: member.id,
    email: member.email,
  });

  return { user, ...tokens } as const;
};

export const login = async (identifier: string, password: string, ip?: string) => {
  const normalizedId = identifier.trim().toLowerCase();
  await checkBruteForce(normalizedId, ip);

  // Determine lookup strategy: email (contains @) or member number
  const isEmail = normalizedId.includes('@');
  let member: MemberWithRoles | null = null;

  if (isEmail) {
    member = await authRepo.findMemberByEmail(normalizedId);
  } else {
    const matches = await authRepo.findMemberByMemberNumber(identifier.trim());
    if (matches.length === 1) {
      member = matches[0] as MemberWithRoles;
    } else if (matches.length > 1) {
      throw new AppError(401, 'Numero tessera associato a piu\' utenti. Usa l\'email per accedere.');
    }
  }

  if (!member) {
    await authRepo.recordLoginAttempt(normalizedId, 'email', false);
    if (ip) {
      await authRepo.recordLoginAttempt(ip, 'ip', false);
    }
    throw new AppError(401, 'Credenziali non valide.');
  }

  if (!member.active) {
    throw new AppError(403, 'Account disabilitato. Contatta l\'amministratore.');
  }

  const valid = await passwordService.comparePassword(
    password,
    member.passwordHash,
  );

  if (!valid) {
    await authRepo.recordLoginAttempt(normalizedId, 'email', false);
    if (ip) {
      await authRepo.recordLoginAttempt(ip, 'ip', false);
    }
    throw new AppError(401, 'Credenziali non valide.');
  }

  // Record successful attempts
  await authRepo.recordLoginAttempt(normalizedId, 'email', true);
  if (ip) {
    await authRepo.recordLoginAttempt(ip, 'ip', true);
  }

  const tokens = await generateTokenPair(member);
  const user = buildUserResponse(member);

  return { user, ...tokens } as const;
};

export const refreshToken = async (token: string) => {
  const hash = tokenService.hashToken(token);
  const stored = await authRepo.findRefreshToken(hash);

  if (!stored) {
    throw new AppError(401, 'Refresh token non valido.');
  }

  if (stored.revoked) {
    // Possible token reuse -- revoke all tokens for this member
    await authRepo.revokeAllMemberTokens(stored.memberId);
    throw new AppError(401, 'Refresh token revocato. Effettua nuovamente il login.');
  }

  if (stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token scaduto.');
  }

  // Rotate: revoke old, create new
  await authRepo.revokeRefreshToken(stored.id);

  const member = stored.member;
  const tokens = await generateTokenPair(member);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  } as const;
};

export const logout = async (token: string) => {
  const hash = tokenService.hashToken(token);
  const stored = await authRepo.findRefreshToken(hash);

  if (stored && !stored.revoked) {
    await authRepo.revokeRefreshToken(stored.id);
  }
};

export const forgotPassword = async (email: string) => {
  const member = await authRepo.findMemberByEmail(email);

  // Always return success to prevent email enumeration
  if (!member) {
    return;
  }

  const resetToken = tokenService.generateRefreshToken();
  const resetTokenHash = tokenService.hashToken(resetToken);

  // Store reset token as a refresh token with short expiry
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
  await authRepo.createRefreshToken(member.id, resetTokenHash, expiresAt);

  eventBus.emit('auth.password_reset', {
    memberId: member.id,
    email: member.email,
    token: resetToken,
  });
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hash = tokenService.hashToken(token);
  const stored = await authRepo.findRefreshToken(hash);

  if (!stored) {
    throw new AppError(400, 'Token di reset non valido o scaduto.');
  }

  if (stored.revoked || stored.expiresAt < new Date()) {
    throw new AppError(400, 'Token di reset non valido o scaduto.');
  }

  const passwordHash = await passwordService.hashPassword(newPassword);
  await authRepo.updateMemberPasswordHash(stored.memberId, passwordHash);

  // Revoke all refresh tokens for this member
  await authRepo.revokeAllMemberTokens(stored.memberId);
};

export const getMe = async (memberId: string) => {
  const member = await authRepo.findMemberById(memberId);

  if (!member) {
    throw new AppError(404, 'Utente non trovato.');
  }

  return buildUserResponse(member);
};
