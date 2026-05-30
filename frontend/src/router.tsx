import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Always refetch — never serve stale data
        staleTime: 0,
        // Keep data in memory for 5 minutes but always refetch on mount
        gcTime: 5 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Refetch when component mounts
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
