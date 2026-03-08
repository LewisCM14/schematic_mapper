import { useQuery } from "@tanstack/react-query";
import { fetchImage, fetchImages } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useImages(drawingTypeId?: number) {
	const params: Record<string, string> = {};
	if (drawingTypeId !== undefined) {
		params.drawing_type_id = String(drawingTypeId);
	}
	return useQuery({
		queryKey: queryKeys.images.list(
			drawingTypeId !== undefined ? { drawingTypeId } : undefined,
		),
		queryFn: () => fetchImages(Object.keys(params).length ? params : undefined),
	});
}

export function useImage(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.detail(imageId),
		queryFn: () => fetchImage(imageId),
		enabled: Boolean(imageId),
	});
}
