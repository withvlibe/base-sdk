'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseDatabase } from '../VlibeBaseDatabase';
import type { UseKVReturn } from '../types';

/**
 * React hook for working with key-value storage
 *
 * @param db - VlibeBaseDatabase instance
 * @param key - The key to read/write
 * @returns KV data and operations
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { data, loading, set } = useKV<{ theme: string }>(db, 'user-settings');
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <select
 *       value={data?.theme || 'light'}
 *       onChange={(e) => set({ ...data, theme: e.target.value })}
 *     >
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useKV<T = unknown>(
  db: VlibeBaseDatabase,
  key: string
): UseKVReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await db.getKV<T>(key);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch KV'));
    } finally {
      setLoading(false);
    }
  }, [db, key]);

  const set = useCallback(
    async (value: T): Promise<void> => {
      try {
        await db.setKV(key, value);
        setData(value);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to set KV'));
        throw err;
      }
    },
    [db, key]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    set,
    refresh,
  };
}
