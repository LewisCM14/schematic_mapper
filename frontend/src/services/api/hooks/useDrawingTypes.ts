/**
 * useDrawingTypes.ts
 *
 * React Query hook for fetching and caching the list of drawing types from the backend.
 *
 * - Uses aggressive caching (30 min stale, 60 min GC) since drawing types rarely change.
 * - Returns loading, error, and data states for use in dropdowns and forms.
 * - Query key and cache policy are centralized for consistency.
 *
 * Use this hook wherever you need the list of available drawing types.
 */
import { useQuery } from "@tanstack/react-query";
import { GC_TIME_DRAWING_TYPES, STALE_TIME_DRAWING_TYPES } from "../config";
import { fetchDrawingTypes } from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Fetch and cache the list of drawing types for use in forms and selectors.
 * Applies long cache times for performance.
 */
export function useDrawingTypes() {
	return useQuery({
		queryKey: queryKeys.drawingTypes,
		queryFn: fetchDrawingTypes,
		staleTime: STALE_TIME_DRAWING_TYPES,
		gcTime: GC_TIME_DRAWING_TYPES,
	});
}
