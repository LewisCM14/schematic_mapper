import { useQuery } from "@tanstack/react-query";
import { GC_TIME_DRAWING_TYPES, STALE_TIME_DRAWING_TYPES } from "../config";
import { fetchDrawingTypes } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useDrawingTypes() {
	return useQuery({
		queryKey: queryKeys.drawingTypes,
		queryFn: fetchDrawingTypes,
		staleTime: STALE_TIME_DRAWING_TYPES,
		gcTime: GC_TIME_DRAWING_TYPES,
	});
}
