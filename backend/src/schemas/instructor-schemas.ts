/**
 * Zod validation schemas for instructor API endpoints.
 *
 * Validates input at the API boundary before it reaches business logic.
 * All error messages are in Italian to match the SkySlot UI language.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeRegex = /^([01]\d|2[0-3]):(00|15|30|45)$/;

const timeString = z
  .string()
  .regex(timeRegex, 'Formato orario non valido. Usare HH:MM con quarti d\'ora (00, 15, 30, 45)');

const dayOfWeek = z
  .number()
  .int('Il giorno deve essere un numero intero')
  .min(0, 'Il giorno deve essere tra 0 (lunedi) e 6 (domenica)')
  .max(6, 'Il giorno deve essere tra 0 (lunedi) e 6 (domenica)');

// ---------------------------------------------------------------------------
// Regular Availability
// ---------------------------------------------------------------------------

const regularAvailabilitySlotSchema = z.object({
  startDay: dayOfWeek,
  startTime: timeString,
  endDay: dayOfWeek,
  endTime: timeString,
});

export const regularAvailabilitySchema = z.object({
  slots: z
    .array(regularAvailabilitySlotSchema)
    .max(50, 'Troppi slot di disponibilita (massimo 50)'),
});

export type RegularAvailabilityInput = z.infer<typeof regularAvailabilitySchema>;
export type RegularAvailabilitySlot = z.infer<typeof regularAvailabilitySlotSchema>;

// ---------------------------------------------------------------------------
// Availability Exceptions
// ---------------------------------------------------------------------------

export const exceptionSchema = z.object({
  startDate: z
    .string()
    .datetime({ message: 'Data inizio non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .datetime({ message: 'Data fine non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val)),
  isPresent: z.boolean({
    message: 'Il campo isPresent e obbligatorio',
  }),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'La data di fine deve essere successiva alla data di inizio', path: ['endDate'] },
);

export type ExceptionInput = z.infer<typeof exceptionSchema>;

// ---------------------------------------------------------------------------
// Update Exception (partial)
// ---------------------------------------------------------------------------

export const updateExceptionSchema = z.object({
  startDate: z
    .string()
    .datetime({ message: 'Data inizio non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val))
    .optional(),
  endDate: z
    .string()
    .datetime({ message: 'Data fine non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val))
    .optional(),
  isPresent: z.boolean().optional(),
});

export type UpdateExceptionInput = z.infer<typeof updateExceptionSchema>;

// ---------------------------------------------------------------------------
// Availability Query
// ---------------------------------------------------------------------------

export const availabilityQuerySchema = z.object({
  from: z
    .string()
    .datetime({ message: 'Data "from" non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val)),
  to: z
    .string()
    .datetime({ message: 'Data "to" non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val)),
}).refine(
  (data) => data.to > data.from,
  { message: 'La data "to" deve essere successiva a "from"', path: ['to'] },
);

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

// ---------------------------------------------------------------------------
// Exception list query (optional from/to)
// ---------------------------------------------------------------------------

export const exceptionQuerySchema = z.object({
  from: z
    .string()
    .datetime({ message: 'Data "from" non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val))
    .optional(),
  to: z
    .string()
    .datetime({ message: 'Data "to" non valida. Usare formato ISO 8601.' })
    .transform((val) => new Date(val))
    .optional(),
});

export type ExceptionQueryInput = z.infer<typeof exceptionQuerySchema>;
