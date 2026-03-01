/**
 * Zod validation schemas for member-related endpoints.
 *
 * Every schema is exported as a named constant.  No defaults are set for
 * fields that are genuinely optional — only query-string pagination params
 * receive sensible defaults.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable fragments
// ---------------------------------------------------------------------------

const emailField = z.string().email('Indirizzo email non valido');

const paginationDefaults = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25),
};

// ---------------------------------------------------------------------------
// Create member
// ---------------------------------------------------------------------------

export const createMemberSchema = z.object({
  email: emailField,
  firstName: z.string().min(1, 'Il nome è obbligatorio').max(100),
  lastName: z.string().min(1, 'Il cognome è obbligatorio').max(100),
  password: z
    .string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .optional(),
  fiscalCode: z.string().max(16).optional(),
  dateOfBirth: z.string().date().optional(),
  address: z.string().max(255).optional(),
  zipCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).default('IT').optional(),
  homePhone: z.string().max(20).optional(),
  workPhone: z.string().max(20).optional(),
  cellPhone: z.string().max(20).optional(),
  memberNumber: z.string().max(50).optional(),
  subscriptionExpiry: z.string().date().optional(),
  roleId: z.string().cuid().optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

// ---------------------------------------------------------------------------
// Update member
// ---------------------------------------------------------------------------

export const updateMemberSchema = z.object({
  email: emailField.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  fiscalCode: z.string().max(16).optional().nullable(),
  dateOfBirth: z.string().date().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  zipCode: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  homePhone: z.string().max(20).optional().nullable(),
  workPhone: z.string().max(20).optional().nullable(),
  cellPhone: z.string().max(20).optional().nullable(),
  memberNumber: z.string().max(50).optional().nullable(),
  subscriptionExpiry: z.string().date().optional().nullable(),
  flightsPaid: z.boolean().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

// ---------------------------------------------------------------------------
// Member query (list)
// ---------------------------------------------------------------------------

export const memberQuerySchema = z.object({
  ...paginationDefaults,
  search: z.string().optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  roleId: z.string().cuid().optional(),
  sortBy: z.enum(['lastName', 'firstName', 'email', 'memberNumber', 'active', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type MemberQueryInput = z.infer<typeof memberQuerySchema>;

// ---------------------------------------------------------------------------
// Directory query
// ---------------------------------------------------------------------------

export const directoryQuerySchema = z.object({
  ...paginationDefaults,
  search: z.string().optional(),
});

export type DirectoryQueryInput = z.infer<typeof directoryQuerySchema>;

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export const preferencesSchema = z.object({
  language: z.enum(['it', 'en', 'fr', 'de', 'es']).optional(),
  timezone: z.string().min(1).max(50).optional(),
  notificationEnabled: z.boolean().optional(),
  privacyFlags: z.number().int().min(0).max(7).optional(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export const importSchema = z.object({
  csvData: z.string().min(1, 'Il contenuto CSV è obbligatorio'),
});

export type ImportInput = z.infer<typeof importSchema>;

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const memberIdParamSchema = z.object({
  id: z.string().cuid('ID socio non valido'),
});
