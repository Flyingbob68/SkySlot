/**
 * API client functions for the booking domain.
 *
 * Each function maps to a backend endpoint and returns the standard
 * `ApiResponse<T>` envelope.
 */

import { get, post, put, del } from '@/services/api-client';
import type { ApiResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingMember {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
}

export interface BookingAircraft {
  readonly id: string;
  readonly callsign: string;
  readonly type: string;
  readonly seats: number;
}

export interface Booking {
  readonly id: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly aircraftId: string;
  readonly memberId: string;
  readonly slotType: 'SOLO' | 'DUAL' | 'MAINTENANCE';
  readonly instructorId: string | null;
  readonly freeSeats: number;
  readonly comments: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly aircraft: BookingAircraft;
  readonly member: BookingMember;
  readonly instructor: BookingMember | null;
}

export interface SunTimes {
  readonly sunrise: string | null;
  readonly sunset: string | null;
  readonly aeroDawn: string | null;
  readonly aeroDusk: string | null;
}

export interface CalendarData {
  readonly date: string;
  readonly firstHour: string;
  readonly lastHour: string;
  readonly aircraft: readonly BookingAircraft[];
  readonly bookings: readonly Booking[];
  readonly sunTimes: SunTimes;
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
}

export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface CreateBookingPayload {
  readonly startDate: string;
  readonly endDate: string;
  readonly aircraftId: string;
  readonly slotType: 'SOLO' | 'DUAL' | 'MAINTENANCE';
  readonly instructorId?: string;
  readonly freeSeats?: number;
  readonly comments?: string;
  readonly confirmed?: boolean;
}

export interface UpdateBookingPayload {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly aircraftId?: string;
  readonly slotType?: 'SOLO' | 'DUAL' | 'MAINTENANCE';
  readonly instructorId?: string | null;
  readonly freeSeats?: number;
  readonly comments?: string | null;
  readonly confirmed?: boolean;
}

export interface ConflictResult {
  readonly hasConflicts: boolean;
  readonly aircraft: readonly { id: string; startDate: string; endDate: string }[];
  readonly member: readonly { id: string; startDate: string; endDate: string }[];
  readonly instructor: readonly { id: string; startDate: string; endDate: string }[];
}

export interface BookingCreateResponse {
  readonly booking?: Booking;
  readonly validation?: ValidationResult;
  readonly needsConfirmation?: boolean;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function fetchBookings(params: {
  page?: number;
  limit?: number;
  memberId?: string;
  aircraftId?: string;
  from?: string;
  to?: string;
  slotType?: string;
}): Promise<ApiResponse<Booking[]>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.memberId) searchParams.set('memberId', params.memberId);
  if (params.aircraftId) searchParams.set('aircraftId', params.aircraftId);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.slotType) searchParams.set('slotType', params.slotType);

  const qs = searchParams.toString();
  return get<Booking[]>(`/bookings${qs ? `?${qs}` : ''}`);
}

export function fetchCalendarData(
  date: string,
  aircraftIds?: readonly string[],
): Promise<ApiResponse<CalendarData>> {
  const searchParams = new URLSearchParams();
  searchParams.set('date', date);
  if (aircraftIds) {
    for (const id of aircraftIds) {
      searchParams.append('aircraftIds', id);
    }
  }
  return get<CalendarData>(`/bookings/calendar?${searchParams.toString()}`);
}

export function fetchMyBookings(
  page = 1,
  limit = 20,
): Promise<ApiResponse<Booking[]>> {
  return get<Booking[]>(`/bookings/my?page=${page}&limit=${limit}`);
}

export function fetchBookingById(id: string): Promise<ApiResponse<Booking>> {
  return get<Booking>(`/bookings/${id}`);
}

export function fetchConflicts(params: {
  startDate: string;
  endDate: string;
  aircraftId: string;
  memberId?: string;
  instructorId?: string;
  excludeBookingId?: string;
}): Promise<ApiResponse<ConflictResult>> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);
  searchParams.set('aircraftId', params.aircraftId);
  if (params.memberId) searchParams.set('memberId', params.memberId);
  if (params.instructorId) searchParams.set('instructorId', params.instructorId);
  if (params.excludeBookingId) searchParams.set('excludeBookingId', params.excludeBookingId);

  return get<ConflictResult>(`/bookings/conflicts?${searchParams.toString()}`);
}

export function createBooking(
  payload: CreateBookingPayload,
): Promise<ApiResponse<Booking>> {
  return post<Booking>('/bookings', payload);
}

export function updateBooking(
  id: string,
  payload: UpdateBookingPayload,
): Promise<ApiResponse<Booking>> {
  return put<Booking>(`/bookings/${id}`, payload);
}

export function deleteBooking(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/bookings/${id}`);
}
