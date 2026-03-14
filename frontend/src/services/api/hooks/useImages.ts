/**
 * useImages.ts
 *
 * React Query hooks for fetching and caching image lists and image details from the backend.
 *
 * - useImages: Infinite query for paginated image lists, with optional filters (drawing type, search).
 * - useImage: Query for a single image detail by ID.
 * - getNextPageParam: Helper to extract the next cursor for pagination.
 * - Applies cache and stale times for optimal UX and backend efficiency.
 *
 * Use these hooks in image selection, gallery, and detail pages.
 */
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	GC_TIME_IMAGE_DETAIL,
	GC_TIME_IMAGE_LIST,
	STALE_TIME_IMAGE_DETAIL,
	STALE_TIME_IMAGE_LIST,
} from "../config";
import { fetchImage, fetchImages } from "../endpoints";
import { queryKeys } from "../queryKeys";
import type { ImageListPage } from "../schemas";

/**
 * Infinite query hook for paginated image lists, with optional filters.
 * @param drawingTypeId Optional filter for drawing type
 * @param search Optional search string
 * @returns React Query infinite query result for image list pages
 */
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
	return useInfiniteQuery<ImageListPage, Error>({
		queryKey: queryKeys.images.list(filters),
		queryFn: (context) => {
			const pageParam = context.pageParam as string | undefined;
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

/**
 * Helper to extract the next page cursor for infinite image list queries.
 * Accepts the full ImageListPage type and normalizes next_cursor null to undefined.
 */
export function getNextPageParam(lastPage: ImageListPage) {
	return lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined;
}

/**
 * Query hook for fetching a single image detail by ID.
 * @param imageId The image UUID
 * @returns React Query result for the image detail
 */
export function useImage(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.detail(imageId),
		queryFn: () => fetchImage(imageId),
		enabled: Boolean(imageId),
		staleTime: STALE_TIME_IMAGE_DETAIL,
		gcTime: GC_TIME_IMAGE_DETAIL,
	});
}
