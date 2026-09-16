import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/react-query";

export const CACHE_KEY = "profitai.query-cache";
export const CACHE_USER_KEY = "profitai.cache-user";
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const PERSISTED_KEYS = new Set(["sales", "contacts", "payments"]);

/** Only successful ledger data is written to localStorage. */
export const shouldDehydrateQuery = (query: Query) =>
  query.state.status === "success" && PERSISTED_KEYS.has(String(query.queryKey[0]));

export function createQueryPersister() {
  if (typeof window === "undefined") return null;
  try {
    // Touch storage once so a blocked/private-mode browser fails here, not later.
    window.localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: CACHE_KEY,
    throttleTime: 1000,
  });
}

export function rememberCacheUser(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(CACHE_USER_KEY, userId);
    else window.localStorage.removeItem(CACHE_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function cacheUser(): string | null {
  try {
    return window.localStorage.getItem(CACHE_USER_KEY);
  } catch {
    return null;
  }
}
