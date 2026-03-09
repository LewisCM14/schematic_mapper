import { useQuery } from "@tanstack/react-query";
import { fetchDrawingTypes } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useDrawingTypes() {
	return useQuery({
		queryKey: queryKeys.drawingTypes,
		queryFn: fetchDrawingTypes,
		staleTime: 30 * 60 * 1000,
		gcTime: 60 * 60 * 1000,
	});
}
