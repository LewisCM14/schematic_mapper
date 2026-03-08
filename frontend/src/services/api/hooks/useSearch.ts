import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSearch } from "../endpoints";
import { queryKeys } from "../queryKeys";

const DEFAULT_LIMIT = 25;

export function useSearch(
	imageId: string,
	query: string,
	sources: string[] = ["internal", "asset"],
	limit: number = DEFAULT_LIMIT,
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
		enabled: Boolean(imageId) && query.length >= 2,
	});
}
