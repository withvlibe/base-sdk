'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseDatabase } from '../VlibeBaseDatabase';
import type {
  BaseRecord,
  UseCollectionOptions,
  UseCollectionReturn,
  RealtimePayload,
} from '../types';

/**
 * React hook for working with a database collection
 *
 * @param db - VlibeBaseDatabase instance
 * @param collection - Collection name
 * @param options - Query options
 * @returns Collection data and operations
 *
 * @example
 * ```tsx
 * function TodoList() {
 *   const { data, loading, insert, remove } = useCollection(db, 'todos', {
 *     orderBy: 'created_at',
 *     orderDirection: 'desc',
 *     realtime: true,
 *   });
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <ul>
 *       {data.map(todo => (
 *         <li key={todo.id}>
 *           {todo.title}
 *           <button onClick={() => remove(todo.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useCollection<T extends BaseRecord = BaseRecord>(
  db: VlibeBaseDatabase,
  collection: string,
  options: UseCollectionOptions = {}
): UseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { realtime = false, ...queryOptions } = options;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await db.query<T>(collection, queryOptions);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [db, collection, JSON.stringify(queryOptions)]);

  const insert = useCallback(
    async (doc: Partial<T>): Promise<T | null> => {
      try {
        const result = await db.insert<T>(collection, doc);
        if (!realtime) {
          setData((prev) => [result, ...prev]);
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to insert'));
        return null;
      }
    },
    [db, collection, realtime]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<T | null> => {
      try {
        const result = await db.update<T>(collection, id, updates);
        if (!realtime) {
          setData((prev) =>
            prev.map((item) => (item.id === id ? result : item))
          );
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update'));
        return null;
      }
    },
    [db, collection, realtime]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await db.delete(collection, id);
        if (!realtime) {
          setData((prev) => prev.filter((item) => item.id !== id));
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete'));
        return false;
      }
    },
    [db, collection, realtime]
  );

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const subscription = db.subscribe<T>(
      collection,
      (payload: RealtimePayload<T>) => {
        switch (payload.eventType) {
          case 'INSERT':
            if (payload.new) {
              setData((prev) => [payload.new as T, ...prev]);
            }
            break;
          case 'UPDATE':
            if (payload.new) {
              setData((prev) =>
                prev.map((item) =>
                  item.id === (payload.new as T).id ? (payload.new as T) : item
                )
              );
            }
            break;
          case 'DELETE':
            if (payload.old) {
              setData((prev) =>
                prev.filter((item) => item.id !== (payload.old as T).id)
              );
            }
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [db, collection, realtime]);

  return {
    data,
    loading,
    error,
    refresh,
    insert,
    update,
    remove,
  };
}
