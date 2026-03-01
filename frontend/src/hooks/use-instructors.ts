/**
 * Custom hooks for instructor data fetching and mutations.
 *
 * Builds on the generic useApi hook with instructor-specific
 * typed fetcher functions.
 */

import { useCallback, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import * as instructorApi from '@/services/instructor-service';
import type {
  Instructor,
  RegularAvailabilitySlot,
  RegularAvailabilityInput,
  AvailabilityException,
  AvailabilityBlock,
  CreateExceptionInput,
  UpdateExceptionInput,
} from '@/types/instructor';

// ---------------------------------------------------------------------------
// List all instructors
// ---------------------------------------------------------------------------

export function useInstructors() {
  return useApi<Instructor[]>(
    () => instructorApi.fetchInstructors(),
    [],
  );
}

// ---------------------------------------------------------------------------
// Single instructor by id
// ---------------------------------------------------------------------------

export function useInstructor(id: string) {
  return useApi<Instructor>(
    () => instructorApi.fetchInstructorById(id),
    [id],
  );
}

// ---------------------------------------------------------------------------
// Resolved availability for a date range
// ---------------------------------------------------------------------------

export function useAvailability(id: string, from: string, to: string) {
  return useApi<AvailabilityBlock[]>(
    () => instructorApi.fetchAvailability(id, from, to),
    [id, from, to],
  );
}

// ---------------------------------------------------------------------------
// Regular availability (weekly schedule)
// ---------------------------------------------------------------------------

export function useRegularAvailability(id: string) {
  const result = useApi<RegularAvailabilitySlot[]>(
    () => instructorApi.fetchRegularAvailability(id),
    [id],
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useCallback(
    async (slots: readonly RegularAvailabilityInput[]) => {
      setSaving(true);
      setSaveError(null);

      try {
        const response = await instructorApi.updateRegularAvailability(id, slots);

        if (!response.success) {
          setSaveError(response.error ?? 'Errore durante il salvataggio');
          return false;
        }

        result.refetch();
        return true;
      } catch {
        setSaveError('Errore durante il salvataggio');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, result],
  );

  return { ...result, save, saving, saveError };
}

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export function useExceptions(id: string, from?: string, to?: string) {
  const result = useApi<AvailabilityException[]>(
    () => instructorApi.fetchExceptions(id, from, to),
    [id, from, to],
  );

  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const create = useCallback(
    async (data: CreateExceptionInput) => {
      setMutating(true);
      setMutationError(null);

      try {
        const response = await instructorApi.createException(id, data);

        if (!response.success) {
          setMutationError(response.error ?? 'Errore durante la creazione');
          return false;
        }

        result.refetch();
        return true;
      } catch {
        setMutationError('Errore durante la creazione');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [id, result],
  );

  const update = useCallback(
    async (exceptionId: string, data: UpdateExceptionInput) => {
      setMutating(true);
      setMutationError(null);

      try {
        const response = await instructorApi.updateException(id, exceptionId, data);

        if (!response.success) {
          setMutationError(response.error ?? 'Errore durante l\'aggiornamento');
          return false;
        }

        result.refetch();
        return true;
      } catch {
        setMutationError('Errore durante l\'aggiornamento');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [id, result],
  );

  const remove = useCallback(
    async (exceptionId: string) => {
      setMutating(true);
      setMutationError(null);

      try {
        const response = await instructorApi.deleteException(id, exceptionId);

        if (!response.success) {
          setMutationError(response.error ?? 'Errore durante l\'eliminazione');
          return false;
        }

        result.refetch();
        return true;
      } catch {
        setMutationError('Errore durante l\'eliminazione');
        return false;
      } finally {
        setMutating(false);
      }
    },
    [id, result],
  );

  return {
    ...result,
    create,
    update,
    remove,
    mutating,
    mutationError,
  };
}
