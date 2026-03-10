import { useQuery } from "@tanstack/react-query";
import {
	GC_TIME_FITTING_POSITIONS,
	STALE_TIME_FITTING_POSITIONS,
} from "../config";
import { fetchFittingPositions } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useFittingPositions(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.fittingPositions(imageId),
		queryFn: () => fetchFittingPositions(imageId),
		enabled: Boolean(imageId),
		staleTime: STALE_TIME_FITTING_POSITIONS,
		gcTime: GC_TIME_FITTING_POSITIONS,
	});
}
