import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchImage, fetchImages } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useImages(drawingTypeId?: number) {
	const baseParams: Record<string, string> = {};
	if (drawingTypeId !== undefined) {
		baseParams.drawing_type_id = String(drawingTypeId);
	}
	return useInfiniteQuery({
		queryKey: queryKeys.images.list(
			drawingTypeId !== undefined ? { drawingTypeId } : undefined,
		),
		queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
			const params = { ...baseParams };
			if (pageParam) params.cursor = pageParam;
			return fetchImages(Object.keys(params).length ? params : undefined);
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
}

export function useImage(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.detail(imageId),
		queryFn: () => fetchImage(imageId),
		enabled: Boolean(imageId),
		staleTime: 15 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
	});
}
