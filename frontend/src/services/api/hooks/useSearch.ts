/**
 * useSearch.ts
 *
 * React Query infinite query hook for paginated search results in the Schematic Mapper frontend.
 *
 * - Accepts imageId, query string, sources, and limit as parameters.
 * - Only enabled when imageId is set and query meets minimum length.
 * - Applies short cache times for fresh, responsive search UX.
 * - Handles pagination via next_cursor from the backend.
 *
 * Use this hook in search bars, result lists, and autocomplete components.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	GC_TIME_SEARCH,
	SEARCH_DEFAULT_LIMIT,
	SEARCH_MIN_QUERY_LENGTH,
	STALE_TIME_SEARCH,
} from "../config";
import { fetchSearch } from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Infinite query hook for paginated search results.
 * Only enabled when imageId is set and query meets minimum length.
 * @param imageId The image UUID to search within
 * @param query The search string
 * @param sources Array of sources to search (default: ["internal", "asset"])
 * @param limit Max results per page (default: SEARCH_DEFAULT_LIMIT)
 * @returns React Query infinite query result for search pages
 */
export function useSearch(
	imageId: string,
	query: string,
	sources: string[] = ["internal", "asset"],
	limit: number = SEARCH_DEFAULT_LIMIT,
) {
	return useInfiniteQuery({
		queryKey: queryKeys.search(imageId, query, sources, limit),
		queryFn: ({ pageParam }) =>
			fetchSearch({
				imageId,
				query,
				sources,
				limit,
				cursor: pageParam as string | null,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
		enabled: Boolean(imageId) && query.length >= SEARCH_MIN_QUERY_LENGTH,
		staleTime: STALE_TIME_SEARCH,
		gcTime: GC_TIME_SEARCH,
	});
}
