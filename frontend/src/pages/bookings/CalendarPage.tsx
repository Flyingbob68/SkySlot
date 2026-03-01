/**
 * Calendar page -- the main booking view.
 *
 * Displays a date picker, view mode selector, and the day-view grid
 * with aircraft columns and 15-min time rows.  Clicking an empty
 * cell opens the booking form.
 */

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BookingGrid } from '@/components/booking/BookingGrid';
import { BookingForm } from '@/components/booking/BookingForm';
import { useBookingStore } from '@/stores/booking-store';
import { useCalendarData } from '@/hooks/use-bookings';
import { useApi } from '@/hooks/use-api';
import { get } from '@/services/api-client';
import type { Booking, BookingAircraft } from '@/services/booking-service';

// ---------------------------------------------------------------------------
// Instructor type for the form
// ---------------------------------------------------------------------------

interface InstructorDTO {
  readonly id: string;
  readonly memberId: string;
  readonly member: { firstName: string; lastName: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CalendarPage() {
  const {
    selectedDate,
    selectedAircraftIds,
    setDate,
    goToNextDay,
    goToPrevDay,
    goToToday,
  } = useBookingStore();

  // Fetch calendar data
  const { data: calendarData, isLoading, error, refetch } = useCalendarData(
    selectedDate,
    selectedAircraftIds.length > 0 ? selectedAircraftIds : undefined,
  );

  // Fetch instructors for form
  const { data: instructorsRaw } = useApi<InstructorDTO[]>(
    () => get<InstructorDTO[]>('/instructors').then((r) => ({
      ...r,
      data: r.data ?? [],
    })),
    [],
  );

  const instructors = (instructorsRaw ?? []).map((i) => ({
    id: i.memberId,
    name: i.member ? `${i.member.firstName} ${i.member.lastName}` : i.id,
  }));

  // Booking form state
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [defaultAircraftId, setDefaultAircraftId] = useState<string | undefined>();
  const [defaultStartMinutes, setDefaultStartMinutes] = useState<number | undefined>();

  const handleCreateBooking = useCallback(
    (aircraftId: string, startMinutes: number) => {
      setSelectedBooking(null);
      setDefaultAircraftId(aircraftId);
      setDefaultStartMinutes(startMinutes);
      setFormOpen(true);
    },
    [],
  );

  const handleSelectBooking = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setDefaultAircraftId(undefined);
    setDefaultStartMinutes(undefined);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setSelectedBooking(null);
  }, []);

  const handleFormSaved = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        setDate(e.target.value);
      }
    },
    [setDate],
  );

  // Format display date
  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const aircraft: readonly BookingAircraft[] = calendarData?.aircraft ?? [];
  const bookings: readonly Booking[] = calendarData?.bookings ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header with date navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevDay} aria-label="Giorno precedente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay} aria-label="Giorno successivo">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Oggi
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium capitalize">{displayDate}</span>
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && <LoadingSpinner centered />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Grid */}
      {!isLoading && calendarData && (
        <BookingGrid
          date={selectedDate}
          aircraft={aircraft}
          bookings={bookings}
          firstHour={calendarData.firstHour}
          lastHour={calendarData.lastHour}
          sunTimes={calendarData.sunTimes}
          onCreateBooking={handleCreateBooking}
          onSelectBooking={handleSelectBooking}
        />
      )}

      {/* Booking form dialog */}
      <BookingForm
        open={formOpen}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
        booking={selectedBooking}
        aircraft={[...aircraft]}
        instructors={instructors}
        defaultDate={selectedDate}
        defaultStartMinutes={defaultStartMinutes}
        defaultAircraftId={defaultAircraftId}
      />
    </div>
  );
}

export default CalendarPage;
