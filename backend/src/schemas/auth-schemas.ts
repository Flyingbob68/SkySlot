/**
 * Zod validation schemas for authentication endpoints.
 *
 * Each schema defines the expected shape and constraints for its
 * corresponding request body.  The validation middleware applies
 * these before the controller runs.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Inserisci email o numero tessera.'),
  password: z
    .string()
    .min(8, 'La password deve contenere almeno 8 caratteri.'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .email('Inserisci un indirizzo email valido.'),
  password: z
    .string()
    .min(8, 'La password deve contenere almeno 8 caratteri.'),
  firstName: z
    .string()
    .min(1, 'Il nome e\' obbligatorio.'),
  lastName: z
    .string()
    .min(1, 'Il cognome e\' obbligatorio.'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Inserisci un indirizzo email valido.'),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Il token e\' obbligatorio.'),
  password: z
    .string()
    .min(8, 'La password deve contenere almeno 8 caratteri.'),
});

export const refreshTokenSchema = z.object({
  token: z
    .string()
    .min(1, 'Il refresh token e\' obbligatorio.'),
});
