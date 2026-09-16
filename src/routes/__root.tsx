import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CACHE_MAX_AGE,
  cacheUser,
  createQueryPersister,
  rememberCacheUser,
  shouldDehydrateQuery,
} from "@/lib/query-persister";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ProfitAI — Resale Ledger" },
      { name: "theme-color", content: "#FAF9F5", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#262624", media: "(prefers-color-scheme: dark)" },
      {
        name: "description",
        content:
          "Business Buddy is a mobile-friendly web application for managing side business subscription sales records.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "ProfitAI — Resale Ledger" },
      {
        property: "og:description",
        content:
          "Business Buddy is a mobile-friendly web application for managing side business subscription sales records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ProfitAI — Resale Ledger" },
      {
        name: "twitter:description",
        content:
          "Business Buddy is a mobile-friendly web application for managing side business subscription sales records.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1006a44e-e3ac-4e47-895b-4b34d22e76d1/id-preview-74905dca--1a7e79b8-dadd-4434-9814-51f040fb5abe.lovable.app-1779250358683.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1006a44e-e3ac-4e47-895b-4b34d22e76d1/id-preview-74905dca--1a7e79b8-dadd-4434-9814-51f040fb5abe.lovable.app-1779250358683.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Applies the saved theme before first paint so dark-mode users never see a
// light flash. Mirrors the key and class used by use-theme.ts.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("profitai-theme");if(!t){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // On the client, successful ledger queries are persisted to localStorage so a
  // reopen paints the last known data immediately and refreshes in place.
  const persister = useMemo(() => createQueryPersister(), []);

  const inner = (
    <AuthProvider>
      <AuthListener persister={persister} />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{inner}</QueryClientProvider>;
  }
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE,
        buster: cacheUser() ?? "anon",
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      {inner}
    </PersistQueryClientProvider>
  );
}

function AuthListener({ persister }: { persister: ReturnType<typeof createQueryPersister> }) {
  const qc = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes happen every hour; they must not trigger a refetch storm.
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (session?.user?.id && !cacheUser()) rememberCacheUser(session.user.id);
        return;
      }
      if (event === "SIGNED_OUT") {
        rememberCacheUser(null);
        qc.clear();
        void persister?.removeClient();
        router.invalidate();
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        const uid = session?.user?.id ?? null;
        if (uid && cacheUser() !== uid) {
          // A different account: never show another user's cached ledger.
          qc.clear();
          void persister?.removeClient();
          rememberCacheUser(uid);
        }
        qc.invalidateQueries();
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc, router, persister]);
  return null;
}
