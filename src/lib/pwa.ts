import { useCallback, useEffect, useState } from "react";

/*
 * Progressive Web App plumbing: service-worker registration, the "Add to
 * Home Screen" install prompt, and cache hygiene on sign-out.
 *
 * The manifest lives at public/manifest.webmanifest and the worker at
 * public/sw.js; both are linked from the root route.
 */

const SW_URL = "/sw.js";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notify() {
  for (const fn of promptListeners) fn();
}

/** True when the page is running as an installed app (home-screen launch). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

/** iOS Safari never fires beforeinstallprompt; it needs manual instructions. */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const webkit = /WebKit/.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && !otherBrowser;
}

/**
 * Registers the service worker once per page load. Safe to call on the
 * server or in browsers without service-worker support (it just returns).
 * Skipped in dev so Vite's HMR and fresh SSR output are never masked by a cache.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  const register = () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((reg) => {
        // Check for a newer build whenever the app comes back to the foreground.
        const check = () => void reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      })
      .catch((err) => console.warn("Service worker registration failed", err));
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** Drops cached pages so a signed-out (or switched) account leaves nothing behind offline. */
export function clearPwaPageCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_PAGES" });
}

/**
 * Exposes the browser's install prompt to UI.
 *
 * - `canPrompt`: Chrome/Edge/Samsung on Android (and desktop) captured the
 *   native prompt; call `install()` to show it.
 * - `needsManualSteps`: iOS Safari, where the user must use Share → Add to Home Screen.
 * - `installed`: already running as the installed app.
 */
export function useInstallPrompt() {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosSafari());
    const rerender = () => force((n) => n + 1);
    promptListeners.add(rerender);
    return () => {
      promptListeners.delete(rerender);
    };
  }, []);

  const install = useCallback(async () => {
    const evt = deferredPrompt;
    if (!evt) return "unavailable" as const;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      notify();
    }
    return outcome;
  }, []);

  return {
    canPrompt: deferredPrompt !== null,
    needsManualSteps: !installed && ios && deferredPrompt === null,
    installed,
    install,
  };
}
