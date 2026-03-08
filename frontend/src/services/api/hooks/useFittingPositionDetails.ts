import { useQuery } from "@tanstack/react-query";
import { fetchFittingPositionDetails } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useFittingPositionDetails(fittingPositionId: string | null) {
	return useQuery({
		queryKey: queryKeys.fittingPositions.detail(fittingPositionId ?? ""),
		queryFn: () => fetchFittingPositionDetails(fittingPositionId ?? ""),
		enabled: Boolean(fittingPositionId),
	});
}
