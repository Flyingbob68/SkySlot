/**
 * Pure date-utility functions used across the SkySlot backend.
 *
 * Every function returns a **new** Date (or primitive) and never mutates
 * the input.  Quarter-hour rounding is essential for the booking system
 * where time slots snap to 15-minute boundaries.
 */

const QUARTER_HOUR_MS = 15 * 60 * 1000;

/**
 * Parse an "HH:MM" string into its numeric components.
 *
 * @throws {Error} If the string is not in valid HH:MM format.
 */
export const parseTimeString = (
  time: string,
): { readonly hours: number; readonly minutes: number } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time format: "${time}". Expected HH:MM.`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(
      `Time out of range: "${time}". Hours must be 0-23, minutes 0-59.`,
    );
  }

  return { hours, minutes };
};

/**
 * Get the number of minutes elapsed since midnight for a given Date.
 */
export const toMinutesSinceMidnight = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

/**
 * Round a Date to the **nearest** 15-minute boundary.
 *
 * Standard rounding: >= 7.5 min rounds up, < 7.5 min rounds down.
 */
export const roundToQuarterHour = (date: Date): Date => {
  const ms = date.getTime();
  return new Date(Math.round(ms / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
};

/**
 * Round a Date **up** (ceil) to the next 15-minute boundary.
 *
 * If the date already sits exactly on a boundary it is returned unchanged
 * (as a new instance).
 */
export const roundUpToQuarterHour = (date: Date): Date => {
  const ms = date.getTime();
  return new Date(Math.ceil(ms / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
};

/**
 * Round a Date **down** (floor) to the previous 15-minute boundary.
 *
 * If the date already sits exactly on a boundary it is returned unchanged
 * (as a new instance).
 */
export const roundDownToQuarterHour = (date: Date): Date => {
  const ms = date.getTime();
  return new Date(Math.floor(ms / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
};

/**
 * Check whether a booking's start and end times fall within the club's
 * operating hours on the same day.
 *
 * @param startDate - Booking start (Date).
 * @param endDate   - Booking end   (Date).
 * @param firstHour - Club opening time as "HH:MM".
 * @param lastHour  - Club closing time as "HH:MM".
 * @returns `true` when the booking is entirely within operating hours.
 */
export const isWithinOperatingHours = (
  startDate: Date,
  endDate: Date,
  firstHour: string,
  lastHour: string,
): boolean => {
  const opening = parseTimeString(firstHour);
  const closing = parseTimeString(lastHour);

  const openingMinutes = opening.hours * 60 + opening.minutes;
  const closingMinutes = closing.hours * 60 + closing.minutes;

  const startMinutes = toMinutesSinceMidnight(startDate);
  const endMinutes = toMinutesSinceMidnight(endDate);

  return startMinutes >= openingMinutes && endMinutes <= closingMinutes;
};
