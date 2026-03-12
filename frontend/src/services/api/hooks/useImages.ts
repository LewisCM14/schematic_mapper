import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	GC_TIME_IMAGE_DETAIL,
	GC_TIME_IMAGE_LIST,
	STALE_TIME_IMAGE_DETAIL,
	STALE_TIME_IMAGE_LIST,
} from "../config";
import { fetchImage, fetchImages } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useImages(drawingTypeId?: number, search?: string) {
	const baseParams: Record<string, string> = {};
	if (drawingTypeId !== undefined) {
		baseParams.drawing_type_id = String(drawingTypeId);
	}
	if (search) {
		baseParams.search = search;
	}
	const hasFilters = drawingTypeId !== undefined || Boolean(search);
	const filters = hasFilters
		? {
				...(drawingTypeId !== undefined ? { drawingTypeId } : {}),
				...(search ? { search } : {}),
			}
		: undefined;
	return useInfiniteQuery({
		queryKey: queryKeys.images.list(filters),
		queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
			const params = { ...baseParams };
			if (pageParam) params.cursor = pageParam;
			return fetchImages(Object.keys(params).length ? params : undefined);
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam,
		staleTime: STALE_TIME_IMAGE_LIST,
		gcTime: GC_TIME_IMAGE_LIST,
	});
}

// Exported for testing
export function getNextPageParam(lastPage: {
	has_more: boolean;
	next_cursor?: string;
}) {
	return lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined;
}

export function useImage(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.detail(imageId),
		queryFn: () => fetchImage(imageId),
		enabled: Boolean(imageId),
		staleTime: STALE_TIME_IMAGE_DETAIL,
		gcTime: GC_TIME_IMAGE_DETAIL,
	});
}
