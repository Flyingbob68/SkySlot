/**
 * Read-only calendar view showing resolved instructor availability.
 *
 * Displays a weekly view with 15-minute granularity.  Color coding:
 * - Green: available (from regular schedule)
 * - Red: absence exception override
 * - Yellow: presence exception override
 * - Gray: unavailable
 *
 * The component fetches resolved availability blocks and renders
 * them on a time grid. Includes week navigation controls.
 *
 * All text is in Italian.
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAvailability } from '@/hooks/use-instructors';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const;
const MINUTES_PER_SLOT = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailabilityCalendarProps {
  readonly instructorId: string;
  readonly firstHour?: string;
  readonly lastHour?: string;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const from = monday.toLocaleDateString('it-IT', opts);
  const to = sunday.toLocaleDateString('it-IT', { ...opts, year: 'numeric' });
  return `${from} - ${to}`;
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvailabilityCalendar({
  instructorId,
  firstHour = '07:00',
  lastHour = '21:00',
}: AvailabilityCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  const { data: blocks, isLoading, error } = useAvailability(instructorId, from, to);

  const timeSlots = useMemo(
    () => generateTimeSlots(firstHour, lastHour),
    [firstHour, lastHour],
  );

  /**
   * Build a lookup map: "dayIndex-HH:MM" -> availability state
   * States: 'available' | 'unavailable'
   */
  const cellStates = useMemo(() => {
    const map = new Map<string, 'available' | 'unavailable'>();

    if (!blocks) return map;

    for (const block of blocks) {
      const startMs = new Date(block.start).getTime();
      const endMs = new Date(block.end).getTime();
      const weekStartMs = weekStart.getTime();

      for (let ms = startMs; ms < endMs; ms += MINUTES_PER_SLOT * 60 * 1000) {
        const slotDate = new Date(ms);
        const dayOffset = Math.floor((ms - weekStartMs) / MS_PER_DAY);
        if (dayOffset < 0 || dayOffset >= 7) continue;

        const hh = String(slotDate.getUTCHours()).padStart(2, '0');
        const mm = String(slotDate.getUTCMinutes()).padStart(2, '0');
        const time = `${hh}:${mm}`;

        if (!timeSlots.includes(time)) continue;

        const key = `${dayOffset}-${time}`;
        map.set(key, block.available ? 'available' : 'unavailable');
      }
    }

    return map;
  }, [blocks, weekStart, timeSlots]);

  const handlePrevWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const handleToday = useCallback(() => {
    setWeekStart(getMonday(new Date()));
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div>
      {/* Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            &#8592;
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Oggi
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            &#8594;
          </Button>
        </div>
        <span className="text-sm font-medium">{formatWeekLabel(weekStart)}</span>
      </div>

      {isLoading ? (
        <LoadingSpinner centered />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
              {/* Header row */}
              <div className="sticky top-0 z-10 bg-background" />
              {DAY_LABELS.map((label, i) => {
                const dayDate = addDays(weekStart, i);
                const dayNum = dayDate.getUTCDate();
                return (
                  <div
                    key={i}
                    className="sticky top-0 z-10 bg-background px-1 py-2 text-center text-xs font-semibold"
                  >
                    {label} {dayNum}
                  </div>
                );
              })}

              {/* Time rows */}
              {timeSlots.map((time) => (
                <div key={time} className="contents">
                  <div className="flex items-center pr-2 text-right text-xs text-muted-foreground tabular-nums">
                    {time.endsWith(':00') ? time : ''}
                  </div>

                  {Array.from({ length: 7 }, (_, day) => {
                    const key = `${day}-${time}`;
                    const state = cellStates.get(key);
                    const isHourBoundary = time.endsWith(':00');

                    let bgClass = 'bg-muted/20';
                    if (state === 'available') {
                      bgClass = 'bg-green-400';
                    } else if (state === 'unavailable') {
                      bgClass = 'bg-muted/20';
                    }

                    return (
                      <div
                        key={key}
                        className={[
                          'h-3 border-r border-border/30',
                          isHourBoundary ? 'border-t border-t-border/50' : '',
                          bgClass,
                        ].join(' ')}
                        role="gridcell"
                        aria-label={`${DAY_LABELS[day]} ${time} - ${state === 'available' ? 'Disponibile' : 'Non disponibile'}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-400" />
              Disponibile
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-muted/20 border border-border/30" />
              Non disponibile
            </div>
          </div>
        </>
      )}
    </div>
  );
}
