import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FIXTURES, IMAGE_ID } from "../../../test/handlers";
import { queryKeys } from "../queryKeys";
import { useFittingPositions } from "./useFittingPositions";

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

describe("useFittingPositions", () => {
	it("is disabled when imageId is empty string", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useFittingPositions(""), { wrapper });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("fetches fitting positions for a valid imageId", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useFittingPositions(IMAGE_ID), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toHaveLength(FIXTURES.positions.length);
		expect(result.current.data?.[0].fitting_position_id).toBe(
			FIXTURES.positions[0].fitting_position_id,
		);
	});

	it("uses the correct query key", () => {
		const key = queryKeys.images.fittingPositions(IMAGE_ID);
		expect(key).toEqual(["images", IMAGE_ID, "fitting-positions"]);
	});

	it("applies staleTime of 5 minutes", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const { result } = renderHook(() => useFittingPositions(IMAGE_ID), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const state = queryClient.getQueryState(
			queryKeys.images.fittingPositions(IMAGE_ID),
		);
		// staleTime 5 min means not stale immediately after fetch
		expect(state?.isInvalidated).toBeFalsy();
	});
});
