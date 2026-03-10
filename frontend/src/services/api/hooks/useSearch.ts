import { useInfiniteQuery } from "@tanstack/react-query";
import {
	GC_TIME_SEARCH,
	SEARCH_DEFAULT_LIMIT,
	SEARCH_MIN_QUERY_LENGTH,
	STALE_TIME_SEARCH,
} from "../config";
import { fetchSearch } from "../endpoints";
import { queryKeys } from "../queryKeys";

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
