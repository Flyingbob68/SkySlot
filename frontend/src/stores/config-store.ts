/**
 * Zustand store for club configuration.
 *
 * Holds the club config singleton in memory so that other modules
 * can read operating hours, slot duration, qualification mode, etc.
 * without re-fetching from the API each time.
 */

import { create } from 'zustand';
import type { ClubConfig } from '@/services/admin-service';
import * as adminApi from '@/services/admin-service';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface ConfigState {
  readonly config: ClubConfig | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  fetchConfig: () => Promise<void>;
  setConfig: (config: ClubConfig) => void;
  clearConfig: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await adminApi.getConfig();

      if (result.success && result.data) {
        set({ config: result.data, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: result.error ?? 'Errore nel caricamento configurazione' });
      }
    } catch {
      set({ isLoading: false, error: 'Errore di rete nel caricamento configurazione' });
    }
  },

  setConfig: (config) => set({ config }),

  clearConfig: () => set({ config: null, error: null }),
}));
