import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 30 seconds stale time — prevents request storms on mount/focus
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        // Do NOT retry on 4xx errors — only retry on network failures
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          // Never retry client errors (4xx) — they won't succeed on retry
          if (status && status >= 400 && status < 500) return false;
          // Retry network errors up to 2 times
          return failureCount < 2;
        },
        refetchOnWindowFocus: false, // prevents request storm on tab switch
        refetchOnMount: true,
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
