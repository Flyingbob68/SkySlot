/**
 * Dialog form for creating and editing bookings.
 *
 * Renders as a modal overlay.  Shows validation errors inline and
 * a confirmation dialog when warnings are returned by the server.
 * All user-facing text is in Italian.
 */

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  createBooking,
  updateBooking,
  deleteBooking,
  type Booking,
  type CreateBookingPayload,
  type UpdateBookingPayload,
  type ValidationWarning,
} from '@/services/booking-service';
import { slotTypeLabel } from '@/utils/calendar-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotType = 'SOLO' | 'DUAL' | 'MAINTENANCE';

interface AircraftOption {
  readonly id: string;
  readonly callsign: string;
  readonly type: string;
}

interface InstructorOption {
  readonly id: string;
  readonly name: string;
}

interface BookingFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly booking?: Booking | null;
  readonly aircraft: readonly AircraftOption[];
  readonly instructors: readonly InstructorOption[];
  readonly defaultDate?: string;
  readonly defaultStartMinutes?: number;
  readonly defaultAircraftId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function buildTimeOptions(): readonly string[] {
  const options: string[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    options.push(minutesToTime(m));
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingForm({
  open,
  onClose,
  onSaved,
  booking,
  aircraft,
  instructors,
  defaultDate,
  defaultStartMinutes,
  defaultAircraftId,
}: BookingFormProps) {
  const isEdit = Boolean(booking);

  // Form state
  const [aircraftId, setAircraftId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [slotType, setSlotType] = useState<SlotType>('SOLO');
  const [instructorId, setInstructorId] = useState('');
  const [freeSeats, setFreeSeats] = useState(0);
  const [comments, setComments] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [warnings, setWarnings] = useState<readonly ValidationWarning[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (!open) return;

    if (booking) {
      const s = new Date(booking.startDate);
      const e = new Date(booking.endDate);
      setAircraftId(booking.aircraftId);
      setDate(s.toISOString().slice(0, 10));
      setStartTime(minutesToTime(s.getUTCHours() * 60 + s.getUTCMinutes()));
      setEndTime(minutesToTime(e.getUTCHours() * 60 + e.getUTCMinutes()));
      setSlotType(booking.slotType);
      setInstructorId(booking.instructorId ?? '');
      setFreeSeats(booking.freeSeats);
      setComments(booking.comments ?? '');
    } else {
      setAircraftId(defaultAircraftId ?? (aircraft[0]?.id ?? ''));
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setStartTime(defaultStartMinutes !== undefined ? minutesToTime(defaultStartMinutes) : '08:00');
      setEndTime(
        defaultStartMinutes !== undefined
          ? minutesToTime(defaultStartMinutes + 60)
          : '09:00',
      );
      setSlotType('SOLO');
      setInstructorId('');
      setFreeSeats(0);
      setComments('');
    }

    setErrors([]);
    setWarnings([]);
    setShowConfirm(false);
  }, [open, booking, defaultDate, defaultStartMinutes, defaultAircraftId, aircraft]);

  const buildISODate = useCallback(
    (time: string) => {
      const minutes = timeToMinutes(time);
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
    },
    [date],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent, confirmed = false) => {
      e.preventDefault();
      setIsSubmitting(true);
      setErrors([]);

      try {
        const startISO = buildISODate(startTime);
        const endISO = buildISODate(endTime);

        let result;

        if (isEdit && booking) {
          const payload: UpdateBookingPayload = {
            startDate: startISO,
            endDate: endISO,
            aircraftId,
            slotType,
            instructorId: slotType === 'DUAL' ? instructorId : null,
            freeSeats,
            comments: comments || null,
            confirmed,
          };
          result = await updateBooking(booking.id, payload);
        } else {
          const payload: CreateBookingPayload = {
            startDate: startISO,
            endDate: endISO,
            aircraftId,
            slotType,
            instructorId: slotType === 'DUAL' ? instructorId : undefined,
            freeSeats,
            comments: comments || undefined,
            confirmed,
          };
          result = await createBooking(payload);
        }

        // Check for validation response
        const rawResult = result as unknown as Record<string, unknown>;

        if (rawResult.validation) {
          const validation = rawResult.validation as {
            valid: boolean;
            errors: { message: string }[];
            warnings: ValidationWarning[];
          };

          if (!validation.valid) {
            setErrors(validation.errors.map((e) => e.message));
            return;
          }

          if (validation.warnings.length > 0 && !confirmed) {
            setWarnings(validation.warnings);
            setShowConfirm(true);
            return;
          }
        }

        if (!result.success && result.error) {
          setErrors([result.error]);
          return;
        }

        onSaved();
        onClose();
      } catch {
        setErrors(['Errore imprevisto. Riprova.']);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      buildISODate,
      startTime,
      endTime,
      aircraftId,
      slotType,
      instructorId,
      freeSeats,
      comments,
      isEdit,
      booking,
      onSaved,
      onClose,
    ],
  );

  const handleConfirm = useCallback(
    (e: FormEvent) => {
      setShowConfirm(false);
      handleSubmit(e, true);
    },
    [handleSubmit],
  );

  const handleDelete = useCallback(async () => {
    if (!booking) return;
    setIsDeleting(true);
    setErrors([]);

    try {
      const result = await deleteBooking(booking.id);
      if (!result.success && result.error) {
        setErrors([result.error]);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setErrors(['Errore durante la cancellazione.']);
    } finally {
      setIsDeleting(false);
    }
  }, [booking, onSaved, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {isEdit ? 'Modifica prenotazione' : 'Nuova prenotazione'}
        </h2>

        {/* Warning confirmation dialog */}
        {showConfirm && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 font-medium text-amber-900">Attenzione</p>
            {warnings.map((w) => (
              <p key={w.code} className="text-sm text-amber-800">
                {w.message}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={(e) => handleConfirm(e)}>
                Conferma comunque
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
                Annulla
              </Button>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          {/* Aircraft */}
          <div>
            <label htmlFor="bf-aircraft" className="mb-1 block text-sm font-medium">
              Aeromobile
            </label>
            <select
              id="bf-aircraft"
              value={aircraftId}
              onChange={(e) => setAircraftId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              {aircraft.map((ac) => (
                <option key={ac.id} value={ac.id}>
                  {ac.callsign} ({ac.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="bf-date" className="mb-1 block text-sm font-medium">
              Data
            </label>
            <Input
              id="bf-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bf-start" className="mb-1 block text-sm font-medium">
                Ora inizio
              </label>
              <select
                id="bf-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bf-end" className="mb-1 block text-sm font-medium">
                Ora fine
              </label>
              <select
                id="bf-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Slot type */}
          <div>
            <label htmlFor="bf-type" className="mb-1 block text-sm font-medium">
              Tipo
            </label>
            <select
              id="bf-type"
              value={slotType}
              onChange={(e) => setSlotType(e.target.value as SlotType)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="SOLO">{slotTypeLabel('SOLO')}</option>
              <option value="DUAL">{slotTypeLabel('DUAL')}</option>
              <option value="MAINTENANCE">{slotTypeLabel('MAINTENANCE')}</option>
            </select>
          </div>

          {/* Instructor (only for DUAL) */}
          {slotType === 'DUAL' && (
            <div>
              <label htmlFor="bf-instructor" className="mb-1 block text-sm font-medium">
                Istruttore
              </label>
              <select
                id="bf-instructor"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">-- Seleziona istruttore --</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Free seats */}
          <div>
            <label htmlFor="bf-seats" className="mb-1 block text-sm font-medium">
              Posti passeggero disponibili
            </label>
            <Input
              id="bf-seats"
              type="number"
              min={0}
              value={freeSeats}
              onChange={(e) => setFreeSeats(Number(e.target.value))}
            />
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="bf-comments" className="mb-1 block text-sm font-medium">
              Note
            </label>
            <textarea
              id="bf-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                >
                  {isDeleting ? <LoadingSpinner size="sm" /> : 'Cancella'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting || showConfirm}>
                {isSubmitting ? <LoadingSpinner size="sm" /> : isEdit ? 'Salva' : 'Prenota'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
