/**
 * API client for instructor endpoints.
 *
 * Wraps the generic api-client with typed functions for each
 * instructor-related endpoint.
 */

import { get, put, post, del } from '@/services/api-client';
import type {
  Instructor,
  RegularAvailabilitySlot,
  RegularAvailabilityInput,
  AvailabilityException,
  AvailabilityBlock,
  CreateExceptionInput,
  UpdateExceptionInput,
} from '@/types/instructor';

const BASE = '/instructors';

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------

export const fetchInstructors = () =>
  get<Instructor[]>(BASE);

export const fetchInstructorById = (id: string) =>
  get<Instructor>(`${BASE}/${id}`);

// ---------------------------------------------------------------------------
// Resolved Availability
// ---------------------------------------------------------------------------

export const fetchAvailability = (
  id: string,
  from: string,
  to: string,
) =>
  get<AvailabilityBlock[]>(
    `${BASE}/${id}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );

// ---------------------------------------------------------------------------
// Regular Availability
// ---------------------------------------------------------------------------

export const fetchRegularAvailability = (id: string) =>
  get<RegularAvailabilitySlot[]>(`${BASE}/${id}/regular-availability`);

export const updateRegularAvailability = (
  id: string,
  slots: readonly RegularAvailabilityInput[],
) =>
  put<RegularAvailabilitySlot[]>(`${BASE}/${id}/regular-availability`, { slots });

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export const fetchExceptions = (
  id: string,
  from?: string,
  to?: string,
) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const url = query ? `${BASE}/${id}/exceptions?${query}` : `${BASE}/${id}/exceptions`;
  return get<AvailabilityException[]>(url);
};

export const createException = (
  id: string,
  data: CreateExceptionInput,
) =>
  post<AvailabilityException>(`${BASE}/${id}/exceptions`, data);

export const updateException = (
  instructorId: string,
  exceptionId: string,
  data: UpdateExceptionInput,
) =>
  put<AvailabilityException>(
    `${BASE}/${instructorId}/exceptions/${exceptionId}`,
    data,
  );

export const deleteException = (
  instructorId: string,
  exceptionId: string,
) =>
  del<null>(`${BASE}/${instructorId}/exceptions/${exceptionId}`);
