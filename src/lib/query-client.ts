import axios from "axios";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { logger, summarizeError } from "@/lib/logger";

function shouldLogCacheFailure(error: unknown) {
  // Axios failures are already logged once in the shared API client.
  return !axios.isAxiosError(error);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!shouldLogCacheFailure(error)) {
        return;
      }

      logger.error("react-query", "query_failed", {
        queryKey: query.queryKey,
        error: summarizeError(error),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, _context, mutation) => {
      if (!shouldLogCacheFailure(error)) {
        return;
      }

      logger.error("react-query", "mutation_failed", {
        mutationKey: mutation.options.mutationKey,
        variables: variables ? "provided" : "none",
        error: summarizeError(error),
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});
