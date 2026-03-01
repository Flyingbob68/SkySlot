/**
 * Password hashing and verification using bcrypt.
 *
 * All operations return new values -- nothing is mutated.  Salt rounds
 * are read from the application config (minimum 12).
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { config } from '../config/env.js';

/**
 * Hash a plaintext password with bcrypt.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcryptRounds);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 *
 * Returns `true` when the password matches.
 */
export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a cryptographically random password of the given length.
 *
 * The output uses URL-safe base64 characters so it can be safely
 * embedded in links and forms.
 */
export const generateRandomPassword = (length = 24): string => {
  return randomBytes(length).toString('base64url').slice(0, length);
};
