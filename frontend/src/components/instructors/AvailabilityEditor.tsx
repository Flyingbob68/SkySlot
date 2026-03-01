/**
 * Visual weekly grid editor for instructor regular availability.
 *
 * Displays a grid with 7 columns (Lun-Dom) and rows from firstHour
 * to lastHour in 15-minute increments. Users click/drag to toggle
 * slots between available (green) and unavailable (gray).
 *
 * Props:
 * - slots: current regular availability slots from the backend
 * - onSave: callback with the updated slots array
 * - saving: whether a save operation is in progress
 * - firstHour/lastHour: operating hour range (default 07:00-21:00)
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { RegularAvailabilitySlot, RegularAvailabilityInput } from '@/types/instructor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const;
const MINUTES_PER_SLOT = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityEditorProps {
  readonly slots: readonly RegularAvailabilitySlot[];
  readonly onSave: (slots: readonly RegularAvailabilityInput[]) => Promise<boolean>;
  readonly saving: boolean;
  readonly firstHour?: string;
  readonly lastHour?: string;
}

interface CellKey {
  readonly day: number;
  readonly time: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTimeSlots(firstHour: string, lastHour: string): readonly string[] {
  const [startH, startM] = firstHour.split(':').map(Number);
  const [endH, endM] = lastHour.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const times: string[] = [];
  for (let m = startMin; m < endMin; m += MINUTES_PER_SLOT) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

function cellKeyToString(key: CellKey): string {
  return `${key.day}-${key.time}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Build the set of selected cells from backend slots.
 * Handles same-day and cross-day windows.
 */
function buildSelectedSet(
  slots: readonly RegularAvailabilitySlot[],
  timeSlots: readonly string[],
): Set<string> {
  const selected = new Set<string>();

  for (const slot of slots) {
    if (slot.startDay === slot.endDay) {
      // Same-day: iterate from startTime to endTime
      for (const time of timeSlots) {
        const mins = timeToMinutes(time);
        if (mins >= timeToMinutes(slot.startTime) && mins < timeToMinutes(slot.endTime)) {
          selected.add(cellKeyToString({ day: slot.startDay, time }));
        }
      }
    } else {
      // Day-spanning: fill tail of start day, full intermediate days, head of end day
      for (const time of timeSlots) {
        const mins = timeToMinutes(time);
        if (mins >= timeToMinutes(slot.startTime)) {
          selected.add(cellKeyToString({ day: slot.startDay, time }));
        }
      }

      let d = (slot.startDay + 1) % 7;
      while (d !== slot.endDay) {
        for (const time of timeSlots) {
          selected.add(cellKeyToString({ day: d, time }));
        }
        d = (d + 1) % 7;
      }

      for (const time of timeSlots) {
        const mins = timeToMinutes(time);
        if (mins < timeToMinutes(slot.endTime)) {
          selected.add(cellKeyToString({ day: slot.endDay, time }));
        }
      }
    }
  }

  return selected;
}

/**
 * Convert the selected cell set back to contiguous RegularAvailabilityInput slots.
 * Groups consecutive time cells on the same day into single slots.
 */
function selectedToSlots(
  selected: Set<string>,
  timeSlots: readonly string[],
): readonly RegularAvailabilityInput[] {
  const result: RegularAvailabilityInput[] = [];

  for (let day = 0; day < 7; day++) {
    let rangeStart: string | null = null;

    for (const time of timeSlots) {
      const key = cellKeyToString({ day, time });
      const isSelected = selected.has(key);

      if (isSelected && rangeStart === null) {
        rangeStart = time;
      } else if (!isSelected && rangeStart !== null) {
        result.push({
          startDay: day,
          startTime: rangeStart,
          endDay: day,
          endTime: time,
        });
        rangeStart = null;
      }
    }

    // Close any open range at the end of the day
    if (rangeStart !== null) {
      const lastTime = timeSlots[timeSlots.length - 1];
      const endMinutes = timeToMinutes(lastTime) + MINUTES_PER_SLOT;
      result.push({
        startDay: day,
        startTime: rangeStart,
        endDay: day,
        endTime: minutesToTime(endMinutes),
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvailabilityEditor({
  slots,
  onSave,
  saving,
  firstHour = '07:00',
  lastHour = '21:00',
}: AvailabilityEditorProps) {
  const timeSlots = generateTimeSlots(firstHour, lastHour);
  const [selected, setSelected] = useState<Set<string>>(
    () => buildSelectedSet(slots, timeSlots),
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<boolean>(true); // true = selecting, false = deselecting

  const toggleCell = useCallback((key: string, forceState?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldSelect = forceState ?? !prev.has(key);
      if (shouldSelect) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((day: number, time: string) => {
    const key = cellKeyToString({ day, time });
    const willSelect = !selected.has(key);
    dragModeRef.current = willSelect;
    setIsDragging(true);
    toggleCell(key, willSelect);
  }, [selected, toggleCell]);

  const handleMouseEnter = useCallback((day: number, time: string) => {
    if (!isDragging) return;
    const key = cellKeyToString({ day, time });
    toggleCell(key, dragModeRef.current);
  }, [isDragging, toggleCell]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSave = useCallback(async () => {
    const newSlots = selectedToSlots(selected, timeSlots);
    await onSave(newSlots);
  }, [selected, timeSlots, onSave]);

  const handleClear = useCallback(() => {
    setSelected(new Set());
  }, []);

  return (
    <div
      className="select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Disponibilita Settimanale</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={saving}>
            Cancella Tutto
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
          {/* Header row */}
          <div className="sticky top-0 z-10 bg-background" />
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="sticky top-0 z-10 bg-background px-1 py-2 text-center text-xs font-semibold"
            >
              {label}
            </div>
          ))}

          {/* Time rows */}
          {timeSlots.map((time) => (
            <div key={time} className="contents">
              {/* Time label */}
              <div className="flex items-center pr-2 text-right text-xs text-muted-foreground tabular-nums">
                {time.endsWith(':00') ? time : ''}
              </div>

              {/* Day cells */}
              {Array.from({ length: 7 }, (_, day) => {
                const key = cellKeyToString({ day, time });
                const isSelected = selected.has(key);
                const isHourBoundary = time.endsWith(':00');

                return (
                  <div
                    key={key}
                    className={[
                      'h-3 cursor-pointer border-r border-border/30 transition-colors',
                      isHourBoundary ? 'border-t border-t-border/50' : '',
                      isSelected
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-muted/30 hover:bg-muted/60',
                    ].join(' ')}
                    onMouseDown={() => handleMouseDown(day, time)}
                    onMouseEnter={() => handleMouseEnter(day, time)}
                    role="gridcell"
                    aria-label={`${DAY_LABELS[day]} ${time} - ${isSelected ? 'Disponibile' : 'Non disponibile'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
          Disponibile
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted/30 border border-border/30" />
          Non disponibile
        </div>
      </div>
    </div>
  );
}
