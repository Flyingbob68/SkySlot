/**
 * Main calendar grid component for the day view.
 *
 * Renders a table where rows are 15-min time slots and columns are
 * aircraft.  Bookings are positioned absolutely within each column.
 */

import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  generateTimeSlots,
  getSlotColor,
  bookingStartRow,
  type TimeSlot,
} from '@/utils/calendar-helpers';
import { BookingSlot } from '@/components/booking/BookingSlot';
import type { Booking, BookingAircraft, SunTimes } from '@/services/booking-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT_PX = 28;

const SLOT_BG: Record<string, string> = {
  night: 'bg-indigo-950/20',
  twilight: 'bg-amber-100/60',
  day: 'bg-white',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingGridProps {
  readonly date: string;
  readonly aircraft: readonly BookingAircraft[];
  readonly bookings: readonly Booking[];
  readonly firstHour: string;
  readonly lastHour: string;
  readonly sunTimes: SunTimes;
  readonly onCreateBooking: (aircraftId: string, startMinutes: number) => void;
  readonly onSelectBooking: (booking: Booking) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingGrid({
  date,
  aircraft,
  bookings,
  firstHour,
  lastHour,
  sunTimes,
  onCreateBooking,
  onSelectBooking,
}: BookingGridProps) {
  const timeSlots = useMemo(
    () => generateTimeSlots(firstHour, lastHour),
    [firstHour, lastHour],
  );

  // Group bookings by aircraft for fast lookup
  const bookingsByAircraft = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.aircraftId) ?? [];
      map.set(b.aircraftId, [...list, b]);
    }
    return map;
  }, [bookings]);

  const handleCellClick = useCallback(
    (aircraftId: string, slot: TimeSlot) => {
      onCreateBooking(aircraftId, slot.totalMinutes);
    },
    [onCreateBooking],
  );

  if (aircraft.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Nessun aeromobile disponibile
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="inline-flex min-w-full">
        {/* Time column */}
        <div className="sticky left-0 z-20 bg-card border-r border-border">
          {/* Header spacer */}
          <div className="h-10 border-b border-border" />
          {/* Time labels */}
          {timeSlots.map((slot) => {
            const color = getSlotColor(
              slot.totalMinutes,
              sunTimes.sunrise,
              sunTimes.sunset,
              sunTimes.aeroDawn,
              sunTimes.aeroDusk,
            );
            return (
              <div
                key={slot.label}
                className={cn(
                  'flex items-center justify-end border-b border-border/50 pr-2 text-xs text-muted-foreground',
                  SLOT_BG[color],
                  slot.minute === 0 ? 'font-medium border-border' : '',
                )}
                style={{ height: `${ROW_HEIGHT_PX}px`, minWidth: '60px' }}
              >
                {slot.minute === 0 ? slot.label : ''}
              </div>
            );
          })}
        </div>

        {/* Aircraft columns */}
        {aircraft.map((ac) => {
          const acBookings = bookingsByAircraft.get(ac.id) ?? [];

          return (
            <div
              key={ac.id}
              className="flex-1 border-r border-border last:border-r-0"
              style={{ minWidth: '140px' }}
            >
              {/* Aircraft header */}
              <div className="flex h-10 items-center justify-center border-b border-border bg-muted/50 px-2">
                <span className="text-xs font-semibold truncate" title={`${ac.callsign} (${ac.type})`}>
                  {ac.callsign}
                </span>
              </div>

              {/* Slot rows (relative container for absolute booking positioning) */}
              <div className="relative">
                {timeSlots.map((slot) => {
                  const color = getSlotColor(
                    slot.totalMinutes,
                    sunTimes.sunrise,
                    sunTimes.sunset,
                    sunTimes.aeroDawn,
                    sunTimes.aeroDusk,
                  );

                  return (
                    <div
                      key={slot.label}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCellClick(ac.id, slot)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleCellClick(ac.id, slot);
                        }
                      }}
                      className={cn(
                        'border-b border-border/30 transition-colors hover:bg-primary/5 cursor-pointer',
                        SLOT_BG[color],
                        slot.minute === 0 ? 'border-border/60' : '',
                      )}
                      style={{ height: `${ROW_HEIGHT_PX}px` }}
                    />
                  );
                })}

                {/* Booking overlays */}
                {acBookings.map((b) => {
                  const topRow = bookingStartRow(b.startDate, firstHour);
                  return (
                    <BookingSlot
                      key={b.id}
                      booking={b}
                      topRow={topRow}
                      onClick={onSelectBooking}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
