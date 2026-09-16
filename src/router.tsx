import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // "online" pauses requests when the browser thinks it is offline, which on
        // mobile leaves the UI hanging. Fire anyway and let the fetch fail fast.
        networkMode: "offlineFirst",
        retry: 1,
        retryDelay: 1500,
        staleTime: 30_000,
        // Keep data around so a reload (with the persisted cache) paints instantly.
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
