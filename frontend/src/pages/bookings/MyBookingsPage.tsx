/**
 * My Bookings page -- shows the authenticated user's upcoming and
 * past bookings in a card layout.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Plane, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMyBookings } from '@/hooks/use-bookings';
import { deleteBooking, type Booking } from '@/services/booking-service';
import { formatBookingTime, slotTypeColor, slotTypeLabel } from '@/utils/calendar-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isFuture(iso: string): boolean {
  return new Date(iso) > new Date();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BookingCard({
  booking,
  onDeleted,
}: {
  readonly booking: Booking;
  readonly onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Sei sicuro di voler cancellare questa prenotazione?')) return;
    setIsDeleting(true);
    try {
      const result = await deleteBooking(booking.id);
      if (result.success) {
        onDeleted();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [booking.id, onDeleted]);

  const handleClick = useCallback(() => {
    navigate('/prenotazioni/calendario');
  }, [navigate]);

  const future = isFuture(booking.startDate);
  const pilotName = `${booking.member.firstName} ${booking.member.lastName}`;
  const instructorName = booking.instructor
    ? `${booking.instructor.firstName} ${booking.instructor.lastName}`
    : null;

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${!future ? 'opacity-70' : ''}`}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {booking.aircraft.callsign}
          </CardTitle>
          <Badge className={slotTypeColor(booking.slotType)} variant="outline">
            {slotTypeLabel(booking.slotType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{formatDate(booking.startDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatBookingTime(booking.startDate, booking.endDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Plane className="h-4 w-4" />
          <span>{booking.aircraft.type}</span>
        </div>

        {instructorName && (
          <div className="text-muted-foreground">
            Istruttore: <span className="font-medium text-foreground">{instructorName}</span>
          </div>
        )}

        {booking.comments && (
          <p className="text-xs text-muted-foreground italic">{booking.comments}</p>
        )}

        {future && (
          <div className="flex justify-end pt-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Cancella
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function MyBookingsPage() {
  const [page, setPage] = useState(1);
  const { data: bookings, isLoading, error, meta, refetch } = useMyBookings(page, 20);

  const handleDeleted = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  // Separate future and past bookings
  const now = new Date();
  const upcoming = (bookings ?? []).filter((b) => new Date(b.endDate) > now);
  const past = (bookings ?? []).filter((b) => new Date(b.endDate) <= now);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <h1 className="text-xl sm:text-2xl font-bold">Le mie prenotazioni</h1>

      {isLoading && <LoadingSpinner centered />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && bookings && bookings.length === 0 && (
        <p className="text-muted-foreground">Non hai ancora effettuato prenotazioni.</p>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Prossime</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} onDeleted={handleDeleted} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Passate</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} onDeleted={handleDeleted} />
            ))}
          </div>
        </section>
      )}

      {/* Pagination */}
      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page <= 1}
          >
            Precedente
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {meta.page} di {Math.ceil(meta.total / meta.limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page * meta.limit >= meta.total}
          >
            Successiva
          </Button>
        </div>
      )}
    </div>
  );
}

export default MyBookingsPage;
