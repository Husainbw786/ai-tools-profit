import { useContext } from "react";
import { AuthContext } from "@/components/AuthProvider";

/**
 * Reads the shared auth state from `AuthProvider` (mounted in the root route).
 * Returns `{ session, user, loading }`.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Outside the provider (should not happen in the app); behave as signed out.
    return { session: null, user: null, loading: false } as const;
  }
  return { session: ctx.session, user: ctx.session?.user ?? null, loading: ctx.loading };
}
