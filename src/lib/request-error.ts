/**
 * Turns the raw errors that bubble out of server-function calls into short,
 * human messages, and provides a per-request timeout signal so a hung request
 * always settles.
 */

export const REQUEST_TIMEOUT_MS = 20_000;

export function requestSignal(ms: number = REQUEST_TIMEOUT_MS): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }
  return AbortSignal.timeout(ms);
}

const messageOf = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
};

export const isTimeoutError = (err: unknown) =>
  (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) ||
  /timed? ?out|aborted/i.test(messageOf(err));

export const isAuthError = (err: unknown) => /^unauthorized/i.test(messageOf(err).trim());

export const isOfflineError = (err: unknown) =>
  (typeof navigator !== "undefined" && navigator.onLine === false) ||
  /failed to fetch|networkerror|network request failed|load failed/i.test(messageOf(err));

export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again.") {
  const raw = messageOf(err).trim();
  if (isTimeoutError(err)) return "Request timed out. Check your connection and try again.";
  if (isOfflineError(err)) return "You appear to be offline. Check your connection and try again.";
  if (isAuthError(err)) return "Your session has expired. Please sign in again.";
  if (!raw) return fallback;
  if (/^<!doctype|^<html|^<\?xml/i.test(raw)) return "Server error. Please try again.";
  if (raw.length > 200) return fallback;
  return raw;
}
