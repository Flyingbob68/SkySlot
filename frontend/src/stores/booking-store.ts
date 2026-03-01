/**
 * Zustand store for booking calendar state.
 *
 * Holds the selected date, view mode, aircraft filter, and general
 * booking list filters.  Actions produce new state slices -- never
 * mutate the existing state.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'day' | 'week';

interface BookingFilters {
  readonly slotType?: 'SOLO' | 'DUAL' | 'MAINTENANCE';
  readonly memberId?: string;
}

interface BookingState {
  readonly selectedDate: string; // ISO date string (YYYY-MM-DD)
  readonly viewMode: ViewMode;
  readonly selectedAircraftIds: readonly string[];
  readonly filters: BookingFilters;

  // Actions
  setDate: (date: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleAircraft: (aircraftId: string) => void;
  setSelectedAircraftIds: (ids: readonly string[]) => void;
  setFilters: (filters: BookingFilters) => void;
  goToNextDay: () => void;
  goToPrevDay: () => void;
  goToToday: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBookingStore = create<BookingState>((set) => ({
  selectedDate: todayISO(),
  viewMode: 'day',
  selectedAircraftIds: [],
  filters: {},

  setDate: (date) => set({ selectedDate: date }),

  setViewMode: (viewMode) => set({ viewMode }),

  toggleAircraft: (aircraftId) =>
    set((state) => {
      const current = state.selectedAircraftIds;
      const exists = current.includes(aircraftId);
      const next = exists
        ? current.filter((id) => id !== aircraftId)
        : [...current, aircraftId];
      return { selectedAircraftIds: next };
    }),

  setSelectedAircraftIds: (ids) => set({ selectedAircraftIds: ids }),

  setFilters: (filters) => set({ filters }),

  goToNextDay: () =>
    set((state) => ({ selectedDate: addDays(state.selectedDate, 1) })),

  goToPrevDay: () =>
    set((state) => ({ selectedDate: addDays(state.selectedDate, -1) })),

  goToToday: () => set({ selectedDate: todayISO() }),
}));
