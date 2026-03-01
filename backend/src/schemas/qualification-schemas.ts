/**
 * Zod validation schemas for qualification endpoints.
 *
 * Each schema validates a specific request body shape and is used
 * by the `validateBody` middleware.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Qualification definitions
// ---------------------------------------------------------------------------

export const createQualificationSchema = z.object({
  name: z
    .string()
    .min(1, 'Il nome della qualifica è obbligatorio')
    .max(100, 'Il nome non può superare i 100 caratteri'),
  hasExpiry: z.boolean(),
  description: z
    .string()
    .max(500, 'La descrizione non può superare i 500 caratteri')
    .optional(),
});

export const updateQualificationSchema = z.object({
  name: z
    .string()
    .min(1, 'Il nome della qualifica è obbligatorio')
    .max(100, 'Il nome non può superare i 100 caratteri')
    .optional(),
  description: z
    .string()
    .max(500, 'La descrizione non può superare i 500 caratteri')
    .nullable()
    .optional(),
});

// ---------------------------------------------------------------------------
// Member qualifications
// ---------------------------------------------------------------------------

export const assignQualificationSchema = z.object({
  qualificationId: z.string().cuid('ID qualifica non valido'),
  expiryDate: z
    .string()
    .datetime({ message: 'Data di scadenza non valida (formato ISO)' })
    .optional(),
});

export const updateMemberQualificationSchema = z.object({
  expiryDate: z
    .string()
    .datetime({ message: 'Data di scadenza non valida (formato ISO)' })
    .nullable()
    .optional(),
  noAlert: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const expiringQuerySchema = z.object({
  days: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(365))
    .optional()
    .default(60),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateQualificationInput = z.infer<typeof createQualificationSchema>;
export type UpdateQualificationInput = z.infer<typeof updateQualificationSchema>;
export type AssignQualificationInput = z.infer<typeof assignQualificationSchema>;
export type UpdateMemberQualificationInput = z.infer<typeof updateMemberQualificationSchema>;
