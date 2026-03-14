/**
 * useHealth.ts
 *
 * React Query hook for fetching the backend health check endpoint.
 *
 * - Returns loading, error, and data states for use in status banners or diagnostics.
 * - Query key is centralized for cache consistency.
 *
 * Use this hook wherever you need to display or react to backend health status.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Fetch the backend health check status for diagnostics and banners.
 */
export function useHealth() {
	return useQuery({
		queryKey: queryKeys.health,
		queryFn: fetchHealth,
	});
}
