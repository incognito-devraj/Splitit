import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 2 minutes stale time — data doesn't change that often,
        // prevents redundant fetches on every mount/navigation
        staleTime: 2 * 60_000,
        // Keep unused data in cache for 10 minutes so switching tabs is instant
        gcTime: 10 * 60_000,
        // Do NOT retry on 4xx errors — only retry on network failures
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        // Do NOT refetch on every mount — serve from cache until stale
        refetchOnMount: false,
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
