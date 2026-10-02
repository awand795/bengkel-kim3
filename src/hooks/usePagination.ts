import { useState, useEffect, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
  total: number;
  defaultLimit?: number;
  maxLimit?: number;
  storageKey?: string;
  presetLimits?: number[];
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  safePage: number;
  totalPages: number;
  offset: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  setLimit: (limit: number) => void;
  isCustomLimit: boolean;
}

/**
 * usePagination - Hook pagination enterprise
 * Mengelola state page, limit, safePage, offset, dan sinkronisasi localStorage.
 */
export function usePagination({
  total,
  defaultLimit = 10,
  maxLimit = 200,
  storageKey,
  presetLimits = [10, 25, 50, 100],
}: UsePaginationOptions): UsePaginationReturn {
  // Ambil limit awal dari localStorage jika storageKey ada & valid
  const getInitialLimit = (): number => {
    if (!storageKey || typeof window === 'undefined') return defaultLimit;
    try {
      const stored = localStorage.getItem(`pagination:${storageKey}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= maxLimit) {
          return parsed;
        }
      }
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }
    return defaultLimit;
  };

  const [limit, setLimitState] = useState<number>(getInitialLimit);
  const [page, setPageState] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * limit;

  // Otomatis sinkronkan page jika total mengecil dan page melebihi totalPages
  useEffect(() => {
    if (page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  // setLimit: bulatkan, batasi 1..maxLimit, abaikan NaN, reset page ke 1
  const setLimit = useCallback(
    (newLimit: number) => {
      const num = Number(newLimit);
      if (isNaN(num)) return;
      const rounded = Math.round(num);
      const clamped = Math.min(Math.max(1, rounded), maxLimit);
      setLimitState(clamped);
      setPageState(1);

      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`pagination:${storageKey}`, String(clamped));
        } catch {
          // Abaikan jika localStorage tidak dapat ditulis
        }
      }
    },
    [maxLimit, storageKey]
  );

  // setPage: batasi 1..totalPages, abaikan NaN
  const setPage = useCallback(
    (action: number | ((prev: number) => number)) => {
      setPageState((prev) => {
        const nextVal = typeof action === 'function' ? action(prev) : action;
        const num = Number(nextVal);
        if (isNaN(num)) return prev;
        const rounded = Math.round(num);
        return Math.min(Math.max(1, rounded), totalPages);
      });
    },
    [totalPages]
  );

  const isCustomLimit = useMemo(() => {
    return !presetLimits.includes(limit);
  }, [limit, presetLimits]);

  return {
    page,
    limit,
    safePage,
    totalPages,
    offset,
    setPage,
    setLimit,
    isCustomLimit,
  };
}

export default usePagination;
