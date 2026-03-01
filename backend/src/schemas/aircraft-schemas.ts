/**
 * Zod validation schemas for aircraft API endpoints.
 *
 * Validates input at the API boundary before it reaches business logic.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create aircraft
// ---------------------------------------------------------------------------

export const createAircraftSchema = z.object({
  callsign: z
    .string()
    .trim()
    .min(1, 'Immatricolazione obbligatoria')
    .max(10, 'Immatricolazione troppo lunga'),
  type: z
    .string()
    .trim()
    .min(1, 'Tipo aeromobile obbligatorio')
    .max(20, 'Tipo troppo lungo'),
  seats: z
    .number()
    .int('I posti devono essere un numero intero')
    .min(1, 'Almeno un posto richiesto'),
  hourlyRate: z
    .number()
    .min(0, 'Il costo orario non puo essere negativo')
    .optional(),
  comments: z
    .string()
    .max(500, 'Note troppo lunghe')
    .optional(),
  displayOrder: z
    .number()
    .int('Ordine deve essere un numero intero')
    .min(0, 'Ordine non puo essere negativo')
    .optional(),
});

export type CreateAircraftInput = z.infer<typeof createAircraftSchema>;

// ---------------------------------------------------------------------------
// Update aircraft
// ---------------------------------------------------------------------------

export const updateAircraftSchema = z.object({
  callsign: z
    .string()
    .trim()
    .min(1, 'Immatricolazione obbligatoria')
    .max(10, 'Immatricolazione troppo lunga')
    .optional(),
  type: z
    .string()
    .trim()
    .min(1, 'Tipo aeromobile obbligatorio')
    .max(20, 'Tipo troppo lungo')
    .optional(),
  seats: z
    .number()
    .int('I posti devono essere un numero intero')
    .min(1, 'Almeno un posto richiesto')
    .optional(),
  hourlyRate: z
    .number()
    .min(0, 'Il costo orario non puo essere negativo')
    .nullable()
    .optional(),
  comments: z
    .string()
    .max(500, 'Note troppo lunghe')
    .nullable()
    .optional(),
  displayOrder: z
    .number()
    .int('Ordine deve essere un numero intero')
    .min(0, 'Ordine non puo essere negativo')
    .optional(),
});

export type UpdateAircraftInput = z.infer<typeof updateAircraftSchema>;

// ---------------------------------------------------------------------------
// Qualification requirements
// ---------------------------------------------------------------------------

export const qualificationRequirementSchema = z.object({
  checkGroup: z
    .number()
    .int('Il livello deve essere un numero intero')
    .min(0, 'Il livello non puo essere negativo'),
  qualificationId: z
    .string()
    .min(1, 'ID qualifica obbligatorio'),
});

export const qualificationRequirementsSchema = z.object({
  requirements: z.array(qualificationRequirementSchema),
});

export type QualificationRequirementsInput = z.infer<typeof qualificationRequirementsSchema>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export const listAircraftQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ListAircraftQuery = z.infer<typeof listAircraftQuerySchema>;
