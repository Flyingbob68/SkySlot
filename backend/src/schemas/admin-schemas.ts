/**
 * Zod validation schemas for administration API endpoints.
 *
 * Validates input at the API boundary before it reaches business logic.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Time format helper
// ---------------------------------------------------------------------------

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const isoDatetime = z.string().datetime({ message: 'Formato data/ora ISO 8601 non valido' });

// ---------------------------------------------------------------------------
// Update club configuration
// ---------------------------------------------------------------------------

export const updateConfigSchema = z.object({
  clubName: z
    .string()
    .trim()
    .min(1, 'Nome club obbligatorio')
    .max(100, 'Nome club troppo lungo')
    .optional(),
  clubWebsite: z
    .string()
    .url('URL sito web non valido')
    .nullable()
    .optional(),
  icaoCode: z
    .string()
    .trim()
    .min(3, 'Codice ICAO troppo corto')
    .max(4, 'Codice ICAO troppo lungo')
    .toUpperCase()
    .nullable()
    .optional(),
  firstHour: z
    .string()
    .regex(timeRegex, 'Formato ora non valido (HH:MM)')
    .optional(),
  lastHour: z
    .string()
    .regex(timeRegex, 'Formato ora non valido (HH:MM)')
    .optional(),
  defaultTimezone: z
    .string()
    .min(1, 'Timezone obbligatorio')
    .optional(),
  defaultLanguage: z
    .string()
    .min(2, 'Lingua non valida')
    .max(5, 'Lingua non valida')
    .optional(),
  defaultSlotDuration: z
    .number()
    .int('La durata deve essere un numero intero')
    .min(15, 'Durata minima 15 minuti')
    .max(480, 'Durata massima 480 minuti')
    .optional(),
  minSlotDuration: z
    .number()
    .int('La durata deve essere un numero intero')
    .min(15, 'Durata minima 15 minuti')
    .max(240, 'Durata massima 240 minuti')
    .optional(),
  infoMessage: z
    .string()
    .max(2000, 'Messaggio troppo lungo')
    .nullable()
    .optional(),
  mailFromAddress: z
    .string()
    .email('Indirizzo email non valido')
    .nullable()
    .optional(),
  bookDateLimitWeeks: z
    .number()
    .int('Le settimane devono essere un numero intero')
    .min(1, 'Minimo 1 settimana')
    .max(52, 'Massimo 52 settimane')
    .optional(),
  bookDurationLimitHours: z
    .number()
    .int('Le ore devono essere un numero intero')
    .min(0, 'Non puo essere negativo')
    .max(24, 'Massimo 24 ore')
    .optional(),
  bookInstructionMinMinutes: z
    .number()
    .int('I minuti devono essere un numero intero')
    .min(0, 'Non puo essere negativo')
    .max(480, 'Massimo 480 minuti')
    .optional(),
  bookAllocatingRule: z
    .enum(['SPECIFIC', 'BY_TYPE'])
    .optional(),
  bookCommentEnabled: z
    .boolean()
    .optional(),
  qualificationMode: z
    .enum(['OFF', 'WARNING', 'RESTRICTED'])
    .optional(),
  subscriptionMode: z
    .enum(['OFF', 'WARNING', 'RESTRICTED'])
    .optional(),
  registrationMode: z
    .enum(['OPEN', 'INVITE', 'DISABLED'])
    .optional(),
});

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

// ---------------------------------------------------------------------------
// Create role
// ---------------------------------------------------------------------------

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome ruolo troppo corto')
    .max(50, 'Nome ruolo troppo lungo')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Nome ruolo: solo lettere minuscole, numeri, trattini e underscore'),
  permissions: z
    .array(z.string().min(1))
    .min(0, 'Fornire almeno un array di permessi'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

// ---------------------------------------------------------------------------
// Update role
// ---------------------------------------------------------------------------

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome ruolo troppo corto')
    .max(50, 'Nome ruolo troppo lungo')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Nome ruolo: solo lettere minuscole, numeri, trattini e underscore')
    .optional(),
  permissions: z
    .array(z.string().min(1))
    .optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ---------------------------------------------------------------------------
// Audit log query
// ---------------------------------------------------------------------------

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Pagina minima 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Massimo 100 elementi per pagina').default(20),
  userId: z.string().min(1).optional(),
  entity: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  from: isoDatetime.optional(),
  to: isoDatetime.optional(),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
