/**
 * React hooks for aircraft data fetching.
 *
 * Wraps the useApi generic hook with typed aircraft fetchers
 * so that pages can consume fleet data declaratively.
 */

import { useApi } from '@/hooks/use-api';
import * as aircraftService from '@/services/aircraft-service';
import type { Aircraft, AircraftWithQualifications } from '@/types/aircraft';

/**
 * Fetch the full aircraft list.
 *
 * @param options.active - Optional filter: `true` = active only, `false` = inactive only.
 */
export function useAircraft(options: { active?: boolean } = {}) {
  return useApi<Aircraft[]>(
    () => aircraftService.getAircraft(options),
    [options.active],
  );
}

/**
 * Fetch a single aircraft by ID, including qualification requirements.
 *
 * @param id - Aircraft ID (cuid).
 */
export function useAircraftDetail(id: string) {
  return useApi<AircraftWithQualifications>(
    () => aircraftService.getAircraftById(id),
    [id],
  );
}
