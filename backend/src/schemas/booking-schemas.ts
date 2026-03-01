/**
 * Zod validation schemas for booking endpoints.
 *
 * Each schema is used by the `validate` middleware to ensure request
 * payloads conform to the expected shape before reaching controllers.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared refinements
// ---------------------------------------------------------------------------

const isoDatetime = z.string().datetime({ message: 'Formato data/ora ISO 8601 non valido' });

const slotTypeEnum = z.enum(['SOLO', 'DUAL', 'MAINTENANCE'], {
  message: 'Tipo slot non valido. Valori ammessi: SOLO, DUAL, MAINTENANCE',
});

// ---------------------------------------------------------------------------
// Create booking
// ---------------------------------------------------------------------------

export const createBookingSchema = z
  .object({
    startDate: isoDatetime,
    endDate: isoDatetime,
    aircraftId: z.string().min(1, 'ID aeromobile obbligatorio'),
    slotType: slotTypeEnum,
    instructorId: z.string().min(1).optional(),
    freeSeats: z.number().int().min(0).optional(),
    comments: z.string().max(500).optional(),
    confirmed: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.slotType === 'DUAL' && !data.instructorId) {
        return false;
      }
      return true;
    },
    { message: 'Istruttore obbligatorio per voli DUAL', path: ['instructorId'] },
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------------------
// Update booking
// ---------------------------------------------------------------------------

export const updateBookingSchema = z
  .object({
    startDate: isoDatetime.optional(),
    endDate: isoDatetime.optional(),
    aircraftId: z.string().min(1).optional(),
    slotType: slotTypeEnum.optional(),
    instructorId: z.string().min(1).nullable().optional(),
    freeSeats: z.number().int().min(0).optional(),
    comments: z.string().max(500).nullable().optional(),
    confirmed: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.slotType === 'DUAL' && data.instructorId === null) {
        return false;
      }
      return true;
    },
    { message: 'Istruttore obbligatorio per voli DUAL', path: ['instructorId'] },
  );

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// ---------------------------------------------------------------------------
// Booking query (list)
// ---------------------------------------------------------------------------

export const bookingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  memberId: z.string().min(1).optional(),
  aircraftId: z.string().min(1).optional(),
  from: isoDatetime.optional(),
  to: isoDatetime.optional(),
  slotType: slotTypeEnum.optional(),
});

export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

// ---------------------------------------------------------------------------
// Calendar query
// ---------------------------------------------------------------------------

export const calendarQuerySchema = z.object({
  date: isoDatetime,
  aircraftIds: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return Array.isArray(val) ? val : [val];
    }),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;

// ---------------------------------------------------------------------------
// Conflict check query
// ---------------------------------------------------------------------------

export const conflictCheckSchema = z.object({
  startDate: isoDatetime,
  endDate: isoDatetime,
  aircraftId: z.string().min(1, 'ID aeromobile obbligatorio'),
  memberId: z.string().min(1).optional(),
  instructorId: z.string().min(1).optional(),
  excludeBookingId: z.string().min(1).optional(),
});

export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const bookingIdParamSchema = z.object({
  id: z.string().min(1, 'ID prenotazione obbligatorio'),
});
