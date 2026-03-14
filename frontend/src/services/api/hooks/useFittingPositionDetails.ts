/**
 * useFittingPositionDetails.ts
 *
 * React Query hook for fetching and caching the details of a single fitting position.
 *
 * - Uses short cache times (60s stale, 15min GC) for live enrichment data.
 * - Query is only enabled when a valid fittingPositionId is provided.
 * - Returns loading, error, and data states for use in detail panels and dialogs.
 *
 * Use this hook wherever you need to display or react to fitting position details.
 */
import { useQuery } from "@tanstack/react-query";
import { GC_TIME_FP_DETAIL, STALE_TIME_FP_DETAIL } from "../config";
import { fetchFittingPositionDetails } from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Fetch and cache the details for a single fitting position (live enrichment).
 * Only runs when a valid ID is provided.
 */
export function useFittingPositionDetails(fittingPositionId: string | null) {
	return useQuery({
		queryKey: queryKeys.fittingPositions.detail(fittingPositionId ?? ""),
		queryFn: () => fetchFittingPositionDetails(fittingPositionId ?? ""),
		enabled: Boolean(fittingPositionId),
		staleTime: STALE_TIME_FP_DETAIL,
		gcTime: GC_TIME_FP_DETAIL,
	});
}
