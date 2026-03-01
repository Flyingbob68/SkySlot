/**
 * JWT and refresh-token utilities.
 *
 * Access tokens are short-lived JWTs signed with the app secret.
 * Refresh tokens are opaque 64-byte hex strings; only their SHA-256
 * hash is persisted so that a database leak does not compromise sessions.
 */

import { randomBytes, createHash } from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { JwtPayload } from '../types/auth.js';

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------

interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtAccessExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      roles: [...payload.roles],
      permissions: [...payload.permissions],
    },
    config.jwtSecret,
    options,
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

export const generateRefreshToken = (): string => {
  return randomBytes(64).toString('hex');
};

export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

// ---------------------------------------------------------------------------
// Refresh token expiry calculation
// ---------------------------------------------------------------------------

/**
 * Parse the configured refresh-token lifetime string (e.g. "7d", "24h")
 * into a concrete `Date`.
 */
export const getRefreshTokenExpiry = (): Date => {
  const raw = config.jwtRefreshExpiresIn;
  const match = /^(\d+)([dhms])$/.exec(raw);

  if (!match) {
    // Fallback: 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers: Readonly<Record<string, number>> = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  };

  return new Date(Date.now() + value * (multipliers[unit] ?? 0));
};
