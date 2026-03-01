/**
 * Availability resolution engine for instructors.
 *
 * Implements the four-step algorithm defined in spec 06-instructors:
 * 1. Base: all 15-min slots start as UNAVAILABLE
 * 2. Apply regular weekly availability: matching slots -> AVAILABLE
 * 3. Apply presence exceptions (isPresent=true): slots -> AVAILABLE
 * 4. Apply absence exceptions (isPresent=false): slots -> UNAVAILABLE (highest priority)
 *
 * Day-spanning regular availability (e.g., Sat 14:00 -> Sun 12:00) is supported.
 * All output is merged into contiguous blocks of same availability state.
 */

import * as instructorRepo from '../repositories/instructor-repository.js';
import { parseTimeString } from '../utils/date.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailabilityBlock {
  readonly start: Date;
  readonly end: Date;
  readonly available: boolean;
}

interface RegularSlot {
  readonly startDay: number;
  readonly startTime: string;
  readonly endDay: number;
  readonly endTime: string;
}

interface ExceptionRecord {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly isPresent: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUARTER_HOUR_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate all 15-minute slot start times between `from` and `to`.
 * Returns an array of timestamps (ms since epoch).
 */
const generateSlotStarts = (from: Date, to: Date): readonly number[] => {
  const startMs = from.getTime();
  const endMs = to.getTime();
  const slots: number[] = [];

  for (let ms = startMs; ms < endMs; ms += QUARTER_HOUR_MS) {
    slots.push(ms);
  }

  return slots;
};

/**
 * Get the day-of-week in SkySlot convention (0=Monday, 6=Sunday)
 * from a JS Date object (where getUTCDay() returns 0=Sunday).
 */
const toSkySlotDay = (date: Date): number => {
  const jsDay = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
};

/**
 * Get minutes since midnight (UTC) for a given Date.
 */
const minutesOfDay = (date: Date): number =>
  date.getUTCHours() * 60 + date.getUTCMinutes();

/**
 * Check whether a slot timestamp falls within a regular availability window.
 * Handles day-spanning windows (e.g., startDay=5, startTime=14:00, endDay=6, endTime=12:00).
 */
const isInRegularWindow = (slotMs: number, rule: RegularSlot): boolean => {
  const slotDate = new Date(slotMs);
  const slotDay = toSkySlotDay(slotDate);
  const slotMinutes = minutesOfDay(slotDate);

  const start = parseTimeString(rule.startTime);
  const end = parseTimeString(rule.endTime);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (rule.startDay === rule.endDay) {
    // Same-day window
    return slotDay === rule.startDay
      && slotMinutes >= startMinutes
      && slotMinutes < endMinutes;
  }

  // Day-spanning window: check if slot is in the tail of startDay or head of endDay,
  // or in any full day in between.
  const spanDays = computeSpanDays(rule.startDay, rule.endDay);

  if (slotDay === rule.startDay) {
    return slotMinutes >= startMinutes;
  }

  if (slotDay === rule.endDay) {
    return slotMinutes < endMinutes;
  }

  // Check if slotDay is between startDay and endDay (wrapping around week)
  return spanDays.includes(slotDay);
};

/**
 * Compute the days strictly between startDay and endDay in the week cycle.
 * Example: startDay=5 (Sat), endDay=1 (Tue) => [6, 0] (Sun, Mon)
 */
const computeSpanDays = (startDay: number, endDay: number): readonly number[] => {
  const days: number[] = [];
  let current = (startDay + 1) % 7;

  while (current !== endDay) {
    days.push(current);
    current = (current + 1) % 7;
  }

  return days;
};

/**
 * Check whether a slot timestamp falls within an exception period.
 */
const isInException = (slotMs: number, exception: ExceptionRecord): boolean => {
  const slotEnd = slotMs + QUARTER_HOUR_MS;
  const excStartMs = exception.startDate.getTime();
  const excEndMs = exception.endDate.getTime();

  // The slot overlaps the exception if slotStart < excEnd AND slotEnd > excStart
  return slotMs < excEndMs && slotEnd > excStartMs;
};

/**
 * Merge an array of (slotStart, available) pairs into contiguous blocks
 * where adjacent slots with the same availability are combined.
 */
const mergeIntoBlocks = (
  slotStarts: readonly number[],
  availability: ReadonlyMap<number, boolean>,
): readonly AvailabilityBlock[] => {
  if (slotStarts.length === 0) {
    return [];
  }

  const blocks: AvailabilityBlock[] = [];
  let blockStart = slotStarts[0];
  let blockAvailable = availability.get(slotStarts[0]) ?? false;

  for (let i = 1; i < slotStarts.length; i++) {
    const current = slotStarts[i];
    const currentAvailable = availability.get(current) ?? false;

    if (currentAvailable !== blockAvailable) {
      blocks.push({
        start: new Date(blockStart),
        end: new Date(current),
        available: blockAvailable,
      });
      blockStart = current;
      blockAvailable = currentAvailable;
    }
  }

  // Close the last block
  const lastSlotEnd = slotStarts[slotStarts.length - 1] + QUARTER_HOUR_MS;
  blocks.push({
    start: new Date(blockStart),
    end: new Date(lastSlotEnd),
    available: blockAvailable,
  });

  return blocks;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the effective availability for an instructor over a date range.
 *
 * Algorithm:
 * 1. Generate 15-min slots, all initially UNAVAILABLE
 * 2. Apply regular availability rules -> matching slots become AVAILABLE
 * 3. Apply presence exceptions (isPresent=true) -> override AVAILABLE
 * 4. Apply absence exceptions (isPresent=false) -> override UNAVAILABLE
 *
 * Returns merged contiguous blocks of { start, end, available }.
 */
export const resolveAvailability = async (
  instructorId: string,
  fromDate: Date,
  toDate: Date,
): Promise<readonly AvailabilityBlock[]> => {
  // Fetch data in parallel
  const [regularSlots, exceptions] = await Promise.all([
    instructorRepo.getRegularAvailability(instructorId),
    instructorRepo.getExceptions(instructorId, { from: fromDate, to: toDate }),
  ]);

  // Step 1: Generate all 15-minute slot starts, all initially UNAVAILABLE
  const slotStarts = generateSlotStarts(fromDate, toDate);
  const availability = new Map<number, boolean>();

  for (const slotMs of slotStarts) {
    availability.set(slotMs, false);
  }

  // Step 2: Apply regular availability rules
  for (const slotMs of slotStarts) {
    for (const rule of regularSlots) {
      if (isInRegularWindow(slotMs, rule)) {
        availability.set(slotMs, true);
        break;
      }
    }
  }

  // Separate exceptions by type
  const presenceExceptions = exceptions.filter((e) => e.isPresent);
  const absenceExceptions = exceptions.filter((e) => !e.isPresent);

  // Step 3: Apply presence exceptions (isPresent=true) -> AVAILABLE
  for (const slotMs of slotStarts) {
    for (const exc of presenceExceptions) {
      if (isInException(slotMs, exc)) {
        availability.set(slotMs, true);
        break;
      }
    }
  }

  // Step 4: Apply absence exceptions (isPresent=false) -> UNAVAILABLE (highest priority)
  for (const slotMs of slotStarts) {
    for (const exc of absenceExceptions) {
      if (isInException(slotMs, exc)) {
        availability.set(slotMs, false);
        break;
      }
    }
  }

  // Merge into contiguous blocks
  return mergeIntoBlocks(slotStarts, availability);
};

/**
 * Check whether an instructor is fully available for the entire
 * given time slot (start to end).
 *
 * Used to validate DUAL bookings.
 */
export const isAvailableForSlot = async (
  instructorId: string,
  startDate: Date,
  endDate: Date,
): Promise<boolean> => {
  const blocks = await resolveAvailability(instructorId, startDate, endDate);

  // The instructor is fully available if every block within the range is available
  for (const block of blocks) {
    if (!block.available) {
      return false;
    }
  }

  return blocks.length > 0;
};
