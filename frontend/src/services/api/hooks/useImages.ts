import { useQuery } from "@tanstack/react-query";
import { fetchImage, fetchImages } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useImages() {
	return useQuery({
		queryKey: queryKeys.images.list(),
		queryFn: () => fetchImages(),
	});
}

export function useImage(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.detail(imageId),
		queryFn: () => fetchImage(imageId),
		enabled: Boolean(imageId),
	});
}
