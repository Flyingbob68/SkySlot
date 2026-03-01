/**
 * React hooks for booking data fetching.
 *
 * Wraps the generic `useApi` hook with booking-specific fetcher
 * functions so that components can consume data declaratively.
 */

import { useApi } from '@/hooks/use-api';
import {
  fetchCalendarData,
  fetchMyBookings,
  fetchBookingById,
  type CalendarData,
  type Booking,
} from '@/services/booking-service';

/**
 * Fetch calendar data for a specific date and (optionally) filtered
 * aircraft IDs.
 */
export function useCalendarData(date: string, aircraftIds?: readonly string[]) {
  // Build a stable key from the aircraft IDs array
  const aircraftKey = aircraftIds ? aircraftIds.join(',') : '';

  return useApi<CalendarData>(
    () => fetchCalendarData(new Date(date + 'T00:00:00Z').toISOString(), aircraftIds),
    [date, aircraftKey],
  );
}

/**
 * Fetch the authenticated user's bookings with pagination.
 */
export function useMyBookings(page = 1, limit = 20) {
  return useApi<Booking[]>(
    () => fetchMyBookings(page, limit),
    [page, limit],
  );
}

/**
 * Fetch a single booking by ID.
 */
export function useBookingDetail(id: string | undefined) {
  return useApi<Booking>(
    () => {
      if (!id) {
        return Promise.resolve({ success: false, data: null, error: 'ID mancante' });
      }
      return fetchBookingById(id);
    },
    [id],
  );
}
