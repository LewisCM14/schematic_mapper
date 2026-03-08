import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../endpoints";
import { queryKeys } from "../queryKeys";

export function useHealth() {
	return useQuery({
		queryKey: queryKeys.health,
		queryFn: fetchHealth,
	});
}
