/**
 * Individual booking block rendered inside the calendar grid.
 *
 * Shows the pilot name, slot type badge, and time range.
 * Clicking the block opens the detail/edit view.
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  formatBookingTime,
  slotTypeColor,
  slotTypeLabel,
  bookingSpanRows,
} from '@/utils/calendar-helpers';
import type { Booking } from '@/services/booking-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT_PX = 28;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookingSlotProps {
  readonly booking: Booking;
  readonly topRow: number;
  readonly onClick: (booking: Booking) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingSlot({ booking, topRow, onClick }: BookingSlotProps) {
  const rows = bookingSpanRows(booking.startDate, booking.endDate);
  const heightPx = rows * ROW_HEIGHT_PX;
  const topPx = topRow * ROW_HEIGHT_PX;

  const pilotName = `${booking.member.firstName} ${booking.member.lastName}`;
  const timeRange = formatBookingTime(booking.startDate, booking.endDate);
  const colorClasses = slotTypeColor(booking.slotType);

  const handleClick = () => {
    onClick(booking);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden rounded border px-1 text-left text-xs leading-tight',
        colorClasses,
      )}
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
      title={`${pilotName} - ${slotTypeLabel(booking.slotType)} - ${timeRange}`}
    >
      <div className="truncate font-medium">{pilotName}</div>
      {rows >= 2 && (
        <div className="truncate opacity-75">{timeRange}</div>
      )}
      {rows >= 3 && (
        <Badge className="mt-0.5 scale-90 origin-left" variant="outline">
          {slotTypeLabel(booking.slotType)}
        </Badge>
      )}
    </button>
  );
}
