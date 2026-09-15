import { createContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  session: Session | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

/** How long we wait for Supabase before falling back to the locally stored session. */
const AUTH_TIMEOUT_MS = 6_000;

/**
 * Best-effort read of the session Supabase persisted in localStorage. Used only
 * as a fallback when `getSession()` is slow (e.g. a token refresh retrying on a
 * flaky mobile connection); the server still validates the token.
 */
function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const key = Object.keys(window.localStorage).find(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
    if (!key) return null;
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return parsed && typeof parsed === "object" && "access_token" in parsed
      ? (parsed as Session)
      : null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for the Supabase session. Mounted once in the root so
 * every `useAuth()` shares one subscription and one `getSession()` call.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    let settled = false;
    const settle = (session: Session | null) => {
      settled = true;
      setState({ session, loading: false });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      settle(session);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => settle(data.session))
      .catch(() => settle(readStoredSession()));

    // Never leave the app on a spinner: after a few seconds, render with what we
    // have locally and let the data layer surface any auth problem.
    const timer = window.setTimeout(() => {
      if (!settled) settle(readStoredSession());
    }, AUTH_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
