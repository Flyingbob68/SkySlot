/**
 * Pure utility functions for the booking calendar grid.
 *
 * All functions are side-effect-free and return new values.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSlot {
  readonly label: string; // "07:00", "07:15", ...
  readonly hour: number;
  readonly minute: number;
  readonly totalMinutes: number;
}

export type SlotColor = 'night' | 'twilight' | 'day';

// ---------------------------------------------------------------------------
// Time slot generation
// ---------------------------------------------------------------------------

/**
 * Generate an array of 15-minute time slot labels between `firstHour`
 * and `lastHour` (both in "HH:MM" format).
 */
export function generateTimeSlots(firstHour: string, lastHour: string): readonly TimeSlot[] {
  const [startH, startM] = firstHour.split(':').map(Number);
  const [endH, endM] = lastHour.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots: TimeSlot[] = [];

  for (let m = startMinutes; m < endMinutes; m += 15) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    slots.push({
      label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      hour,
      minute,
      totalMinutes: m,
    });
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Slot color (sunrise/sunset)
// ---------------------------------------------------------------------------

/**
 * Determine the background color class for a time slot based on
 * sunrise/sunset data.
 *
 * - night: before sunrise or after sunset (dark blue)
 * - twilight: between sunrise and aeroDawn, or between aeroDusk and sunset (orange)
 * - day: between aeroDawn and aeroDusk (white/light)
 */
export function getSlotColor(
  totalMinutes: number,
  sunrise: string | null,
  sunset: string | null,
  aeroDawn: string | null,
  aeroDusk: string | null,
): SlotColor {
  if (!sunrise || !sunset) return 'day';

  const sunriseMin = dateToMinutes(sunrise);
  const sunsetMin = dateToMinutes(sunset);
  const dawnMin = aeroDawn ? dateToMinutes(aeroDawn) : sunriseMin;
  const duskMin = aeroDusk ? dateToMinutes(aeroDusk) : sunsetMin;

  if (totalMinutes < sunriseMin || totalMinutes >= sunsetMin) {
    return 'night';
  }

  if (totalMinutes < dawnMin || totalMinutes >= duskMin) {
    return 'twilight';
  }

  return 'day';
}

function dateToMinutes(isoString: string): number {
  const d = new Date(isoString);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a booking's start and end times as "HH:MM - HH:MM".
 */
export function formatBookingTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);

  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  return `${fmt(s)} - ${fmt(e)}`;
}

/**
 * Calculate how many 15-min rows a booking spans.
 */
export function bookingSpanRows(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (15 * 60_000)));
}

/**
 * Calculate the row index of a booking within the grid (0-based, relative
 * to firstHour).
 */
export function bookingStartRow(startDate: string, firstHour: string): number {
  const start = new Date(startDate);
  const startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  const [fh, fm] = firstHour.split(':').map(Number);
  const firstMin = fh * 60 + fm;
  return Math.max(0, Math.floor((startMin - firstMin) / 15));
}

/**
 * Build a CSS color class for a slot type.
 */
export function slotTypeColor(slotType: 'SOLO' | 'DUAL' | 'MAINTENANCE'): string {
  switch (slotType) {
    case 'SOLO':
      return 'bg-blue-200 border-blue-400 text-blue-900';
    case 'DUAL':
      return 'bg-green-200 border-green-400 text-green-900';
    case 'MAINTENANCE':
      return 'bg-red-200 border-red-400 text-red-900';
    default:
      return 'bg-gray-200 border-gray-400 text-gray-900';
  }
}

/**
 * Italian label for slot type.
 */
export function slotTypeLabel(slotType: 'SOLO' | 'DUAL' | 'MAINTENANCE'): string {
  switch (slotType) {
    case 'SOLO':
      return 'Volo Solo';
    case 'DUAL':
      return 'Volo con Istruttore';
    case 'MAINTENANCE':
      return 'Manutenzione';
    default:
      return slotType;
  }
}
