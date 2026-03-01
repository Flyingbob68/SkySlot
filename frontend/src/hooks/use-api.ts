import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse, PaginationMeta } from '@/types/api';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  meta: PaginationMeta | undefined;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      if (!mountedRef.current) return;

      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
        setError(null);
      } else {
        setData(null);
        setError(result.error ?? 'Errore sconosciuto');
      }
    } catch {
      if (!mountedRef.current) return;
      setData(null);
      setError('Errore durante il caricamento dei dati');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, error, isLoading, meta, refetch };
}
