import { useMemo } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import type {
  LookupContext,
  LookupDefinition,
  LookupResult,
  ResourceHelpers,
} from "@/features/resources/resource-types";

/**
 * Resolves all lookup datasets required by a resource screen and exposes helper
 * methods that turn backend ids into UI labels.
 */
export function useLookupResults(
  definitions: LookupDefinition[] | undefined,
  context: LookupContext,
) {
  const queries = useQueries({
    queries: (definitions ?? []).map((definition) => ({
      queryKey: definition.queryKey(context),
      queryFn: () => definition.queryFn(context),
      enabled: definition.enabled ? definition.enabled(context) : true,
    })),
  });

  return useMemo(() => {
    const results: Record<string, LookupResult> = {};

    (definitions ?? []).forEach((definition, index) => {
      const query = queries[index] as UseQueryResult<unknown[], Error>;
      const raw = (query.data ?? []) as unknown[];
      // Lookup definitions stay backend-shaped until this point; the helper
      // layer converts them into select options and label maps for forms,
      // filters, and detail screens.
      const options = raw.map((item) => definition.toOption(item));
      const labelMap = options.reduce<Record<string, string>>((accumulator, option) => {
        accumulator[option.value] = option.label;
        return accumulator;
      }, {});

      results[definition.key] = {
        key: definition.key,
        options,
        labelMap,
        raw,
      };
    });

    return {
      queries,
      results,
      helpers: {
        lookupLabel: (lookupKey: string, value?: string | null) => {
          if (!value) {
            return "—";
          }
          return results[lookupKey]?.labelMap[value] ?? value;
        },
        lookupOptions: (lookupKey: string) => results[lookupKey]?.options ?? [],
      } satisfies ResourceHelpers,
      loading: queries.some((query) => query.isLoading),
    };
  }, [definitions, queries]);
}

// Resource filters and query-string prefills arrive as unknown values, so this
// helper centralizes the string conversion used by the generic resource pages.
export function stringFromUnknown(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}
