/**
 * useFittingPositions.ts
 *
 * React Query hook for fetching and caching the list of fitting positions for a given image.
 *
 * - Uses moderate cache times (5min stale, 30min GC) for performance and freshness.
 * - Query is only enabled when a valid imageId is provided.
 * - Returns loading, error, and data states for use in mapping and annotation UIs.
 *
 * Use this hook wherever you need to display or interact with fitting positions for an image.
 */
import { useQuery } from "@tanstack/react-query";
import {
	GC_TIME_FITTING_POSITIONS,
	STALE_TIME_FITTING_POSITIONS,
} from "../config";
import { fetchFittingPositions } from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Fetch and cache the list of fitting positions for a specific image.
 * Only runs when a valid imageId is provided.
 */
export function useFittingPositions(imageId: string) {
	return useQuery({
		queryKey: queryKeys.images.fittingPositions(imageId),
		queryFn: () => fetchFittingPositions(imageId),
		enabled: Boolean(imageId),
		staleTime: STALE_TIME_FITTING_POSITIONS,
		gcTime: GC_TIME_FITTING_POSITIONS,
	});
}
