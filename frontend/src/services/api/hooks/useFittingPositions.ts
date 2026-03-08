import { useQuery } from "@tanstack/react-query";
import { fetchFittingPositions } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useFittingPositions(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.fittingPositions(imageId),
		queryFn: () => fetchFittingPositions(imageId),
		enabled: Boolean(imageId),
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
}
