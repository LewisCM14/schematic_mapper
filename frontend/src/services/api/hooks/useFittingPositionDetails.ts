import { useQuery } from "@tanstack/react-query";
import { GC_TIME_FP_DETAIL, STALE_TIME_FP_DETAIL } from "../config";
import { fetchFittingPositionDetails } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useFittingPositionDetails(fittingPositionId: string | null) {
	return useQuery({
		queryKey: queryKeys.fittingPositions.detail(fittingPositionId ?? ""),
		queryFn: () => fetchFittingPositionDetails(fittingPositionId ?? ""),
		enabled: Boolean(fittingPositionId),
		staleTime: STALE_TIME_FP_DETAIL,
		gcTime: GC_TIME_FP_DETAIL,
	});
}
