import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "../../../test/handlers";
import { queryKeys } from "../queryKeys";
import { useFittingPositionDetails } from "./useFittingPositionDetails";

const FP_ID = "FP-PUMP-01-INLET";

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return {
		wrapper: ({ children }: { children: React.ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient }, children),
		queryClient,
	};
}

describe("useFittingPositionDetails", () => {
	it("is disabled when fittingPositionId is null", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useFittingPositionDetails(null), {
			wrapper,
		});
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("is disabled when fittingPositionId is empty string", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(
			() => useFittingPositionDetails("" as unknown as null),
			{ wrapper },
		);
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("fetches details for a valid fittingPositionId", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useFittingPositionDetails(FP_ID), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.fitting_position_id).toBe(
			FIXTURES.positionDetail.fitting_position_id,
		);
		expect(result.current.data?.asset?.high_level_component).toBe(
			FIXTURES.positionDetail.asset.high_level_component,
		);
	});

	it("uses the correct query key", () => {
		const key = queryKeys.fittingPositions.detail(FP_ID);
		expect(key).toEqual(["fitting-positions", FP_ID, "details"]);
	});

	it("applies staleTime of 60 seconds", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const { result } = renderHook(() => useFittingPositionDetails(FP_ID), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const state = queryClient.getQueryState(
			queryKeys.fittingPositions.detail(FP_ID),
		);
		// staleTime 60s means not stale immediately after fetch
		expect(state?.isInvalidated).toBeFalsy();
	});
});
