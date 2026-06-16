import { useQuery, type UseQueryOptions, type QueryKey } from "@tanstack/react-query";
import { get, set } from "idb-keyval";
import { useEffect, useState } from "react";
import { isNetworkError } from "@/utils/offlineUtils";

/**
 * useOfflineQuery — a thin wrapper around useQuery that mirrors every
 * successful response into IndexedDB and, on a network failure while offline,
 * transparently serves the last cached value so the page can still render.
 *
 * It also exposes `isFromCache` so the UI can show a "cached" indicator.
 */
export function useOfflineQuery<TData>(
  options: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryFn"> & {
    queryFn: () => Promise<TData>;
  },
) {
  const [isFromCache, setIsFromCache] = useState(false);
  const cacheKey = `offline_q_${JSON.stringify(options.queryKey)}`;

  const query = useQuery<TData, Error>({
    ...options,
    queryFn: async () => {
      try {
        const data = await options.queryFn();
        try {
          await set(cacheKey, { data, timestamp: Date.now() });
        } catch {
          /* ignore quota errors */
        }
        setIsFromCache(false);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = await get<{ data: TData; timestamp: number }>(cacheKey);
          if (cached) {
            setIsFromCache(true);
            return cached.data;
          }
        }
        throw err;
      }
    },
    retry: (failureCount, error) => {
      if (isNetworkError(error)) return false;
      return failureCount < 2;
    },
  });

  // If we mounted offline, reflect cached state immediately.
  useEffect(() => {
    if (!navigator.onLine && query.data) setIsFromCache(true);
  }, [query.data]);

  return { ...query, isFromCache };
}
